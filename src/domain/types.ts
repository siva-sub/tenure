/**
 * The domain vocabulary of a Singapore home record.
 *
 * Nothing in here knows about React, HTTP or storage. The same types are used by
 * the seeded fixture, the zod boundary in `src/data/api.ts`, and the calculators,
 * so a real backend can replace the fixture without touching the UI.
 */

export type PropertyKind = 'hdb' | 'condo' | 'landed'

/** HDB flat types are a regulated taxonomy — do not invent new ones in copy. */
export type FlatType = '2-Room Flexi' | '3-Room' | '4-Room' | '5-Room' | 'Executive' | 'Private'

export type ManagementBody = 'town-council' | 'mcst'

export interface Lease {
  /** ISO date the 99-year (or remaining) term starts. */
  startsOn: string
  termYears: number
}

export interface Management {
  body: ManagementBody
  /** e.g. "Tampines Town Council" or "MCST 3921 — Meridian Crest" */
  name: string
  /** Monthly charge in SGD: conservancy charge (HDB) or MCST maintenance contribution. */
  monthlyChargeSgd: number
  /** Short label for the charge, e.g. "Conservancy (4-room)" / "MCST contribution". */
  chargeLabel: string
  /** Share value, for MCST properties only — drives levy apportionment. */
  shareValue?: number
  contactEmail: string
  /** Human opening hours, shown on the maintenance page. */
  hours: string
}

export interface Room {
  id: string
  name: string
  /** Why this room is monitored — keeps the UI honest about sensor placement. */
  note: string
  /** Local mean radiant discomfort in a tropical flat is dominated by these. */
  aspect: 'north' | 'south' | 'east' | 'west' | 'internal'
  hasSensor: boolean
}

export interface Meter {
  /** The SP Services account number is the join key to the utility bill. */
  accountNumber: string
  /** AMI = SP's advanced metering infrastructure (half-hourly smart meter). */
  kind: 'ami' | 'ct-clamp' | 'manual'
  ctClampChannels: string[]
  retailer: string
  /** OEM contract end date — a renewal/unwind decision the record should surface. */
  contractEndsOn: string
  tariffLabel: string
  tariffCentsPerKwh: number
}

export interface EnergyBenchmarks {
  /** kWh per square metre per year. */
  eui: number
  /** Peer band for the same flat type and town, kWh/yr. */
  peerLowKwh: number
  peerMedianKwh: number
  peerHighKwh: number
  /** Share of annual consumption attributable to space cooling, 0–1. */
  coolingShare: number
  /** Modelled cooling-degree-days for the year, base 24 °C. */
  coolingDegreeDays: number
}

export interface PropertyRecord {
  id: string
  /** Display name, e.g. "Blk 456 Tampines Street 42". */
  label: string
  addressLine1: string
  unit: string
  planningArea: string
  postalDistrict: string
  postalCode: string
  kind: PropertyKind
  flatType: FlatType
  floorAreaSqm: number
  storey: number
  householdSize: number
  bedrooms: number
  lease: Lease
  builtYear: number
  management: Management
  rooms: Room[]
  meter: Meter
  /** Annual consumption in kWh for the trailing 12 months. */
  annualKwh: number
  benchmarks: EnergyBenchmarks
  /** Whole-flat energy score, 0–100 (higher is better). */
  score: number
  /** 0–100 percentile within same flat type + town; 100 = most efficient. */
  peerPercentile: number
  /** Fabric, cooling, appliances, behaviour, renewables — each 0–100. */
  scoreBreakdown: ScoreFactor[]
  /** Roadmap items that were declined or are blocked, with the reason. */
  caveats: string[]
}

export interface ScoreFactor {
  id: string
  label: string
  score: number
  weight: number
  note: string
}

export type MeasureCategory =
  | 'cooling'
  | 'envelope'
  | 'hot-water'
  | 'lighting'
  | 'appliance'
  | 'renewables'
  | 'water'

export type MeasureStatus = 'installed' | 'planned' | 'blocked' | 'declined'

/** "measured" means metered before/after; "modelled" means an engineering estimate. */
export type Evidence = 'measured' | 'modelled' | 'supplier-claim'

export interface RetrofitMeasure {
  id: string
  name: string
  category: MeasureCategory
  status: MeasureStatus
  /** Present for installed measures. */
  installedOn?: string
  costSgd: number
  subsidySgd?: number
  subsidyScheme?: string
  contractor?: string
  /** Verified or modelled annual saving in kWh. */
  savingKwhYear?: number
  /** Annual water saving in cubic metres, where relevant. */
  savingM3Year?: number
  evidence?: Evidence
  warrantyEndsOn?: string
  notes: string
  /** Free-text provenance, shown in the measure drawer. */
  source?: string
}

/** Static catalogue entry: what may be installed, by whom, on what. */
export interface MeasureTemplate {
  id: string
  name: string
  category: MeasureCategory
  /** One-line explanation of the physics, not marketing. */
  mechanism: string
  typicalCostSgd: [number, number]
  typicalSavingKwhYear: number
  allowedFor: PropertyKind[]
  /** Whose consent is needed before work starts. */
  requiresConsent: Array<'owner' | 'mcst' | 'town-council' | 'hdb' | 'lta' | 'none'>
  consentNote: string
  /** Minimum remaining lease (years) for the payback to be considered sane. */
  minRemainingLeaseYears: number
  subsidyScheme?: string
}

export type TicketOwner = 'owner' | 'town-council' | 'mcst' | 'hdb' | 'oneservice' | 'pub' | 'sp-group'
export type TicketStatus = 'open' | 'awaiting-inspection' | 'in-progress' | 'resolved'
export type TicketSeverity = 'routine' | 'urgent' | 'safety'

export interface TicketEvent {
  at: string
  label: string
  detail?: string
}

export interface MaintenanceTicket {
  id: string
  propertyId: string
  title: string
  /** What is actually broken, in the resident's words. */
  body: string
  status: TicketStatus
  severity: TicketSeverity
  owner: TicketOwner
  /** Why it was routed to that owner — the legal/management basis. */
  routedBecause: string
  openedOn: string
  dueOn: string
  caseRef?: string
  /** Which room the issue is in; links to the sensor map. */
  roomId?: string
  events: TicketEvent[]
}

export interface Subsidy {
  id: string
  name: string
  administrator: string
  covers: string[]
  /** Who is eligible, in the administrator's own terms. */
  eligibility: string
  valueLabel: string
  status: 'claimed' | 'available' | 'expired' | 'not-eligible'
  deadline?: string
  note: string
}

/** One 30-minute interval. Singapore's AMI meters report half-hourly. */
export interface IntervalReading {
  /** ISO instant, local +08:00. */
  at: string
  /** Whole-flat load in kWh for this half hour. */
  kwh: number
  /** Attributable share for cooling (AC + fans), in kWh. */
  kwhCooling: number
  outdoorC: number
  outdoorRh: number
  /** Reading per room id; absent when the room has no sensor. */
  roomsC: Record<string, number>
  roomsRh: Record<string, number>
  /** NEA-style PM2.5 in µg/m³. */
  pm25: number
}

export interface DailyReading {
  date: string
  kwh: number
  outdoorC: number
  /** Hours the living room spent above 70 % RH (mould-relevant). */
  mouldHours: number
}

export interface Telemetry {
  propertyId: string
  /** Today, 48 half-hourly intervals. */
  today: IntervalReading[]
  /** Trailing 90 days, one row per day. */
  history: DailyReading[]
  /** Instant the fixture/telemetry was captured. */
  capturedAt: string
}

/** Feature parity, evidenced from a live competitor page. */
export type Coverage = 'shipped' | 'partial' | 'planned' | 'gap'

export interface ParityRow {
  id: string
  category: string
  competitor: string
  /** Verbatim or near-verbatim capability taken from the competitor's own page. */
  capability: string
  whyItMatters: string
  coverage: Coverage
  /** Where in Tenure the capability lives, if shipped. */
  where?: string
  sourceUrl: string
  /** ISO date the page was read. */
  checkedOn: string
}

export interface PricePoint {
  retailer: string
  plan: string
  centsPerKwh: number
  contractMonths: number
  note: string
  /** Percent below the regulated tariff. */
  deltaPct: number
}
