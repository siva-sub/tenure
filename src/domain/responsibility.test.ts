import { describe, expect, it } from 'vitest'
import { routeReport, slaBreached, RESPONSIBILITY_RULES } from './responsibility'
import type { MaintenanceTicket } from './types'

describe('routeReport', () => {
  it('sends HDB inter-floor seepage to HDB, not the Town Council', () => {
    const result = routeReport('Water seepage on the kitchen ceiling from the unit above', 'hdb')
    expect(result.owner).toBe('hdb')
    expect(result.ruleId).toBe('water-seepage')
    expect(result.because).toMatch(/between flats/)
  })

  it('sends the same seepage to the MCST in a strata development', () => {
    const result = routeReport('Seepage from the neighbouring lot through the riser', 'condo')
    expect(result.owner).toBe('mcst')
  })

  it('sends lift faults to the Town Council in an HDB block', () => {
    const result = routeReport('Lift A is stuck at level 8 again', 'hdb')
    expect(result.owner).toBe('town-council')
    expect(result.severity).toBe('safety')
  })

  it('sends corridor lighting to the Town Council', () => {
    const result = routeReport('The corridor light outside my unit is flickering', 'hdb')
    expect(result.owner).toBe('town-council')
    expect(result.severity).toBe('routine')
  })

  it('keeps internal fittings with the owner', () => {
    const result = routeReport('Master bedroom aircon not cooling', 'hdb')
    expect(result.owner).toBe('owner')
  })

  it('routes renovation noise by tenure type', () => {
    expect(routeReport('Hacking noise next door during renovation', 'hdb').owner).toBe('town-council')
    expect(routeReport('Hacking noise next door during renovation', 'condo').owner).toBe('mcst')
  })

  it('routes supply issues to SP Group', () => {
    const result = routeReport('Electricity meter readings look wrong on my bill', 'hdb')
    expect(result.owner).toBe('sp-group')
    expect(result.severity).toBe('urgent')
  })

  it('falls back to the owner rather than dropping an unrecognised report', () => {
    const result = routeReport('A strange smell in the storeroom', 'hdb')
    expect(result.owner).toBe('owner')
    expect(result.ruleId).toBe('internal-defect')
    expect(result.because.length).toBeGreaterThan(20)
  })

  it('never returns an empty justification', () => {
    for (const kind of ['hdb', 'condo', 'landed'] as const) {
      for (const _rule of RESPONSIBILITY_RULES) {
        const sample = 'seepage lift corridor solar defect renovation meter'
        const result = routeReport(sample, kind)
        expect(result.because.length).toBeGreaterThan(20)
        expect(result.owner).toBeTruthy()
      }
    }
  })
})

describe('slaBreached', () => {
  const base: MaintenanceTicket = {
    id: 't1',
    propertyId: 'p1',
    title: 'Test',
    body: 'Body',
    status: 'open',
    severity: 'urgent',
    owner: 'hdb',
    routedBecause: 'because',
    openedOn: '2026-11-09T10:00:00+08:00',
    dueOn: '2026-11-10T10:00:00+08:00',
    events: [],
  }

  it('is true once the response window has passed', () => {
    expect(slaBreached(base, new Date('2026-11-12T00:00:00+08:00'))).toBe(true)
  })

  it('is false inside the window', () => {
    expect(slaBreached(base, new Date('2026-11-10T09:00:00+08:00'))).toBe(false)
  })

  it('is false for resolved cases regardless of the clock', () => {
    expect(slaBreached({ ...base, status: 'resolved' }, new Date('2027-01-01T00:00:00+08:00'))).toBe(false)
  })
})
