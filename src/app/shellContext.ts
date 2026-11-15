import type { MaintenanceTicket, PropertyRecord } from '@/domain/types'

export interface ShellContext {
  property: PropertyRecord
  properties: PropertyRecord[]
  openReport: (preset?: { roomId?: string; text?: string }) => void
}

export interface TicketLookups {
  open: MaintenanceTicket[]
  breached: MaintenanceTicket[]
}

/** Which owner a ticket sits with, in plain language, for the board. */
export const STATUS_LABEL: Record<MaintenanceTicket['status'], string> = {
  open: 'Open',
  'awaiting-inspection': 'Awaiting inspection',
  'in-progress': 'Working on it',
  resolved: 'Resolved',
}

/** OneService's own state vocabulary, which residents already recognise. */
export const ONESERVICE_STATUS: Record<MaintenanceTicket['status'], string> = {
  open: 'Acknowledged',
  'awaiting-inspection': 'Working on it',
  'in-progress': 'Working on it',
  resolved: 'Resolved',
}
