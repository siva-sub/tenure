import { useMemo, useState } from 'react'
import type { IntervalReading } from '@/domain/types'
import { useOutletContext } from 'react-router-dom'
import type { ShellContext } from '@/app/shellContext'
import { useTelemetry } from '@/app/queries'
import {
  co2Kg,
  consumptionSplit,
  exceedanceDays,
  loadShiftPotential,
  TARIFF_WINDOWS,
  bandForScore,
  bandLabel,
  mouldRisk,
} from '@/domain/energy'
import { clock, dateShort, kwh, num, pct, sgd } from '@/domain/format'
import { Reveal, Sec } from '@/components/Reveal'
import { LoadRibbon, PeerBand, ScoreDial } from '@/components/instruments'
import { AsyncBoundary, LedgerSkeleton } from '@/components/States'

type View = 'today' | 'quarter' | 'year'

const VIEWS: Array<{ id: View; label: string }> = [
  { id: 'today', label: 'Today' },
  { id: 'quarter', label: 'Trailing 90 days' },
  { id: 'year', label: 'Annual' },
]

export function EnergyPage() {
  const { property } = useOutletContext<ShellContext>()
  const telemetry = useTelemetry(property.id)
  const [view, setView] = useState<View>('today')

  const data = telemetry.data
  const intervals = data?.today ?? []

  const today = useMemo(() => {
    const total = intervals.reduce((sum, r) => sum + r.kwh, 0)
    const cooling = intervals.reduce((sum, r) => sum + r.kwhCooling, 0)
    const hottest = intervals.reduce<IntervalReading | null>(
      (max, r) => (max === null || r.outdoorC > max.outdoorC ? r : max),
      null,
    )
    const shift = loadShiftPotential(intervals, property.meter.tariffCentsPerKwh)
    return {
      total,
      cooling,
      hottest,
      shift,
      cost: (total * property.meter.tariffCentsPerKwh) / 100,
      emissions: co2Kg(total),
    }
  }, [intervals, property.meter.tariffCentsPerKwh])

  const quarter = useMemo(() => {
    const history = data?.history ?? []
    const total = history.reduce((sum, d) => sum + d.kwh, 0)
    const mean = history.length ? total / history.length : 0
    const max = history.reduce((m, d) => Math.max(m, d.kwh), 0)
    const dailyThreshold = property.benchmarks.peerHighKwh / 365
    const mouldDays = history.filter((d) => d.mouldHours >= 4).length
    return {
      history,
      total,
      mean,
      max,
      exceed: exceedanceDays(history, dailyThreshold),
      mouldDays,
      threshold: dailyThreshold,
    }
  }, [data?.history, property.benchmarks.peerHighKwh])

  const split = consumptionSplit(property.annualKwh, property.benchmarks.coolingShare)
  const band = bandForScore(property.score)
  const rooms = property.rooms.filter((r) => r.hasSensor)
  const mould = mouldRisk(intervals, property.rooms)

  const contractDays = Math.round(
    (new Date(property.meter.contractEndsOn).getTime() - Date.now()) / 86_400_000,
  )

  return (
    <div className="page">
      <header className="page__head">
        <span className="eyebrow rise" style={{ '--i': 0 } as React.CSSProperties}>
          <span className="eyebrow__num">02</span> energy
        </span>
        <h1 className="page__title rise" style={{ '--i': 1 } as React.CSSProperties}>
          What this home actually costs to run
        </h1>
        <p className="page__lede rise" style={{ '--i': 2 } as React.CSSProperties}>
          Singapore has no Energy Performance Certificate for a flat, so this band is constructed rather than imported:
          metered consumption, floor area, household size and the tropical cooling load, with every ingredient shown.
        </p>
        <div className="page__meta rise" style={{ '--i': 3 } as React.CSSProperties}>
          <span className="badge badge--info">
            <span className="badge__dot" />
            {property.meter.kind === 'ami' ? 'AMI · half-hourly, metered' : 'CT clamp · live, billing estimated'}
          </span>
          <span>{property.meter.tariffLabel}</span>
          <span>{property.meter.tariffCentsPerKwh.toFixed(2)}¢/kWh</span>
          {data ? <span>Read at {clock(data.capturedAt)}</span> : null}
        </div>
      </header>

      {/* ---------------------------------------------------------- */}
      <Reveal>
        <section className="card" aria-labelledby="band-title">
          <div className="card__head">
            <h2 className="card__title" id="band-title">
              The band, built from parts
            </h2>
            <span className="card__note">
              {band} · {bandLabel(band)} · {property.score}/100
            </span>
          </div>
          <div className="card__body score-layout">
            <div>
              <ScoreDial score={property.score} />
              <div className="dial-facts" style={{ marginTop: 'var(--s-3)' }}>
                <div>
                  <span className="stat__label">EUI</span>
                  <span className="mono">{num(property.benchmarks.eui, 1)} kWh/m²·yr</span>
                </div>
                <div>
                  <span className="stat__label">Cooling degree days</span>
                  <span className="mono">{num(property.benchmarks.coolingDegreeDays)} CDD</span>
                </div>
              </div>
            </div>

            <div className="breakdown">
              {property.scoreBreakdown.map((factor) => (
                <div key={factor.id} className="breakdown__row">
                  <div className="breakdown__head">
                    <span className="breakdown__label">{factor.label}</span>
                    <span className="mono breakdown__score">
                      {factor.score}
                      <span className="muted"> / 100 · weight {pct(factor.weight)}</span>
                    </span>
                  </div>
                  <div className="breakdown__track">
                    <div className="breakdown__fill" style={{ width: `${factor.score}%` }} data-tone={factor.score >= 60 ? 'ok' : factor.score >= 40 ? 'warn' : 'bad'} />
                  </div>
                  <p className="breakdown__note">{factor.note}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="card__foot">
            Weighted composite: fabric {pct(0.2)} · cooling {pct(0.3)} · appliances {pct(0.25)} · behaviour {pct(0.15)} ·
            renewables {pct(0.1)}
          </div>
        </section>
      </Reveal>

      {/* ---------------------------------------------------------- */}
      <Sec
        num="02.1"
        title="Consumption"
        aside={
          view === 'today'
            ? `${kwh(today.total, 1)} so far today`
            : view === 'quarter'
              ? `${kwh(quarter.mean, 1)} average day`
              : `${kwh(property.annualKwh)} trailing year`
        }
      >
        <div className="tabs" role="tablist" aria-label="Consumption view">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              role="tab"
              className="tab"
              aria-selected={view === v.id}
              aria-controls={`panel-${v.id}`}
              id={`tab-${v.id}`}
              onClick={() => setView(v.id)}
            >
              {v.label}
            </button>
          ))}
        </div>

        <AsyncBoundary
          isPending={telemetry.isPending}
          error={telemetry.error}
          onRetry={() => void telemetry.refetch()}
          skeleton={<LedgerSkeleton rows={6} />}
        >
          {view === 'today' ? (
            <div id="panel-today" role="tabpanel" aria-labelledby="tab-today" className="grid grid--margin">
              <section className="card">
                <div className="card__head">
                  <h3 className="card__title">Half-hourly load</h3>
                  <span className="card__note">48 intervals · 7 pm–11 pm shaded</span>
                </div>
                <div className="card__body">
                  <LoadRibbon intervals={intervals} />
                  <div className="legend-row">
                    <span style={{ '--swatch': 'var(--viz-1)' } as React.CSSProperties}>Total load</span>
                    <span style={{ '--swatch': 'var(--viz-3)' } as React.CSSProperties}>Cooling share</span>
                    <span style={{ '--swatch': 'var(--sodium)' } as React.CSSProperties}>Peak tariff window</span>
                  </div>
                </div>
                <div className="card__foot">
                  Peak is 7 pm–11 pm: when residents are home, air-conditioning starts, and time-of-use plans charge
                  most.
                </div>
              </section>

              <div className="stack stack--tight">
                <div className="statcard">
                  <span className="stat__label">Today</span>
                  <span className="stat__value">
                    {num(today.total, 1)}
                    <span className="stat__unit">kWh</span>
                  </span>
                  <span className="stat__note">
                    {sgd(today.cost, { cents: true })} at {property.meter.tariffCentsPerKwh.toFixed(2)}¢/kWh ·{' '}
                    {num(today.emissions, 1)} kg CO₂e
                  </span>
                </div>

                <div className="statcard">
                  <span className="stat__label">Peak-window share</span>
                  <span className="stat__value">
                    {pct(today.shift.peakShare)}
                    <span className="stat__unit">of load</span>
                  </span>
                  <span className="stat__note">
                    {kwh(today.shift.peakKwh, 1)} between 7 and 11 pm. Shifting {kwh(today.shift.shiftableKwh, 1)} a
                    day to off-peak is worth about {sgd(today.shift.savingSgdYear)} a year on a time-of-use plan.
                  </span>
                </div>

                <div className="statcard">
                  <span className="stat__label">Outdoor peak</span>
                  <span className="stat__value">
                    {today.hottest ? num(today.hottest.outdoorC, 1) : '—'}
                    <span className="stat__unit">°C</span>
                  </span>
                  <span className="stat__note">
                    {today.hottest ? `at ${clock(today.hottest.at)} · ${num(today.hottest.outdoorRh)} % RH` : ''}. Cooling
                    load tracks this, lagged by about two hours because of the slab.
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          {view === 'quarter' ? (
            <div id="panel-quarter" role="tabpanel" aria-labelledby="tab-quarter" className="grid grid--margin">
              <section className="card">
                <div className="card__head">
                  <h3 className="card__title">Daily consumption</h3>
                  <span className="card__note">90 days · dash is the peer high band</span>
                </div>
                <div className="card__body">
                  <div className="trend" role="img" aria-label={`Daily consumption for the last 90 days, averaging ${num(quarter.mean, 1)} kWh.`}>
                    {quarter.history.map((day, i) => (
                      <div key={day.date} className="trend__col" title={`${dateShort(day.date)} · ${day.kwh} kWh`}>
                        <div
                          className="trend__bar"
                          style={{ height: `${(day.kwh / Math.max(quarter.max, 1)) * 100}%`, '--i': i } as React.CSSProperties}
                        />
                      </div>
                    ))}
                    <div
                      className="trend__threshold"
                      style={{ bottom: `${(quarter.threshold / Math.max(quarter.max, 1)) * 100}%` }}
                    />
                  </div>
                  <div className="trend__axis">
                    <span>{quarter.history[0] ? dateShort(quarter.history[0].date) : ''}</span>
                    <span>today</span>
                  </div>
                </div>
                <div className="card__foot">
                  {quarter.exceed} of {quarter.history.length} days above the peer high band of{' '}
                  {num(quarter.threshold, 1)} kWh/day.
                </div>
              </section>

              <div className="stack stack--tight">
                <div className="statcard">
                  <span className="stat__label">90-day total</span>
                  <span className="stat__value">
                    {num(quarter.total)}
                    <span className="stat__unit">kWh</span>
                  </span>
                  <span className="stat__note">
                    Annualised at {kwh((quarter.total / Math.max(1, quarter.history.length)) * 365)}, against a recorded
                    trailing year of {kwh(property.annualKwh)}.
                  </span>
                </div>
                <div className="statcard">
                  <span className="stat__label">Mould-risk days</span>
                  <span className="stat__value">
                    {quarter.mouldDays}
                    <span className="stat__unit">of 90</span>
                  </span>
                  <span className="stat__note">
                    Days where a monitored room held above 70 % RH for more than four hours — the threshold where black
                    mould establishes on cool surfaces.
                  </span>
                </div>
                <div className="statcard">
                  <span className="stat__label">Weekday vs weekend</span>
                  <span className="stat__value">
                    {num(
                      quarter.history
                        .filter((d) => {
                          const day = new Date(`${d.date}T00:00:00+08:00`).getDay()
                          return day === 0 || day === 6
                        })
                        .reduce((s, d) => s + d.kwh, 0) /
                        Math.max(
                          1,
                          quarter.history.filter((d) => {
                            const day = new Date(`${d.date}T00:00:00+08:00`).getDay()
                            return day === 0 || day === 6
                          }).length,
                        ),
                      1,
                    )}
                    <span className="stat__unit">kWh weekend day</span>
                  </span>
                  <span className="stat__note">Occupancy, not weather, drives most of the difference.</span>
                </div>
              </div>
            </div>
          ) : null}

          {view === 'year' ? (
            <div id="panel-year" role="tabpanel" aria-labelledby="tab-year" className="grid grid--margin">
              <section className="card">
                <div className="card__head">
                  <h3 className="card__title">Annual attribution</h3>
                  <span className="card__note">{kwh(property.annualKwh)} · trailing 12 months</span>
                </div>
                <div className="card__body" style={{ display: 'grid', gap: 'var(--s-4)' }}>
                  {split.map((row, i) => (
                    <div key={row.key} className="split">
                      <div className="split__head">
                        <span className="split__label">{row.label}</span>
                        <span className="mono split__value">
                          {kwh(row.kwh)} · {pct(row.share)}
                        </span>
                      </div>
                      <div className="split__track">
                        <div className={`split__fill split__fill--${i}`} style={{ width: `${row.share * 100}%` }} />
                      </div>
                    </div>
                  ))}
                  <p className="note">
                    Cooling is {pct(property.benchmarks.coolingShare)} of the total. That is why fabric measures —
                    shading, film, ceiling insulation — move the number more than swapping a kettle.
                  </p>
                </div>
              </section>

              <div className="stack stack--tight">
                <section className="card">
                  <div className="card__head">
                    <h3 className="card__title">Against peers</h3>
                    <span className="card__note">{property.planningArea} · {property.flatType}</span>
                  </div>
                  <div className="card__body" style={{ display: 'grid', gap: 'var(--s-4)' }}>
                    <PeerBand
                      value={property.annualKwh}
                      low={property.benchmarks.peerLowKwh}
                      median={property.benchmarks.peerMedianKwh}
                      high={property.benchmarks.peerHighKwh}
                    />
                    <p className="small muted">
                      Above the {num(property.peerPercentile)}th percentile of {property.flatType.toLowerCase()} units in{' '}
                      {property.planningArea}. The band is normalised for household size and floor area.
                    </p>
                  </div>
                </section>

                <section className="card">
                  <div className="card__head">
                    <h3 className="card__title">Emissions</h3>
                  </div>
                  <div className="card__body">
                    <span className="stat__value">
                      {num(co2Kg(property.annualKwh) / 1000, 2)}
                      <span className="stat__unit">tonnes CO₂e / yr</span>
                    </span>
                    <p className="tiny muted" style={{ marginTop: 'var(--s-2)' }}>
                      At 0.41 kg CO₂e per kWh, the indicative grid emission factor. Reported for context, not as an
                      offset claim.
                    </p>
                  </div>
                </section>
              </div>
            </div>
          ) : null}
        </AsyncBoundary>
      </Sec>

      {/* ---------------------------------------------------------- */}
      <Sec num="02.2" title="Tariff and contract" aside={`revised quarterly · ${property.meter.tariffLabel}`}>
        <div className="grid grid--3">
          <section className="card">
            <div className="card__head">
              <h3 className="card__title">Regulated tariff</h3>
            </div>
            <div className="card__body">
              <span className="stat__value">
                {property.meter.tariffCentsPerKwh.toFixed(2)}
                <span className="stat__unit">¢/kWh</span>
              </span>
              <p className="small muted" style={{ marginTop: 'var(--s-2)' }}>
                The Q4 2026 regulated tariff including GST. It is revised every quarter, so every payback figure in this
                record carries the vintage it was computed at.
              </p>
            </div>
          </section>

          <section className="card">
            <div className="card__head">
              <h3 className="card__title">Contract</h3>
              <span className="card__note">{property.meter.retailer}</span>
            </div>
            <div className="card__body" style={{ display: 'grid', gap: 'var(--s-2)' }}>
              <span className="stat__value">
                {contractDays}
                <span className="stat__unit">days to end</span>
              </span>
              <p className="small muted">
                Ends {dateShort(property.meter.contractEndsOn)}. Renewal terms default to a worse rate than the
                advertised one, so the record flags the decision rather than letting it renew silently.
              </p>
            </div>
          </section>

          <section className="card">
            <div className="card__head">
              <h3 className="card__title">Windows</h3>
            </div>
            <div className="card__body">
              <ul className="windowlist">
                {TARIFF_WINDOWS.map((w) => (
                  <li key={w.id}>
                    <span className={`windowlist__swatch windowlist__swatch--${w.id}`} />
                    <span>{w.label}</span>
                    <span className="mono muted">
                      {String(w.startHour).padStart(2, '0')}:00–{String(w.endHour).padStart(2, '0')}:00
                    </span>
                    <span className="mono">×{w.multiplier.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              <p className="tiny muted" style={{ marginTop: 'var(--s-2)' }}>
                Multipliers are indicative of time-of-use plans on the Open Electricity Market; the regulated tariff is
                flat.
              </p>
            </div>
          </section>
        </div>
      </Sec>

      {mould.some((m) => m.verdict === 'at-risk' || m.verdict === 'critical') ? (
        <div className="note note--warn" style={{ marginTop: 'var(--s-6)' }}>
          <strong>Mould risk is being carried in {mould.filter((m) => m.index >= 48).length} rooms.</strong>{' '}
          {mould[0]?.roomName} is the worst at {num(mould[0]?.hoursAbove ?? 0, 1)} hours above threshold today. The
          telemetry page breaks this down room by room — {rooms.length} sensors are reporting.
        </div>
      ) : null}
    </div>
  )
}
