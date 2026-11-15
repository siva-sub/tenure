import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Reveal-on-scroll, with the observer disconnected after the first hit so a
 * long page does not keep paying for intersection checks it has already made.
 */
export function Reveal({
  children,
  delay = 0,
  as: Tag = 'div',
  className = '',
}: {
  children: ReactNode
  delay?: number
  as?: 'div' | 'section' | 'article' | 'li'
  className?: string
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [seen, setSeen] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (typeof IntersectionObserver === 'undefined') {
      setSeen(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setSeen(true)
            observer.disconnect()
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <Tag
      ref={ref as never}
      className={`reveal ${seen ? 'is-seen' : ''} ${className}`.trim()}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  )
}

/** A numbered section heading — the document's running structure. */
export function Sec({
  num,
  title,
  aside,
  children,
  id,
}: {
  num: string
  title: string
  aside?: ReactNode
  children?: ReactNode
  id?: string
}) {
  return (
    <section className="sec" id={id} aria-labelledby={id ? `${id}-title` : undefined}>
      <header className="sec__head">
        <h2 className="sec__title" id={id ? `${id}-title` : undefined}>
          <span className="sec__num">{num}</span>
          {title}
        </h2>
        {aside ? <div className="sec__aside">{aside}</div> : null}
      </header>
      {children}
    </section>
  )
}
