const DAY_MS = 86_400_000
const ignoredCategories = new Set(['', 'other', 'others', 'general', 'miscellaneous', 'uncategorized'])

function dateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date
}

function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function subscriptionSavings(subscription, inactiveLicenses, remainingBudget = Number(subscription.monthly_cost) || 0) {
  const monthlyCost = Math.max(Number(subscription.monthly_cost) || 0, 0)
  const seatCount = Math.max(Number(subscription.total_seats) || 0, 0)
  const defaultSeatCost = seatCount ? monthlyCost / seatCount : 0
  const estimated = inactiveLicenses.reduce((total, license) => {
    const recordedCost = license.monthly_cost === null || license.monthly_cost === undefined
      ? defaultSeatCost
      : Number(license.monthly_cost)
    return total + (Number.isFinite(recordedCost) ? Math.max(recordedCost, 0) : 0)
  }, 0)
  return roundMoney(Math.min(monthlyCost, remainingBudget, estimated))
}

function recommendation({
  subscriptionId = null,
  type,
  title,
  explanation,
  evidence,
  suggestedAction,
  estimatedSavings = 0,
  priority,
}) {
  return {
    subscriptionId,
    type,
    title,
    explanation,
    evidence,
    suggestedAction,
    estimatedSavings: roundMoney(estimatedSavings),
    priority,
    status: 'Pending',
  }
}

export function generateWorkspaceRecommendations(
  subscriptions,
  licenses,
  thresholds,
  currency = 'INR',
  monitoredUsage = [],
  now = new Date(),
) {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const licensesBySubscription = new Map()
  for (const license of licenses) {
    const rows = licensesBySubscription.get(license.subscription_id) ?? []
    rows.push(license)
    licensesBySubscription.set(license.subscription_id, rows)
  }
  const usageBySubscription = new Map(monitoredUsage.map((usage) => [usage.subscriptionId, usage]))
  const recommendations = []
  const subscriptionsByCategory = new Map()
  const monthlySpendBySubscription = new Map()

  for (const subscription of subscriptions) {
    const monthlyCost = Math.max(Number(subscription.monthly_cost) || 0, 0)
    monthlySpendBySubscription.set(subscription.id, monthlyCost)
    const relatedLicenses = licensesBySubscription.get(subscription.id) ?? []
    const eligibleLicenses = relatedLicenses.filter((license) => (
      license.assigned && !license.reclaimed_at && !license.excluded_from_optimization
    ))
    const inactiveLicenses = eligibleLicenses.flatMap((license) => {
      const lastActive = dateOnly(license.last_active)
      if (!lastActive || lastActive > today) return []
      const inactiveDays = Math.floor((today - lastActive) / DAY_MS)
      return inactiveDays > thresholds.potentialDays ? [{ ...license, inactiveDays }] : []
    })
    const inactiveSavings = subscriptionSavings(subscription, inactiveLicenses)
    const highPriorityCount = inactiveLicenses.filter((license) => license.inactiveDays > thresholds.highPriorityDays).length
    const recentUsage = usageBySubscription.get(subscription.id)

    if (inactiveLicenses.length) {
      const evidence = [
        `${inactiveLicenses.length} assigned license(s) have no recorded activity for more than ${thresholds.potentialDays} days.`,
        `${highPriorityCount} license(s) exceed the high-priority threshold of ${thresholds.highPriorityDays} days.`,
        `Estimated eligible license cost: ${currency} ${inactiveSavings.toFixed(2)} per month.`,
      ]
      if (recentUsage) {
        evidence.push(
          `Mapped monitoring recorded ${Number(recentUsage.employeeCount) || 0} employee(s), ${Math.round((Number(recentUsage.activeSeconds) || 0) / 60)} minutes, and ${Number(recentUsage.activeDays) || 0} employee-app days in the last 30 days; latest observed use was ${recentUsage.lastActivityDate}.`,
        )
      }
      recommendations.push(recommendation({
        subscriptionId: subscription.id,
        type: 'unused_license',
        title: `Review ${inactiveLicenses.length} inactive ${subscription.app_name} license${inactiveLicenses.length === 1 ? '' : 's'}`,
        explanation: `${inactiveLicenses.length} assigned ${subscription.app_name} license(s) exceeded the configured inactivity threshold. This identifies accounts for review; it does not prove they can be removed.`,
        evidence,
        suggestedAction: 'Confirm each account with its employee and application owner before changing or reclaiming a license.',
        estimatedSavings: inactiveSavings,
        priority: highPriorityCount ? 'High' : 'Medium',
      }))
    }

    const assignedSeats = Math.max(Number(subscription.assigned_seats) || 0, 0)
    const totalSeats = Math.max(Number(subscription.total_seats) || 0, 0)
    const unassignedSeats = Math.max(totalSeats - assignedSeats, 0)
    const estimatedUnassignedSavings = roundMoney(Math.min(
      Math.max(monthlyCost - inactiveSavings, 0),
      totalSeats ? monthlyCost * unassignedSeats / totalSeats : 0,
    ))
    if (unassignedSeats > 0) {
      recommendations.push(recommendation({
        subscriptionId: subscription.id,
        type: 'unassigned_seats',
        title: `Review ${unassignedSeats} unassigned ${subscription.app_name} seat${unassignedSeats === 1 ? '' : 's'}`,
        explanation: `${unassignedSeats} of ${totalSeats} purchased seats are not assigned. Confirm the seat count and contract terms before reducing a renewal.`,
        evidence: [
          `${assignedSeats} of ${totalSeats} purchased seats are assigned.`,
          `Estimated cost of unassigned seats: ${currency} ${estimatedUnassignedSavings.toFixed(2)} per month, prorated from subscription spend.`,
        ],
        suggestedAction: 'Check the provider’s contract and upcoming renewal options before reducing purchased seats.',
        estimatedSavings: estimatedUnassignedSavings,
        priority: unassignedSeats / Math.max(totalSeats, 1) >= 0.5 ? 'High' : 'Medium',
      }))
    }
    const renewalDate = dateOnly(subscription.renewal_date)
    if (renewalDate) {
      const daysUntilRenewal = Math.floor((renewalDate - today) / DAY_MS)
      if (daysUntilRenewal >= 0 && daysUntilRenewal <= 30) {
        recommendations.push(recommendation({
          subscriptionId: subscription.id,
          type: 'renewal_review',
          title: `Review ${subscription.app_name} renewal`,
          explanation: `${subscription.app_name} renews in ${daysUntilRenewal} day(s). Review current usage, seat count, contract terms, and owner approval before renewal.`,
          evidence: [
            `Renewal date: ${subscription.renewal_date} (${daysUntilRenewal} day(s) remaining).`,
            `Current subscription spend: ${currency} ${monthlyCost.toFixed(2)} per month.`,
          ],
          suggestedAction: 'Confirm the renewal decision and seat requirements with the subscription owner before the renewal date.',
          priority: daysUntilRenewal <= 7 ? 'High' : 'Medium',
        }))
      }
    }

    const category = String(subscription.category || '').trim().toLowerCase()
    if (subscription.status === 'Active' && !ignoredCategories.has(category)) {
      const grouped = subscriptionsByCategory.get(category) ?? []
      grouped.push(subscription)
      subscriptionsByCategory.set(category, grouped)
    }
  }

  for (const [category, groupedSubscriptions] of subscriptionsByCategory) {
    if (groupedSubscriptions.length < 2) continue
    const appNames = groupedSubscriptions.map((item) => item.app_name).sort((left, right) => left.localeCompare(right))
    const groupSpend = groupedSubscriptions.reduce((total, item) => total + (monthlySpendBySubscription.get(item.id) ?? 0), 0)
    recommendations.push(recommendation({
      type: 'duplicate_application',
      title: `Review applications in the ${groupedSubscriptions[0].category} category`,
      explanation: `${groupedSubscriptions.length} active subscriptions share the same category. A category match indicates a review opportunity, not confirmed feature overlap or a guaranteed saving.`,
      evidence: [
        `Applications in this category: ${appNames.join(', ')}.`,
        `Combined spend for these subscriptions: ${currency} ${roundMoney(groupSpend).toFixed(2)} per month.`,
      ],
      suggestedAction: 'Ask application owners to compare required workflows and contract terms. Consolidate only if the tools genuinely meet the same needs.',
      priority: groupedSubscriptions.length >= 3 ? 'Medium' : 'Low',
    }))
  }

  return recommendations
}
