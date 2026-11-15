import type { Coverage, ParityRow } from './types'

/**
 * Competitor parity, evidenced.
 *
 * Every row below was read off the competitor's own live page on 2026-11-15.
 * `capability` is close to verbatim so the claim can be checked; `coverage` is
 * Tenure's honest position against it. Nothing here is inferred from memory: if
 * a site blocked the reader (PropertyGuru and the HDB Flat Portal both return
 * 403), it is absent rather than guessed at.
 */

const CHECKED = '2026-11-15'

export const PARITY: ParityRow[] = [
  /* ---------------- Utility & energy insight ---------------- */
  {
    id: 'sp-consumption-views',
    category: 'Utility insight',
    competitor: 'SP app — Consumption Insights',
    capability: 'Check meter readings by day, month or year.',
    whyItMatters:
      'Residents already expect to zoom from a year of history to a single half-hour slot. Anything less feels like a downgrade from the utility’s own app.',
    coverage: 'shipped',
    where: 'Energy · the day / 90-day / 12-month switch',
    sourceUrl: 'https://www.spdigital.sg/spapp/consumption-insight',
    checkedOn: CHECKED,
  },
  {
    id: 'sp-carbon',
    category: 'Utility insight',
    competitor: 'SP app',
    capability: 'My Carbon Footprint.',
    whyItMatters:
      'Emissions are the language the Green Plan is written in, and residents use them to justify spending on efficiency.',
    coverage: 'shipped',
    where: 'Energy · emissions panel, grid factor 0.41 kg CO₂e/kWh',
    sourceUrl: 'https://www.spdigital.sg/spapp',
    checkedOn: CHECKED,
  },
  {
    id: 'sp-green-goals',
    category: 'Utility insight',
    competitor: 'SP app',
    capability: 'Green Goals, set in line with SG Green Plan 2030.',
    whyItMatters:
      'A target turns a dashboard into a commitment. Without one, the record is only a mirror.',
    coverage: 'partial',
    where: 'Energy · peer band target, no national goal linkage',
    sourceUrl: 'https://www.spdigital.sg/spapp/consumption-insight',
    checkedOn: CHECKED,
  },
  {
    id: 'sp-meter-read',
    category: 'Utility insight',
    competitor: 'SP app',
    capability: 'Submit meter readings for accurate billing.',
    whyItMatters:
      'Homes without an advanced meter are read once every two months, with estimates in between. Letting the resident correct that is a genuine accuracy win.',
    coverage: 'planned',
    sourceUrl: 'https://www.spdigital.sg/spapp/consumption-insight',
    checkedOn: CHECKED,
  },
  {
    id: 'sp-bill-pay',
    category: 'Utility insight',
    competitor: 'SP app',
    capability: 'Pay electricity, water and gas bills in a tap.',
    whyItMatters: 'Table stakes for a utilities app — and deliberately not what Tenure is.',
    coverage: 'gap',
    sourceUrl: 'https://www.spdigital.sg/spapp',
    checkedOn: CHECKED,
  },
  {
    id: 'sp-ev',
    category: 'Utility insight',
    competitor: 'SP app',
    capability: 'Singapore’s largest EV charging network, with ChargeUP rewards.',
    whyItMatters:
      'Relevant to retrofit economics if the household is considering an EV, but a network product rather than a record.',
    coverage: 'gap',
    sourceUrl: 'https://www.spdigital.sg/spapp',
    checkedOn: CHECKED,
  },
  {
    id: 'oem-intervals',
    category: 'Utility insight',
    competitor: 'Open Electricity Market',
    capability:
      'Advanced meters record consumption at half-hourly intervals; cumulative meters are read once every two months.',
    whyItMatters:
      'This dual reality is the single most important data-quality constraint in the product. The UI must label whether a number is metered or estimated.',
    coverage: 'shipped',
    where: 'Energy · meter provenance badge (AMI vs estimated)',
    sourceUrl: 'https://www.openelectricitymarket.sg/residential/metering-options',
    checkedOn: CHECKED,
  },
  {
    id: 'oem-load-profile',
    category: 'Utility insight',
    competitor: 'Open Electricity Market',
    capability: 'Load profile view for consumers on advanced meters.',
    whyItMatters: 'Load shape, not total consumption, is what tells you when to shift a cycle.',
    coverage: 'shipped',
    where: 'Telemetry · 48-interval load curve',
    sourceUrl: 'https://www.openelectricitymarket.sg/residential/metering-options',
    checkedOn: CHECKED,
  },
  {
    id: 'sp-tariff',
    category: 'Utility insight',
    competitor: 'SP Group',
    capability: 'Regulated tariff, revised quarterly — 31.16¢/kWh including GST for Q4 2026.',
    whyItMatters:
      'Every payback figure is denominated in this number, and it moves four times a year. Hard-coding it silently would be wrong within a quarter.',
    coverage: 'shipped',
    where: 'Energy · tariff card, with the vintage stated',
    sourceUrl: 'https://www.spgroup.com.sg/our-services/utilities/tariff-information',
    checkedOn: CHECKED,
  },

  /* ---------------- Municipal reporting ---------------- */
  {
    id: 'os-case',
    category: 'Municipal reporting',
    competitor: 'OneService',
    capability: 'Submit a case with up to three photos.',
    whyItMatters:
      'The photo limit is a real product constraint, not an arbitrary one — and residents have learned it.',
    coverage: 'shipped',
    where: 'Maintenance · report form, capped at 3 attachments',
    sourceUrl: 'https://www.oneservice.gov.sg/osapp-faq/',
    checkedOn: CHECKED,
  },
  {
    id: 'os-status',
    category: 'Municipal reporting',
    competitor: 'OneService',
    capability:
      'Status vocabulary: Acknowledged · Working on it · Resolved · Reply from Agency · Reply from Town Council.',
    whyItMatters:
      'Using the state vocabulary residents already recognise removes the single biggest source of “is anyone looking at this?” anxiety.',
    coverage: 'shipped',
    where: 'Maintenance · ticket timeline',
    sourceUrl: 'https://www.oneservice.gov.sg/osapp-faq/',
    checkedOn: CHECKED,
  },
  {
    id: 'os-singpass',
    category: 'Municipal reporting',
    competitor: 'OneService',
    capability: 'Singpass login to retrieve your details.',
    whyItMatters:
      'Property data is personal data. Singpass is the expected identity layer, and an email-and-password login would read as less safe.',
    coverage: 'planned',
    sourceUrl: 'https://www.oneservice.gov.sg/osapp-faq/',
    checkedOn: CHECKED,
  },
  {
    id: 'os-multilingual',
    category: 'Municipal reporting',
    competitor: 'OneService chatbot',
    capability: 'Voice and chat support in English, Chinese, Malay, or Tamil.',
    whyItMatters:
      'A Singapore product that only speaks English is excluding a large share of the households that most need maintenance help.',
    coverage: 'gap',
    sourceUrl: 'https://www.oneservice.gov.sg/oneservice/oneservice-app-and-chatbot/',
    checkedOn: CHECKED,
  },
  {
    id: 'os-booking',
    category: 'Municipal reporting',
    competitor: 'OneService',
    capability: 'Booking BBQ pits and void decks.',
    whyItMatters: 'Community bookings sit in the same surface as defects for a reason: they are the same Town Council relationship.',
    coverage: 'gap',
    sourceUrl: 'https://www.oneservice.gov.sg/oneservice/oneservice-app-and-chatbot/',
    checkedOn: CHECKED,
  },
  {
    id: 'os-lift',
    category: 'Municipal reporting',
    competitor: 'OneService',
    capability: 'Updates on HDB lift faults.',
    whyItMatters: 'Lift outages are the most common safety-adjacent municipal event in a high-rise estate.',
    coverage: 'partial',
    where: 'Maintenance · lift tickets carry the Town Council reference',
    sourceUrl: 'https://www.oneservice.gov.sg/oneservice/oneservice-app-and-chatbot/',
    checkedOn: CHECKED,
  },
  {
    id: 'os-rating',
    category: 'Municipal reporting',
    competitor: 'OneService',
    capability: 'Rate Our Service after a case closes.',
    whyItMatters: 'Closure quality is the part of maintenance that everyone skips and every resident notices.',
    coverage: 'planned',
    sourceUrl: 'https://www.oneservice.gov.sg/osapp-faq/',
    checkedOn: CHECKED,
  },

  /* ---------------- Statutory & programme context ---------------- */
  {
    id: 'hdb-leak',
    category: 'Statutory context',
    competitor: 'HDB',
    capability:
      'Flat owners are responsible for upkeep of their flat; for leaks from common property, contact the Town Council; neighbours may have to engage a contractor together.',
    whyItMatters:
      'Inter-floor seepage is the highest-friction maintenance case in Singapore housing. Whoever documents it well owns the relationship.',
    coverage: 'shipped',
    where: 'Maintenance · seepage case with the joint-inspection trail',
    sourceUrl:
      'https://www.hdb.gov.sg/managing-my-home/renovation-and-maintenance/home-maintenance/home-care-guide/ceiling-leaks',
    checkedOn: CHECKED,
  },
  {
    id: 'cfhp',
    category: 'Statutory context',
    competitor: 'Climate Friendly Households Programme',
    capability:
      '$400 in Climate Vouchers, across 12 eligible product types, valid until 31 December 2027.',
    whyItMatters:
      'This is the only direct cash incentive for most Singapore households. A retrofit register that ignores it overstates every payback.',
    coverage: 'shipped',
    where: 'Retrofit · subsidy tracker and measure-level claim',
    sourceUrl: 'https://www.climate-friendly-households.gov.sg/about/',
    checkedOn: CHECKED,
  },
  {
    id: 'bca-greenmark',
    category: 'Statutory context',
    competitor: 'BCA Green Mark',
    capability:
      'Singapore’s green building rating system, for new and existing buildings; certification via CorpPass, 4–6 months, valid 3 years.',
    whyItMatters:
      'It certifies buildings, not homes. That gap is exactly why Tenure has to construct an energy score instead of importing a certificate.',
    coverage: 'partial',
    where: 'Record · stated explicitly, so the absence is explained rather than faked',
    sourceUrl: 'https://www1.bca.gov.sg/sustainability/greenmark/',
    checkedOn: CHECKED,
  },
  {
    id: 'hip',
    category: 'Statutory context',
    competitor: 'HDB Home Improvement Programme',
    capability:
      'Scheduled by precinct for flats around 30 years old, with optional packages co-paid at $599.50–$1,498.75 by flat type, subject to a 75% poll.',
    whyItMatters:
      'Co-payment and precinct scheduling decide whether a measure is a decision at all. Most owners learn this too late.',
    coverage: 'shipped',
    where: 'Retrofit · eligibility state and co-payment band',
    sourceUrl: 'https://www.gov.sg/explainers/5-things-you-should-know-if-your-home-is-undergoing-hip/',
    checkedOn: CHECKED,
  },

  /* ---------------- Strata management ---------------- */
  {
    id: 'mc-supplier',
    category: 'Strata management',
    competitor: 'myCondo',
    capability: 'mySupplier — contractor and warranty expiry tracking.',
    whyItMatters: 'A warranty that expires unnoticed is a free repair the owner pays for twice.',
    coverage: 'shipped',
    where: 'Retrofit · warranty expiry on every installed measure',
    sourceUrl: 'https://mycondo.sg/',
    checkedOn: CHECKED,
  },
  {
    id: 'mc-feedback',
    category: 'Strata management',
    competitor: 'myCondo',
    capability: 'myFeedback and myReport — defect reporting and estate feedback.',
    whyItMatters: 'The condo equivalent of OneService, and residents expect it inside the same app as their unit record.',
    coverage: 'shipped',
    where: 'Maintenance · MCST-routed tickets',
    sourceUrl: 'https://mycondo.sg/',
    checkedOn: CHECKED,
  },
  {
    id: 'mc-aircon',
    category: 'Strata management',
    competitor: 'myCondo',
    capability: 'myAircon — air-conditioning servicing as a booked service.',
    whyItMatters:
      'Air-con is the dominant load and the least-maintained asset in a tropical flat. A servicing log is the cheapest efficiency measure available.',
    coverage: 'partial',
    where: 'Telemetry · service-due signal, no booking engine',
    sourceUrl: 'https://mycondo.sg/',
    checkedOn: CHECKED,
  },
  {
    id: 'mc-visitor',
    category: 'Strata management',
    competitor: 'myCondo',
    capability: 'myVisitor and myVehicle — visitor and vehicle management.',
    whyItMatters: 'A condo gate record; useful context, not a home-performance record.',
    coverage: 'gap',
    sourceUrl: 'https://mycondo.sg/',
    checkedOn: CHECKED,
  },
  {
    id: 'mc-facility',
    category: 'Strata management',
    competitor: 'myCondo',
    capability: 'myFacility — common facility booking.',
    whyItMatters: 'Expected in any condo app, and adjacent to the MCST relationship rather than to the building record.',
    coverage: 'gap',
    sourceUrl: 'https://mycondo.sg/',
    checkedOn: CHECKED,
  },
  {
    id: 'qs-agm',
    category: 'Strata management',
    competitor: 'Qornerstone — Qommunity Plus',
    capability: 'AGM e-voting with live quorum and instant tally.',
    whyItMatters:
      'Consent is the real bottleneck for every condo retrofit. Without a resolution workflow, planned measures sit at “pending approval” forever.',
    coverage: 'gap',
    sourceUrl: 'https://qornerstone.com/',
    checkedOn: CHECKED,
  },
  {
    id: 'qs-paynow',
    category: 'Strata management',
    competitor: 'Qornerstone',
    capability: 'QuickPay auto-receipting with PayNow QR; InvoiceNow, IMDA-certified and IRAS-compliant.',
    whyItMatters: 'Singapore strata finance runs on PayNow and GST-compliant invoicing. Neither is optional.',
    coverage: 'gap',
    sourceUrl: 'https://qornerstone.com/',
    checkedOn: CHECKED,
  },
  {
    id: 'qs-sinking',
    category: 'Strata management',
    competitor: 'Qornerstone',
    capability: 'Sinking-fund planning, compliant with the Building Maintenance and Strata Management Act.',
    whyItMatters:
      'A sinking fund is the only realistic capital source for a shared retrofit, and it is a statutory artefact, not a convenience.',
    coverage: 'partial',
    where: 'Record · share value and contribution shown; no fund ledger',
    sourceUrl: 'https://qornerstone.com/',
    checkedOn: CHECKED,
  },

  /* ---------------- Valuation & transaction ---------------- */
  {
    id: 'co-xvalue',
    category: 'Valuation',
    competitor: '99.co',
    capability: '99 Property Value and X-Value™, powered by SRX.',
    whyItMatters:
      'Retrofit value only materialises at resale, and Singapore buyers price on transaction data. Without an AVM the record cannot show whether a measure paid.',
    coverage: 'gap',
    sourceUrl: 'https://www.99.co/',
    checkedOn: CHECKED,
  },
  {
    id: 'co-calc',
    category: 'Valuation',
    competitor: '99.co',
    capability: 'Calculators for eligibility, stamp duty, TDSR, MSR, affordability, mortgage and progressive payments.',
    whyItMatters:
      'The affordability question and the retrofit question are the same conversation for an upgrading household.',
    coverage: 'gap',
    sourceUrl: 'https://www.99.co/',
    checkedOn: CHECKED,
  },
]

export interface ParitySummary {
  total: number
  shipped: number
  partial: number
  planned: number
  gap: number
  coveragePct: number
  byCategory: Array<{ category: string; total: number; shipped: number; partial: number }>
}

export function summariseParity(rows: ParityRow[] = PARITY): ParitySummary {
  const count = (c: Coverage): number => rows.filter((r) => r.coverage === c).length
  const total = rows.length
  const shipped = count('shipped')
  const partial = count('partial')
  const categories = [...new Set(rows.map((r) => r.category))]
  return {
    total,
    shipped,
    partial,
    planned: count('planned'),
    gap: count('gap'),
    // Partial counts half: the capability exists but does not fully match the competitor.
    coveragePct: total === 0 ? 0 : Math.round(((shipped + partial * 0.5) / total) * 100),
    byCategory: categories.map((category) => {
      const inCategory = rows.filter((r) => r.category === category)
      return {
        category,
        total: inCategory.length,
        shipped: inCategory.filter((r) => r.coverage === 'shipped').length,
        partial: inCategory.filter((r) => r.coverage === 'partial').length,
      }
    }),
  }
}

/** Rows that represent a real commercial risk if left unbuilt. */
export function criticalGaps(rows: ParityRow[] = PARITY): ParityRow[] {
  return rows.filter((r) => r.coverage === 'gap' && /Singpass|AGM|PayNow|X-Value|chatbot/i.test(r.capability + r.whyItMatters))
}
