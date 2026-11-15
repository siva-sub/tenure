import { useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import type { ShellContext } from '@/app/shellContext'
import { useSubsidies } from '@/app/queries'
import { Reveal, Sec } from '@/components/Reveal'
import { AsyncBoundary, LedgerSkeleton } from '@/components/States'

/**
 * The public page that explains which Singapore schemes and rails this record
 * is actually wired into. Every claim carries a source, because the whole point
 * of the product is that a property record should be checkable.
 */

interface Rail {
  id: string
  name: string
  operator: string
  what: string
  inTheRecord: string
  source: string
}

const RAILS: Rail[] = [
  {
    id: 'ami',
    name: 'Half-hourly metering (AMI)',
    operator: 'SP Group · Open Electricity Market',
    what: 'Advanced meters record consumption at half-hourly intervals. Homes without one are read once every two months, with estimates in between.',
    inTheRecord: 'Every consumption view carries a provenance badge, so a metered number is never confused with an estimated one.',
    source: 'https://www.openelectricitymarket.sg/residential/metering-options',
  },
  {
    id: 'tariff',
    name: 'Regulated tariff, revised quarterly',
    operator: 'SP Group',
    what: 'The regulated tariff moves four times a year. Q4 2026 is 31.16¢/kWh including GST.',
    inTheRecord: 'Every payback figure states the tariff vintage it was computed at, and the contract renewal date is surfaced before it auto-renews.',
    source: 'https://www.spgroup.com.sg/our-services/utilities/tariff-information',
  },
  {
    id: 'oneservice',
    name: 'Municipal case routing',
    operator: 'Municipal Services Office · OneService',
    what: 'OneService routes a report to the right agency or Town Council, with up to three photos and a published set of case states.',
    inTheRecord: 'Cases use the same state vocabulary residents already know — Acknowledged, Working on it, Resolved, Reply from Agency, Reply from Town Council — and the three-photo limit is enforced.',
    source: 'https://www.oneservice.gov.sg/osapp-faq/',
  },
  {
    id: 'hdb-leaks',
    name: 'Inter-floor seepage',
    operator: 'Housing & Development Board',
    what: 'A flat owner is responsible for upkeep inside the flat; leaks from common property go to the Town Council; neighbours may have to engage a contractor together.',
    inTheRecord: 'Seepage cases carry the joint-inspection trail, the moisture reading and the HDB reference, because that trail is the evidence if the case is escalated.',
    source: 'https://www.hdb.gov.sg/managing-my-home/renovation-and-maintenance/home-maintenance/home-care-guide/ceiling-leaks',
  },
  {
    id: 'mcst',
    name: 'Strata funds and share value',
    operator: 'MCST · Building Maintenance and Strata Management Act',
    what: 'Common property is apportioned by share value, and funded through the management fund and the sinking fund, under resolutions passed at general meetings.',
    inTheRecord: 'Condo records show the share value, the monthly contribution and the warranty expiry of every installed measure, so a shared repair is not paid for twice.',
    source: 'https://qornerstone.com/',
  },
  {
    id: 'greenmark',
    name: 'Building-level green rating',
    operator: 'Building and Construction Authority',
    what: 'Green Mark rates buildings — new and existing — not individual dwellings. Singapore has no per-home Energy Performance Certificate.',
    inTheRecord: 'That absence is why the energy band here is constructed from metered data and shown with its weights, rather than presented as a certificate.',
    source: 'https://www1.bca.gov.sg/sustainability/greenmark/',
  },
]

export function ProgrammesPage() {
  const { property } = useOutletContext<ShellContext>()
  const subsidies = useSubsidies(property.id)
  const isCondo = property.kind === 'condo'

  const rails = useMemo(() => (isCondo ? RAILS : RAILS.filter((r) => r.id !== 'mcst')), [isCondo])

  return (
    <div className="page">
      <header className="page__head">
        <span className="eyebrow rise" style={{ '--i': 0 } as React.CSSProperties}>
          <span className="eyebrow__num">06</span> programmes
        </span>
        <h1 className="page__title rise" style={{ '--i': 1 } as React.CSSProperties}>
          Built on Singapore&rsquo;s actual rails
        </h1>
        <p className="page__lede rise" style={{ '--i': 2 } as React.CSSProperties}>
          A home record is only useful if it reflects the schemes, tariffs and reporting channels that really exist
          here. These are the ones this record is wired into, and what it does with each.
        </p>
        <div className="page__meta rise" style={{ '--i': 3 } as React.CSSProperties}>
          <span>{subsidies.data?.length ?? 0} schemes tracked for this address</span>
          <span>{rails.length} national rails</span>
          <span>Sources linked, not paraphrased</span>
        </div>
      </header>

      <Sec num="06.1" title="Schemes this address can use" aside={property.management.name}>
        <AsyncBoundary
          isPending={subsidies.isPending}
          error={subsidies.error}
          onRetry={() => void subsidies.refetch()}
          skeleton={<LedgerSkeleton rows={3} />}
        >
          <div className="grid grid--split">
            {(subsidies.data ?? []).map((scheme) => (
              <Reveal key={scheme.id}>
                <article className="card" style={{ height: '100%' }}>
                  <div className="card__head">
                    <h3 className="card__title">{scheme.name}</h3>
                    <span
                      className={`badge ${
                        scheme.status === 'claimed'
                          ? 'badge--ok'
                          : scheme.status === 'available'
                            ? 'badge--warn'
                            : 'badge--mute'
                      }`}
                    >
                      {scheme.status === 'claimed'
                        ? 'Claimed'
                        : scheme.status === 'available'
                          ? 'Eligible'
                          : scheme.status === 'expired'
                            ? 'Expired'
                            : 'Not eligible'}
                    </span>
                  </div>
                  <div className="card__body" style={{ display: 'grid', gap: 'var(--s-3)' }}>
                    <div>
                      <span className="stat__label">Value</span>
                      <p className="small">{scheme.valueLabel}</p>
                    </div>
                    <div>
                      <span className="stat__label">Who it is for</span>
                      <p className="tiny muted">{scheme.eligibility}</p>
                    </div>
                    <p className="note">{scheme.note}</p>
                  </div>
                  <div className="card__foot">
                    {scheme.administrator}
                    {scheme.deadline ? ` · closes ${scheme.deadline}` : ''}
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </AsyncBoundary>
      </Sec>

      <Sec num="06.2" title="National rails" aside="each linked to its official source">
        <div className="parity">
          {rails.map((rail) => (
            <article key={rail.id} className="parity__row">
              <div className="parity__head">
                <span className="badge badge--ok">supported</span>
                <span className="parity__competitor">{rail.operator}</span>
              </div>
              <p className="parity__capability">{rail.name}</p>
              <p className="parity__why">{rail.what}</p>
              <div className="parity__foot">
                <span className="mono">→ {rail.inTheRecord}</span>
                <a href={rail.source} target="_blank" rel="noreferrer noopener" className="link-quiet tiny">
                  source
                </a>
              </div>
            </article>
          ))}
        </div>
      </Sec>

      <div className="note" style={{ marginTop: 'var(--s-6)' }}>
        <strong>Nothing here is a certificate.</strong> Singapore does not issue an energy performance certificate for a
        home, so the band on this record is derived from metered consumption and stated assumptions — visible on the
        energy page, with the weights shown.
      </div>
    </div>
  )
}
