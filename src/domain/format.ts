/**
 * Singapore-specific formatting. All money is SGD, all dates are Singapore time,
 * and numbers use the SI grouping conventions a Singapore resident expects
 * ($4,180.50 · 1,240 kWh · 54.2 kWh/m²/yr).
 */

const SGD = new Intl.NumberFormat('en-SG', {
  style: 'currency',
  currency: 'SGD',
  currencyDisplay: 'narrowSymbol',
  maximumFractionDigits: 0,
})

const SGD_CENTS = new Intl.NumberFormat('en-SG', {
  style: 'currency',
  currency: 'SGD',
  currencyDisplay: 'narrowSymbol',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function sgd(value: number, opts: { cents?: boolean } = {}): string {
  return opts.cents ? SGD_CENTS.format(value) : SGD.format(value)
}

export function num(value: number, digits = 0): string {
  return new Intl.NumberFormat('en-SG', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value)
}

export function kwh(value: number, digits = 0): string {
  return `${num(value, digits)} kWh`
}

const DATE = new Intl.DateTimeFormat('en-SG', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'Asia/Singapore',
})

const DATE_SHORT = new Intl.DateTimeFormat('en-SG', {
  day: '2-digit',
  month: 'short',
  timeZone: 'Asia/Singapore',
})

const TIME = new Intl.DateTimeFormat('en-SG', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Asia/Singapore',
})

const WEEKDAY = new Intl.DateTimeFormat('en-SG', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'Asia/Singapore',
})

export const date = (iso: string): string => DATE.format(new Date(iso))
export const dateShort = (iso: string): string => DATE_SHORT.format(new Date(iso))
export const time = (iso: string): string => TIME.format(new Date(iso))
export const weekday = (iso: string): string => WEEKDAY.format(new Date(iso))

/** "08:30" from an ISO instant, in Singapore time. */
export function clock(iso: string): string {
  return TIME.format(new Date(iso)).replace(':', ':')
}

export function pct(value: number, digits = 0): string {
  return `${num(value * 100, digits)}%`
}

export function signed(value: number, digits = 0): string {
  const s = num(Math.abs(value), digits)
  return value < 0 ? `−${s}` : `+${s}`
}

/** "58 yr 4 mth" — the way remaining lease is quoted in Singapore. */
export function duration(years: number): string {
  if (!Number.isFinite(years) || years < 0) return '—'
  const whole = Math.floor(years)
  const months = Math.round((years - whole) * 12)
  if (months === 12) return `${whole + 1} yr`
  if (whole === 0) return `${months} mth`
  if (months === 0) return `${whole} yr`
  return `${whole} yr ${months} mth`
}

/** Relative time for activity feeds: "4 h ago", "3 days ago". */
export function ago(iso: string, now = new Date()): string {
  const diff = now.getTime() - new Date(iso).getTime()
  const mins = Math.round(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.round(hours / 24)
  if (days < 31) return `${days} day${days === 1 ? '' : 's'} ago`
  const months = Math.round(days / 30.4)
  if (months < 18) return `${months} mth ago`
  return `${Math.round(months / 12)} yr ago`
}

/** Stable ISO date (Singapore) for a Date, used for chart bucket keys. */
export function isoDate(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Singapore',
  }).format(d)
}
