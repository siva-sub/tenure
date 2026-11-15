import { useEffect, useMemo, useRef, useState } from 'react'
import type { PropertyRecord } from '@/domain/types'
import { bandForScore } from '@/domain/energy'

interface Command {
  id: string
  kind: 'section' | 'property' | 'action'
  label: string
  hint: string
  run: () => void
}

/**
 * A real command palette rather than a search box: sections, property switches
 * and actions in one list, keyboard driven, with the dialog element owning focus
 * management so there is no hand-rolled trap to get wrong.
 */
export function CommandPalette({
  open,
  onClose,
  properties,
  onNavigate,
  onSelectProperty,
  onReport,
}: {
  open: boolean
  onClose: () => void
  properties: PropertyRecord[]
  onNavigate: (to: string) => void
  onSelectProperty: (id: string) => void
  onReport: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)

  const commands = useMemo<Command[]>(() => {
    const sections: Command[] = [
      { to: '/', label: 'The record', hint: 'Overview' },
      { to: '/energy', label: 'Energy', hint: 'Score, consumption, tariff' },
      { to: '/retrofit', label: 'Retrofit', hint: 'Measures, payback, subsidies' },
      { to: '/maintenance', label: 'Maintenance', hint: 'Who is responsible' },
      { to: '/telemetry', label: 'Telemetry', hint: 'Sensors and load' },
      { to: '/programmes', label: 'Programmes', hint: 'Schemes and national rails' },
    ].map(({ to, label, hint }) => ({
      id: `nav:${to}`,
      kind: 'section' as const,
      label,
      hint,
      run: () => onNavigate(to),
    }))

    const props = properties.map((p) => ({
      id: `prop:${p.id}`,
      kind: 'property' as const,
      label: p.label,
      hint: `${p.unit} · ${p.postalDistrict} · ${bandForScore(p.score)}`,
      run: () => onSelectProperty(p.id),
    }))

    const actions: Command[] = [
      {
        id: 'action:report',
        kind: 'action',
        label: 'Report a maintenance issue',
        hint: 'Routes to owner, Town Council, MCST or HDB',
        run: onReport,
      },
    ]

    return [...sections, ...props, ...actions]
  }, [properties, onNavigate, onSelectProperty, onReport])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return commands
    return commands.filter((c) => `${c.label} ${c.hint} ${c.kind}`.toLowerCase().includes(q))
  }, [commands, query])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      setQuery('')
      setIndex(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  useEffect(() => {
    setIndex(0)
  }, [query])

  const active = filtered[Math.min(index, Math.max(0, filtered.length - 1))]

  function onKeyDown(event: React.KeyboardEvent<HTMLDialogElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setIndex((i) => Math.max(i - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      active?.run()
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="palette"
      aria-label="Command palette"
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onKeyDown={onKeyDown}
    >
      <div className="palette__search">
        <span className="mono" style={{ color: 'var(--sodium)', fontSize: 12 }} aria-hidden="true">
          ›
        </span>
        <input
          ref={inputRef}
          className="palette__input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Jump to a section, property or action"
          aria-label="Search commands"
          aria-controls="palette-list"
          aria-activedescendant={active ? `pal-${active.id}` : undefined}
          role="combobox"
          aria-expanded="true"
          spellCheck={false}
        />
        <kbd className="palette__hint" aria-hidden="true">
          esc
        </kbd>
      </div>

      {filtered.length === 0 ? (
        <p className="palette__empty">Nothing matches “{query}”.</p>
      ) : (
        <ul className="palette__list" id="palette-list" role="listbox" aria-label="Commands">
          {filtered.map((command, i) => (
            <li
              key={command.id}
              id={`pal-${command.id}`}
              role="option"
              aria-selected={i === index}
              className="palette__item"
              onMouseEnter={() => setIndex(i)}
              onClick={command.run}
            >
              <span className="palette__kind">{command.kind.slice(0, 3)}</span>
              <span className="palette__label">{command.label}</span>
              <span className="palette__hint">{command.hint}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="palette__foot">
        <span>↑↓ move</span>
        <span>↵ open</span>
        <span>esc close</span>
      </div>
    </dialog>
  )
}
