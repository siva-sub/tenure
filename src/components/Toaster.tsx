import { dismissToast, useToasts } from './toastStore'

export function Toaster() {
  const toasts = useToasts()
  if (toasts.length === 0) return null

  return (
    <div className="toasts" role="status" aria-live="polite" aria-atomic="false">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="toast"
          style={t.tone === 'bad' ? { borderLeftColor: 'var(--bad)' } : undefined}
        >
          <div>
            <div className="toast__title">{t.title}</div>
            {t.body ? <div className="toast__body">{t.body}</div> : null}
          </div>
          <button
            type="button"
            className="btn btn--icon btn--quiet"
            style={{ color: 'var(--chrome-ink-2)' }}
            onClick={() => dismissToast(t.id)}
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
