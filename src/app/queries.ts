import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createTicket,
  getParity,
  getProperty,
  getTelemetry,
  listMeasures,
  listProperties,
  listSubsidies,
  listTickets,
  resolveTicket,
  type NewTicketInput,
} from '@/data/api'

export const queryKeys = {
  properties: ['properties'] as const,
  property: (id: string) => ['property', id] as const,
  measures: (id: string) => ['measures', id] as const,
  tickets: (id: string) => ['tickets', id] as const,
  telemetry: (id: string) => ['telemetry', id] as const,
  subsidies: (id: string) => ['subsidies', id] as const,
  parity: ['parity'] as const,
}

export function useProperties() {
  return useQuery({ queryKey: queryKeys.properties, queryFn: listProperties, staleTime: Infinity })
}

export function useProperty(id: string) {
  return useQuery({
    queryKey: queryKeys.property(id),
    queryFn: () => getProperty(id),
    staleTime: Infinity,
  })
}

export function useMeasures(id: string) {
  return useQuery({ queryKey: queryKeys.measures(id), queryFn: () => listMeasures(id) })
}

export function useTickets(id: string) {
  return useQuery({ queryKey: queryKeys.tickets(id), queryFn: () => listTickets(id) })
}

export function useTelemetry(id: string) {
  return useQuery({ queryKey: queryKeys.telemetry(id), queryFn: () => getTelemetry(id) })
}

export function useSubsidies(id: string) {
  return useQuery({ queryKey: queryKeys.subsidies(id), queryFn: () => listSubsidies(id) })
}

export function useParity() {
  return useQuery({ queryKey: queryKeys.parity, queryFn: getParity, staleTime: Infinity })
}

export function useCreateTicket() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: NewTicketInput) => createTicket(input),
    onSuccess: (ticket) => {
      void client.invalidateQueries({ queryKey: queryKeys.tickets(ticket.propertyId) })
    },
  })
}

export function useResolveTicket(propertyId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (vars: { ticketId: string; note: string }) => resolveTicket(vars.ticketId, vars.note),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.tickets(propertyId) })
    },
  })
}
