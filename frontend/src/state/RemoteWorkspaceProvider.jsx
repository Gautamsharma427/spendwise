import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { DEFAULT_THRESHOLDS, normalizeApplicationName } from '../domain/analytics.js'
import { apiRequest } from '../api/client.js'
import { useAuth } from '../auth/AuthContext.js'
import OrganizationOnboarding from '../auth/OrganizationOnboarding.jsx'
import { WorkspaceContext } from './WorkspaceContext.js'

const DEFAULT_NOTIFICATIONS = { renewals: true, optimization: true, weeklyDigest: false }
const freshWorkspace = {
  organization: { id: '', name: 'Workspace', currency: 'INR', demoMode: false },
  user: { id: '', name: 'User', email: '', role: 'Member' },
  subscriptions: [],
  licenses: [],
  recommendations: [],
  spendingHistory: [],
  activity: [],
  thresholds: DEFAULT_THRESHOLDS,
  notifications: DEFAULT_NOTIFICATIONS,
}

function preferencesKey(userId) {
  return `spendwise-preferences-v1:${userId}`
}

function readPreferences(userId) {
  try {
    const stored = JSON.parse(localStorage.getItem(preferencesKey(userId)) || '{}')
    return {
      thresholds: { ...DEFAULT_THRESHOLDS, ...stored.thresholds },
      notifications: { ...DEFAULT_NOTIFICATIONS, ...stored.notifications },
    }
  } catch (error) {
    console.error('Unable to load workspace preferences:', error)
    toast.error('Saved preferences could not be loaded. Default preferences are active.')
    return { thresholds: DEFAULT_THRESHOLDS, notifications: DEFAULT_NOTIFICATIONS }
  }
}

function toSubscription(row) {
  const monthlyCost = Number(row.monthlyCost) || 0
  const totalSeats = Number(row.totalSeats) || 0
  const divisor = { monthly: 1, quarterly: 3, annually: 12 }[row.billingFrequency] || 1
  return {
    ...row,
    monthlyCost,
    totalSeats,
    assignedSeats: Number(row.assignedSeats) || 0,
    billingAmount: monthlyCost * divisor,
    seatCost: totalSeats ? Math.round((monthlyCost / totalSeats) * 100) / 100 : null,
    description: '',
    createdAt: row.createdAt || new Date().toISOString(),
  }
}

function toLicense(row, subscriptions) {
  return {
    ...row,
    appName: subscriptions.find((item) => item.id === row.subscriptionId)?.appName || 'Unknown application',
    employeeName: row.employeeName || '',
    employeeEmail: row.employeeEmail || '',
    lastActive: row.lastActive || '',
    monthlyCost: row.monthlyCost === null ? null : Number(row.monthlyCost),
    excludedFromOptimization: Boolean(row.excludedFromOptimization),
    underReview: Boolean(row.underReview),
    reclaimedAt: row.reclaimedAt || null,
  }
}

function toRecommendation(row, subscriptions) {
  const estimatedMonthlySavings = Number(row.estimatedSavings) || 0
  return {
    ...row,
    appName: subscriptions.find((item) => item.id === row.subscriptionId)?.appName || 'Multiple applications',
    evidence: Array.isArray(row.evidence) ? row.evidence : [],
    estimatedMonthlySavings,
    estimatedAnnualSavings: Math.round(estimatedMonthlySavings * 1200) / 100,
    verifiedMonthlySavings: row.verifiedMonthlySavings === null ? null : Number(row.verifiedMonthlySavings),
    createdAt: row.createdAt || new Date().toISOString(),
  }
}

function subscriptionPayload(subscription) {
  return {
    appName: subscription.appName,
    vendor: subscription.vendor,
    category: subscription.category,
    monthlyCost: Number(subscription.monthlyCost),
    billingFrequency: subscription.billingFrequency,
    totalSeats: Number(subscription.totalSeats),
    assignedSeats: Number(subscription.assignedSeats),
    renewalDate: subscription.renewalDate,
    department: subscription.department || '',
    owner: subscription.owner || '',
    status: subscription.status || 'Active',
  }
}

export function RemoteWorkspaceProvider({ children }) {
  const { session, signOut } = useAuth()
  const token = session.access_token
  const userId = session.user.id
  const [workspace, setWorkspace] = useState(freshWorkspace)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [onboarding, setOnboarding] = useState(null)

  const loadWorkspace = useCallback(async () => {
    const [profile, subscriptionRows, licenseRows, recommendationRows] = await Promise.all([
      apiRequest('/workspace', token),
      apiRequest('/subscriptions', token),
      apiRequest('/licenses', token),
      apiRequest('/recommendations', token),
    ])
    const subscriptions = subscriptionRows.map(toSubscription)
    const preferences = readPreferences(userId)
    setWorkspace((current) => ({
      ...current,
      organization: { ...profile.organization, demoMode: false },
      user: {
        ...profile.user,
        role: `${profile.user.role[0].toUpperCase()}${profile.user.role.slice(1)}`,
      },
      subscriptions,
      licenses: licenseRows.map((row) => toLicense(row, subscriptions)),
      recommendations: recommendationRows.map((row) => toRecommendation(row, subscriptions)),
      thresholds: preferences.thresholds,
      notifications: preferences.notifications,
    }))
    setLoadError('')
  }, [token, userId])

  useEffect(() => {
    let active = true
    apiRequest('/onboarding/status', token).then(async (status) => {
      if (!active) return
      if (status.needsOrganization) {
        setOnboarding(status)
        return null
      }
      setOnboarding(null)
      const [subscriptionRows, licenseRows, recommendationRows] = await Promise.all([
        apiRequest('/subscriptions', token),
        apiRequest('/licenses', token),
        apiRequest('/recommendations', token),
      ])
      if (!active) return
      const subscriptions = subscriptionRows.map(toSubscription)
      const preferences = readPreferences(userId)
      setWorkspace({
        ...freshWorkspace,
        organization: { ...status.workspace.organization, demoMode: false },
        user: { ...status.workspace.user, role: `${status.workspace.user.role[0].toUpperCase()}${status.workspace.user.role.slice(1)}` },
        subscriptions,
        licenses: licenseRows.map((row) => toLicense(row, subscriptions)),
        recommendations: recommendationRows.map((row) => toRecommendation(row, subscriptions)),
        thresholds: preferences.thresholds,
        notifications: preferences.notifications,
      })
    }).catch((error) => {
      if (!active) return
      console.error('Could not load the authenticated workspace:', error)
      setLoadError(error.message)
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [token, userId])

  const createOrganization = useCallback(async (details) => {
    setLoading(true)
    let organizationCreated = false
    try {
      await apiRequest('/onboarding/organization', token, { method: 'POST', body: details })
      organizationCreated = true
      setOnboarding(null)
      await loadWorkspace()
      toast.success('Your organization workspace is ready.')
    } catch (error) {
      setLoading(false)
      if (organizationCreated) {
        setOnboarding(null)
        setLoadError('Your organization was created, but the workspace could not be loaded. Retry the connection or sign out.')
      }
      throw error
    }
  }, [loadWorkspace, token])

  const handleMutation = useCallback(async (operation, successMessage) => {
    try {
      const result = await operation()
      if (successMessage) toast.success(successMessage)
      return result ?? true
    } catch (error) {
      console.error('Workspace operation failed:', error)
      toast.error(error.message || 'The workspace change could not be saved.')
      return false
    }
  }, [])

  const addSubscription = useCallback((subscription) => handleMutation(async () => {
    if (workspace.subscriptions.some((item) => normalizeApplicationName(item.appName) === normalizeApplicationName(subscription.appName))) {
      throw new Error(`${subscription.appName} is already in your workspace.`)
    }
    await apiRequest('/subscriptions', token, { method: 'POST', body: subscriptionPayload(subscription) })
    await loadWorkspace()
  }, 'Subscription added.'), [handleMutation, loadWorkspace, token, workspace.subscriptions])

  const updateSubscription = useCallback((subscriptionId, changes) => handleMutation(async () => {
    const current = workspace.subscriptions.find((item) => item.id === subscriptionId)
    if (!current) throw new Error('Subscription not found.')
    const updated = { ...current, ...changes }
    if (workspace.subscriptions.some((item) => item.id !== subscriptionId
      && normalizeApplicationName(item.appName) === normalizeApplicationName(updated.appName))) {
      throw new Error(`${updated.appName} is already in your workspace.`)
    }
    await apiRequest(`/subscriptions/${subscriptionId}`, token, { method: 'PUT', body: subscriptionPayload(updated) })
    await loadWorkspace()
  }, 'Subscription updated.'), [handleMutation, loadWorkspace, token, workspace.subscriptions])

  const deleteSubscription = useCallback((subscriptionId) => handleMutation(async () => {
    await apiRequest(`/subscriptions/${subscriptionId}`, token, { method: 'DELETE' })
    await loadWorkspace()
  }, 'Subscription and its related records removed.'), [handleMutation, loadWorkspace, token])

  const addSubscriptions = useCallback((subscriptions) => handleMutation(async () => {
    const unique = new Map()
    for (const subscription of subscriptions) unique.set(normalizeApplicationName(subscription.appName), subscription)
    const existing = new Set(workspace.subscriptions.map((item) => normalizeApplicationName(item.appName)))
    const records = [...unique.values()].filter((item) => !existing.has(normalizeApplicationName(item.appName)))
    if (!records.length) throw new Error('All imported subscriptions already exist in this workspace.')
    if (records.length !== subscriptions.length) {
      toast.error(`${subscriptions.length - records.length} duplicate application row(s) were not added.`)
    }
    await apiRequest('/import/subscriptions', token, {
      method: 'POST',
      body: { records: records.map(subscriptionPayload) },
    })
    await loadWorkspace()
  }), [handleMutation, loadWorkspace, token, workspace.subscriptions])

  const addLicenses = useCallback((licenses) => handleMutation(async () => {
    const subscriptionsByName = new Map(workspace.subscriptions.map((item) => [normalizeApplicationName(item.appName), item]))
    const records = licenses.map((license) => {
      const subscription = subscriptionsByName.get(normalizeApplicationName(license.appName))
      if (!subscription) throw new Error(`${license.appName} must be imported as a subscription before its licenses.`)
      return {
        subscriptionId: subscription.id,
        employeeEmail: license.employeeEmail,
        employeeName: license.employeeName || '',
        department: license.department,
        licenseType: license.licenseType,
        assigned: Boolean(license.assigned),
        lastActive: license.lastActive || '',
        monthlyCost: license.monthlyCost,
        excludedFromOptimization: Boolean(license.excludedFromOptimization),
      }
    })
    await apiRequest('/import/licenses', token, { method: 'POST', body: { records } })
    await loadWorkspace()
  }), [handleMutation, loadWorkspace, token, workspace.subscriptions])

  const importLicenseActivity = useCallback((records) => handleMutation(async () => {
    const result = await apiRequest('/usage/activity/import', token, { method: 'POST', body: { records } })
    await loadWorkspace()
    return result
  }), [handleMutation, loadWorkspace, token])

  const updateLicense = useCallback((licenseId, changes) => handleMutation(async () => {
    const fields = {
      employeeEmail: changes.employeeEmail,
      employeeName: changes.employeeName,
      department: changes.department,
      licenseType: changes.licenseType,
      assigned: changes.assigned,
      lastActive: changes.lastActive,
      monthlyCost: changes.monthlyCost,
      excludedFromOptimization: changes.excludedFromOptimization,
      underReview: changes.underReview,
      reclaimedAt: changes.reclaimedAt,
    }
    const body = Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined))
    await apiRequest(`/licenses/${licenseId}`, token, { method: 'PATCH', body })
    await loadWorkspace()
  }, 'License updated.'), [handleMutation, loadWorkspace, token])

  const updateRecommendation = useCallback((recommendationId, changes) => handleMutation(async () => {
    const body = { status: changes.status }
    if (changes.verifiedMonthlySavings !== undefined) body.verifiedMonthlySavings = changes.verifiedMonthlySavings
    if (changes.notes !== undefined) body.notes = changes.notes
    await apiRequest(`/recommendations/${recommendationId}`, token, { method: 'PATCH', body })
    await loadWorkspace()
  }, 'Recommendation updated.'), [handleMutation, loadWorkspace, token])

  const generate = useCallback(() => handleMutation(async () => {
    const records = await apiRequest('/recommendations/analyze', token, {
      method: 'POST',
      body: { thresholds: workspace.thresholds },
    })
    await loadWorkspace()
    if (records.length) toast.success(`Generated and saved ${records.length} recommendation${records.length === 1 ? '' : 's'}.`)
    else toast('No new recommendations were found.')
  }, null), [handleMutation, loadWorkspace, token, workspace])

  const updateSettings = useCallback((changes) => handleMutation(async () => {
    const preferences = {
      thresholds: { ...workspace.thresholds, ...changes.thresholds },
      notifications: { ...workspace.notifications, ...changes.notifications },
    }
    localStorage.setItem(preferencesKey(userId), JSON.stringify(preferences))
    const body = {}
    if (workspace.user.role === 'Admin') {
      if (changes.organization) body.organization = {
        name: changes.organization.name,
        currency: changes.organization.currency,
      }
      if (changes.user?.name) body.user = { name: changes.user.name }
    }
    if (Object.keys(body).length) {
      await apiRequest('/workspace', token, { method: 'PATCH', body })
      await loadWorkspace()
    }
    setWorkspace((current) => ({
      ...current,
      thresholds: preferences.thresholds,
      notifications: preferences.notifications,
    }))
  }, 'Settings saved.'), [handleMutation, loadWorkspace, token, userId, workspace.notifications, workspace.thresholds, workspace.user.role])

  const clearWorkspace = useCallback(() => handleMutation(async () => {
    await apiRequest('/workspace/data', token, { method: 'DELETE' })
    await loadWorkspace()
  }, 'Workspace subscriptions, licenses, and recommendations cleared.'), [handleMutation, loadWorkspace, token])

  const value = useMemo(() => ({
    ...workspace,
    isCloud: true,
    loading,
    loadError,
    refreshWorkspace: () => handleMutation(loadWorkspace),
    addSubscription,
    updateSubscription,
    deleteSubscription,
    addSubscriptions,
    addLicenses,
    importLicenseActivity,
    updateLicense,
    updateRecommendation,
    generateRecommendations: generate,
    updateSettings,
    clearWorkspace,
    loadDemo: () => toast.error('Demo data cannot be loaded into an authenticated organization workspace.'),
  }), [
    workspace,
    loading,
    loadError,
    handleMutation,
    loadWorkspace,
    addSubscription,
    updateSubscription,
    deleteSubscription,
    addSubscriptions,
    addLicenses,
    importLicenseActivity,
    updateLicense,
    updateRecommendation,
    generate,
    updateSettings,
    clearWorkspace,
  ])

  if (loading) return <div aria-busy="true" className="page-loading"><span /><span /><span /><p>Loading your organization workspace…</p></div>
  if (onboarding?.needsOrganization) {
    return (
      <OrganizationOnboarding
        email={onboarding.email}
        onCreate={createOrganization}
        onSignOut={() => signOut().catch((error) => { console.error('Sign-out failed:', error); toast.error(error.message || 'Could not sign out.') })}
        signingOut={false}
        suggestedName={onboarding.suggestedName}
      />
    )
  }
  if (loadError) {
    return (
      <main className="auth-page">
        <section className="auth-card auth-error-card">
          <span className="eyebrow">WORKSPACE CONNECTION</span>
          <h1>Could not load your workspace</h1>
          <p>{loadError}</p>
          <div className="auth-error-actions"><button className="primary-button" onClick={() => {
            setLoading(true)
            loadWorkspace().catch((error) => setLoadError(error.message)).finally(() => setLoading(false))
          }} type="button">Retry connection</button><button className="secondary-button" onClick={() => signOut().catch((error) => { console.error('Sign-out failed:', error); toast.error(error.message || 'Could not sign out.') })} type="button">Sign out</button></div>
        </section>
      </main>
    )
  }
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}
