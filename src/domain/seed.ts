import type {
  DailyReading,
  IntervalReading,
  PropertyRecord,
  RetrofitMeasure,
  Subsidy,
} from './types'
import { TARIFF_WINDOWS } from './energy'

/**
 * Seeded fixture data.
 *
 * Two homes, deliberately unlike each other: a 1986 four-room HDB flat in
 * Tampines (Town Council, 58 years of lease left, partly retrofitted) and a
 * 1997 condominium apartment in Bukit Merah (MCST, 70 years left, barely
 * touched). Every figure is plausible for a Singapore household, and the
 * numbers are chosen so the calculators produce interesting, non-trivial
 * verdicts rather than all-green demo data.
 *
 * This module is the only place fixture numbers live. `src/data/api.ts`
 * validates everything that leaves it, and a real backend can replace it whole.
 */

/* ------------------------------------------------------------------ */
/* Deterministic pseudo-randomness                                      */
/* ------------------------------------------------------------------ */

/** mulberry32 — small, fast, deterministic. Telemetry must not jitter between renders. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const iso = (d: Date): string => {
  const s = new Date(d.getTime() + 8 * 3600_000).toISOString()
  return `${s.slice(0, 19)}+08:00`
}

/* ------------------------------------------------------------------ */
/* Properties                                                           */
/* ------------------------------------------------------------------ */

export const TAMPINES: PropertyRecord = {
  id: 'blk-456-tampines-42',
  label: 'Blk 456 Tampines Street 42',
  addressLine1: '456 Tampines Street 42',
  unit: '#08-145',
  planningArea: 'Tampines',
  postalDistrict: 'D18',
  postalCode: '520456',
  kind: 'hdb',
  flatType: '4-Room',
  floorAreaSqm: 93,
  storey: 8,
  householdSize: 3,
  bedrooms: 3,
  lease: { startsOn: '1986-04-01', termYears: 99 },
  builtYear: 1986,
  management: {
    body: 'town-council',
    name: 'Tampines Town Council',
    monthlyChargeSgd: 81.5,
    chargeLabel: 'Conservancy charge · 4-room',
    contactEmail: 'conservancy@example-towncouncil.sg',
    hours: 'Mon–Fri 08:30–18:00 · Sat 08:30–12:30',
  },
  rooms: [
    {
      id: 'living',
      name: 'Living / dining',
      note: 'Single-sensor room. The split-unit indoor head discharges across the sofa, so set-point drift shows up here first.',
      aspect: 'west',
      hasSensor: true,
    },
    {
      id: 'master',
      name: 'Master bedroom',
      note: 'West-facing. Wall surface temperature peaks at 20:00, two hours after the air-con starts.',
      aspect: 'west',
      hasSensor: true,
    },
    {
      id: 'bed2',
      name: 'Bedroom 2',
      note: 'North-facing, least solar gain. Used as the control room for the mould comparison.',
      aspect: 'north',
      hasSensor: true,
    },
    {
      id: 'kitchen',
      name: 'Kitchen',
      note: 'Cooking humidity dominates. Sensor sits above the service yard door, not over the hob.',
      aspect: 'east',
      hasSensor: true,
    },
    {
      id: 'shelter',
      name: 'Household shelter',
      note: 'Reinforced concrete box with no through-draught. The coldest wall in the flat and the first place black mould establishes.',
      aspect: 'internal',
      hasSensor: true,
    },
    {
      id: 'service-yard',
      name: 'Service yard',
      note: 'No sensor. Records laundry-drying behaviour from the AC-ledge humidity probe instead.',
      aspect: 'east',
      hasSensor: false,
    },
  ],
  meter: {
    accountNumber: '5-0123-4567-8901',
    kind: 'ami',
    ctClampChannels: ['Whole-flat (single-phase, 40 A)'],
    retailer: 'SP Group regulated tariff',
    contractEndsOn: '2027-03-31',
    tariffLabel: 'Regulated tariff · Q4 2026',
    tariffCentsPerKwh: 31.16,
  },
  annualKwh: 4190,
  benchmarks: {
    eui: 45.1,
    peerLowKwh: 3600,
    peerMedianKwh: 4560,
    peerHighKwh: 5880,
    coolingShare: 0.54,
    coolingDegreeDays: 2460,
  },
  score: 58,
  peerPercentile: 68,
  scoreBreakdown: [
    {
      id: 'fabric',
      label: 'Envelope & glazing',
      score: 42,
      weight: 0.2,
      note: '1986 single-glazed aluminium windows, west elevation unshaded until 2024. Solar gain is the binding constraint.',
    },
    {
      id: 'cooling',
      label: 'Cooling system',
      score: 74,
      weight: 0.3,
      note: 'Inverter System 4 installed 2023. Indoor heads have not been chemically washed in 18 months.',
    },
    {
      id: 'appliances',
      label: 'Appliances',
      score: 66,
      weight: 0.25,
      note: 'Fridge and shower fittings replaced under Climate Vouchers in 2025. Dryer is still a non-heat-pump unit.',
    },
    {
      id: 'behaviour',
      label: 'Operating pattern',
      score: 61,
      weight: 0.15,
      note: 'Air-con runs 21:00–07:00 in two rooms. Set point averages 23.5 °C, below the 25 °C efficiency knee.',
    },
    {
      id: 'renewables',
      label: 'Renewables',
      score: 0,
      weight: 0.1,
      note: 'No generation. Rooftop PV on an HDB block is common property — delivered through SolarNova, not by the flat.',
    },
  ],
  caveats: [
    'No residential EPC exists in Singapore, so this score is constructed from metered consumption, floor area, flat type and climate — not imported from a certificate.',
    'The 2023 air-con works sit inside the current tenancy, not the original lease term. Capital costs are apportioned accordingly.',
  ],
}

export const MEMBINA: PropertyRecord = {
  id: 'meridian-crest-21',
  label: 'Meridian Crest',
  addressLine1: '21 Jalan Membina',
  unit: '#12-03',
  planningArea: 'Bukit Merah',
  postalDistrict: 'D03',
  postalCode: '163021',
  kind: 'condo',
  flatType: 'Private',
  floorAreaSqm: 118,
  storey: 12,
  householdSize: 4,
  bedrooms: 3,
  lease: { startsOn: '1997-08-01', termYears: 99 },
  builtYear: 1997,
  management: {
    body: 'mcst',
    name: 'MCST 3921 — Meridian Crest',
    monthlyChargeSgd: 385,
    chargeLabel: 'MCST contribution',
    shareValue: 62,
    contactEmail: 'ma@meridiancrest.example.sg',
    hours: 'Mon–Fri 09:00–17:00 · 24 h security desk',
  },
  rooms: [
    {
      id: 'living',
      name: 'Living / dining',
      note: 'Open plan, 3.1 m ceiling. West sun through the balcony slides in under the 22:00 curtain.',
      aspect: 'west',
      hasSensor: true,
    },
    {
      id: 'master',
      name: 'Master bedroom',
      note: 'Top-floor unit: the ceiling slab is a direct solar receiver between 13:00 and 17:00.',
      aspect: 'south',
      hasSensor: true,
    },
    {
      id: 'bed2',
      name: 'Bedroom 2',
      note: 'Occupied by a child. AC runs longer here than anywhere else in the flat.',
      aspect: 'east',
      hasSensor: true,
    },
    {
      id: 'bed3',
      name: 'Bedroom 3 / study',
      note: 'Work-from-home desk. CO₂ is the interesting signal, not temperature.',
      aspect: 'north',
      hasSensor: true,
    },
    {
      id: 'kitchen',
      name: 'Kitchen',
      note: 'Enclosed. Extraction hood is a recirculating type, so humidity has nowhere to go.',
      aspect: 'east',
      hasSensor: true,
    },
  ],
  meter: {
    accountNumber: '5-0987-6543-2109',
    kind: 'ct-clamp',
    ctClampChannels: ['Whole-flat supply', 'Air-con condenser circuit', 'Water heater circuit'],
    retailer: 'Open Electricity Market — fixed 24-month',
    contractEndsOn: '2026-12-31',
    tariffLabel: 'Fixed plan · 24 months',
    tariffCentsPerKwh: 28.4,
  },
  annualKwh: 8760,
  benchmarks: {
    eui: 74.2,
    peerLowKwh: 5400,
    peerMedianKwh: 7200,
    peerHighKwh: 9600,
    coolingShare: 0.61,
    coolingDegreeDays: 2460,
  },
  score: 32,
  peerPercentile: 22,
  scoreBreakdown: [
    {
      id: 'fabric',
      label: 'Envelope & glazing',
      score: 35,
      weight: 0.2,
      note: 'Top-floor slab takes direct heat. Balcony glazing is single-pane and faces west.',
    },
    {
      id: 'cooling',
      label: 'Cooling system',
      score: 38,
      weight: 0.3,
      note: 'Original 1997 fan-coil units. Two of three condensers are past their rated life.',
    },
    {
      id: 'appliances',
      label: 'Appliances',
      score: 44,
      weight: 0.25,
      note: 'No appliance register yet — tick ratings unknown for most items.',
    },
    {
      id: 'behaviour',
      label: 'Operating pattern',
      score: 46,
      weight: 0.15,
      note: 'Smart controllers fitted in 2025 cut overnight runtime by 19 %. Set points remain aggressive.',
    },
    {
      id: 'renewables',
      label: 'Renewables',
      score: 0,
      weight: 0.1,
      note: 'No generation. Balcony PV would need an MCST resolution and feeds the common account.',
    },
  ],
  caveats: [
    'The 24-month OEM contract ends 31 Dec 2026. The record flags the renewal decision 45 days out, because the auto-renewal terms are worse than the advertised rate.',
    'Ceiling insulation work affects the lot boundary only; the MCST has confirmed it does not require approval.',
  ],
}

export const PROPERTIES: PropertyRecord[] = [TAMPINES, MEMBINA]

/* ------------------------------------------------------------------ */
/* Retrofit register                                                    */
/* ------------------------------------------------------------------ */

export const MEASURES: RetrofitMeasure[] = [
  {
    id: 'm-ac-system4',
    name: 'Inverter System 4 air-conditioning',
    category: 'cooling',
    status: 'installed',
    installedOn: '2023-05-18',
    costSgd: 4180,
    contractor: 'Gain City — aircon engineering',
    savingKwhYear: 1240,
    evidence: 'measured',
    warrantyEndsOn: '2028-05-18',
    notes:
      'Like-for-like replacement of a non-inverter System 4. Saving is metered: 12 months before against 12 months after, normalised to cooling-degree-days.',
    source: 'SP AMI half-hourly export, May 2022 – May 2024',
  },
  {
    id: 'm-led',
    name: 'Whole-flat LED retrofit',
    category: 'lighting',
    status: 'installed',
    installedOn: '2019-11-02',
    costSgd: 320,
    savingKwhYear: 380,
    evidence: 'measured',
    warrantyEndsOn: '2029-11-02',
    notes:
      'Twenty-two fittings. Measured against a three-week baseline with the old compact fluorescents, adjusted for occupancy.',
    source: 'CT clamp, three-week pre/post baseline',
  },
  {
    id: 'm-fridge',
    name: 'Refrigerator — 4-tick, Climate Voucher purchase',
    category: 'appliance',
    status: 'installed',
    installedOn: '2025-06-14',
    costSgd: 1389,
    subsidySgd: 400,
    subsidyScheme: 'Climate Vouchers (CFHP)',
    contractor: 'Harvey Norman — Millenia Walk',
    savingKwhYear: 310,
    evidence: 'measured',
    warrantyEndsOn: '2035-06-14',
    notes:
      'The full $400 Climate Voucher balance was spent on this purchase. Refrigerators carry the longest duty cycle of any appliance in a Singapore flat — they run 24 hours, so a poor unit is a permanent tax.',
    source: 'NEA tick rating; SP AMI, Jun–Sep 2025',
  },
  {
    id: 'm-shower',
    name: 'Water-efficient shower fittings — 3-tick',
    category: 'water',
    status: 'installed',
    installedOn: '2025-06-14',
    costSgd: 96,
    savingM3Year: 18,
    evidence: 'modelled',
    notes:
      'Two bathrooms. Water is billed by SP Group at the potable rate, so this is a utility saving rather than an energy one — the record tracks both metres separately rather than pretending they are the same.',
    source: 'PUB water efficiency labelling scheme',
  },
  {
    id: 'm-fans',
    name: 'Ceiling fans × 3 (living + 2 bedrooms)',
    category: 'cooling',
    status: 'planned',
    costSgd: 690,
    savingKwhYear: 300,
    evidence: 'modelled',
    notes:
      'Air movement buys roughly 1.5 °C of perceived cooling for about 30 W. The cheapest way to raise the air-con set point without a comfort complaint.',
  },
  {
    id: 'm-film',
    name: 'Solar-control film — west bedrooms',
    category: 'envelope',
    status: 'planned',
    costSgd: 1450,
    savingKwhYear: 210,
    evidence: 'modelled',
    notes:
      'Two west-facing windows totalling 7.2 m². Modelled at 38 % solar heat gain reduction. Payback is long; the case rests on comfort at 20:00, not on energy.',
  },
  {
    id: 'm-hip',
    name: 'HIP — optional package (toilets, door, refuse hopper)',
    category: 'envelope',
    status: 'planned',
    costSgd: 899.25,
    savingKwhYear: 0,
    evidence: 'modelled',
    notes:
      'The Home Improvement Programme is scheduled by precinct, not on demand, and requires a 75 % poll of eligible Singapore Citizen households. The co-payment shown is the 4-room rate. No energy saving is claimed — this is asset condition, not efficiency.',
  },
  {
    id: 'm-pv',
    name: 'Rooftop solar PV (block roof)',
    category: 'renewables',
    status: 'blocked',
    costSgd: 0,
    savingKwhYear: 0,
    notes:
      'The block roof is common property. Residential solar on HDB blocks is delivered through SolarNova and the Town Council, and the generation serves common services — not the flat’s bill. Recorded here so the idea is not raised again every year.',
  },
  {
    id: 'm-ev',
    name: 'Dedicated EV charger at own parking lot',
    category: 'appliance',
    status: 'declined',
    costSgd: 0,
    savingKwhYear: 0,
    notes:
      'No dedicated lot in an HDB multi-storey car park. Charging is provided at the car park level by the appointed operator. Outside the flat owner’s control.',
  },
  {
    id: 'm-ac-controllers',
    name: 'Smart AC controllers × 3',
    category: 'cooling',
    status: 'installed',
    installedOn: '2025-02-11',
    costSgd: 540,
    contractor: 'Third-party installer',
    savingKwhYear: 420,
    evidence: 'measured',
    notes:
      'Schedule-based shut-off at 03:00 and a 25 °C floor. Metered against the same weeks in the prior year.',
    source: 'CT clamp, condenser circuit',
  },
  {
    id: 'm-ceiling',
    name: 'Ceiling insulation — top-floor slab',
    category: 'envelope',
    status: 'planned',
    costSgd: 2800,
    savingKwhYear: 380,
    evidence: 'modelled',
    notes:
      'Top-floor slab reaches 41 °C by 16:00. Insulation delays the heat flux past the evening occupancy peak rather than removing it.',
  },
  {
    id: 'm-pv-balcony',
    name: 'Balcony PV — 1.2 kWp',
    category: 'renewables',
    status: 'planned',
    costSgd: 3200,
    savingKwhYear: 1150,
    evidence: 'modelled',
    notes:
      'Requires an MCST resolution at an AGM. The array would sit within the lot’s exclusive-use balcony, but the mounting and the export arrangement both cross into common property.',
  },
  {
    id: 'm-heater-timer',
    name: 'Water heater timer',
    category: 'hot-water',
    status: 'installed',
    installedOn: '2024-08-30',
    costSgd: 120,
    savingKwhYear: 165,
    evidence: 'measured',
    notes: 'Two 45-minute windows daily instead of a live 3 kW tank. Measured on the dedicated heater CT circuit.',
  },
  {
    id: 'm-dryer',
    name: 'Heat-pump dryer (replace condenser dryer)',
    category: 'appliance',
    status: 'planned',
    costSgd: 1290,
    savingKwhYear: 240,
    evidence: 'modelled',
    notes:
      'In a Singapore flat the laundry is dried indoors during the monsoon anyway; a heat-pump dryer removes roughly 2 kWh per cycle.',
  },
]

/* ------------------------------------------------------------------ */
/* Subsidies and programmes                                             */
/* ------------------------------------------------------------------ */

export const SUBSIDIES: Subsidy[] = [
  {
    id: 's-cfhp',
    name: 'Climate Vouchers',
    administrator: 'Climate Friendly Households Programme (CFHP)',
    covers: [
      'Refrigerators (3-tick and above)',
      'Air-conditioners (5-tick)',
      'Shower fittings (3-tick)',
      'LED lights',
      'And the other eligible fitting types in the 12-type list',
    ],
    eligibility:
      'One set per registered residential address: all HDB households, and Singapore Citizen households in private property.',
    valueLabel: '$400 ($300 from 15 Apr 2024 + $100 from 15 Apr 2025)',
    status: 'claimed',
    deadline: '2027-12-31',
    note:
      'Spent in full on 14 Jun 2025 against the refrigerator purchase. Vouchers remain valid until 31 December 2027, so a second set cannot be claimed at this address.',
  },
  {
    id: 's-hip',
    name: 'Home Improvement Programme (HIP)',
    administrator: 'Housing & Development Board',
    covers: [
      'Essential improvements: spalling concrete, structural cracks, pipe sockets for drying racks — fully funded',
      'Optional improvements: toilets, entrance door and grille, refuse hopper — co-payment applies',
      'EASE 2.0 grab bars and non-slip treatment for senior households',
    ],
    eligibility:
      'Flats around 30 years old (and a second round for 60–70 year old flats). The programme is scheduled by precinct, and requires at least 75 % of eligible Singapore Citizen households to vote for it.',
    valueLabel: 'Optional package co-payment $599.50 – $1,498.75 by flat type',
    status: 'available',
    note:
      'This block (1986) is inside the age window but has not been announced for a HIP precinct. Nothing can be applied for directly — the record simply tracks the eligibility state so the owner is not caught out.',
  },
  {
    id: 's-solarnova',
    name: 'SolarNova (block-level solar)',
    administrator: 'HDB / Economic Development Board',
    covers: ['Solar leasing on HDB block roofs, powering common services such as lifts, lights and pumps'],
    eligibility: 'Blocks and precincts, not individual flats.',
    valueLabel: 'Not claimable by a flat owner',
    status: 'not-eligible',
    note:
      'Listed because residents ask. Generation on the block roof is not netted against a flat’s consumption — there is no residential solar export tariff for HDB flats.',
  },
]

/* ------------------------------------------------------------------ */
/* Telemetry                                                            */
/* ------------------------------------------------------------------ */

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))

interface TelemetryProfile {
  propertyId: string
  /** Whole-flat base load per half hour, kWh. */
  base: number
  /** AC draw per half hour when running, kWh. */
  ac: number
  /** Set point the household actually achieves, °C. */
  setPoint: number
  /** Hours the AC typically runs (inclusive start, exclusive end). */
  acHours: [number, number]
  /** Additional mid-day AC in one room (work-from-home). */
  dayAc?: boolean
  seed: number
}

function buildDay(profile: TelemetryProfile, dayIndex: number, now: Date): IntervalReading[] {
  const rnd = seededRandom(profile.seed + dayIndex * 7919)
  const readings: IntervalReading[] = []
  const dayStart = new Date(now)
  dayStart.setHours(0, 0, 0, 0)

  // Monsoon-ish day-to-day variation: some days are wet and cool.
  const wet = rnd() > 0.62
  const outdoorOffset = wet ? -2.1 : 0.4
  const humidityOffset = wet ? 7 : -2

  for (let slot = 0; slot < 48; slot += 1) {
    const hour = slot / 2
    const at = new Date(dayStart.getTime() + slot * 30 * 60_000)
    const diurnal = Math.sin(((hour - 9) / 24) * Math.PI * 2)
    const outdoorC = 29.2 + diurnal * 3.4 + outdoorOffset + (rnd() - 0.5) * 0.7
    const outdoorRh = clamp(82 - diurnal * 9 + humidityOffset + (rnd() - 0.5) * 4, 55, 97)

    // Each room runs on its own schedule. A flat where every sensor shares one
    // air-con trace looks like fake data, because it is: real households cool
    // the master bedroom overnight, the living room in the evening, and the
    // study in the afternoon.
    const masterOn = hour >= profile.acHours[0] || hour < profile.acHours[1]
    const bed2On = hour >= Math.min(23, profile.acHours[0] + 1) || hour < Math.max(6, profile.acHours[1] - 1)
    const livingOn = (hour >= 19 && hour < 23) || (Boolean(profile.dayAc) && hour >= 10 && hour < 18)
    const bed3On = hour >= 23 || (hour >= 14 && hour < 17)
    const acRooms = Number(masterOn) + Number(bed2On) + Number(livingOn) + Number(bed3On)
    const cooling = acRooms * profile.ac * 0.52

    // Indoor air tracks outdoor air closely, plus a little internal gain and a
    // lot of solar gain on the rooms that face the afternoon sun. Anchoring
    // indoor temperature to a fixed 30 °C rather than to the outdoor reading is
    // what produced a 33 °C bedroom at 23:30 in the first cut.
    const sunUp = hour >= 11 && hour < 18
    const morningSun = hour >= 7 && hour < 11
    const roomsC: Record<string, number> = {}
    const roomsRh: Record<string, number> = {}

    // bias: internal gain, °C. solar: additional gain in direct afternoon sun.
    const spec: Array<{ id: string; bias: number; solar: number; rhBias: number; running: boolean }> = [
      { id: 'living', bias: 1.0, solar: 1.7, rhBias: 2, running: livingOn },
      { id: 'master', bias: 1.2, solar: 2.0, rhBias: 4, running: masterOn },
      { id: 'bed2', bias: 0.8, solar: 0.6, rhBias: 1, running: bed2On },
      { id: 'bed3', bias: 0.8, solar: 0.5, rhBias: 3, running: bed3On },
      { id: 'kitchen', bias: 1.1, solar: 0.3, rhBias: 7, running: false },
    ]

    for (const room of spec) {
      const solarGain = room.id === 'kitchen'
        ? (morningSun ? room.solar : 0)
        : (sunUp ? room.solar : 0)
      roomsC[room.id] = room.running
        ? profile.setPoint + room.bias * 0.3 + (rnd() - 0.5) * 0.8
        : outdoorC + room.bias + solarGain + (rnd() - 0.5) * 0.9
      roomsRh[room.id] = room.running
        ? clamp(52 + room.rhBias + (rnd() - 0.5) * 6, 45, 66)
        : clamp(outdoorRh + room.rhBias - 2 + (rnd() - 0.5) * 5, 62, 92)
    }

    // Cooking pushes the kitchen over the threshold twice a day.
    if (hour >= 18 && hour < 20) roomsRh['kitchen'] = clamp((roomsRh['kitchen'] ?? 72) + 9, 62, 96)

    // The household shelter has no through-draught, so it never really dries.
    roomsC['shelter'] = outdoorC + 0.5 + (rnd() - 0.5) * 0.5
    roomsRh['shelter'] = clamp(80 + humidityOffset * 0.8 + (rnd() - 0.5) * 5, 70, 93)

    let kwh = profile.base + (rnd() - 0.5) * profile.base * 0.18 + cooling
    if (hour >= 18.5 && hour < 20) kwh += 0.34
    if (hour >= 6.5 && hour < 7.5) kwh += 0.28
    if (rnd() > 0.94) kwh += 0.42

    const pm25 = wet ? 6 + rnd() * 6 : 12 + rnd() * 10

    readings.push({
      at: iso(at),
      kwh: Math.max(0.04, Number(kwh.toFixed(3))),
      kwhCooling: Number(Math.min(cooling, kwh).toFixed(3)),
      outdoorC: Number(outdoorC.toFixed(1)),
      outdoorRh: Number(outdoorRh.toFixed(0)),
      roomsC,
      roomsRh,
      pm25: Number(pm25.toFixed(0)),
    })
  }
  return readings
}

function buildHistory(profile: TelemetryProfile, days: number, now: Date): DailyReading[] {
  const rnd = seededRandom(profile.seed + 104_729)
  const rows: DailyReading[] = []
  for (let i = days - 1; i >= 0; i -= 1) {
    const day = new Date(now)
    day.setDate(day.getDate() - i)
    day.setHours(0, 0, 0, 0)
    const weekday = day.getDay()
    // Weekends sit higher: more occupancy, longer AC hours.
    const weekendLift = weekday === 0 || weekday === 6 ? 1.18 : 1
    const wet = rnd() > 0.6
    const kwh = (11.4 + rnd() * 3.2) * weekendLift * (wet ? 0.92 : 1)
    const outdoorC = 29.1 + (wet ? -1.4 : 0.6) + (rnd() - 0.5) * 0.8
    rows.push({
      date: day.toISOString().slice(0, 10),
      kwh: Number(kwh.toFixed(1)),
      outdoorC: Number(outdoorC.toFixed(1)),
      mouldHours: Number((rnd() * 4.2 + (wet ? 3.1 : 0.9)).toFixed(1)),
    })
  }
  return rows
}

const PROFILES: Record<string, TelemetryProfile> = {
  [TAMPINES.id]: {
    propertyId: TAMPINES.id,
    base: 0.17,
    ac: 0.62,
    setPoint: 24.6,
    acHours: [21, 7],
    seed: 20261,
  },
  [MEMBINA.id]: {
    propertyId: MEMBINA.id,
    base: 0.26,
    ac: 0.95,
    setPoint: 23.4,
    acHours: [19, 7],
    dayAc: true,
    seed: 91573,
  },
}

export function telemetryFor(propertyId: string, now: Date = new Date()): {
  today: IntervalReading[]
  history: DailyReading[]
} {
  const profile = PROFILES[propertyId] ?? PROFILES[TAMPINES.id]!
  return {
    today: buildDay(profile, Math.floor(now.getTime() / 86_400_000), now),
    history: buildHistory(profile, 90, now),
  }
}

/** Today's load attributed to tariff windows, for the tariff strip. */
export function tariffAttribution(intervals: IntervalReading[]): Array<{ id: string; kwh: number }> {
  return TARIFF_WINDOWS.map((w) => ({
    id: w.id,
    kwh: intervals
      .filter((r) => {
        const h = Number(new Date(r.at).toLocaleString('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Asia/Singapore' }))
        return h >= w.startHour && h < w.endHour
      })
      .reduce((sum, r) => sum + r.kwh, 0),
  }))
}
