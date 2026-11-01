import { DEFAULT_THRESHOLDS, generateRecommendations } from '../domain/analytics.js'

const appCatalog = [
  ['Figma', 'Figma', 'Design', 45, 37, 4, 'Design'],
  ['Slack', 'Slack Technologies', 'Communication', 850, 80, 18, 'Engineering'],
  ['Microsoft 365', 'Microsoft', 'Productivity', 690, 90, 8, 'Operations'],
  ['Google Workspace', 'Google', 'Productivity', 560, 72, 10, 'Operations'],
  ['Zoom', 'Zoom Video Communications', 'Communication', 315, 60, 9, 'Sales'],
  ['Notion', 'Notion Labs', 'Productivity', 330, 32, 7, 'Product'],
  ['Asana', 'Asana', 'Project Management', 480, 36, 7, 'Marketing'],
  ['Monday.com', 'monday.com', 'Project Management', 520, 29, 6, 'Operations'],
  ['Trello', 'Atlassian', 'Project Management', 190, 22, 4, 'Product'],
  ['Jira', 'Atlassian', 'Development', 620, 68, 9, 'Engineering'],
  ['GitHub', 'GitHub', 'Development', 1180, 83, 13, 'Engineering'],
  ['Dropbox', 'Dropbox', 'Cloud Storage', 350, 29, 7, 'Design'],
  ['Canva', 'Canva', 'Design', 270, 38, 6, 'Marketing'],
  ['HubSpot', 'HubSpot', 'CRM', 1450, 39, 3, 'Sales'],
  ['Adobe Creative Cloud', 'Adobe', 'Design', 1650, 24, 11, 'Design'],
  ['Linear', 'Linear Orbit', 'Development', 420, 26, 3, 'Product'],
  ['Airtable', 'Airtable', 'Productivity', 310, 18, 5, 'Operations'],
  ['Loom', 'Atlassian', 'Communication', 240, 23, 8, 'Marketing'],
  ['Miro', 'Miro', 'Design', 410, 31, 5, 'Product'],
  ['1Password', '1Password', 'Security', 290, 40, 4, 'Engineering'],
  ['Intercom', 'Intercom', 'Customer Support', 1320, 25, 4, 'Support'],
  ['Zendesk', 'Zendesk', 'Customer Support', 980, 28, 4, 'Support'],
  ['Salesforce', 'Salesforce', 'CRM', 2100, 42, 4, 'Sales'],
  ['Calendly', 'Calendly', 'Productivity', 230, 27, 4, 'Sales'],
  ['DocuSign', 'DocuSign', 'Productivity', 380, 18, 4, 'Operations'],
  ['Webflow', 'Webflow', 'Marketing', 520, 9, 3, 'Marketing'],
  ['Semrush', 'Semrush', 'Marketing', 460, 11, 3, 'Marketing'],
  ['Hootsuite', 'Hootsuite', 'Marketing', 290, 8, 2, 'Marketing'],
  ['Sentry', 'Sentry', 'Development', 390, 35, 7, 'Engineering'],
  ['Datadog', 'Datadog', 'Development', 1750, 32, 4, 'Engineering'],
  ['AWS', 'Amazon Web Services', 'Infrastructure', 2840, 23, 1, 'Engineering'],
  ['Vercel', 'Vercel', 'Infrastructure', 670, 17, 3, 'Engineering'],
  ['Retool', 'Retool', 'Development', 580, 14, 4, 'Engineering'],
  ['Grammarly', 'Grammarly', 'Productivity', 260, 39, 12, 'Marketing'],
  ['Typeform', 'Typeform', 'Marketing', 220, 14, 3, 'Marketing'],
  ['Gong', 'Gong', 'Sales', 1150, 18, 2, 'Sales'],
  ['PandaDoc', 'PandaDoc', 'Sales', 420, 16, 5, 'Sales'],
  ['Confluence', 'Atlassian', 'Productivity', 490, 38, 6, 'Engineering'],
  ['Google Drive', 'Google', 'Cloud Storage', 370, 45, 6, 'Operations'],
  ['Microsoft Teams', 'Microsoft', 'Communication', 520, 48, 7, 'Operations'],
]

const employees = [
  ['Aarav Sharma', 'Engineering'],
  ['Aanya Patel', 'Design'],
  ['Aditya Rao', 'Product'],
  ['Ananya Iyer', 'Marketing'],
  ['Arjun Mehta', 'Sales'],
  ['Diya Nair', 'Operations'],
  ['Ishaan Kapoor', 'Support'],
  ['Kabir Singh', 'Engineering'],
  ['Kiara Shah', 'Design'],
  ['Mira Desai', 'Product'],
  ['Neel Joshi', 'Marketing'],
  ['Rhea Gupta', 'Sales'],
  ['Sana Khan', 'Operations'],
  ['Vivaan Reddy', 'Engineering'],
  ['Zara Thomas', 'Support'],
]

const idFor = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export function createDemoWorkspace() {
  const today = new Date()
  const subscriptions = appCatalog.map(([appName, vendor, category, monthlyCost, totalSeats, assignedSeats, department], index) => {
    const renewal = new Date(today)
    renewal.setDate(today.getDate() + ((index * 13 + 5) % 120))
    return {
      id: idFor(appName),
      appName,
      vendor,
      category,
      monthlyCost,
      billingFrequency: index % 4 === 0 ? 'annually' : index % 3 === 0 ? 'quarterly' : 'monthly',
      totalSeats,
      assignedSeats,
      renewalDate: renewal.toISOString().slice(0, 10),
      department,
      owner: `${employees[index % employees.length][0]} ${employees[index % employees.length][0].split(' ')[1]}@spendwise.demo`,
      status: index === 23 ? 'Trial' : index === 38 ? 'Inactive' : 'Active',
      description: `${category} software used by the ${department} team.`,
      seatCost: Math.round((monthlyCost / totalSeats) * 100) / 100,
      createdAt: new Date(today.getTime() - (index + 2) * 86_400_000).toISOString(),
    }
  })

  const licenses = []
  for (const subscription of subscriptions) {
    for (let index = 0; index < subscription.assignedSeats; index += 1) {
      const [employeeName, department] = employees[(index + subscriptions.indexOf(subscription)) % employees.length]
      const stale = (index + subscriptions.indexOf(subscription)) % 13 === 0
        ? 105 + index
        : (index + subscriptions.indexOf(subscription)) % 8 === 0
          ? 72 + index
          : 2 + ((index * 5 + subscriptions.indexOf(subscription)) % 26)
      const lastActive = new Date(today)
      lastActive.setDate(today.getDate() - stale)
      licenses.push({
        id: `${subscription.id}-${index + 1}`,
        subscriptionId: subscription.id,
        appName: subscription.appName,
        employeeName,
        employeeEmail: `${employeeName.toLowerCase().replace(' ', '.')}@spendwise.demo`,
        department,
        licenseType: subscription.totalSeats > 50 ? 'Business' : 'Standard',
        assigned: true,
        lastActive: lastActive.toISOString().slice(0, 10),
        monthlyCost: subscription.seatCost,
        excludedFromOptimization: false,
        reclaimedAt: null,
      })
    }
    for (let index = subscription.assignedSeats; index < subscription.totalSeats; index += 1) {
      licenses.push({
        id: `${subscription.id}-${index + 1}`,
        subscriptionId: subscription.id,
        appName: subscription.appName,
        employeeName: '',
        employeeEmail: '',
        department: subscription.department,
        licenseType: subscription.totalSeats > 50 ? 'Business' : 'Standard',
        assigned: false,
        lastActive: '',
        monthlyCost: subscription.seatCost,
        excludedFromOptimization: false,
        reclaimedAt: null,
      })
    }
  }

  const recommendations = generateRecommendations(subscriptions, licenses, DEFAULT_THRESHOLDS)
  const monthlySpend = subscriptions.reduce((sum, subscription) => sum + subscription.monthlyCost, 0)
  const spendingHistory = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'].map((month, index) => ({
    month,
    spend: Math.round(monthlySpend * ([0.88, 0.91, 0.95, 0.93, 1.02, 1][index])),
  }))
  return {
    organization: { name: 'Northstar Labs', currency: 'INR', demoMode: true },
    user: { name: 'Gautam Sharma', email: 'gautam@spendwise.demo', role: 'Admin' },
    subscriptions,
    licenses,
    recommendations,
    spendingHistory,
    activity: [
      { id: 'demo-1', action: 'Demo organization loaded', date: new Date().toISOString() },
      { id: 'demo-2', action: 'Subscription data analyzed', date: new Date(Date.now() - 3_600_000).toISOString() },
      { id: 'demo-3', action: 'License utilization scan completed', date: new Date(Date.now() - 7_200_000).toISOString() },
    ],
    thresholds: DEFAULT_THRESHOLDS,
    notifications: { renewals: true, optimization: true, weeklyDigest: false },
  }
}

export const DEMO_APPLICATIONS = appCatalog
