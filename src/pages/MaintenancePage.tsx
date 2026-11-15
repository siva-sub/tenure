import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import type { ShellContext } from '@/app/shellContext'
import { useTickets } from '@/app/queries'
import { RESPONSIBILITY_RULES, SEVERITY_SLA, slaBreached } from '@/domain/responsibility'
import { leasePosition } from '@/domain/lease'
import { date, duration, num } from '@/domain/format'
import { Reveal, Sec } from '@/components/Reveal'
import { AsyncBoundary, LedgerSkeleton } from '@/components/States'
import { OWNER_LABEL, OWNER_NOTE, SEVERITY_LABEL, STATUS_LABEL } from '@/components/labels'

export function MaintenancePage() {
  const { property, openReport } = useOutletContext<ShellContext>()
  const ticketsQuery = useTickets(property.id)
  const tickets = ticketsQuery.data ?? []
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selected =
    tickets.find((t) => t.id === selectedId) ??
    tickets.find((t) => t.status !== 'resolved') ??
    tickets[0] ??
    null

  const openCount = tickets.filter((t) => t.status !== 'resolved').length
  const breached = tickets.filter((t) => slaBreached(t)).length

  const owners = Array.from(new Set(RESPONSIBILITY_RULES.map((r) => r.ownerByKind[property.kind])))

  return (
    <div className="page">
      <header className="page__head">
        <span className="eyebrow rise" style={{ '--i': 0 } as React.CSSProperties}>
          <span className="eyebrow__num">04</span> maintenance
        </span>
        <h1 className="page__title rise" style={{ '--i': 1 } as React.CSSProperties}>
          Who is actually responsible for this
        </h1>
        <p className="page__lede rise" style={{ '--i': 2 } as React.CSSProperties}>
          {property.kind === 'hdb'
            ? 'In an HDB estate the flat owner, the Town Council and HDB each own a different slice of the building. Misrouting a case is the most common way a repair takes three weeks instead of three days.'
            : 'In a strata development the boundary between what the lot owner maintains and what the MCST maintains is set by the share value and the by-laws, not by convenience.'}
        </p>
        <div className="page__meta rise" style={{ '--i': 3 } as React.CSSProperties}>
          <span>{openCount} open</span>
          <span>{breached} past the response window</span>
          <span>{property.management.name}</span>
          <span>{property.management.hours}</span>
        </div>
      </header>

      {/* Responsibility matrix */}
      <Sec num="04.1" title="Responsibility split" aside={`${owners.length} parties for this property type`}>
        <div className="grid grid--split">
          {owners.map((owner, i) => {
            const rules = RESPONSIBILITY_RULES.filter((r) => r.ownerByKind[property.kind] === owner)
            const count = tickets.filter((t) => t.owner === owner && t.status !== 'resolved').length
            return (
              <Reveal key={owner} delay={i * 60}>
                <article className="card" style={{ height: '100%' }}>
                  <div className="card__head">
                    <h3 className="card__title">{OWNER_LABEL[owner]}</h3>
                    <span className={`badge ${count > 0 ? 'badge--warn' : 'badge--mute'}`}>{count} open</span>
                  </div>
                  <div className="card__body" style={{ display: 'grid', gap: 'var(--s-3)' }}>
                    <p className="tiny muted">{OWNER_NOTE[owner]}</p>
                    <ul className="ticks">
                      {rules.map((rule) => (
                        <li key={rule.id}>{rule.label}</li>
                      ))}
                    </ul>
                    {rules[0] ? <p className="note">{rules[0].because[property.kind]}</p> : null}
                  </div>
                </article>
              </Reveal>
            )
          })}
        </div>
      </Sec>

      {/* Cases */}
      <Sec
        num="04.2"
        title="Cases"
        aside={
          <button type="button" className="btn btn--primary btn--sm" onClick={() => openReport({})}>
            Report an issue
          </button>
        }
      >
        <AsyncBoundary
          isPending={ticketsQuery.isPending}
          error={ticketsQuery.error}
          onRetry={() => void ticketsQuery.refetch()}
          skeleton={<LedgerSkeleton rows={7} />}
        >
          <div className="board">
            <ul className="board__list" role="list">
              {tickets.map((ticket) => {
                const active = selected?.id === ticket.id
                const late = slaBreached(ticket)
                return (
                  <li key={ticket.id}>
                    <button
                      type="button"
                      className={`case ${active ? 'is-active' : ''}`}
                      onClick={() => setSelectedId(ticket.id)}
                      aria-current={active ? 'true' : undefined}
                    >
                      <span className="case__top">
                        <span className={`badge ${ticket.severity === 'safety' ? 'badge--bad' : ticket.severity === 'urgent' ? 'badge--warn' : 'badge--mute'}`}>
                          {SEVERITY_LABEL[ticket.severity]}
                        </span>
                        <span className="case__date mono">{date(ticket.openedOn)}</span>
                      </span>
                      <span className="case__title">{ticket.title}</span>
                      <span className="case__meta">
                        {OWNER_LABEL[ticket.owner]} · {STATUS_LABEL[ticket.status]}
                        {late ? ' · past window' : ''}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>

            {selected ? (
              <article className="case-detail" aria-live="polite">
                <header className="case-detail__head">
                  <div>
                    <span className="eyebrow">
                      <span className="eyebrow__num">{selected.caseRef ?? 'NO REF'}</span> {OWNER_LABEL[selected.owner]}
                    </span>
                    <h3 className="case-detail__title">{selected.title}</h3>
                  </div>
                  <span className={`badge ${slaBreached(selected) ? 'badge--bad' : selected.status === 'resolved' ? 'badge--ok' : 'badge--info'}`}>
                    {slaBreached(selected) ? 'Past response window' : STATUS_LABEL[selected.status]}
                  </span>
                </header>

                <p className="case-detail__body">{selected.body}</p>

                <dl className="kv">
                  <dt className="kv__k">Response window</dt>
                  <dd className="kv__v">
                    {SEVERITY_SLA[selected.severity].label} · due {date(selected.dueOn)}
                  </dd>
                  <dt className="kv__k">Opened</dt>
                  <dd className="kv__v">{date(selected.openedOn)}</dd>
                  <dt className="kv__k">Age</dt>
                  <dd className="kv__v">
                    {num(
                      (Date.now() - new Date(selected.openedOn).getTime()) / 86_400_000,
                      0,
                    )}{' '}
                    days
                  </dd>
                  {selected.roomId ? (
                    <>
                      <dt className="kv__k">Room</dt>
                      <dd className="kv__v">
                        {property.rooms.find((r) => r.id === selected.roomId)?.name ?? selected.roomId}
                      </dd>
                    </>
                  ) : null}
                </dl>

                <div className="note note--warn">
                  <strong>Why this is routed to {OWNER_LABEL[selected.owner]}.</strong>
                  <br />
                  {selected.routedBecause}
                </div>

                <div>
                  <span className="stat__label">Timeline</span>
                  <ol className="timeline" style={{ marginTop: 'var(--s-3)' }}>
                    {selected.events.map((event, i) => (
                      <li
                        key={`${event.at}-${i}`}
                        className={`timeline__item ${i === selected.events.length - 1 ? 'timeline__item--latest' : ''}`}
                      >
                        <span className="timeline__when">{date(event.at)}</span>
                        <div className="timeline__body">
                          <span className="timeline__label">{event.label}</span>
                          {event.detail ? <span className="timeline__detail">{event.detail}</span> : null}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </article>
            ) : (
              <div className="empty">
                <span className="empty__title">No cases yet</span>
                <p className="empty__body">Report an issue and it will appear here with its routing decision.</p>
              </div>
            )}
          </div>
        </AsyncBoundary>
      </Sec>

      <div className="note" style={{ marginTop: 'var(--s-6)' }}>
        <strong>Response windows are contractual, not statutory.</strong> The 4-hour, 24-hour and 5-working-day windows
        shown here follow a typical conservancy contract. The record treats them as the benchmark for “is this late?”
        because a case with no clock is a case nobody escalates.
      </div>

      <p className="tiny muted" style={{ marginTop: 'var(--s-4)' }}>
        Lease reference for this record: term from {date(property.lease.startsOn)} ·{' '}
        {duration(leasePosition(property.lease).remainingYears)} remaining. Maintenance obligations do not end with the
        lease, but the money to fund them usually does.
      </p>
    </div>
  )
}
