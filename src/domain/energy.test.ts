import { describe, expect, it } from 'vitest'
import type { IntervalReading, Room } from './types'
import {
  bandForScore,
  comfortShare,
  coolingDegreeDays,
  loadShiftPotential,
  mouldRisk,
  peerPercentile,
  scoreForEui,
  MOULD_RH_THRESHOLD,
} from './energy'

function interval(overrides: Partial<IntervalReading> & { at: string }): IntervalReading {
  return {
    kwh: 0.2,
    kwhCooling: 0.05,
    outdoorC: 29,
    outdoorRh: 78,
    roomsC: { living: 26 },
    roomsRh: { living: 72 },
    pm25: 12,
    ...overrides,
  }
}

const ROOMS: Room[] = [
  { id: 'living', name: 'Living', note: '', aspect: 'west', hasSensor: true },
  { id: 'shelter', name: 'Shelter', note: '', aspect: 'internal', hasSensor: true },
  { id: 'yard', name: 'Service yard', note: '', aspect: 'east', hasSensor: false },
]

describe('banding', () => {
  it('maps scores onto a seven-band scale, best first', () => {
    expect(bandForScore(100)).toBe('A')
    expect(bandForScore(86)).toBe('A')
    expect(bandForScore(85)).toBe('B')
    expect(bandForScore(58)).toBe('C')
    expect(bandForScore(32)).toBe('E')
    expect(bandForScore(0)).toBe('G')
  })

  it('clamps out-of-range scores rather than throwing', () => {
    expect(bandForScore(-40)).toBe('G')
    expect(bandForScore(900)).toBe('A')
  })

  it('scores lower for a worse energy use intensity', () => {
    expect(scoreForEui(25)).toBeGreaterThan(scoreForEui(45))
    expect(scoreForEui(45)).toBeGreaterThan(scoreForEui(74))
    expect(scoreForEui(200)).toBe(0)
  })

  it('places a mid-band household near the middle of the peer distribution', () => {
    const pct = peerPercentile(45, {
      floorAreaSqm: 93,
      peerLowKwh: 3600,
      peerMedianKwh: 4560,
      peerHighKwh: 5880,
      eui: 0,
      coolingShare: 0,
      coolingDegreeDays: 0,
    })
    expect(pct).toBeGreaterThan(45)
    expect(pct).toBeLessThan(90)
  })
})

describe('mouldRisk', () => {
  it('only scores rooms that actually have a sensor', () => {
    const readings = mouldRisk([interval({ at: '2026-11-15T10:00:00+08:00' })], ROOMS)
    expect(readings.map((r) => r.roomId)).toEqual(expect.arrayContaining(['living', 'shelter']))
    expect(readings.map((r) => r.roomId)).not.toContain('yard')
  })

  it('flags a damp room as at-risk and a dry room as dry', () => {
    const wet = Array.from({ length: 12 }, (_, i) =>
      interval({
        at: `2026-11-15T${String(i).padStart(2, '0')}:00:00+08:00`,
        roomsRh: { living: 86, shelter: 88 },
      }),
    )
    const dry = Array.from({ length: 12 }, (_, i) =>
      interval({
        at: `2026-11-15T${String(i).padStart(2, '0')}:00:00+08:00`,
        roomsRh: { living: 54, shelter: 58 },
      }),
    )

    const wetResult = mouldRisk(wet, ROOMS)
    const dryResult = mouldRisk(dry, ROOMS)

    expect(wetResult[0]?.index).toBeGreaterThan(60)
    expect(['at-risk', 'critical']).toContain(wetResult[0]?.verdict)
    expect(dryResult[0]?.verdict).toBe('dry')
    expect(dryResult[0]?.hoursAbove).toBe(0)
  })

  it('counts hours above the threshold at half-hour resolution', () => {
    const halfWet = [
      interval({ at: '2026-11-15T01:00:00+08:00', roomsRh: { living: MOULD_RH_THRESHOLD + 6 } }),
      interval({ at: '2026-11-15T01:30:00+08:00', roomsRh: { living: MOULD_RH_THRESHOLD + 6 } }),
      interval({ at: '2026-11-15T02:00:00+08:00', roomsRh: { living: 60 } }),
    ]
    const result = mouldRisk(halfWet, ROOMS)
    expect(result[0]?.hoursAbove).toBe(1)
  })

  it('sorts the dampest room first', () => {
    const readings = [
      interval({ at: '2026-11-15T01:00:00+08:00', roomsRh: { living: 74, shelter: 91 } }),
      interval({ at: '2026-11-15T01:30:00+08:00', roomsRh: { living: 73, shelter: 90 } }),
    ]
    expect(mouldRisk(readings, ROOMS)[0]?.roomId).toBe('shelter')
  })
})

describe('loadShiftPotential', () => {
  it('isolates the 7pm-11pm peak window', () => {
    const readings = [
      interval({ at: '2026-11-15T12:00:00+08:00', kwh: 0.2 }),
      interval({ at: '2026-11-15T19:00:00+08:00', kwh: 1.0 }),
      interval({ at: '2026-11-15T20:00:00+08:00', kwh: 1.0 }),
      interval({ at: '2026-11-15T23:30:00+08:00', kwh: 0.3 }),
    ]
    const result = loadShiftPotential(readings, 31.16)
    expect(result.peakKwh).toBeCloseTo(2, 5)
    expect(result.peakShare).toBeCloseTo(2 / 2.5, 3)
    expect(result.shiftableKwh).toBeCloseTo(0.7, 5)
    expect(result.savingSgdYear).toBeGreaterThan(0)
  })
})

describe('comfort and climate', () => {
  it('reports the share of intervals inside the comfort band', () => {
    const readings = [
      interval({ at: '2026-11-15T01:00:00+08:00', roomsC: { living: 25 } }),
      interval({ at: '2026-11-15T01:30:00+08:00', roomsC: { living: 31 } }),
    ]
    expect(comfortShare(readings, 'living')).toBe(0.5)
  })

  it('derives cooling degree days from the outdoor mean', () => {
    const readings = Array.from({ length: 48 }, (_, i) =>
      interval({ at: `2026-11-15T${String(Math.floor(i / 2)).padStart(2, '0')}:00:00+08:00`, outdoorC: 30 }),
    )
    expect(coolingDegreeDays(readings)).toBeCloseTo(6, 5)
  })
})
