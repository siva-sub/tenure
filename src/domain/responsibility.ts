import type { MaintenanceTicket, PropertyKind, TicketOwner, TicketSeverity } from './types'

/**
 * Who is responsible for what.
 *
 * This is the part of Singapore property management that residents most often
 * get wrong, and the part a "living record" must get right: a leaking ceiling in
 * an HDB flat is a different legal animal from a leaking riser in a condo. The
 * rules below encode the split between the flat owner, the Town Council, the
 * MCST, and HDB as a statutory body.
 */

export interface ResponsibilityRule {
  id: string
  /** Short human label, used in the responsibility matrix. */
  label: string
  /** What the resident is reporting. */
  match: RegExp
  ownerByKind: Record<PropertyKind, TicketOwner>
  severity: TicketSeverity
  /** Plain-language basis for the routing decision. */
  because: Readonly<Record<PropertyKind, string>>
}

export const RESPONSIBILITY_RULES: ResponsibilityRule[] = [
  {
    id: 'water-seepage',
    label: 'Inter-floor seepage and ceiling leaks',
    match: /seepage|water stain|ceiling leak|damp patch|leak from (above|upstairs)/i,
    ownerByKind: { hdb: 'hdb', condo: 'mcst', landed: 'owner' },
    severity: 'urgent',
    because: {
      hdb: 'Seepage between flats in an HDB block is handled through HDB, which can inspect the upper unit and direct repairs. Keep the photos and the inspection reference — this is also the evidence trail if the case goes to the Community Disputes Resolution Tribunal.',
      condo: 'Seepage from a neighbouring lot in a strata development goes to the MCST, who will inspect the shared riser and stack before apportioning repair cost under the share value.',
      landed: 'A leak within a landed property boundary is entirely an owner repair; engage a licensed plumber and keep the invoice for the record.',
    },
  },
  {
    id: 'lift',
    label: 'Lifts and lift certification',
    match: /lift|elevator/i,
    ownerByKind: { hdb: 'town-council', condo: 'mcst', landed: 'owner' },
    severity: 'safety',
    because: {
      hdb: 'Lifts are common property maintained by the Town Council under its conservancy contract. HDB also publishes lift-fault status, so the ticket carries the block reference.',
      condo: 'Lifts in a strata development are common property under the MCST, who hold the service contract and the statutory lift certification.',
      landed: 'Not applicable — no common lift.',
    },
  },
  {
    id: 'corridor-lighting',
    label: 'Corridors, void decks and staircases',
    match: /corridor|common area|void deck|staircase|lamp post|light(ing)? (at|along)/i,
    ownerByKind: { hdb: 'town-council', condo: 'mcst', landed: 'owner' },
    severity: 'routine',
    because: {
      hdb: 'Corridors, void decks and staircases are common property; the Town Council pays for their electricity and maintenance out of conservancy charges.',
      condo: 'Common-area lighting sits within the MCST’s maintenance contribution.',
      landed: 'No common property; the record treats this as an owner item.',
    },
  },
  {
    id: 'roof-solar',
    label: 'Roofs, solar and rooftop plant',
    match: /solar|photovoltaic|pv panel|roof/i,
    ownerByKind: { hdb: 'town-council', condo: 'mcst', landed: 'owner' },
    severity: 'routine',
    because: {
      hdb: 'The block roof is common property. Residential solar on HDB blocks is delivered through SolarNova and the Town Council, not by an individual flat owner.',
      condo: 'Rooftop plant is common property; adding PV needs an MCST resolution, and the generation benefits the common account, not one lot.',
      landed: 'A landed roof is yours, but the installation still needs the relevant authority approval and a licensed electrical worker.',
    },
  },
  {
    id: 'renovation',
    label: 'Renovation permits and hours',
    match: /renovation|hacking|drilling|noise|works/i,
    ownerByKind: { hdb: 'town-council', condo: 'mcst', landed: 'town-council' },
    severity: 'routine',
    because: {
      hdb: 'Renovation permits and permitted hours for HDB flats are administered by the Town Council; unpermitted hacking is a reportable breach.',
      condo: 'Renovation by-laws and permitted hours are set and enforced by the MCST.',
      landed: 'Works affecting the streetscape or party walls fall to the Town Council and the relevant authority.',
    },
  },
  {
    id: 'internal-defect',
    label: 'Fittings inside the flat',
    match: /aircon|air-con|ac ledge|tap|toilet|basin|entrance door|window|gate|internal|socket|water heater|\bfan\b|hob|stove/i,
    ownerByKind: { hdb: 'owner', condo: 'owner', landed: 'owner' },
    severity: 'routine',
    because: {
      hdb: 'Fittings inside the flat boundary are the owner’s responsibility. HDB covers structural defects and, for older flats, the Home Improvement Programme.',
      condo: 'Everything within the lot boundary is owner-maintained; the MCST is only responsible from the boundary outwards.',
      landed: 'Owner-maintained throughout.',
    },
  },
  {
    id: 'utility',
    label: 'Supply, metering and billing',
    match: /meter|electricity|water bill|supply|town gas|gas leak/i,
    ownerByKind: { hdb: 'sp-group', condo: 'sp-group', landed: 'sp-group' },
    severity: 'urgent',
    because: {
      hdb: 'Metering, supply and billing sit with SP Group as the utility; a gas escape is an emergency call, not a ticket.',
      condo: 'Metering, supply and billing sit with SP Group as the utility.',
      landed: 'Metering, supply and billing sit with SP Group as the utility.',
    },
  },
]

export const FALLBACK_RULE_ID = 'internal-defect'

export interface RoutingResult {
  owner: TicketOwner
  severity: TicketSeverity
  because: string
  ruleId: string
}

/**
 * Route a free-text report to the correct responsible party. Deliberately
 * deterministic and inspectable: the ticket UI shows the matched rule and the
 * basis, so a resident can disagree and re-route.
 */
export function routeReport(text: string, kind: PropertyKind): RoutingResult {
  const normalised = text.trim()
  const rule = RESPONSIBILITY_RULES.find((r) => r.match.test(normalised))
  if (rule) {
    return {
      owner: rule.ownerByKind[kind],
      severity: rule.severity,
      because: rule.because[kind],
      ruleId: rule.id,
    }
  }
  const fallback = RESPONSIBILITY_RULES.find((r) => r.id === FALLBACK_RULE_ID)!
  return {
    owner: fallback.ownerByKind[kind],
    severity: fallback.severity,
    because: fallback.because[kind],
    ruleId: fallback.id,
  }
}

export const OWNER_LABEL: Record<TicketOwner, string> = {
  owner: 'Owner',
  'town-council': 'Town Council',
  mcst: 'MCST',
  hdb: 'HDB',
  oneservice: 'OneService',
  pub: 'PUB',
  'sp-group': 'SP Group',
}

/** Response expectations, as quoted in a typical conservancy contract. */
export const SEVERITY_SLA: Record<TicketSeverity, { label: string; hours: number }> = {
  safety: { label: 'Safety · 4 h', hours: 4 },
  urgent: { label: 'Urgent · 24 h', hours: 24 },
  routine: { label: 'Routine · 5 working days', hours: 24 * 5 },
}

export function slaBreached(ticket: MaintenanceTicket, now: Date = new Date()): boolean {
  if (ticket.status === 'resolved') return false
  return new Date(ticket.dueOn).getTime() < now.getTime()
}

export function ticketAgeHours(ticket: MaintenanceTicket, now: Date = new Date()): number {
  return (now.getTime() - new Date(ticket.openedOn).getTime()) / 3_600_000
}

/** A one-line audit trail entry for the timeline. */
export function describeEvent(at: string, label: string): string {
  return `${label} · ${at}`
}
