import type { MaintenanceTicket, TicketOwner } from '@/domain/types'

export const STATUS_LABEL: Record<MaintenanceTicket['status'], string> = {
  open: 'Open',
  'awaiting-inspection': 'Awaiting inspection',
  'in-progress': 'Working on it',
  resolved: 'Resolved',
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

export const OWNER_NOTE: Record<TicketOwner, string> = {
  owner: 'Inside the flat boundary',
  'town-council': 'Common property, HDB estate',
  mcst: 'Common property, strata',
  hdb: 'Statutory — structural and inter-floor',
  oneservice: 'Municipal routing layer',
  pub: 'Water and drainage',
  'sp-group': 'Supply, metering and billing',
}

export const SEVERITY_LABEL: Record<MaintenanceTicket['severity'], string> = {
  safety: 'Safety',
  urgent: 'Urgent',
  routine: 'Routine',
}
