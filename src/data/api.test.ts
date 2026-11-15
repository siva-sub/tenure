import { describe, expect, it } from 'vitest'
import { NotFoundError } from './api'
import * as api from './api'

/**
 * Boundary tests. These exist because the first version of `listProperties`
 * returned the zod-parsed object, silently stripping every field the schema did
 * not declare. Validation must gate the shape, not redefine it.
 */

describe('listProperties', () => {
  it('returns complete records, not schema-shaped stubs', async () => {
    const properties = await api.listProperties()
    expect(properties).toHaveLength(2)

    for (const property of properties) {
      expect(property.flatType).toBeTruthy()
      expect(property.rooms.length).toBeGreaterThan(0)
      expect(property.benchmarks.eui).toBeGreaterThan(0)
      expect(property.scoreBreakdown.length).toBeGreaterThan(0)
      expect(property.meter.ctClampChannels.length).toBeGreaterThan(0)
      expect(property.management.name).toBeTruthy()
    }
  })

  it('keeps the two homes distinguishable', async () => {
    const [hdb, condo] = await api.listProperties()
    expect(hdb?.kind).toBe('hdb')
    expect(hdb?.management.body).toBe('town-council')
    expect(condo?.kind).toBe('condo')
    expect(condo?.management.body).toBe('mcst')
    expect(condo?.management.shareValue).toBeGreaterThan(0)
  })
})

describe('getProperty', () => {
  it('raises NotFoundError rather than returning a partial record', async () => {
    await expect(api.getProperty('nope')).rejects.toBeInstanceOf(NotFoundError)
  })

  it('returns the requested record intact', async () => {
    const record = await api.getProperty('blk-456-tampines-42')
    expect(record.unit).toBe('#08-145')
    expect(record.rooms.map((r) => r.name)).toContain('Household shelter')
  })
})

describe('tickets', () => {
  it('scopes cases to the property that owns them', async () => {
    const hdbTickets = await api.listTickets('blk-456-tampines-42')
    const condoTickets = await api.listTickets('meridian-crest-21')
    expect(hdbTickets.length).toBeGreaterThan(0)
    expect(condoTickets.length).toBeGreaterThan(0)
    expect(hdbTickets.every((t) => t.propertyId === 'blk-456-tampines-42')).toBe(true)
    expect(condoTickets.every((t) => t.propertyId === 'meridian-crest-21')).toBe(true)
  })
})

describe('createTicket', () => {
  it('rejects more than three photos, matching the municipal case limit', async () => {
    await expect(
      api.createTicket({
        propertyId: 'blk-456-tampines-42',
        title: 'Test case title',
        body: 'A description long enough to pass validation.',
        owner: 'town-council',
        severity: 'routine',
        routedBecause: 'test',
        attachments: 4,
      }),
    ).rejects.toThrow(/maximum of 3 photos/)
  })
})

describe('telemetry', () => {
  it('returns exactly 48 half-hourly intervals and a 90-day history', async () => {
    const telemetry = await api.getTelemetry('blk-456-tampines-42')
    expect(telemetry.today).toHaveLength(48)
    expect(telemetry.history).toHaveLength(90)
    expect(telemetry.today.every((r) => r.kwh > 0)).toBe(true)
  })

  it('is deterministic for a given property', async () => {
    const a = await api.getTelemetry('meridian-crest-21')
    const b = await api.getTelemetry('meridian-crest-21')
    expect(a.today.map((r) => r.kwh)).toEqual(b.today.map((r) => r.kwh))
  })
})
