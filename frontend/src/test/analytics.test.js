import { describe, expect, it } from 'vitest'
import {
  classifyLicense,
  getDashboardMetrics,
  getInactivityDays,
  getLicenseAnalytics,
  getPotentialSavings,
  findPotentialDuplicates,
  isValidDateOnly,
  normalizeMonthlyCost,
} from '../domain/analytics.js'
import { formatCurrency } from '../components/formatters.js'

const fixedNow = new Date('2026-10-31T12:00:00')
const thresholds = { lowActivityDays: 30, potentialDays: 60, highPriorityDays: 90 }

describe('subscription cost normalization', () => {
  it('converts recurring billing frequencies into monthly costs', () => {
    expect(normalizeMonthlyCost(120, 'monthly')).toBe(120)
    expect(normalizeMonthlyCost(360, 'quarterly')).toBe(120)
    expect(normalizeMonthlyCost(1440, 'annually')).toBe(120)
    expect(normalizeMonthlyCost(-4, 'monthly')).toBeNull()
    expect(normalizeMonthlyCost(100, 'weekly')).toBeNull()
  })
})

describe('currency formatting', () => {
  it('uses the selected currency and locale for formatted values', () => {
    expect(formatCurrency(1234, 'INR')).toContain('₹')
    expect(formatCurrency(1234, 'USD')).toContain('$')
    expect(formatCurrency(1234, 'EUR')).toContain('€')
    expect(formatCurrency(1234, 'GBP')).toContain('£')
    expect(formatCurrency(1234.5, 'USD', false, 2)).toContain('1,234.50')
  })

  it('formats recommendation evidence in the selected currency', () => {
    const duplicates = findPotentialDuplicates([
      { id: 'notion', appName: 'Notion', monthlyCost: 1234 },
      { id: 'confluence', appName: 'Confluence', monthlyCost: 2345 },
    ], 'USD')
    expect(duplicates[0].evidence[0]).toContain('$')
    expect(duplicates[0].evidence[0]).not.toContain('₹')
  })
})

describe('license activity classification', () => {
  it('keeps missing and invalid activity dates unknown', () => {
    expect(classifyLicense({ assigned: true, lastActive: '' }, thresholds, fixedNow)).toBe('Unknown')
    expect(classifyLicense({ assigned: true, lastActive: 'not-a-date' }, thresholds, fixedNow)).toBe('Unknown')
    expect(getInactivityDays('2026-12-01', fixedNow)).toBeNull()
    expect(isValidDateOnly('2026-02-31')).toBe(false)
    expect(isValidDateOnly('2026-02-28')).toBe(true)
  })

  it('distinguishes active, low, inactive, unassigned, excluded, and reclaimed seats', () => {
    expect(classifyLicense({ assigned: true, lastActive: '2026-10-20' }, thresholds, fixedNow)).toBe('Active')
    expect(classifyLicense({ assigned: true, lastActive: '2026-09-10' }, thresholds, fixedNow)).toBe('Low activity')
    expect(classifyLicense({ assigned: true, lastActive: '2026-08-20' }, thresholds, fixedNow)).toBe('Potentially unused')
    expect(classifyLicense({ assigned: true, lastActive: '2026-07-01' }, thresholds, fixedNow)).toBe('High-priority review')
    expect(classifyLicense({ assigned: false, lastActive: '' }, thresholds, fixedNow)).toBe('Unassigned')
    expect(classifyLicense({ assigned: true, excludedFromOptimization: true, lastActive: '2026-07-01' }, thresholds, fixedNow)).toBe('Excluded')
    expect(classifyLicense({ assigned: true, reclaimedAt: '2026-10-31', lastActive: '2026-07-01' }, thresholds, fixedNow)).toBe('Reclaimed')
  })

  it('counts inactive savings only when assigned and known', () => {
    const records = [
      { assigned: true, lastActive: '2026-07-01', monthlyCost: 20 },
      { assigned: true, lastActive: '', monthlyCost: 70 },
      { assigned: false, lastActive: '', monthlyCost: 80 },
      { assigned: true, lastActive: '2026-07-01', monthlyCost: 30, excludedFromOptimization: true },
    ]
    expect(getLicenseAnalytics(records, thresholds, fixedNow)).toMatchObject({ total: 4, assigned: 3, inactive: 1, unassigned: 1, unknown: 1 })
  })
})

describe('savings calculation', () => {
  it('caps inactive license estimates at subscription spend and ignores excluded or unassigned records', () => {
    const subscriptions = [{ appName: 'Tool One', monthlyCost: 100 }, { appName: 'Tool Two', monthlyCost: 50 }]
    const licenses = [
      { appName: 'Tool One', assigned: true, lastActive: '2026-07-01', monthlyCost: 90 },
      { appName: 'Tool One', assigned: true, lastActive: '2026-07-01', monthlyCost: 90 },
      { appName: 'Tool Two', assigned: true, lastActive: '2026-07-01', monthlyCost: 35, excludedFromOptimization: true },
      { appName: 'Tool Two', assigned: false, lastActive: '', monthlyCost: 50 },
    ]
    expect(getPotentialSavings(subscriptions, licenses, thresholds, fixedNow)).toBe(100)
  })

  it('excludes approved estimates from verified savings', () => {
    const metrics = getDashboardMetrics([{ monthlyCost: 600, status: 'Active', renewalDate: '2026-11-05' }], [], [
      { status: 'Approved', verifiedMonthlySavings: 100 },
      { status: 'Completed', verifiedMonthlySavings: 23 },
    ], thresholds)
    expect(metrics.monthlySpend).toBe(600)
    expect(metrics.verifiedMonthlySavings).toBe(23)
  })
})
