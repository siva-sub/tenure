import { describe, expect, it } from 'vitest'
import { analysePayback, leasePosition, savingShare } from './lease'

const LEASE = { startsOn: '1986-04-01', termYears: 99 }

describe('leasePosition', () => {
  it('computes a mid-term position on a 99-year HDB lease', () => {
    const position = leasePosition(LEASE, new Date('2026-04-01T00:00:00+08:00'))
    expect(position.elapsedYears).toBeCloseTo(40, 1)
    expect(position.remainingYears).toBeCloseTo(59, 1)
    expect(position.expiryYear).toBe(2085)
    expect(position.remainingFraction).toBeGreaterThan(0.58)
    expect(position.isShortLease).toBe(false)
  })

  it('flags a lease inside the 20-year financing threshold', () => {
    const position = leasePosition({ startsOn: '1975-01-01', termYears: 99 }, new Date('2060-01-01T00:00:00+08:00'))
    expect(position.isShortLease).toBe(true)
    expect(position.remainingYears).toBeCloseTo(14, 0)
  })

  it('never reports a negative elapsed share past the start date', () => {
    const position = leasePosition({ startsOn: '2030-01-01', termYears: 99 }, new Date('2026-01-01T00:00:00+08:00'))
    expect(position.elapsedYears).toBe(0)
    expect(position.remainingFraction).toBe(1)
  })
})

describe('analysePayback', () => {
  it('accepts a measure that breaks even well inside the remaining lease', () => {
    const result = analysePayback({
      costSgd: 4180,
      savingKwhYear: 1240,
      tariffCentsPerKwh: 31.16,
      remainingYears: 58.4,
    })
    expect(result.paybackYears).toBeCloseTo(10.82, 1)
    expect(result.verdict).toBe('inside-lease')
    expect(result.annualSavingSgd).toBeCloseTo(386.38, 1)
    expect(result.savingWithinLeaseSgd).toBeGreaterThan(0)
  })

  it('rejects a measure whose payback lands after the lease ends', () => {
    const result = analysePayback({
      costSgd: 3200,
      savingKwhYear: 60,
      tariffCentsPerKwh: 28,
      remainingYears: 9,
    })
    expect(result.verdict).toBe('beyond-lease')
    // The household never recovers the capital inside the term.
    expect(result.savingWithinLeaseSgd).toBeLessThan(0)
  })

  it('treats a break-even in the last 15% of the term as tight', () => {
    const result = analysePayback({
      costSgd: 900,
      savingKwhYear: 320,
      tariffCentsPerKwh: 30,
      remainingYears: 10,
    })
    // 900 / (320 * 0.30) = 9.375 years, inside a 10-year term but only just.
    expect(result.paybackYears).toBeCloseTo(9.375, 2)
    expect(result.verdict).toBe('tight')
  })

  it('applies subsidy to the net cost before computing payback', () => {
    const gross = analysePayback({
      costSgd: 1389,
      savingKwhYear: 310,
      tariffCentsPerKwh: 31.16,
      remainingYears: 58,
    })
    const net = analysePayback({
      costSgd: 1389,
      subsidySgd: 400,
      savingKwhYear: 310,
      tariffCentsPerKwh: 31.16,
      remainingYears: 58,
    })
    expect(net.netCostSgd).toBe(989)
    expect(net.paybackYears).toBeLessThan(gross.paybackYears)
  })

  it('reports unknown when no saving is claimed', () => {
    const result = analysePayback({ costSgd: 2800, savingKwhYear: 0, tariffCentsPerKwh: 30, remainingYears: 40 })
    expect(result.verdict).toBe('unknown')
    expect(Number.isFinite(result.paybackYears)).toBe(false)
  })
})

describe('savingShare', () => {
  it('is zero-safe and expresses saving as a share of the baseline', () => {
    expect(savingShare(1240, 4190)).toBeCloseTo(0.296, 2)
    expect(savingShare(100, 0)).toBe(0)
  })
})
