import { formatCurrency } from '../components/formatters.js'

export const DEFAULT_THRESHOLDS = {
  lowActivityDays: 30,
  potentialDays: 60,
  highPriorityDays: 90,
}

export function normalizeApplicationName(value = '') {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

export function normalizeMonthlyCost(amount, frequency = 'monthly') {
  const cost = Number(amount)
  if (!Number.isFinite(cost) || cost < 0) return null
  const divisor = { monthly: 1, quarterly: 3, annually: 12, annual: 12 }[frequency.toLowerCase()]
  return divisor ? Math.round((cost / divisor) * 100) / 100 : null
}

export function isValidDateOnly(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '')
  if (!match) return false
  const [, year, month, day] = match.map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

export function getInactivityDays(lastActive, now = new Date()) {
  if (!isValidDateOnly(lastActive)) return null
  const activityDate = new Date(`${lastActive}T00:00:00`)
  if (Number.isNaN(activityDate.getTime()) || activityDate > now) return null
  return Math.floor((now - activityDate) / 86_400_000)
}

export function classifyLicense(license, thresholds = DEFAULT_THRESHOLDS, now = new Date()) {
  if (!license.assigned) return 'Unassigned'
  if (license.excludedFromOptimization) return 'Excluded'
  if (license.reclaimedAt) return 'Reclaimed'
  const days = getInactivityDays(license.lastActive, now)
  if (days === null) return 'Unknown'
  if (days > thresholds.highPriorityDays) return 'High-priority review'
  if (days > thresholds.potentialDays) return 'Potentially unused'
  if (days > thresholds.lowActivityDays) return 'Low activity'
  return 'Active'
}

export function getLicenseAnalytics(licenses, thresholds = DEFAULT_THRESHOLDS, now = new Date()) {
  const active = licenses.filter((license) => license.assigned && classifyLicense(license, thresholds, now) === 'Active').length
  const assigned = licenses.filter((license) => license.assigned && !license.reclaimedAt).length
  const inactive = licenses.filter((license) => ['Potentially unused', 'High-priority review'].includes(classifyLicense(license, thresholds, now))).length
  const unassigned = licenses.filter((license) => !license.assigned).length

  return {
    total: licenses.length,
    assigned,
    active,
    inactive,
    unassigned,
    unknown: licenses.filter((license) => classifyLicense(license, thresholds, now) === 'Unknown').length,
    utilization: licenses.length ? Math.round((active / licenses.length) * 100) : 0,
  }
}

export function getPotentialSavings(subscriptions, licenses, thresholds = DEFAULT_THRESHOLDS, now = new Date()) {
  const eligibleByApp = new Map()
  for (const license of licenses) {
    const status = classifyLicense(license, thresholds, now)
    if (!license.assigned || license.excludedFromOptimization || license.reclaimedAt
      || !['Potentially unused', 'High-priority review'].includes(status)
      || !Number.isFinite(Number(license.monthlyCost)) || Number(license.monthlyCost) < 0) continue
    const key = normalizeApplicationName(license.appName)
    eligibleByApp.set(key, (eligibleByApp.get(key) ?? 0) + Number(license.monthlyCost))
  }

  let total = 0
  for (const subscription of subscriptions) {
    const eligible = eligibleByApp.get(normalizeApplicationName(subscription.appName)) ?? 0
    total += Math.min(eligible, Number(subscription.monthlyCost) || 0)
  }
  return Math.round(total * 100) / 100
}

export function getDashboardMetrics(subscriptions, licenses, recommendations, thresholds = DEFAULT_THRESHOLDS) {
  const activeSubscriptions = subscriptions.filter((subscription) => subscription.status === 'Active')
  const licenseAnalytics = getLicenseAnalytics(licenses, thresholds)
  const potentialMonthlySavings = getPotentialSavings(subscriptions, licenses, thresholds)
  const verifiedMonthlySavings = recommendations
    .filter((recommendation) => recommendation.status === 'Completed')
    .reduce((sum, recommendation) => sum + (Number(recommendation.verifiedMonthlySavings) || 0), 0)

  return {
    monthlySpend: subscriptions.reduce((sum, subscription) => sum + (Number(subscription.monthlyCost) || 0), 0),
    annualSpend: subscriptions.reduce((sum, subscription) => sum + (Number(subscription.monthlyCost) || 0), 0) * 12,
    potentialMonthlySavings,
    potentialAnnualSavings: potentialMonthlySavings * 12,
    verifiedMonthlySavings,
    activeSubscriptions: activeSubscriptions.length,
    upcomingRenewals: subscriptions.filter((subscription) => {
      const days = Math.ceil((new Date(`${subscription.renewalDate}T00:00:00`) - new Date()) / 86_400_000)
      return days >= 0 && days <= 30
    }).length,
    ...licenseAnalytics,
  }
}

export function getUpcomingRenewals(subscriptions, now = new Date()) {
  return subscriptions
    .map((subscription) => ({
      ...subscription,
      daysUntilRenewal: Math.ceil((new Date(`${subscription.renewalDate}T00:00:00`) - now) / 86_400_000),
    }))
    .filter((subscription) => subscription.daysUntilRenewal >= 0 && subscription.daysUntilRenewal <= 30)
    .sort((left, right) => left.daysUntilRenewal - right.daysUntilRenewal)
}

const duplicateGroups = [
  { names: ['asana', 'monday com', 'trello', 'clickup'], label: 'Project management tools' },
  { names: ['slack', 'microsoft teams', 'google chat'], label: 'Team communication tools' },
  { names: ['google drive', 'dropbox', 'onedrive'], label: 'Cloud storage tools' },
  { names: ['notion', 'confluence'], label: 'Knowledge management tools' },
]

export function findPotentialDuplicates(subscriptions, currency = 'INR') {
  const recommendations = []
  for (const group of duplicateGroups) {
    const matches = subscriptions.filter((subscription) => group.names.includes(normalizeApplicationName(subscription.appName)))
    if (matches.length < 2) continue
    recommendations.push({
      id: `duplicates-${matches.map((item) => item.id).sort().join('-')}`,
      type: 'duplicate_application',
      title: `Review overlapping ${group.label.toLowerCase()}`,
      appName: matches.map((item) => item.appName).join(' + '),
      priority: 'Medium',
      explanation: `${matches.length} applications in the ${group.label.toLowerCase()} group are active across your organization. Review team needs before consolidating.`,
      evidence: matches.map((item) => `${item.appName}: ${formatCurrency(item.monthlyCost, currency)}/month (${item.department || 'Unassigned department'})`),
      suggestedAction: 'Ask department owners to compare workflows and choose whether these tools should remain separate.',
      estimatedMonthlySavings: 0,
      estimatedAnnualSavings: 0,
      status: 'Pending',
      createdAt: new Date().toISOString(),
    })
  }
  return recommendations
}

export function generateRecommendations(subscriptions, licenses, thresholds = DEFAULT_THRESHOLDS, currency = 'INR') {
  const groupedLicenses = new Map()
  for (const license of licenses) {
    const key = normalizeApplicationName(license.appName)
    const group = groupedLicenses.get(key) ?? []
    group.push(license)
    groupedLicenses.set(key, group)
  }

  const recommendations = []
  for (const subscription of subscriptions) {
    const related = groupedLicenses.get(normalizeApplicationName(subscription.appName)) ?? []
    const inactive = related.filter((license) => ['Potentially unused', 'High-priority review'].includes(classifyLicense(license, thresholds)))
    const savings = Math.min(
      inactive.reduce((sum, license) => sum + (Number(license.monthlyCost) || 0), 0),
      Number(subscription.monthlyCost) || 0,
    )
    if (inactive.length && savings > 0) {
      recommendations.push({
        id: `inactive-${subscription.id}`,
        subscriptionId: subscription.id,
        type: 'unused_license',
        title: `Review ${inactive.length} inactive ${subscription.appName} license${inactive.length === 1 ? '' : 's'}`,
        appName: subscription.appName,
        priority: inactive.some((license) => getInactivityDays(license.lastActive) > thresholds.highPriorityDays) ? 'High' : 'Medium',
        explanation: `${inactive.length} assigned license${inactive.length === 1 ? ' has' : 's have'} had no recorded activity beyond the configured review threshold.`,
        evidence: inactive.slice(0, 5).map((license) => `${license.employeeEmail} — ${getInactivityDays(license.lastActive)} days inactive`),
        suggestedAction: 'Confirm with each employee’s manager, then reclaim or reassign licenses through your identity provider.',
        estimatedMonthlySavings: Math.round(savings * 100) / 100,
        estimatedAnnualSavings: Math.round(savings * 1200) / 100,
        status: 'Pending',
        createdAt: new Date().toISOString(),
      })
    }

    const daysUntilRenewal = Math.ceil((new Date(`${subscription.renewalDate}T00:00:00`) - new Date()) / 86_400_000)
    if (daysUntilRenewal >= 0 && daysUntilRenewal <= 30) {
      recommendations.push({
        id: `renewal-${subscription.id}`,
        subscriptionId: subscription.id,
        type: 'renewal_review',
        title: `${subscription.appName} renews in ${daysUntilRenewal} days`,
        appName: subscription.appName,
        priority: daysUntilRenewal <= 7 ? 'High' : 'Low',
        explanation: `The ${subscription.billingFrequency} plan renews on ${subscription.renewalDate}.`,
        evidence: [`Current monthly cost: ${formatCurrency(subscription.monthlyCost, currency)}`, `${subscription.totalSeats} total seats; ${subscription.assignedSeats} assigned`],
        suggestedAction: 'Review usage, pricing, and seat assignments with the subscription owner before renewing.',
        estimatedMonthlySavings: 0,
        estimatedAnnualSavings: 0,
        status: 'Pending',
        createdAt: new Date().toISOString(),
      })
    }
  }
  return [...recommendations, ...findPotentialDuplicates(subscriptions, currency)]
}
