import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { leasePosition } from '@/domain/lease'
import { bandForScore } from '@/domain/energy'
import { duration, sgd } from '@/domain/format'
import { useProperties, useMeasures, useTickets } from '@/app/queries'
import { usePreferences } from '@/app/providers'
import { CommandPalette } from '@/components/CommandPalette'
import type { ShellContext } from './shellContext'
import { ErrorState, RailSkeleton, PageSkeleton } from '@/components/States'
import { Mark } from '@/components/Mark'

const ReportSheet = lazy(async () => {
  const mod = await import('@/components/ReportSheet')
  return { default: mod.ReportSheet }
})

interface NavItem {
  to: string
  num: string
  label: string
  meta?: string
}

const NAV: NavItem[] = [
  { to: '/', num: '01', label: 'The record' },
  { to: '/energy', num: '02', label: 'Energy' },
  { to: '/retrofit', num: '03', label: 'Retrofit' },
  { to: '/maintenance', num: '04', label: 'Maintenance' },
  { to: '/telemetry', num: '05', label: 'Telemetry' },
  { to: '/programmes', num: '06', label: 'Programmes' },
]

export function Shell() {
  const { prefs, setPrefs } = usePreferences()
  const propertiesQuery = useProperties()
  const location = useLocation()
  const navigate = useNavigate()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [report, setReport] = useState<{ roomId?: string; text?: string } | null>(null)

  const properties = propertiesQuery.data ?? []
  const property = properties.find((p) => p.id === prefs.activePropertyId) ?? properties[0]

  const measuresQuery = useMeasures(property?.id ?? '')
  const ticketsQuery = useTickets(property?.id ?? '')

  const counts = useMemo(() => {
    const planned = (measuresQuery.data ?? []).filter((m) => m.status === 'planned').length
    const open = (ticketsQuery.data ?? []).filter((t) => t.status !== 'resolved').length
    return { planned, open }
  }, [measuresQuery.data, ticketsQuery.data])

  // ⌘K / Ctrl-K opens the palette from anywhere.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const isPalette = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k'
      if (isPalette) {
        event.preventDefault()
        setPaletteOpen((open) => !open)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Each navigation lands at the top of the document, like a page turn.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [location.pathname, prefs.activePropertyId])

  if (propertiesQuery.isError) {
    return (
      <ErrorState
        title="The record could not be opened"
        body={
          propertiesQuery.error instanceof Error
            ? propertiesQuery.error.message
            : 'The property service did not respond.'
        }
        onRetry={() => void propertiesQuery.refetch()}
      />
    )
  }

  if (!property) {
    return (
      <div className="shell">
        <aside className="rail">
          <RailSkeleton />
        </aside>
        <div className="main">
          <PageSkeleton />
        </div>
      </div>
    )
  }

  const band = bandForScore(property.score)
  const current = NAV.find((item) =>
    item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to),
  )

  const context: ShellContext = {
    property,
    properties,
    openReport: (preset) => setReport(preset ?? {}),
  }

  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        Skip to the record
      </a>

      <aside className="rail" aria-label="Properties and sections">
        <div className="rail__brand">
          <Mark />
          <div>
            <Link to="/" className="rail__wordmark" style={{ textDecoration: 'none' }}>
              Tenure
            </Link>
            <span className="rail__tag">Living record</span>
          </div>
        </div>

        <div className="rail__section">
          <div className="rail__label">
            <span>Properties</span>
            <span className="mono" style={{ letterSpacing: '0.02em' }}>
              {properties.length}
            </span>
          </div>
          <div className="rail__props">
            {properties.map((p) => {
              const active = p.id === property.id
              const pos = leasePosition(p.lease)
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`prop ${active ? 'is-active' : ''}`}
                  aria-current={active ? 'true' : undefined}
                  onClick={() => setPrefs({ activePropertyId: p.id })}
                >
                  <span className="prop__name">{p.label}</span>
                  <span className="prop__meta">
                    <span>
                      {p.unit} · {p.postalDistrict}
                    </span>
                    <span>{duration(pos.remainingYears)} left</span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <nav className="rail__nav" aria-label="Sections">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `navlink ${isActive ? 'is-active' : ''}`}
            >
              <span className="navlink__num">{item.num}</span>
              <span className="navlink__label">{item.label}</span>
              {item.to === '/maintenance' && counts.open > 0 ? (
                <span className="navlink__meta">{counts.open}</span>
              ) : item.to === '/retrofit' && counts.planned > 0 ? (
                <span className="navlink__meta">{counts.planned}</span>
              ) : item.to === '/energy' ? (
                <span className="navlink__meta">{band}</span>
              ) : null}
            </NavLink>
          ))}
        </nav>

        <div className="rail__foot">
          <div className="rail__status">
            <span className={`dot ${property.meter.kind === 'ami' ? 'dot--live' : ''}`} />
            <span>
              {property.meter.kind === 'ami'
                ? 'AMI · half-hourly'
                : property.meter.kind === 'ct-clamp'
                  ? 'CT clamp · live'
                  : 'Manual reads'}
            </span>
          </div>
          <div>
            {property.meter.tariffLabel}
            <br />
            <span style={{ color: 'var(--chrome-ink-2)' }}>
              {property.meter.tariffCentsPerKwh.toFixed(2)}¢/kWh
            </span>
          </div>
          <div>
            Conservancy / MCST
            <br />
            <span style={{ color: 'var(--chrome-ink-2)' }}>{sgd(property.management.monthlyChargeSgd, { cents: true })} / mth</span>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="crumbs">
            <span>{property.planningArea}</span>
            <span className="crumbs__sep">/</span>
            <span>{property.flatType}</span>
            <span className="crumbs__sep">/</span>
            <span className="crumbs__here">{current?.label ?? 'The record'}</span>
          </div>
          <div className="topbar__actions">
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => setPaletteOpen(true)}
              title="Open the command palette"
            >
              Search
              {/* Left in the accessible name on purpose: a name that omits the
                  visible shortcut fails WCAG 2.5.3 label-in-name. */}
              <kbd className="btn__kbd">⌘K</kbd>
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => setPrefs({ density: prefs.density === 'compact' ? 'comfortable' : 'compact' })}
              aria-pressed={prefs.density === 'compact'}
              title="Toggle ledger density"
            >
              {prefs.density === 'compact' ? 'Compact' : 'Comfortable'}
            </button>
            <button type="button" className="btn btn--primary btn--sm" onClick={() => setReport({})}>
              Report an issue
            </button>
          </div>
        </header>

        <main className="main__scroll" id="main">
          <Outlet context={context} />
        </main>
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        properties={properties}
        onNavigate={(to) => {
          setPaletteOpen(false)
          navigate(to)
        }}
        onSelectProperty={(id) => {
          setPrefs({ activePropertyId: id })
          setPaletteOpen(false)
        }}
        onReport={() => {
          setPaletteOpen(false)
          setReport({})
        }}
      />

      {report ? (
        <Suspense fallback={null}>
          <ReportSheet property={property} preset={report} onClose={() => setReport(null)} />
        </Suspense>
      ) : null}
    </div>
  )
}
