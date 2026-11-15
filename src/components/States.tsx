import type { ReactNode } from 'react'

/** Full-page failure, used when the record itself cannot load. */
export function ErrorState({
  title,
  body,
  onRetry,
}: {
  title: string
  body: string
  onRetry?: () => void
}) {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: '2rem' }}>
      <div className="card" style={{ maxWidth: '34rem' }}>
        <div className="card__body" style={{ display: 'grid', gap: 'var(--s-3)' }}>
          <span className="eyebrow">
            <span className="eyebrow__num">ERR</span> record unavailable
          </span>
          <h1 style={{ fontSize: 'var(--step-5)' }}>{title}</h1>
          <p className="muted small">{body}</p>
          {onRetry ? (
            <button type="button" className="btn btn--primary" onClick={onRetry} style={{ justifySelf: 'start' }}>
              Try again
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

/** Inline failure for a single panel — the rest of the page stays usable. */
export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="note note--bad" role="alert">
      <strong>{message}</strong>
      {onRetry ? (
        <>
          {' '}
          <button type="button" className="btn--quiet btn--sm" onClick={onRetry}>
            Retry
          </button>
        </>
      ) : null}
    </div>
  )
}

export function RailSkeleton() {
  return (
    <div aria-hidden="true" style={{ padding: 'var(--s-5)', display: 'grid', gap: 'var(--s-4)' }}>
      <div className="skel skel--line" style={{ width: '60%', background: '#22382c' }} />
      <div className="skel skel--line" style={{ width: '80%', background: '#22382c' }} />
      <div className="skel skel--block" style={{ background: '#22382c' }} />
      <div className="skel skel--block" style={{ height: '2.5rem', background: '#22382c' }} />
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="skel skel--line" style={{ width: '70%', background: '#22382c' }} />
      ))}
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div aria-hidden="true" className="page">
      <div className="skel skel--line" style={{ width: '8rem', marginBottom: 'var(--s-4)' }} />
      <div className="skel" style={{ width: 'min(28rem, 70%)', height: '3.5rem', marginBottom: 'var(--s-4)' }} />
      <div className="skel skel--line" style={{ width: 'min(34rem, 90%)', marginBottom: 'var(--s-2)' }} />
      <div className="skel skel--line" style={{ width: 'min(24rem, 60%)', marginBottom: 'var(--s-7)' }} />
      <div className="grid grid--3">
        <div className="skel skel--block" style={{ height: '9rem' }} />
        <div className="skel skel--block" style={{ height: '9rem' }} />
        <div className="skel skel--block" style={{ height: '9rem' }} />
      </div>
    </div>
  )
}

export function CardSkeleton({ height = '8rem' }: { height?: string }) {
  return <div className="skel" style={{ height }} />
}

export function LedgerSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-hidden="true" style={{ display: 'grid', gap: 'var(--s-3)', padding: 'var(--s-4) 0' }}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skel skel--line" style={{ width: `${88 - i * 7}%`, height: '1.1rem' }} />
      ))}
    </div>
  )
}

/**
 * One boundary for the three states every panel has. Keeping the shape uniform
 * is what stops a dashboard from looking like six different apps.
 */
export function AsyncBoundary({
  isPending,
  error,
  onRetry,
  skeleton,
  children,
}: {
  isPending: boolean
  error: unknown
  onRetry?: () => void
  skeleton: ReactNode
  children: ReactNode
}) {
  if (isPending) return <>{skeleton}</>
  if (error) {
    return (
      <ErrorNote
        message={error instanceof Error ? error.message : 'This panel could not be loaded.'}
        {...(onRetry ? { onRetry } : {})}
      />
    )
  }
  return <>{children}</>
}
