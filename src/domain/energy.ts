import type { DailyReading, EnergyBenchmarks, IntervalReading, Room } from './types'

/**
 * Energy and comfort arithmetic for a tropical, high-humidity home.
 *
 * Singapore has no residential EPC, so a "score" has to be constructed from
 * what is actually observable: metered consumption, floor area, flat type,
 * household size, and the cooling load implied by climate. We keep every
 * ingredient visible so the number is auditable rather than a black box.
 */

export type Band = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'

export const BANDS: Band[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G']

/** Bands are 15 points wide, best first. Mirrors the shape of an EPC scale. */
export function bandForScore(score: number): Band {
  const clamped = Math.min(100, Math.max(0, score))
  const index = Math.min(6, Math.floor((100 - clamped) / 15))
  return BANDS[index] ?? 'G'
}

export function bandLabel(band: Band): string {
  switch (band) {
    case 'A':
      return 'Very efficient'
    case 'B':
      return 'Efficient'
    case 'C':
      return 'Above average'
    case 'D':
      return 'Average'
    case 'E':
      return 'Below average'
    case 'F':
      return 'Poor'
    case 'G':
      return 'Very poor'
  }
}

/** Lower bound of each band, for drawing the scale. */
export function bandRange(band: Band): { min: number; max: number } {
  const i = BANDS.indexOf(band)
  return { min: 100 - (i + 1) * 15, max: 100 - i * 15 }
}

/**
 * EUI (kWh/m²/yr) → 0–100. The Singapore residential band we care about runs
 * from roughly 25 kWh/m²/yr (efficient 4-room, low occupancy, no dryer) to
 * 110 (private, high occupancy, continuous AC). Values outside are clamped.
 */
export function scoreForEui(eui: number): number {
  const best = 25
  const worst = 110
  const normalised = 1 - (eui - best) / (worst - best)
  return Math.round(Math.min(100, Math.max(0, normalised * 100)))
}

/**
 * Occupancy correction. A 5-person 4-room flat is not "worse" than a 2-person
 * one at the same EUI — it is doing more work. We apply a gentle per-person
 * adjustment of ±4 points around a 3-person baseline so the comparison stays
 * legible rather than over-fitted.
 */
export function occupancyAdjustment(householdSize: number, baseline = 3): number {
  return Math.max(-12, Math.min(12, (baseline - householdSize) * 4))
}

export function peerPercentile(eui: number, benchmarks: EnergyBenchmarks & { floorAreaSqm: number }): number {
  const peerEuis = [benchmarks.peerLowKwh, benchmarks.peerMedianKwh, benchmarks.peerHighKwh].map(
    (kwh) => kwh / benchmarks.floorAreaSqm,
  )
  const [low = 0, median = 0, high = 0] = peerEuis
  if (eui <= low) return 96
  if (eui >= high) return 6
  if (eui <= median) {
    const t = (eui - low) / Math.max(0.001, median - low)
    return Math.round(96 - t * 46)
  }
  const t = (eui - median) / Math.max(0.001, high - median)
  return Math.round(50 - t * 44)
}

/** Cooling-degree days, base 24 °C — the tropical analogue of HDD. */
export function coolingDegreeDays(intervals: IntervalReading[], baseC = 24): number {
  if (intervals.length === 0) return 0
  const hours = (intervals.length * 30) / 60
  const meanOutdoor = intervals.reduce((sum, r) => sum + r.outdoorC, 0) / intervals.length
  return Math.max(0, (meanOutdoor - baseC) * (hours / 24))
}

/**
 * Mould risk. In Singapore the binding constraint is not heat, it is relative
 * humidity: above ~70 % RH for several hours a day, vapour condenses on cool
 * wall surfaces and black mould establishes in corners and wardrobes.
 * We report hours-per-day above threshold and an index that maps to a message.
 */
export const MOULD_RH_THRESHOLD = 70

export interface MouldReading {
  roomId: string
  roomName: string
  hoursAbove: number
  peakRh: number
  meanRh: number
  index: number
  verdict: 'dry' | 'watch' | 'at-risk' | 'critical'
}

export function mouldRisk(intervals: IntervalReading[], rooms: Room[]): MouldReading[] {
  return rooms
    .filter((room) => room.hasSensor)
    .map((room) => {
      const readings = intervals
        .map((i) => i.roomsRh[room.id])
        .filter((v): v is number => typeof v === 'number')
      const above = readings.filter((v) => v > MOULD_RH_THRESHOLD).length
      const hoursAbove = (above * 30) / 60
      const peakRh = readings.length ? Math.max(...readings) : 0
      const meanRh = readings.length ? readings.reduce((a, b) => a + b, 0) / readings.length : 0
      // 0 at 55 % RH, 100 at 95 % RH, scaled by duration.
      const severity = Math.min(1, Math.max(0, (meanRh - 55) / 40))
      const duration = Math.min(1, hoursAbove / 6)
      const index = Math.round(severity * 60 + duration * 40)
      const verdict: MouldReading['verdict'] =
        index >= 70 ? 'critical' : index >= 48 ? 'at-risk' : index >= 26 ? 'watch' : 'dry'
      return {
        roomId: room.id,
        roomName: room.name,
        hoursAbove,
        peakRh,
        meanRh,
        index,
        verdict,
      }
    })
    .sort((a, b) => b.index - a.index)
}

/**
 * Comfort band. ASHRAE's domestic comfort envelope widened for acclimatised
 * tropical occupants is roughly 23–27 °C with ceiling fans in use.
 */
export function comfortShare(intervals: IntervalReading[], roomId: string, low = 23, high = 27): number {
  const readings = intervals
    .map((i) => i.roomsC[roomId])
    .filter((v): v is number => typeof v === 'number')
  if (readings.length === 0) return 0
  return readings.filter((v) => v >= low && v <= high).length / readings.length
}

/** Singapore's grid emission factor, kg CO₂e per kWh. Indicative. */
export const GRID_EMISSION_FACTOR = 0.41

export function co2Kg(kwhValue: number): number {
  return kwhValue * GRID_EMISSION_FACTOR
}

/**
 * Tariff windows. The regulated tariff is flat, but most Open Electricity
 * Market plans the resident can switch to price a 7 pm–11 pm peak, which is
 * also the domestic demand peak. We compute how much load sits in that window.
 */
export interface TariffWindow {
  id: string
  label: string
  startHour: number
  endHour: number
  multiplier: number
}

export const TARIFF_WINDOWS: TariffWindow[] = [
  { id: 'offpeak', label: 'Off-peak', startHour: 0, endHour: 7, multiplier: 0.82 },
  { id: 'day', label: 'Day', startHour: 7, endHour: 17, multiplier: 1 },
  { id: 'shoulder', label: 'Shoulder', startHour: 17, endHour: 19, multiplier: 1.06 },
  { id: 'peak', label: 'Peak', startHour: 19, endHour: 23, multiplier: 1.24 },
  { id: 'late', label: 'Late', startHour: 23, endHour: 24, multiplier: 0.88 },
]

export function sgHour(iso: string): number {
  const d = new Date(iso)
  return Number(
    new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Asia/Singapore' }).format(d),
  )
}

export function windowForHour(hour: number): TariffWindow {
  return (
    TARIFF_WINDOWS.find((w) => hour >= w.startHour && hour < w.endHour) ?? TARIFF_WINDOWS[1]!
  )
}

export interface LoadShiftAnalysis {
  peakKwh: number
  peakShare: number
  /** kWh the household could plausibly move out of the 7–11 pm window. */
  shiftableKwh: number
  /** Annualised saving if all shiftable load moved to off-peak. */
  savingSgdYear: number
}

export function loadShiftPotential(
  intervals: IntervalReading[],
  tariffCentsPerKwh: number,
  shareShiftable = 0.35,
): LoadShiftAnalysis {
  const total = intervals.reduce((sum, r) => sum + r.kwh, 0)
  const peakKwh = intervals
    .filter((r) => {
      const h = sgHour(r.at)
      return h >= 19 && h < 23
    })
    .reduce((sum, r) => sum + r.kwh, 0)
  const peak = TARIFF_WINDOWS.find((w) => w.id === 'peak')!
  const offpeak = TARIFF_WINDOWS.find((w) => w.id === 'offpeak')!
  const shiftableKwh = peakKwh * shareShiftable
  const savingPerKwh = ((peak.multiplier - offpeak.multiplier) * tariffCentsPerKwh) / 100
  return {
    peakKwh,
    peakShare: total > 0 ? peakKwh / total : 0,
    shiftableKwh,
    savingSgdYear: shiftableKwh * savingPerKwh * 365,
  }
}

/** Rolling 7-day mean of daily consumption — used for the trend strip. */
export function rollingMean(values: number[], window: number): number[] {
  return values.map((_, i) => {
    const start = Math.max(0, i - window + 1)
    const slice = values.slice(start, i + 1)
    return slice.reduce((a, b) => a + b, 0) / slice.length
  })
}

/** Days in the trailing window that exceeded the peer high band. */
export function exceedanceDays(history: DailyReading[], thresholdKwh: number): number {
  return history.filter((d) => d.kwh > thresholdKwh).length
}

export interface ConsumptionSplit {
  key: string
  label: string
  kwh: number
  share: number
}

/** Attribution of annual consumption, derived from the cooling share. */
export function consumptionSplit(annualKwh: number, coolingShare: number): ConsumptionSplit[] {
  const cooling = annualKwh * coolingShare
  const hotWater = annualKwh * 0.11
  const lighting = annualKwh * 0.07
  const appliances = Math.max(0, annualKwh - cooling - hotWater - lighting)
  return [
    { key: 'cooling', label: 'Space cooling', kwh: cooling, share: cooling / annualKwh },
    { key: 'appliances', label: 'Appliances & plug loads', kwh: appliances, share: appliances / annualKwh },
    { key: 'hot-water', label: 'Water heating', kwh: hotWater, share: hotWater / annualKwh },
    { key: 'lighting', label: 'Lighting', kwh: lighting, share: lighting / annualKwh },
  ].sort((a, b) => b.kwh - a.kwh)
}
