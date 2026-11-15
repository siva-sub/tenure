import { Link, useOutletContext } from 'react-router-dom'
import type { ShellContext } from '@/app/shellContext'
import { useMeasures, useTickets } from '@/app/queries'
import { bandForScore, bandLabel, consumptionSplit } from '@/domain/energy'
import { duration, kwh, num, pct, sgd, date } from '@/domain/format'
import { leasePosition } from '@/domain/lease'
import { Reveal, Sec } from '@/components/Reveal'
import { ScoreDial, TenureClock, PeerBand } from '@/components/instruments'
import { AsyncBoundary, ErrorNote, LedgerSkeleton } from '@/components/States'
import { OWNER_LABEL, STATUS_LABEL } from '@/components/labels'

export function RecordPage() {
  const { property, openReport } = useOutletContext<ShellContext>()
  const measures = useMeasures(property.id)
  const tickets = useTickets(property.id)

  const position = leasePosition(property.lease)
  const band = bandForScore(property.score)
  const split = consumptionSplit(property.annualKwh, property.benchmarks.coolingShare)
  const openTickets = (tickets.data ?? []).filter((t) => t.status !== 'resolved')
  const installed = (measures.data ?? []).filter((m) => m.status === 'installed')
  const savingTotal = installed.reduce((sum, m) => sum + (m.savingKwhYear ?? 0), 0)

  const activity = (tickets.data ?? [])
    .flatMap((t) => t.events.map((e) => ({ ...e, ticket: t })))
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 5)

  return (
    <div className="page">
      {/* ---------------------------------------------------------- */}
      {/* Title block — the record's front sheet                      */}
      {/* ---------------------------------------------------------- */}
      <header className="titleblock">
        <div className="titleblock__main">
          <span className="eyebrow rise" style={{ '--i': 0 } as React.CSSProperties}>
            <span className="eyebrow__num">01</span> the record · {property.postalDistrict}
          </span>
          <h1 className="titleblock__title rise" style={{ '--i': 1 } as React.CSSProperties}>
            {property.label}{' '}
            <span className="titleblock__unit">{property.unit}</span>
          </h1>
          <p className="page__lede rise" style={{ '--i': 2 } as React.CSSProperties}>
            The living record of a {property.builtYear} {property.flatType.toLowerCase()}{' '}
            {property.kind === 'hdb' ? 'HDB flat' : 'apartment'}: what it costs to run, what has been changed, who is
            responsible for what — and what the sensors are saying right now.
          </p>
          <div className="page__meta rise" style={{ '--i': 3 } as React.CSSProperties}>
            <span>{property.planningArea} · {property.postalDistrict}</span>
            <span>{num(property.floorAreaSqm)} m²</span>
            <span>{property.householdSize} residents</span>
            <span>{property.bedrooms} bedrooms</span>
            <span>Built {property.builtYear}</span>
            <span className="mono">TT-{property.postalCode}-{property.unit.replace('#', '')}</span>
          </div>
        </div>

        <aside className="stamp" aria-label={`Energy band ${band}, ${bandLabel(band)}`}>
          <span className="stamp__label">energy band</span>
          <span className="stamp__band">{band}</span>
          <span className="stamp__meta">
            {property.score}/100
            <br />
            {bandLabel(band)}
          </span>
        </aside>
      </header>

      {/* ---------------------------------------------------------- */}
      <div className="grid grid--margin">
        <div className="stack">
          {/* Lease */}
          <Reveal>
            <section className="card" aria-labelledby="lease-title">
              <div className="card__head">
                <h2 className="card__title" id="lease-title">
                  Lease position
                </h2>
                <span className="card__note">
                  {position.termYears}-year term · expires {position.expiryYear}
                </span>
              </div>
              <div className="card__body">
                <div className="lease-head">
                  <div>
                    <span className="stat__label">Remaining lease</span>
                    <span className="lease-head__value">{duration(position.remainingYears)}</span>
                  </div>
                  <div>
                    <span className="stat__label">Elapsed</span>
                    <span className="lease-head__value lease-head__value--muted">
                      {duration(position.elapsedYears)}
                    </span>
                  </div>
                  <div>
                    <span className="stat__label">Term</span>
                    <span className="lease-head__value lease-head__value--muted">{position.termYears} yr</span>
                  </div>
                </div>

                <AsyncBoundary
                  isPending={measures.isPending}
                  error={measures.error}
                  onRetry={() => void measures.refetch()}
                  skeleton={<LedgerSkeleton rows={4} />}
                >
                  <TenureClock property={property} measures={measures.data ?? []} />
                </AsyncBoundary>

                <p className="note" style={{ marginTop: 'var(--s-4)' }}>
                  Every payback below is measured against the <strong>{duration(position.remainingYears)}</strong> that
                  actually remain, not against an engineering lifetime. A measure whose payback lands after{' '}
                  {position.expiryYear} is a cost the next owner inherits, not a saving this one keeps.
                </p>
              </div>
            </section>
          </Reveal>

          {/* Energy + consumption */}
          <div className="grid grid--2">
            <Reveal delay={60}>
              <section className="card" style={{ height: '100%' }}>
                <div className="card__head">
                  <h2 className="card__title">Energy standing</h2>
                  <Link to="/energy" className="card__note link-quiet">
                    Detail →
                  </Link>
                </div>
                <div className="card__body" style={{ display: 'grid', gap: 'var(--s-3)' }}>
                  <ScoreDial score={property.score} />
                  <div className="dial-facts">
                    <div>
                      <span className="stat__label">Intensity</span>
                      <span className="mono">{num(property.benchmarks.eui, 1)} kWh/m²·yr</span>
                    </div>
                    <div>
                      <span className="stat__label">vs peers</span>
                      <span className="mono">better than {num(property.peerPercentile)}%</span>
                    </div>
                  </div>
                  <PeerBand
                    value={property.annualKwh}
                    low={property.benchmarks.peerLowKwh}
                    median={property.benchmarks.peerMedianKwh}
                    high={property.benchmarks.peerHighKwh}
                  />
                </div>
              </section>
            </Reveal>

            <Reveal delay={120}>
              <section className="card" style={{ height: '100%' }}>
                <div className="card__head">
                  <h2 className="card__title">Where the kWh go</h2>
                  <span className="card__note">{kwh(property.annualKwh)} / yr</span>
                </div>
                <div className="card__body" style={{ display: 'grid', gap: 'var(--s-3)' }}>
                  {split.map((row, i) => (
                    <div key={row.key} className="split">
                      <div className="split__head">
                        <span className="split__label">{row.label}</span>
                        <span className="mono split__value">
                          {kwh(row.kwh)} · {pct(row.share)}
                        </span>
                      </div>
                      <div className="split__track">
                        <div
                          className={`split__fill split__fill--${i}`}
                          style={{ width: `${row.share * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  <p className="tiny muted" style={{ marginTop: 'var(--s-2)' }}>
                    Space cooling dominates a Singapore household and is the only load that responds directly to the
                    building fabric. The split is derived from metered totals and the modelled cooling share, not
                    sub-metered per appliance.
                  </p>
                </div>
              </section>
            </Reveal>
          </div>

          {/* Open cases */}
          <Reveal delay={80}>
            <section className="card" aria-labelledby="cases-title">
              <div className="card__head">
                <h2 className="card__title" id="cases-title">
                  Open responsibilities
                </h2>
                <Link to="/maintenance" className="card__note link-quiet">
                  All cases →
                </Link>
              </div>
              {tickets.isPending ? (
                <div className="card__body">
                  <LedgerSkeleton rows={3} />
                </div>
              ) : tickets.error ? (
                <div className="card__body">
                  <ErrorNote message="Cases could not be loaded." onRetry={() => void tickets.refetch()} />
                </div>
              ) : openTickets.length === 0 ? (
                <div className="card__body">
                  <div className="empty">
                    <span className="empty__title">Nothing outstanding</span>
                    <p className="empty__body">
                      Every reported issue at this address is closed. The next inspection window is tracked on the
                      maintenance page.
                    </p>
                  </div>
                </div>
              ) : (
                <ul className="caselist">
                  {openTickets.slice(0, 4).map((ticket) => (
                    <li key={ticket.id} className="caselist__item">
                      <div className="caselist__main">
                        <span className="caselist__title">{ticket.title}</span>
                        <span className="caselist__meta">
                          {OWNER_LABEL[ticket.owner]} · opened {date(ticket.openedOn)}
                          {ticket.caseRef ? ` · ${ticket.caseRef}` : ''}
                        </span>
                      </div>
                      <span className={`badge ${ticket.severity === 'safety' ? 'badge--bad' : ticket.severity === 'urgent' ? 'badge--warn' : 'badge--mute'}`}>
                        {STATUS_LABEL[ticket.status]}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="card__foot">
                {savingTotal > 0
                  ? `${kwh(savingTotal)}/yr of verified saving across ${installed.length} installed measures.`
                  : 'No verified saving on record yet.'}
              </div>
            </section>
          </Reveal>
        </div>

        {/* -------------------------------------------------------- */}
        {/* Margin column — the annotation layer                      */}
        {/* -------------------------------------------------------- */}
        <aside className="stack stack--tight">
          <Reveal delay={40}>
            <section className="card">
              <div className="card__head">
                <h2 className="card__title">Identity</h2>
              </div>
              <div className="card__body">
                <dl className="kv">
                  <dt className="kv__k">Address</dt>
                  <dd className="kv__v">
                    {property.addressLine1}
                    <br />
                    Singapore {property.postalCode}
                  </dd>

                  <dt className="kv__k">Type</dt>
                  <dd className="kv__v">
                    {property.kind === 'hdb' ? 'HDB ' : ''}
                    {property.flatType} · {num(property.floorAreaSqm)} m²
                  </dd>

                  <dt className="kv__k">Lease</dt>
                  <dd className="kv__v">
                    From {date(property.lease.startsOn)}
                    <br />
                    {position.termYears} years, expiring {position.expiryYear}
                  </dd>

                  <dt className="kv__k">Managed by</dt>
                  <dd className="kv__v">
                    {property.management.name}
                    <br />
                    <span className="muted small">
                      {property.management.chargeLabel} · {sgd(property.management.monthlyChargeSgd, { cents: true })}/mth
                    </span>
                  </dd>

                  {property.management.shareValue ? (
                    <>
                      <dt className="kv__k">Share value</dt>
                      <dd className="kv__v">{property.management.shareValue} / 1,000</dd>
                    </>
                  ) : null}

                  <dt className="kv__k">Meter</dt>
                  <dd className="kv__v">
                    {property.meter.kind === 'ami'
                      ? 'AMI — half-hourly'
                      : property.meter.kind === 'ct-clamp'
                        ? 'CT clamp — 3 circuits'
                        : 'Manual reads'}
                    <br />
                    <span className="muted tiny nowrap">Account {property.meter.accountNumber}</span>
                  </dd>

                  <dt className="kv__k">Supply</dt>
                  <dd className="kv__v">{property.meter.retailer}</dd>
                </dl>
              </div>
            </section>
          </Reveal>

          <Reveal delay={100}>
            <section className="card card--warn">
              <div className="card__head">
                <h2 className="card__title">What this record cannot tell you</h2>
              </div>
              <div className="card__body" style={{ display: 'grid', gap: 'var(--s-2)' }}>
                {property.caveats.map((caveat) => (
                  <p key={caveat} className="small">
                    {caveat}
                  </p>
                ))}
              </div>
            </section>
          </Reveal>

          <Reveal delay={140}>
            <section className="card">
              <div className="card__head">
                <h2 className="card__title">Recent activity</h2>
              </div>
              <div className="card__body">
                {activity.length === 0 ? (
                  <p className="small muted">No activity recorded.</p>
                ) : (
                  <ol className="timeline">
                    {activity.map((event, i) => (
                      <li
                        key={`${event.ticket.id}-${event.at}`}
                        className={`timeline__item ${i === 0 ? 'timeline__item--latest' : ''}`}
                      >
                        <span className="timeline__when">{date(event.at)}</span>
                        <div className="timeline__body">
                          <span className="timeline__label">{event.label}</span>
                          <span className="timeline__detail">{event.ticket.title}</span>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
              <div className="card__foot">
                <button type="button" className="btn btn--quiet btn--sm" onClick={() => openReport({})}>
                  Report something that is not here →
                </button>
              </div>
            </section>
          </Reveal>
        </aside>
      </div>

      <Sec num="—" title="Keep reading" aside="three instruments, one record">
        <div className="grid grid--3">
          <Link to="/energy" className="jump">
            <span className="jump__num">02</span>
            <span className="jump__title">Energy</span>
            <span className="jump__body">
              The score, how it was constructed, the tariff vintage, and when the electricity contract renews.
            </span>
          </Link>
          <Link to="/retrofit" className="jump">
            <span className="jump__num">03</span>
            <span className="jump__title">Retrofit</span>
            <span className="jump__body">
              Installed measures, verified savings, Climate Vouchers, and what the lease does to each payback.
            </span>
          </Link>
          <Link to="/telemetry" className="jump">
            <span className="jump__num">05</span>
            <span className="jump__title">Telemetry</span>
            <span className="jump__body">
              Half-hourly load, room temperature and humidity, and the mould risk the household shelter is hiding.
            </span>
          </Link>
        </div>
      </Sec>
    </div>
  )
}
