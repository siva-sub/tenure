import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import type { ShellContext } from '@/app/shellContext'
import { useMeasures, useSubsidies } from '@/app/queries'
import type { MeasureStatus, RetrofitMeasure } from '@/domain/types'
import { analysePayback, leasePosition } from '@/domain/lease'
import { co2Kg } from '@/domain/energy'
import { date, duration, kwh, num, sgd } from '@/domain/format'
import { Reveal, Sec } from '@/components/Reveal'
import { TenureClock } from '@/components/instruments'
import { AsyncBoundary, LedgerSkeleton } from '@/components/States'

const CATEGORY_LABEL: Record<RetrofitMeasure['category'], string> = {
  cooling: 'Cooling',
  envelope: 'Envelope',
  'hot-water': 'Hot water',
  lighting: 'Lighting',
  appliance: 'Appliance',
  renewables: 'Renewables',
  water: 'Water',
}

const STATUS_TONE: Record<MeasureStatus, string> = {
  installed: 'badge--ok',
  planned: 'badge--info',
  blocked: 'badge--mute',
  declined: 'badge--mute',
}

type Filter = 'all' | MeasureStatus

export function RetrofitPage() {
  const { property } = useOutletContext<ShellContext>()
  const measuresQuery = useMeasures(property.id)
  const subsidiesQuery = useSubsidies(property.id)
  const [filter, setFilter] = useState<Filter>('all')

  const position = leasePosition(property.lease)
  const measures = measuresQuery.data ?? []

  const analysed = useMemo(
    () =>
      measures.map((measure) => ({
        measure,
        analysis: analysePayback({
          costSgd: measure.costSgd,
          subsidySgd: measure.subsidySgd,
          savingKwhYear: measure.savingKwhYear,
          tariffCentsPerKwh: property.meter.tariffCentsPerKwh,
          remainingYears: position.remainingYears,
        }),
      })),
    [measures, property.meter.tariffCentsPerKwh, position.remainingYears],
  )

  const filtered = analysed.filter(({ measure }) => filter === 'all' || measure.status === filter)

  const totals = useMemo(() => {
    const installed = analysed.filter(({ measure }) => measure.status === 'installed')
    const spend = installed.reduce((s, { measure }) => s + measure.costSgd, 0)
    const subsidy = installed.reduce((s, { measure }) => s + (measure.subsidySgd ?? 0), 0)
    const saving = installed.reduce((s, { measure }) => s + (measure.savingKwhYear ?? 0), 0)
    const savingSgd = installed.reduce((s, { analysis }) => s + analysis.annualSavingSgd, 0)
    const atRisk = analysed.filter(
      ({ analysis, measure }) => measure.status === 'planned' && analysis.verdict === 'beyond-lease',
    ).length
    return { spend, subsidy, saving, savingSgd, atRisk, count: installed.length }
  }, [analysed])

  return (
    <div className="page">
      <header className="page__head">
        <span className="eyebrow rise" style={{ '--i': 0 } as React.CSSProperties}>
          <span className="eyebrow__num">03</span> retrofit register
        </span>
        <h1 className="page__title rise" style={{ '--i': 1 } as React.CSSProperties}>
          What was changed, and whether it can pay for itself in time
        </h1>
        <p className="page__lede rise" style={{ '--i': 2 } as React.CSSProperties}>
          {duration(position.remainingYears)} of lease remain. Every payback here is tested against that number, and
          every measured saving names the meter it came off.
        </p>
        <div className="page__meta rise" style={{ '--i': 3 } as React.CSSProperties}>
          <span>{totals.count} installed</span>
          <span>{measures.filter((m) => m.status === 'planned').length} planned</span>
          <span>{measures.filter((m) => m.status === 'blocked' || m.status === 'declined').length} ruled out</span>
          <span>Tariff vintage {property.meter.tariffLabel}</span>
        </div>
      </header>

      <div className="grid grid--4">
        <div className="statcard">
          <span className="stat__label">Installed spend</span>
          <span className="stat__value">{sgd(totals.spend)}</span>
          <span className="stat__note">Net of {sgd(totals.subsidy)} claimed in subsidy.</span>
        </div>
        <div className="statcard">
          <span className="stat__label">Verified saving</span>
          <span className="stat__value">
            {num(totals.saving)}
            <span className="stat__unit">kWh/yr</span>
          </span>
          <span className="stat__note">
            {sgd(totals.savingSgd)}/yr at {property.meter.tariffCentsPerKwh.toFixed(2)}¢ ·{' '}
            {num(co2Kg(totals.saving) / 1000, 2)} tonnes CO₂e.
          </span>
        </div>
        <div className="statcard">
          <span className="stat__label">Share of consumption</span>
          <span className="stat__value">
            {num((totals.saving / property.annualKwh) * 100, 1)}
            <span className="stat__unit">%</span>
          </span>
          <span className="stat__note">Reduction against the {kwh(property.annualKwh)} trailing baseline.</span>
        </div>
        <div className="statcard">
          <span className="stat__label">Beyond the lease</span>
          <span className="stat__value">{totals.atRisk}</span>
          <span className="stat__note">
            Planned measures whose payback lands after {position.expiryYear}. Shown before, not after, the money is
            spent.
          </span>
        </div>
      </div>

      <Sec num="03.1" title="The lease test" aside={`${position.termYears}-year term · expires ${position.expiryYear}`}>
        <section className="card">
          <div className="card__body">
            <AsyncBoundary
              isPending={measuresQuery.isPending}
              error={measuresQuery.error}
              onRetry={() => void measuresQuery.refetch()}
              skeleton={<LedgerSkeleton rows={5} />}
            >
              <TenureClock property={property} measures={measures} />
            </AsyncBoundary>
          </div>
          <div className="card__foot">
            Bars are drawn from today. A bar that crosses the lease expiry line is a saving this household will never
            collect — the flat changes hands first.
          </div>
        </section>
      </Sec>

      <Sec num="03.2" title="Programmes and vouchers" aside={`${subsidiesQuery.data?.length ?? 0} tracked`}>
        <AsyncBoundary
          isPending={subsidiesQuery.isPending}
          error={subsidiesQuery.error}
          onRetry={() => void subsidiesQuery.refetch()}
          skeleton={<LedgerSkeleton rows={3} />}
        >
          <div className="grid grid--3">
            {(subsidiesQuery.data ?? []).map((subsidy) => (
              <Reveal key={subsidy.id}>
                <article className="card" style={{ height: '100%' }}>
                  <div className="card__head">
                    <h3 className="card__title">{subsidy.name}</h3>
                    <span
                      className={`badge ${
                        subsidy.status === 'claimed'
                          ? 'badge--ok'
                          : subsidy.status === 'available'
                            ? 'badge--warn'
                            : 'badge--mute'
                      }`}
                    >
                      {subsidy.status === 'claimed'
                        ? 'Claimed'
                        : subsidy.status === 'available'
                          ? 'Eligible'
                          : subsidy.status === 'expired'
                            ? 'Expired'
                            : 'Not eligible'}
                    </span>
                  </div>
                  <div className="card__body" style={{ display: 'grid', gap: 'var(--s-3)' }}>
                    <div>
                      <span className="stat__label">Value</span>
                      <p className="small">{subsidy.valueLabel}</p>
                    </div>
                    <div>
                      <span className="stat__label">Covers</span>
                      <ul className="ticks">
                        {subsidy.covers.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <span className="stat__label">Eligibility</span>
                      <p className="tiny muted">{subsidy.eligibility}</p>
                    </div>
                    <p className="note">{subsidy.note}</p>
                  </div>
                  <div className="card__foot">
                    {subsidy.administrator}
                    {subsidy.deadline ? ` · closes ${date(subsidy.deadline)}` : ''}
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </AsyncBoundary>
      </Sec>

      <Sec
        num="03.3"
        title="Measure register"
        aside={
          <div className="tabs" role="tablist" aria-label="Filter measures" style={{ border: 0 }}>
            {(['all', 'installed', 'planned', 'blocked'] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                role="tab"
                className="tab"
                aria-selected={filter === f}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'All' : f === 'blocked' ? 'Ruled out' : f}
              </button>
            ))}
          </div>
        }
      >
        <section className="card card--flush">
          <AsyncBoundary
            isPending={measuresQuery.isPending}
            error={measuresQuery.error}
            onRetry={() => void measuresQuery.refetch()}
            skeleton={<div className="card__body"><LedgerSkeleton rows={8} /></div>}
          >
            <table className="ledger">
              <caption>
                {filtered.length} measures shown · savings are annual and verified against the meter named in each row
              </caption>
              <thead>
                <tr>
                  <th scope="col">Measure</th>
                  <th scope="col">Status</th>
                  <th scope="col">Installed</th>
                  <th scope="col" style={{ textAlign: 'right' }}>
                    Net cost
                  </th>
                  <th scope="col" style={{ textAlign: 'right' }}>
                    Saving
                  </th>
                  <th scope="col" style={{ textAlign: 'right' }}>
                    Payback
                  </th>
                  <th scope="col">Lease test</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(({ measure, analysis }) => {
                  const flagged = analysis.verdict === 'beyond-lease'
                  return (
                    <tr key={measure.id} className={flagged ? 'ledger__row--flagged' : undefined}>
                      <td data-label="Measure">
                        <span className="name">{measure.name}</span>
                        <span className="sub">
                          {CATEGORY_LABEL[measure.category]}
                          {measure.evidence ? ` · ${measure.evidence} evidence` : ''}
                        </span>
                        <details className="rowdetail">
                          <summary>Why this is in the record</summary>
                          <p>{measure.notes}</p>
                          {measure.source ? <p className="tiny muted">Source: {measure.source}</p> : null}
                        </details>
                      </td>
                      <td data-label="Status">
                        <span className={`badge ${STATUS_TONE[measure.status]}`}>{measure.status}</span>
                      </td>
                      <td data-label="Installed" className="num">
                        {measure.installedOn ? date(measure.installedOn) : '—'}
                      </td>
                      <td data-label="Net cost" className="num">
                        {measure.costSgd === 0 ? '—' : sgd(analysis.netCostSgd)}
                        {measure.subsidySgd ? (
                          <span className="sub">less {sgd(measure.subsidySgd)} subsidy</span>
                        ) : null}
                      </td>
                      <td data-label="Saving" className="num">
                        {measure.savingKwhYear ? kwh(measure.savingKwhYear) : '—'}
                        {measure.savingM3Year ? (
                          <span className="sub">{num(measure.savingM3Year)} m³ water</span>
                        ) : null}
                      </td>
                      <td data-label="Payback" className="num">
                        {Number.isFinite(analysis.paybackYears) && analysis.paybackYears < 99
                          ? `${num(analysis.paybackYears, 1)} yr`
                          : '—'}
                      </td>
                      <td data-label="Lease test">
                        {measure.status === 'blocked' || measure.status === 'declined' ? (
                          <span className="badge badge--mute">not applicable</span>
                        ) : (
                          <span
                            className={`badge ${
                              analysis.verdict === 'inside-lease'
                                ? 'badge--ok'
                                : analysis.verdict === 'tight'
                                  ? 'badge--warn'
                                  : analysis.verdict === 'beyond-lease'
                                    ? 'badge--bad'
                                    : 'badge--mute'
                            }`}
                          >
                            {analysis.verdict === 'inside-lease'
                              ? 'inside'
                              : analysis.verdict === 'tight'
                                ? 'tight'
                                : analysis.verdict === 'beyond-lease'
                                  ? 'beyond lease'
                                  : 'no saving'}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </AsyncBoundary>
          <div className="card__foot">
            Ruled-out measures are kept deliberately: the record should stop the same idea being re-raised every year.
          </div>
        </section>
      </Sec>
    </div>
  )
}
