import type { IntervalReading, PropertyRecord, RetrofitMeasure } from '@/domain/types'
import { BANDS, bandForScore, bandLabel, type Band } from '@/domain/energy'
import { analysePayback, leasePosition } from '@/domain/lease'
import { duration, num } from '@/domain/format'

/* ==================================================================== */
/* Score dial                                                            */
/* ==================================================================== */

const BAND_COLOURS: Record<Band, string> = {
  A: '#3c6b4c',
  B: '#6d8a4f',
  C: '#8a9a5b',
  D: '#c0a03a',
  E: '#bb6a2a',
  F: '#a8431f',
  G: '#8a2b16',
}

function polar(cx: number, cy: number, r: number, degrees: number): [number, number] {
  const rad = (degrees * Math.PI) / 180
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)]
}

export function ScoreDial({ score, size = 260 }: { score: number; size?: number }) {
  const cx = 130
  const cy = 118
  const r = 92
  const band = bandForScore(score)
  const needleDeg = -90 + (100 - Math.min(100, Math.max(0, score))) * 1.8

  return (
    <div className="dial">
      <svg
        className="dial__svg"
        viewBox="0 0 260 152"
        width={size}
        role="img"
        aria-label={`Energy score ${score} out of 100, band ${band}, ${bandLabel(band)}`}
      >
        {BANDS.map((b, i) => {
          const from = 180 + i * 27 + 1.6
          const to = 180 + (i + 1) * 27 - 1.6
          const [x1, y1] = polar(cx, cy, r, from)
          const [x2, y2] = polar(cx, cy, r, to)
          const large = to - from > 180 ? 1 : 0
          return (
            <path
              key={b}
              className="dial__band"
              d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`}
              stroke={BAND_COLOURS[b]}
              opacity={b === band ? 1 : 0.32}
            />
          )
        })}

        {BANDS.map((b, i) => {
          const [x, y] = polar(cx, cy, r + 14, 180 + i * 27 + 13.5)
          return (
            <text key={b} className="dial__letter" x={x} y={y} textAnchor="middle" dominantBaseline="middle">
              {b}
            </text>
          )
        })}

        {/* The marker rides the arc. A needle through the centre would have to
            cross the score, which is the one thing that must stay legible. */}
        <g className="dial__needle" style={{ '--deg': `${needleDeg}deg` } as React.CSSProperties}>
          <rect x={cx - 1.9} y={17} width="3.8" height="16" rx="1.9" fill="var(--ink)" />
        </g>

        <text className="dial__value" x={cx} y={cy - 34} textAnchor="middle">
          {Math.round(score)}
        </text>
        <text className="dial__caption" x={cx} y={cy - 14} textAnchor="middle">
          {band} · {bandLabel(band).toUpperCase()}
        </text>
      </svg>
    </div>
  )
}

/* ==================================================================== */
/* Tenure clock — the signature instrument                               */
/* ==================================================================== */

/**
 * Two stacked instruments rather than one overloaded SVG:
 *
 *  1. the term bar, showing elapsed against remaining at true proportion;
 *  2. a Gantt of payback horizons drawn from today, so a measure whose bar
 *     would cross the lease expiry is visible as such.
 *
 * The earlier version drew both in one coordinate system and the labels
 * collided with the bar — this split keeps text in HTML, where it can wrap,
 * truncate and stay legible at any width.
 */
export function TenureClock({
  property,
  measures,
  maxBars = 5,
}: {
  property: PropertyRecord
  measures: RetrofitMeasure[]
  maxBars?: number
}) {
  const position = leasePosition(property.lease)
  const nowPct = Math.min(100, Math.max(0, (position.elapsedYears / position.termYears) * 100))

  const rows = measures
    .filter((m) => (m.savingKwhYear ?? 0) > 0 && m.status !== 'blocked' && m.status !== 'declined')
    .map((m) => {
      const analysis = analysePayback({
        costSgd: m.costSgd,
        subsidySgd: m.subsidySgd,
        savingKwhYear: m.savingKwhYear,
        tariffCentsPerKwh: property.meter.tariffCentsPerKwh,
        remainingYears: position.remainingYears,
      })
      const widthPct = (analysis.paybackYears / Math.max(1, position.remainingYears)) * 100
      return { measure: m, analysis, widthPct }
    })
    .sort((a, b) => b.analysis.netCostSgd - a.analysis.netCostSgd)
    .slice(0, maxBars)

  return (
    <div className="tenure">
      {/* 1. The term */}
      <div className="tenure__term">
        <div className="tenure__term-labels">
          <span>Term start · {position.startsOn.getFullYear()}</span>
          <span>Expiry · {position.expiryYear}</span>
        </div>
        <div
          className="tenure__bar"
          role="img"
          aria-label={`${position.termYears}-year lease, ${duration(position.elapsedYears)} elapsed, ${duration(position.remainingYears)} remaining.`}
        >
          <div className="tenure__elapsed" style={{ width: `${nowPct}%` }} />
          <div className="tenure__now" style={{ left: `${nowPct}%` }}>
            <span className="tenure__now-tag">now</span>
          </div>
        </div>
        <div className="tenure__term-note">
          <span className="mono">{duration(position.remainingYears)} remaining</span>
          <span className="mono">{num(position.remainingFraction * 100, 0)}% of term</span>
        </div>
      </div>

      {/* 2. Payback horizons against what is left */}
      <div className="tenure__gantt">
        <div className="tenure__gantt-head">
          <span>Measure</span>
          <span>Payback from today · {duration(position.remainingYears)} of lease available</span>
          <span>Years</span>
        </div>

        {rows.length === 0 ? (
          <p className="tiny muted">No measure with a verified saving yet.</p>
        ) : (
          rows.map(({ measure, analysis, widthPct }) => {
            const clamped = Math.min(widthPct, 100)
            const over = analysis.verdict === 'beyond-lease'
            const tone = over ? 'over' : analysis.verdict === 'tight' ? 'tight' : 'ok'
            return (
              <div className="tenure__gantt-row" key={measure.id}>
                <span className="tenure__gantt-name" title={measure.name}>
                  {measure.name}
                </span>
                <span
                  className="tenure__gantt-track"
                  style={{ '--decade': `${(10 / Math.max(1, position.remainingYears)) * 100}%` } as React.CSSProperties}
                >
                  <span
                    className="tenure__gantt-bar"
                    data-tone={tone}
                    style={{ left: 0, width: `${Math.max(clamped, 0.6)}%` }}
                    title={`${num(analysis.paybackYears, 1)} years · ${over ? 'past the lease' : analysis.verdict === 'tight' ? 'tight' : 'inside the lease'}`}
                  />
                  <span className="tenure__gantt-expiry" aria-hidden="true" />
                </span>
                <span className={`tenure__gantt-years ${over ? 'is-over' : ''}`}>
                  {Number.isFinite(analysis.paybackYears) && analysis.paybackYears < 99
                    ? `${num(analysis.paybackYears, 1)} yr`
                    : '—'}
                  {over ? ' ⚠' : ''}
                </span>
              </div>
            )
          })
        )}

        <div className="tenure__legend">
          <span style={{ '--swatch': 'var(--moss)' } as React.CSSProperties}>
            <i className="tenure__key" /> breaks even inside the lease
          </span>
          <span style={{ '--swatch': 'var(--ochre)' } as React.CSSProperties}>
            <i className="tenure__key" /> tight — inside, but only just
          </span>
          <span style={{ '--swatch': 'var(--laterite)' } as React.CSSProperties}>
            <i className="tenure__key" /> payback runs past the lease
          </span>
        </div>
      </div>
    </div>
  )
}

/* ==================================================================== */
/* 48-interval day ribbon                                                */
/* ==================================================================== */

const HOUR_FMT = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  hour12: false,
  timeZone: 'Asia/Singapore',
})

function rhColour(rh: number): string {
  if (rh > 82) return 'var(--rh-critical)'
  if (rh > 76) return 'var(--rh-risk)'
  if (rh > 70) return 'var(--rh-watch)'
  if (rh > 64) return 'var(--rh-ok)'
  return 'var(--rh-dry)'
}

export function LoadRibbon({ intervals, roomId = 'living' }: { intervals: IntervalReading[]; roomId?: string }) {
  const max = Math.max(...intervals.map((i) => i.kwh), 0.001)

  return (
    <div className="ribbon">
      <div className="ribbon__lane" role="img" aria-label="Half-hourly electricity load for today, with the 7 pm to 11 pm peak window shaded.">
        {intervals.map((reading, i) => {
          const hour = Number(HOUR_FMT.format(new Date(reading.at)))
          const isPeak = hour >= 19 && hour < 23
          const acShare = Math.max(0, Math.min(1, reading.kwhCooling / Math.max(reading.kwh, 0.001)))
          return (
            <div key={reading.at} className={`ribbon__col ${isPeak ? 'ribbon__col--peak' : ''}`}>
              <div
                className="ribbon__fill"
                style={{ '--h': reading.kwh / max, '--i': i } as React.CSSProperties}
                title={`${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 === 0 ? '00' : '30'} · ${reading.kwh.toFixed(2)} kWh`}
              >
                <div
                  className="ribbon__fill ribbon__fill--ac"
                  style={{ height: `${acShare * 100}%`, position: 'absolute', bottom: 0, '--i': i } as React.CSSProperties}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="ribbon__rh-lane" role="img" aria-label="Living room relative humidity across the day. Deeper red means sustained time above the 70 percent mould threshold.">
        {intervals.map((reading, i) => {
          const rh = reading.roomsRh[roomId] ?? reading.outdoorRh
          return (
            <div
              key={`rh-${reading.at}`}
              className="ribbon__rh"
              style={{ background: rhColour(rh), '--i': i } as React.CSSProperties}
              title={`${rh.toFixed(0)}% RH`}
            />
          )
        })}
      </div>

      <div className="ribbon__axis" aria-hidden="true">
        <span>00:00</span>
        <span>06:00</span>
        <span>12:00</span>
        <span>18:00 → 24:00</span>
      </div>
    </div>
  )
}

/* ==================================================================== */
/* Peer band                                                             */
/* ==================================================================== */

export function PeerBand({
  value,
  low,
  median,
  high,
  unit = 'kWh/yr',
}: {
  value: number
  low: number
  median: number
  high: number
  unit?: string
}) {
  const span = Math.max(1, high - low)
  const pos = Math.min(1, Math.max(0, (value - low) / span)) * 100

  return (
    <div className="peer">
      <div className="peer__track" role="img" aria-label={`Your consumption ${num(value)} ${unit}, against a peer band from ${num(low)} to ${num(high)} ${unit}, median ${num(median)}.`}>
        <div
          className="peer__band"
          style={{ left: '0%', width: `${((median - low) / span) * 100}%` }}
        />
        <div className="peer__marker" style={{ left: `${pos}%` }} />
      </div>
      <div className="peer__labels">
        <span>{num(low)}</span>
        <span>median {num(median)}</span>
        <span>{num(high)}</span>
      </div>
    </div>
  )
}
