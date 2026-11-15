import { useEffect, useRef, useState } from 'react'
import type { PropertyRecord } from '@/domain/types'
import { routeReport } from '@/domain/responsibility'
import { OWNER_LABEL } from '@/domain/responsibility'
import { useCreateTicket } from '@/app/queries'
import { toast } from './toastStore'

const MAX_PHOTOS = 3

/**
 * The report form.
 *
 * The routing is shown live as the resident types, before they submit: the
 * single most useful thing this product can do is tell someone *who is
 * responsible* before they spend three weeks phoning the wrong office.
 */
export function ReportSheet({
  property,
  preset,
  onClose,
}: {
  property: PropertyRecord
  preset: { roomId?: string; text?: string }
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement | null>(null)
  const mutation = useCreateTicket()

  const [title, setTitle] = useState(preset.text ?? '')
  const [body, setBody] = useState('')
  const [roomId, setRoomId] = useState(preset.roomId ?? '')
  const [photoCount, setPhotoCount] = useState(0)
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  const combined = `${title} ${body}`.trim()
  const routing = routeReport(combined.length > 4 ? combined : 'internal defect', property.kind)

  const titleError = touched && title.trim().length < 6 ? 'Give the issue a short, specific title (6 characters or more).' : null
  const bodyError = touched && body.trim().length < 12 ? 'Describe what you can see — 12 characters or more.' : null
  const photoError = photoCount > MAX_PHOTOS ? `OneService accepts a maximum of ${MAX_PHOTOS} photos per case.` : null

  const canSubmit = title.trim().length >= 6 && body.trim().length >= 12 && photoCount <= MAX_PHOTOS

  function submit(event: React.FormEvent) {
    event.preventDefault()
    setTouched(true)
    if (!canSubmit) return
    mutation.mutate(
      {
        propertyId: property.id,
        title: title.trim(),
        body: body.trim(),
        owner: routing.owner,
        severity: routing.severity,
        routedBecause: routing.because,
        roomId: roomId || undefined,
        attachments: photoCount,
      },
      {
        onSuccess: (ticket) => {
          toast({
            title: 'Case filed',
            body: `Routed to ${OWNER_LABEL[ticket.owner]} · ${ticket.caseRef ?? 'reference pending'}`,
          })
          onClose()
        },
        onError: (error) => {
          toast({
            title: 'Could not file the case',
            body: error instanceof Error ? error.message : 'Unknown error',
            tone: 'bad',
          })
        },
      },
    )
  }

  return (
    <dialog
      ref={dialogRef}
      className="sheet"
      aria-labelledby="report-title"
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
    >
      <form onSubmit={submit} noValidate>
        <div className="sheet__head">
          <div>
            <span className="eyebrow">
              <span className="eyebrow__num">04</span> maintenance
            </span>
            <h2 className="sheet__title" id="report-title">
              Report an issue
            </h2>
          </div>
          <button type="button" className="btn btn--icon btn--quiet" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="sheet__body">
          <div className="note">
            <strong>{property.label} {property.unit}</strong> · {property.management.name}
            <br />
            Reported as {property.kind === 'hdb' ? 'an HDB flat' : property.kind === 'condo' ? 'a strata lot' : 'a landed property'}.
          </div>

          <div className={`field ${titleError ? 'field--invalid' : ''}`}>
            <label className="field__label" htmlFor="issue-title">
              What is wrong
            </label>
            <input
              id="issue-title"
              className="input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Water seepage on kitchen ceiling"
              aria-invalid={Boolean(titleError)}
              aria-describedby={titleError ? 'issue-title-error' : undefined}
            />
            {titleError ? (
              <p className="field__error" id="issue-title-error">
                {titleError}
              </p>
            ) : null}
          </div>

          <div className={`field ${bodyError ? 'field--invalid' : ''}`}>
            <label className="field__label" htmlFor="issue-body">
              What you can see
            </label>
            <textarea
              id="issue-body"
              className="textarea"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Where it is, how long it has been happening, and anything you have already tried."
              aria-invalid={Boolean(bodyError)}
              aria-describedby={bodyError ? 'issue-body-error' : undefined}
            />
            {bodyError ? (
              <p className="field__error" id="issue-body-error">
                {bodyError}
              </p>
            ) : null}
          </div>

          <div className="grid grid--2">
            <div className="field">
              <label className="field__label" htmlFor="issue-room">
                Room
              </label>
              <select
                id="issue-room"
                className="select"
                value={roomId}
                onChange={(event) => setRoomId(event.target.value)}
              >
                <option value="">Not specific</option>
                {property.rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label className="field__label" htmlFor="issue-photos">
                Photos — {photoCount}/{MAX_PHOTOS}
              </label>
              <input
                id="issue-photos"
                className="input"
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => setPhotoCount(event.target.files?.length ?? 0)}
                aria-describedby="issue-photos-hint"
              />
              <p className="field__hint" id="issue-photos-hint">
                The municipal case system caps attachments at three.
              </p>
            </div>
          </div>

          {photoError ? <p className="field__error">{photoError}</p> : null}

          <div className={`note ${routing.severity === 'safety' ? 'note--bad' : 'note--warn'}`} aria-live="polite">
            <span className="eyebrow" style={{ marginBottom: 4 }}>
              <span className="eyebrow__num">→</span> routed to {OWNER_LABEL[routing.owner]} · {routing.severity}
            </span>
            <p style={{ marginTop: 4 }}>{routing.because}</p>
          </div>
        </div>

        <div className="sheet__foot">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={mutation.isPending}>
            {mutation.isPending ? 'Filing…' : 'File case'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
