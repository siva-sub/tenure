/** The mark: a lease band — term start, term end, remaining term, now. */
export function Mark() {
  return (
    <svg className="mark" viewBox="0 0 34 34" role="img" aria-label="Tenure">
      <rect
        x="1.5"
        y="1.5"
        width="31"
        height="31"
        rx="1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.45"
      />
      <line x1="8" y1="8" x2="8" y2="26" stroke="currentColor" strokeWidth="1.5" />
      <line x1="26" y1="8" x2="26" y2="26" stroke="currentColor" strokeWidth="1.25" opacity="0.45" />
      <rect x="8" y="14.5" width="18" height="5" fill="currentColor" opacity="0.16" />
      <line x1="16" y1="10.5" x2="16" y2="23.5" stroke="currentColor" strokeWidth="2.25" />
    </svg>
  )
}
