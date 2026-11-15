import { useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import type { ShellContext } from '@/app/shellContext'
import { useTelemetry } from '@/app/queries'
import { comfortShare, mouldRisk } from '@/domain/energy'
import { clock, num, pct } from '@/domain/format'
import { Reveal, Sec } from '@/components/Reveal'
import { LoadRibbon } from '@/components/instruments'
import { AsyncBoundary, LedgerSkeleton } from '@/components/States'

export function TelemetryPage() {
  const { property } = useOutletContext<ShellContext>()
  const telemetry = useTelemetry(property.id)
  const intervals = telemetry.data?.today ?? []
  const last = intervals.at(-1)

  const mould = useMemo(() => mouldRisk(intervals, property.rooms), [intervals, property.rooms])
  const comfort = useMemo(() => comfortShare(intervals, 'living'), [intervals])

  const sensors = property.rooms.filter((r) => r.hasSensor)
  const hottest = intervals.reduce<number | null>((max, r) => (max === null || r.outdoorC > max ? r.outdoorC : max), null)
  const coolest = intervals.reduce<number | null>((min, r) => (min === null || r.outdoorC < min ? r.outdoorC : min), null)
  const pm = intervals.length ? intervals.reduce((s, r) => s + r.pm25, 0) / intervals.length : 0

  return (
    <div className="page">
      <header className="page__head">
        <span className="eyebrow rise" style={{ '--i': 0 } as React.CSSProperties}>
          <span className="eyebrow__num">05</span> telemetry
        </span>
        <h1 className="page__title rise" style={{ '--i': 1 } as React.CSSProperties}>
          The building, reading itself out
        </h1>
        <p className="page__lede rise" style={{ '--i': 2 } as React.CSSProperties}>
          {sensors.length} room sensors and a CT clamp on the incoming supply, sampled at one minute and aggregated to
          thirty. Humidity is tracked as carefully as temperature, because in this climate dampness is what damages the
          building.
        </p>
        <div className="page__meta rise" style={{ '--i': 3 } as React.CSSProperties}>
          <span className="rail__status" style={{ display: 'inline-flex', gap: '0.5em' }}>
            <span className="dot dot--live" style={{ background: 'var(--ok)', boxShadow: '0 0 0 3px var(--ok-wash)' }} />
            live
          </span>
          <span>Last sample {last ? clock(last.at) : '—'}</span>
          <span>{property.meter.ctClampChannels.join(' · ')}</span>
        </div>
      </header>

      <AsyncBoundary
        isPending={telemetry.isPending}
        error={telemetry.error}
        onRetry={() => void telemetry.refetch()}
        skeleton={<LedgerSkeleton rows={8} />}
      >
        {/* Room cards */}
        <Sec num="05.1" title="Room by room" aside={last ? `as at ${clock(last.at)}` : undefined}>
          <div className="grid grid--split">
            {sensors.map((room, i) => {
              const temp = last?.roomsC[room.id]
              const rh = last?.roomsRh[room.id]
              const risk = mould.find((m) => m.roomId === room.id)
              const tone =
                risk?.verdict === 'critical'
                  ? 'badge--bad'
                  : risk?.verdict === 'at-risk'
                    ? 'badge--warn'
                    : risk?.verdict === 'watch'
                      ? 'badge--info'
                      : 'badge--ok'
              return (
                <Reveal key={room.id} delay={i * 50}>
                  <article className="card roomcard">
                    <div className="card__head">
                      <h3 className="card__title">{room.name}</h3>
                      <span className={`badge ${tone}`}>{risk?.verdict ?? 'no data'}</span>
                    </div>
                    <div className="card__body">
                      <div className="roomcard__figures">
                        <div>
                          <span className="stat__label">Temp</span>
                          <span className="roomcard__value">
                            {temp !== undefined ? num(temp, 1) : '—'}
                            <span className="stat__unit">°C</span>
                          </span>
                        </div>
                        <div>
                          <span className="stat__label">RH</span>
                          <span className="roomcard__value">
                            {rh !== undefined ? num(rh, 0) : '—'}
                            <span className="stat__unit">%</span>
                          </span>
                        </div>
                        <div>
                          <span className="stat__label">Above 70%</span>
                          <span className="roomcard__value">
                            {num(risk?.hoursAbove ?? 0, 1)}
                            <span className="stat__unit">h</span>
                          </span>
                        </div>
                      </div>
                      <div className="riskbar" aria-hidden="true">
                        <div className="riskbar__fill" style={{ width: `${risk?.index ?? 0}%` }} data-tone={tone.includes('bad') ? 'bad' : tone.includes('warn') ? 'warn' : tone.includes('info') ? 'info' : 'ok'} />
                      </div>
                      <p className="tiny muted" style={{ marginTop: 'var(--s-2)' }}>
                        {room.note}
                      </p>
                    </div>
                  </article>
                </Reveal>
              )
            })}
          </div>
        </Sec>

        {/* Load */}
        <Sec num="05.2" title="Load" aside="48 half-hour intervals · today">
          <div className="grid grid--margin">
            <section className="card">
              <div className="card__head">
                <h3 className="card__title">Demand and humidity</h3>
                <span className="card__note">bars: kWh · strip: living room RH</span>
              </div>
              <div className="card__body">
                <LoadRibbon intervals={intervals} />
                <div className="legend-row">
                  <span style={{ '--swatch': 'var(--viz-1)' } as React.CSSProperties}>Whole flat</span>
                  <span style={{ '--swatch': 'var(--viz-3)' } as React.CSSProperties}>Cooling</span>
                  <span style={{ '--swatch': 'var(--rh-dry)' } as React.CSSProperties}>RH dry</span>
                  <span style={{ '--swatch': 'var(--rh-watch)' } as React.CSSProperties}>RH 70%+</span>
                  <span style={{ '--swatch': 'var(--rh-critical)' } as React.CSSProperties}>RH 82%+</span>
                </div>
              </div>
              <div className="card__foot">
                The CT clamp sits on the incoming supply; the air-con branch is measured separately, which is why the
                cooling share is a reading rather than an estimate.
              </div>
            </section>

            <div className="stack stack--tight">
              <div className="statcard">
                <span className="stat__label">Outdoor swing</span>
                <span className="stat__value">
                  {hottest !== null && coolest !== null ? num(hottest - coolest, 1) : '—'}
                  <span className="stat__unit">K today</span>
                </span>
                <span className="stat__note">
                  {coolest !== null ? num(coolest, 1) : '—'} to {hottest !== null ? num(hottest, 1) : '—'} °C. In
                  Singapore the swing is small and the humidity is high, so envelope losses behave differently from a
                  temperate climate.
                </span>
              </div>
              <div className="statcard">
                <span className="stat__label">Comfort band</span>
                <span className="stat__value">{pct(comfort)}</span>
                <span className="stat__note">
                  Share of today spent between 23 and 27 °C in the living room, the band an acclimatised occupant
                  accepts with fans running.
                </span>
              </div>
              <div className="statcard">
                <span className="stat__label">Particulates</span>
                <span className="stat__value">
                  {num(pm, 0)}
                  <span className="stat__unit">µg/m³</span>
                </span>
                <span className="stat__note">
                  Mean indoor PM2.5. During the Southwest Monsoon haze this is the number that decides whether windows
                  stay shut.
                </span>
              </div>
            </div>
          </div>
        </Sec>

        {/* Mould */}
        <Sec num="05.3" title="Mould risk" aside="threshold: 70% RH sustained">
          <section className="card card--flush">
            <div className="card__body" style={{ paddingBottom: 0 }}>
              <p className="small muted" style={{ maxWidth: '68ch' }}>
                Air-conditioned rooms read dry while the unit runs and then swing back within an hour of shut-off. The
                household shelter — a reinforced concrete box with no through-draught — is the room that never dries
                out, and the first place black mould appears.
              </p>
            </div>
            <table className="ledger" style={{ marginTop: 'var(--s-4)' }}>
              <thead>
                <tr>
                  <th scope="col">Room</th>
                  <th scope="col" style={{ textAlign: 'right' }}>
                    Hours &gt; 70%
                  </th>
                  <th scope="col" style={{ textAlign: 'right' }}>
                    Peak RH
                  </th>
                  <th scope="col" style={{ textAlign: 'right' }}>
                    Mean RH
                  </th>
                  <th scope="col">Index</th>
                  <th scope="col">Verdict</th>
                </tr>
              </thead>
              <tbody>
                {mould.map((row) => (
                  <tr key={row.roomId}>
                    <td data-label="Room">
                      <span className="name">{row.roomName}</span>
                    </td>
                    <td data-label="Hours above" className="num">
                      {num(row.hoursAbove, 1)}
                    </td>
                    <td data-label="Peak RH" className="num">
                      {num(row.peakRh, 0)}%
                    </td>
                    <td data-label="Mean RH" className="num">
                      {num(row.meanRh, 0)}%
                    </td>
                    <td data-label="Index">
                      <div className="riskbar riskbar--inline" aria-hidden="true">
                        <div
                          className="riskbar__fill"
                          style={{ width: `${row.index}%` }}
                          data-tone={row.index >= 70 ? 'bad' : row.index >= 48 ? 'warn' : row.index >= 26 ? 'info' : 'ok'}
                        />
                      </div>
                    </td>
                    <td data-label="Verdict">
                      <span
                        className={`badge ${
                          row.verdict === 'critical'
                            ? 'badge--bad'
                            : row.verdict === 'at-risk'
                              ? 'badge--warn'
                              : row.verdict === 'watch'
                                ? 'badge--info'
                                : 'badge--ok'
                        }`}
                      >
                        {row.verdict}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </Sec>

        {/* Climate */}
        <Sec num="05.4" title="What the climate is doing to this building" aside="Meteorological Service Singapore">
          <div className="grid grid--3">
            <article className="card">
              <div className="card__head">
                <h3 className="card__title">Monsoon calendar</h3>
              </div>
              <div className="card__body" style={{ display: 'grid', gap: 'var(--s-2)' }}>
                <p className="small">
                  <strong>Northeast monsoon</strong> December to early March — the wet season, and when rain ingress
                  shows up at windows and the AC ledge.
                </p>
                <p className="small">
                  <strong>Southwest monsoon</strong> June to September — drier, with haze episodes that force windows
                  shut and push the AC harder.
                </p>
                <p className="tiny muted">
                  Two inter-monsoon periods bring the thunderstorms. Roughly 171 rain days a year and 2,113 mm of rain.
                </p>
              </div>
            </article>

            <article className="card">
              <div className="card__head">
                <h3 className="card__title">Design conditions</h3>
              </div>
              <div className="card__body" style={{ display: 'grid', gap: 'var(--s-2)' }}>
                <p className="small">
                  <strong>31–33 °C</strong> daytime, <strong>23–25 °C</strong> at night, with relative humidity
                  averaging <strong>around 82 %</strong>.
                </p>
                <p className="tiny muted">
                  There is no heating season, so the whole thermal design problem is removing heat and water vapour —
                  not retaining it.
                </p>
              </div>
            </article>

            <article className="card">
              <div className="card__head">
                <h3 className="card__title">Data provenance</h3>
              </div>
              <div className="card__body" style={{ display: 'grid', gap: 'var(--s-2)' }}>
                <p className="small">
                  {property.meter.kind === 'ami'
                    ? 'Consumption comes from the AMI meter at half-hourly resolution and is labelled as metered.'
                    : 'Consumption comes from a CT clamp on the incoming supply. Billing is still estimated from a manual read, so the record separates the two.'}
                </p>
                <p className="tiny muted">
                  Room sensors sample at one minute; the page aggregates to thirty to match the meter. Percentages are
                  of todays 48 intervals, not of the year.
                </p>
              </div>
            </article>
          </div>
        </Sec>
      </AsyncBoundary>
    </div>
  )
}
