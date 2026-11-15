import { z } from 'zod'
import type {
  MaintenanceTicket,
  PropertyRecord,
  RetrofitMeasure,
  Subsidy,
  Telemetry,
} from '@/domain/types'
import { PROPERTIES, MEASURES, SUBSIDIES, telemetryFor } from '@/domain/seed'
import { PARITY } from '@/domain/parity'

/**
 * The data boundary.
 *
 * Everything crossing it is validated, exactly as it would be for a real HTTP
 * client: if the shape drifts, the app fails loudly at the boundary instead of
 * half-rendering. The fixture is the only implementation today; swapping in
 * `fetch()` means replacing the `read*` functions and nothing else.
 */

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}

/* ------------------------------------------------------------------ */
/* Schemas — validation gates only; the domain types stay authoritative */
/* ------------------------------------------------------------------ */

const leaseSchema = z.object({
  startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  termYears: z.number().positive(),
})

const propertySchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  unit: z.string().min(1),
  kind: z.enum(['hdb', 'condo', 'landed']),
  flatType: z.string().min(1),
  planningArea: z.string().min(1),
  postalCode: z.string().min(5),
  floorAreaSqm: z.number().positive(),
  householdSize: z.number().int().positive(),
  lease: leaseSchema,
  annualKwh: z.number().nonnegative(),
  score: z.number().min(0).max(100),
  peerPercentile: z.number().min(0).max(100),
  rooms: z.array(z.object({ id: z.string(), hasSensor: z.boolean() })).min(1),
  meter: z.object({
    kind: z.enum(['ami', 'ct-clamp', 'manual']),
    tariffCentsPerKwh: z.number().positive(),
    contractEndsOn: z.string(),
  }),
  management: z.object({
    body: z.enum(['town-council', 'mcst']),
    monthlyChargeSgd: z.number().nonnegative(),
  }),
  benchmarks: z.object({
    eui: z.number().nonnegative(),
    peerMedianKwh: z.number().positive(),
  }),
})

const measureSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  status: z.enum(['installed', 'planned', 'blocked', 'declined']),
  costSgd: z.number().nonnegative(),
  savingKwhYear: z.number().nonnegative().optional(),
})

const ticketSchema = z.object({
  id: z.string().min(1),
  propertyId: z.string().min(1),
  title: z.string().min(1),
  status: z.enum(['open', 'awaiting-inspection', 'in-progress', 'resolved']),
  owner: z.enum(['owner', 'town-council', 'mcst', 'hdb', 'oneservice', 'pub', 'sp-group']),
  severity: z.enum(['routine', 'urgent', 'safety']),
  events: z.array(z.object({ at: z.string(), label: z.string() })),
})

const telemetrySchema = z.object({
  propertyId: z.string().min(1),
  today: z.array(z.object({ at: z.string(), kwh: z.number().nonnegative() })).length(48),
  history: z.array(z.object({ date: z.string(), kwh: z.number().nonnegative() })).min(1),
})

/* ------------------------------------------------------------------ */
/* Latency — real apps are asynchronous; the UI must be built for it    */
/* ------------------------------------------------------------------ */

const LATENCY_MS = 140

function simulateLatency(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, LATENCY_MS)
  })
}

/* ------------------------------------------------------------------ */
/* Persistent store for mutations made in this browser                  */
/* ------------------------------------------------------------------ */

const TICKETS_KEY = 'tenure.tickets.v1'
const PREFERENCES_KEY = 'tenure.preferences.v1'

export interface Preferences {
  activePropertyId: string
  /** Display density for ledgers. */
  density: 'comfortable' | 'compact'
  /** Whether the record highlights measures that fail the lease test. */
  strictLease: boolean
}

export const DEFAULT_PREFERENCES: Preferences = {
  activePropertyId: PROPERTIES[0]!.id,
  density: 'comfortable',
  strictLease: true,
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = globalThis.localStorage?.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(value))
  } catch {
    // Storage can be unavailable (private mode, quota). Mutations still apply
    // in-memory for the session; persistence is a progressive enhancement.
  }
}

export function loadPreferences(): Preferences {
  return { ...DEFAULT_PREFERENCES, ...readJson<Partial<Preferences>>(PREFERENCES_KEY, {}) }
}

export function savePreferences(next: Preferences): void {
  writeJson(PREFERENCES_KEY, next)
}

/* ------------------------------------------------------------------ */
/* Seeded tickets, plus anything the visitor has filed                  */
/* ------------------------------------------------------------------ */

const SEEDED_TICKETS: MaintenanceTicket[] = [
  {
    id: 'tk-seepage-09145',
    propertyId: 'blk-456-tampines-42',
    title: 'Water seepage on kitchen ceiling, from #09-145',
    body: 'A damp patch roughly the size of a dinner plate appeared on the kitchen ceiling last week and has grown. Paint is bubbling and there is a faint musty smell.',
    status: 'awaiting-inspection',
    severity: 'urgent',
    owner: 'hdb',
    routedBecause:
      'Inter-floor seepage in an HDB block: HDB inspects the upper flat and can direct repairs. Both owners may ultimately share the cost of engaging a contractor, so the inspection report matters.',
    openedOn: '2026-11-09T10:12:00+08:00',
    dueOn: '2026-11-10T10:12:00+08:00',
    caseRef: 'HDB/BD/2026/0114',
    roomId: 'kitchen',
    events: [
      { at: '2026-11-09T10:12:00+08:00', label: 'Reported', detail: 'Submitted with 3 photos and a moisture-meter reading of 24 %.' },
      { at: '2026-11-09T15:40:00+08:00', label: 'Acknowledged', detail: 'HDB branch officer assigned.' },
      { at: '2026-11-11T09:05:00+08:00', label: 'Working on it', detail: 'Joint inspection scheduled with both households.' },
      {
        at: '2026-11-13T14:20:00+08:00',
        label: 'Reply from Agency',
        detail: 'Inspection confirms the leak originates in the upper flat’s kitchen waste pipe. Repair notice issued to the upper flat.',
      },
    ],
  },
  {
    id: 'tk-lift-a',
    propertyId: 'blk-456-tampines-42',
    title: 'Lift A stops at level 8 without opening doors',
    body: 'Lift A at Block 456 travelled to level 8, paused, then continued to ground floor without opening. Happened twice this morning.',
    status: 'resolved',
    severity: 'safety',
    owner: 'town-council',
    routedBecause:
      'Lifts are common property under the Town Council’s conservancy contract, and the lift service record is held by the council.',
    openedOn: '2026-10-28T08:41:00+08:00',
    dueOn: '2026-10-28T12:41:00+08:00',
    caseRef: 'TC/TPN/LF/8842',
    events: [
      { at: '2026-10-28T08:41:00+08:00', label: 'Reported' },
      { at: '2026-10-28T09:02:00+08:00', label: 'Acknowledged', detail: 'Lift contractor dispatched.' },
      { at: '2026-10-28T11:30:00+08:00', label: 'Working on it', detail: 'Door sensor replaced.' },
      { at: '2026-10-28T16:10:00+08:00', label: 'Resolved', detail: 'Back in service. Five-year lift certificate unaffected.' },
    ],
  },
  {
    id: 'tk-corridor',
    propertyId: 'blk-456-tampines-42',
    title: 'Corridor light outside #08-145 flickering',
    body: 'The fluorescent batten outside the unit has been flickering for about a week. It is on the stretch between the lift lobby and the stairwell.',
    status: 'in-progress',
    severity: 'routine',
    owner: 'oneservice',
    routedBecause:
      'Corridor lighting is common property maintained by the Town Council. Filed through OneService so the case is routed and tracked with a municipal reference.',
    openedOn: '2026-11-06T19:22:00+08:00',
    dueOn: '2026-11-13T19:22:00+08:00',
    caseRef: 'OS-2026-441192',
    events: [
      { at: '2026-11-06T19:22:00+08:00', label: 'Reported', detail: 'Two photos attached.' },
      { at: '2026-11-07T09:15:00+08:00', label: 'Acknowledged' },
      { at: '2026-11-08T11:40:00+08:00', label: 'Working on it', detail: 'Routed to Town Council conservancy team.' },
    ],
  },
  {
    id: 'tk-ac-master',
    propertyId: 'blk-456-tampines-42',
    title: 'Master bedroom air-con not cooling below 26 °C',
    body: 'Since the recent hot spell the master bedroom unit runs continuously and still sits around 27 °C at night. Filters were cleaned a month ago.',
    status: 'open',
    severity: 'routine',
    owner: 'owner',
    routedBecause:
      'Fittings inside the flat boundary, including the air-conditioning, are the owner’s responsibility. HDB does not service private air-conditioning.',
    openedOn: '2026-11-12T21:05:00+08:00',
    dueOn: '2026-11-19T21:05:00+08:00',
    roomId: 'master',
    events: [
      { at: '2026-11-12T21:05:00+08:00', label: 'Reported', detail: 'Correlated with a 14 % rise in cooling load over nine days.' },
    ],
  },
  {
    id: 'tk-riser-12',
    propertyId: 'meridian-crest-21',
    title: 'Riser leak in level 12 common corridor',
    body: 'Water is pooling at the base of the riser cupboard by the lift lobby and seeping toward unit #12-03’s door. It has rained twice this week.',
    status: 'in-progress',
    severity: 'urgent',
    owner: 'mcst',
    routedBecause:
      'The riser and corridor are common property. The MCST is responsible for the repair and for apportioning any cost through the management fund.',
    openedOn: '2026-11-10T07:48:00+08:00',
    dueOn: '2026-11-11T07:48:00+08:00',
    caseRef: 'MCST3921/WO/2026-573',
    events: [
      { at: '2026-11-10T07:48:00+08:00', label: 'Reported' },
      { at: '2026-11-10T10:20:00+08:00', label: 'Acknowledged', detail: 'Managing agent instructed the plumber.' },
      { at: '2026-11-10T16:05:00+08:00', label: 'Working on it', detail: 'Temporary seal applied; permanent repair quoted at $1,840 from the management fund.' },
    ],
  },
  {
    id: 'tk-gym',
    propertyId: 'meridian-crest-21',
    title: 'Gym treadmill belt slipping',
    body: 'The treadmill nearest the window slips under load. Two residents have mentioned it in the group chat.',
    status: 'resolved',
    severity: 'routine',
    owner: 'mcst',
    routedBecause: 'Gym equipment is common property maintained under the MCST’s facilities contract.',
    openedOn: '2026-10-19T18:30:00+08:00',
    dueOn: '2026-10-26T18:30:00+08:00',
    caseRef: 'MCST3921/WO/2026-512',
    events: [
      { at: '2026-10-19T18:30:00+08:00', label: 'Reported' },
      { at: '2026-10-22T14:00:00+08:00', label: 'Resolved', detail: 'Belt replaced and machine re-commissioned.' },
    ],
  },
  {
    id: 'tk-reno',
    propertyId: 'meridian-crest-21',
    title: 'Renovation noise from #11-02 outside permitted hours',
    body: 'Hacking on a Sunday afternoon, well past the permitted window stated in the by-laws.',
    status: 'open',
    severity: 'routine',
    owner: 'mcst',
    routedBecause:
      'Renovation by-laws and permitted hours in a strata development are set and enforced by the MCST, not by HDB or the Town Council.',
    openedOn: '2026-11-09T15:12:00+08:00',
    dueOn: '2026-11-14T15:12:00+08:00',
    caseRef: 'MCST3921/CMP/2026-118',
    events: [{ at: '2026-11-09T15:12:00+08:00', label: 'Reported' }],
  },
]

function allTickets(): MaintenanceTicket[] {
  const local = readJson<MaintenanceTicket[]>(TICKETS_KEY, [])
  return [...local, ...SEEDED_TICKETS]
}

/* ------------------------------------------------------------------ */
/* Read API                                                            */
/* ------------------------------------------------------------------ */

export async function listProperties(): Promise<PropertyRecord[]> {
  await simulateLatency()
  // Validate, then return the original objects. Returning the zod output here
  // would strip every key the schema does not declare — which is how `flatType`
  // and `rooms` disappeared the first time this shipped.
  for (const property of PROPERTIES) propertySchema.parse(property)
  return PROPERTIES
}

export async function getProperty(id: string): Promise<PropertyRecord> {
  await simulateLatency()
  const found = PROPERTIES.find((p) => p.id === id)
  if (!found) throw new NotFoundError(`No property record for “${id}”.`)
  propertySchema.parse(found)
  return found
}

export async function listMeasures(propertyId: string): Promise<RetrofitMeasure[]> {
  await simulateLatency()
  // Measures belong to whichever home the record is modelling. The fixture keeps
  // one register per home so the two properties read as genuinely different.
  const source = propertyId === 'meridian-crest-21' ? MEASURES.filter(isCondoMeasure) : MEASURES.filter(notCondo)
  source.forEach((m) => measureSchema.parse(m))
  return source
}

const CONDO_MEASURE_IDS = new Set([
  'm-ac-controllers',
  'm-ceiling',
  'm-pv-balcony',
  'm-heater-timer',
  'm-dryer',
])

const isCondoMeasure = (m: RetrofitMeasure): boolean => CONDO_MEASURE_IDS.has(m.id)
const notCondo = (m: RetrofitMeasure): boolean => !CONDO_MEASURE_IDS.has(m.id)

export async function listTickets(propertyId: string): Promise<MaintenanceTicket[]> {
  await simulateLatency()
  const tickets = allTickets().filter((t) => t.propertyId === propertyId)
  tickets.forEach((t) => ticketSchema.parse(t))
  return tickets.sort((a, b) => new Date(b.openedOn).getTime() - new Date(a.openedOn).getTime())
}

export async function listSubsidies(propertyId: string): Promise<Subsidy[]> {
  await simulateLatency()
  return propertyId === 'meridian-crest-21' ? SUBSIDIES.filter((s) => s.id === 's-cfhp') : SUBSIDIES
}

export async function getTelemetry(propertyId: string): Promise<Telemetry> {
  await simulateLatency()
  const { today, history } = telemetryFor(propertyId)
  const payload: Telemetry = {
    propertyId,
    today,
    history,
    capturedAt: today.at(-1)?.at ?? new Date().toISOString(),
  }
  telemetrySchema.parse(payload)
  return payload
}

export async function getParity() {
  await simulateLatency()
  return PARITY
}

/* ------------------------------------------------------------------ */
/* Mutations                                                           */
/* ------------------------------------------------------------------ */

export interface NewTicketInput {
  propertyId: string
  title: string
  body: string
  owner: MaintenanceTicket['owner']
  severity: MaintenanceTicket['severity']
  routedBecause: string
  roomId?: string | undefined
  attachments: number
}

export async function createTicket(input: NewTicketInput): Promise<MaintenanceTicket> {
  await simulateLatency()
  if (input.attachments > 3) {
    throw new Error('OneService accepts a maximum of 3 photos per case.')
  }
  const now = new Date()
  const dueHours = input.severity === 'safety' ? 4 : input.severity === 'urgent' ? 24 : 120
  const ticket: MaintenanceTicket = {
    id: `tk-${now.getTime().toString(36)}`,
    propertyId: input.propertyId,
    title: input.title,
    body: input.body,
    status: 'open',
    severity: input.severity,
    owner: input.owner,
    routedBecause: input.routedBecause,
    openedOn: now.toISOString(),
    dueOn: new Date(now.getTime() + dueHours * 3_600_000).toISOString(),
    ...(input.roomId ? { roomId: input.roomId } : {}),
    events: [{ at: now.toISOString(), label: 'Reported', detail: `${input.attachments} photo attachment(s).` }],
  }
  const existing = readJson<MaintenanceTicket[]>(TICKETS_KEY, [])
  writeJson(TICKETS_KEY, [ticket, ...existing])
  return ticket
}

export async function resolveTicket(ticketId: string, note: string): Promise<MaintenanceTicket> {
  await simulateLatency()
  const local = readJson<MaintenanceTicket[]>(TICKETS_KEY, [])
  const index = local.findIndex((t) => t.id === ticketId)
  if (index === -1) {
    throw new Error('Only cases opened in this browser can be closed from the record.')
  }
  const current = local[index]!
  const updated: MaintenanceTicket = {
    ...current,
    status: 'resolved',
    events: [...current.events, { at: new Date().toISOString(), label: 'Resolved', detail: note }],
  }
  local[index] = updated
  writeJson(TICKETS_KEY, local)
  return updated
}

/** Demo reset — clears locally filed cases so the seeded record can be restored. */
export function resetLocalData(): void {
  writeJson(TICKETS_KEY, [])
}
