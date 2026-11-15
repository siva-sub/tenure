import type { Lease, PropertyRecord } from './types'

/**
 * Lease arithmetic.
 *
 * This is the module that makes Tenure Singaporean rather than generic. Almost
 * every home here sits on a 99-year leasehold term, so the honest question is
 * not "what is the payback?" but "does the payback land inside the lease I
 * actually hold?" A 14-year payback on a flat with 9 years left is a bad buy
 * dressed up as a good one.
 */

const MS_PER_YEAR = 365.2425 * 24 * 60 * 60 * 1000

export interface LeasePosition {
  startsOn: Date
  endsOn: Date
  termYears: number
  /** Years elapsed since the term started. */
  elapsedYears: number
  /** Years left. Can be negative if the term has run out. */
  remainingYears: number
  /** Remaining as a fraction of the original term, 0–1. */
  remainingFraction: number
  /** Calendar year the lease runs out. */
  expiryYear: number
  /** Has less than 20 years left — the threshold banks use for financing. */
  isShortLease: boolean
}

export function leasePosition(lease: Lease, now: Date = new Date()): LeasePosition {
  const startsOn = new Date(lease.startsOn)
  const endsOn = new Date(startsOn)
  endsOn.setFullYear(endsOn.getFullYear() + lease.termYears)

  const elapsedYears = (now.getTime() - startsOn.getTime()) / MS_PER_YEAR
  const remainingYears = (endsOn.getTime() - now.getTime()) / MS_PER_YEAR

  return {
    startsOn,
    endsOn,
    termYears: lease.termYears,
    elapsedYears: Math.max(0, elapsedYears),
    remainingYears,
    remainingFraction: Math.min(1, Math.max(0, remainingYears / lease.termYears)),
    expiryYear: endsOn.getFullYear(),
    isShortLease: remainingYears < 20,
  }
}

export type PaybackVerdict = 'inside-lease' | 'tight' | 'beyond-lease' | 'unknown'

export interface PaybackAnalysis {
  paybackYears: number
  /** Net cost to the owner after subsidy. */
  netCostSgd: number
  annualSavingSgd: number
  /** kWh saved per year, if known. */
  savingKwhYear: number
  /**
   * Net saving over the shorter of the asset's service life and the remaining
   * lease. Measuring this over the payback horizon instead would always return
   * exactly zero, which is the trap this field exists to avoid.
   */
  savingWithinLeaseSgd: number
  /** Remaining lease at the point the measure breaks even. */
  leaseAtBreakEvenYears: number
  verdict: PaybackVerdict
  consecutiveYears: number
}

export interface PaybackInput {
  costSgd: number
  subsidySgd?: number | undefined
  savingKwhYear?: number | undefined
  tariffCentsPerKwh: number
  remainingYears: number
  /** Service life of the measure, years. Defaults to 15. */
  assetLifeYears?: number
}

/**
 * A payback that lands close to expiry is worse than the number suggests: the
 * last years of a lease carry the least optionality, and resale value for
 * energy measures is close to zero in the Singapore resale market. We therefore
 * treat "inside the lease by under 15 % of remaining term" as *tight*.
 */
export function analysePayback(input: PaybackInput): PaybackAnalysis {
  const netCostSgd = Math.max(0, input.costSgd - (input.subsidySgd ?? 0))
  const savingKwhYear = input.savingKwhYear ?? 0
  const annualSavingSgd = (savingKwhYear * input.tariffCentsPerKwh) / 100
  const paybackYears = annualSavingSgd > 0 ? netCostSgd / annualSavingSgd : Number.POSITIVE_INFINITY

  const assetLifeYears = input.assetLifeYears ?? 15
  const usableYears = Math.max(0, Math.min(assetLifeYears, input.remainingYears))
  const savingWithinLeaseSgd = annualSavingSgd * usableYears - netCostSgd

  let verdict: PaybackVerdict
  if (!Number.isFinite(paybackYears) || savingKwhYear <= 0) {
    verdict = 'unknown'
  } else if (paybackYears > input.remainingYears) {
    verdict = 'beyond-lease'
  } else if (paybackYears > input.remainingYears * 0.85) {
    verdict = 'tight'
  } else {
    verdict = 'inside-lease'
  }

  return {
    paybackYears,
    netCostSgd,
    annualSavingSgd,
    savingKwhYear,
    savingWithinLeaseSgd,
    leaseAtBreakEvenYears: Math.max(0, input.remainingYears - paybackYears),
    verdict,
    consecutiveYears: 0,
  }
}

/** Convenience: payback analysis for one property at a point in time. */
export function paybackFor(
  property: PropertyRecord,
  measure: { costSgd: number; subsidySgd?: number | undefined; savingKwhYear?: number | undefined },
  now: Date = new Date(),
): PaybackAnalysis {
  const position = leasePosition(property.lease, now)
  return analysePayback({
    costSgd: measure.costSgd,
    subsidySgd: measure.subsidySgd,
    savingKwhYear: measure.savingKwhYear,
    tariffCentsPerKwh: property.meter.tariffCentsPerKwh,
    remainingYears: position.remainingYears,
  })
}

/**
 * Retrofit intensity: how much of the remaining term has been spent on
 * energy measures, normalised per square metre. Used on the overview page as a
 * single "is this home keeping up" number.
 */
export function retrofitIntensity(spendSgd: number, floorAreaSqm: number): number {
  if (floorAreaSqm <= 0) return 0
  return spendSgd / floorAreaSqm
}

/** Annualised kWh saving as a share of the property's annual consumption. */
export function savingShare(savingKwhYear: number, annualKwh: number): number {
  if (annualKwh <= 0) return 0
  return savingKwhYear / annualKwh
}
