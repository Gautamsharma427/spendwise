import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { createDemoWorkspace } from '../data/demoData.js'
import { generateRecommendations, normalizeApplicationName } from '../domain/analytics.js'
import { useAuth } from '../auth/AuthContext.js'
import { WorkspaceContext } from './WorkspaceContext.js'
import { RemoteWorkspaceProvider } from './RemoteWorkspaceProvider.jsx'

const STORAGE_KEY = 'spendwise-workspace-v1'

function readWorkspace() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return createDemoWorkspace()
    const data = JSON.parse(stored)
    if (!Array.isArray(data.subscriptions) || !Array.isArray(data.licenses) || !Array.isArray(data.recommendations)) {
      throw new Error('Saved workspace data is incomplete.')
    }
    return data
  } catch (error) {
    console.error('Unable to load saved SpendWise workspace:', error)
    toast.error('Saved workspace data could not be loaded. A demo workspace was opened.')
    return createDemoWorkspace()
  }
}

function DemoWorkspaceProvider({ children }) {
  const [workspace, setWorkspace] = useState(readWorkspace)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace))
    } catch (error) {
      console.error('Unable to persist SpendWise workspace:', error)
      toast.error('Changes could not be saved in this browser.')
    }
  }, [workspace])

  const addSubscription = useCallback((subscription) => {
    setWorkspace((current) => {
      if (current.subscriptions.some((item) => normalizeApplicationName(item.appName) === normalizeApplicationName(subscription.appName))) {
        toast.error(`${subscription.appName} is already in your workspace.`)
        return current
      }
      return {
        ...current,
        organization: { ...current.organization, demoMode: false },
        spendingHistory: [],
        subscriptions: [subscription, ...current.subscriptions],
        activity: [{ id: crypto.randomUUID(), action: `Added ${subscription.appName} subscription`, date: new Date().toISOString() }, ...current.activity],
      }
    })
  }, [])

  const updateSubscription = useCallback((subscriptionId, changes) => {
    setWorkspace((current) => {
      const currentSubscription = current.subscriptions.find((item) => item.id === subscriptionId)
      const updatedName = changes.appName ?? currentSubscription?.appName
      if (current.subscriptions.some((item) => item.id !== subscriptionId
        && normalizeApplicationName(item.appName) === normalizeApplicationName(updatedName))) {
        toast.error(`${updatedName} is already in your workspace.`)
        return current
      }
      return {
        ...current,
        organization: { ...current.organization, demoMode: false },
        spendingHistory: [],
        subscriptions: current.subscriptions.map((item) => item.id === subscriptionId
          ? {
            ...item,
            ...changes,
            seatCost: Number(changes.totalSeats ?? item.totalSeats) > 0
              ? Math.round((Number(changes.monthlyCost ?? item.monthlyCost) / Number(changes.totalSeats ?? item.totalSeats)) * 100) / 100
              : null,
          }
          : item),
        activity: [{ id: crypto.randomUUID(), action: 'Updated a subscription', date: new Date().toISOString() }, ...current.activity],
      }
    })
  }, [])

  const deleteSubscription = useCallback((subscriptionId) => {
    setWorkspace((current) => {
      const subscription = current.subscriptions.find((item) => item.id === subscriptionId)
      return {
        ...current,
        organization: { ...current.organization, demoMode: false },
        spendingHistory: [],
        subscriptions: current.subscriptions.filter((item) => item.id !== subscriptionId),
        licenses: current.licenses.filter((item) => item.subscriptionId !== subscriptionId),
        activity: [{ id: crypto.randomUUID(), action: `Removed ${subscription?.appName ?? 'a'} subscription and its demo license records`, date: new Date().toISOString() }, ...current.activity],
      }
    })
  }, [])

  const addLicenses = useCallback((licenses) => {
    setWorkspace((current) => ({
      ...current,
      organization: { ...current.organization, demoMode: false },
      spendingHistory: [],
      licenses: [...licenses, ...current.licenses],
      activity: [{ id: crypto.randomUUID(), action: `Imported ${licenses.length} license records`, date: new Date().toISOString() }, ...current.activity],
    }))
  }, [])

  const importLicenseActivity = useCallback((records) => {
    const activityByLicense = new Map(records.map((record) => [record.licenseId, record.lastActive]))
    setWorkspace((current) => ({
      ...current,
      licenses: current.licenses.map((license) => {
        const lastActive = activityByLicense.get(license.id)
        return lastActive && (!license.lastActive || lastActive > license.lastActive)
          ? { ...license, lastActive }
          : license
      }),
      activity: [{ id: crypto.randomUUID(), action: `Synchronized activity for ${records.length} licenses`, date: new Date().toISOString() }, ...current.activity],
    }))
    return true
  }, [])

  const addSubscriptions = useCallback((subscriptions) => {
    setWorkspace((current) => {
      const existing = new Set(current.subscriptions.map((item) => normalizeApplicationName(item.appName)))
      const additions = subscriptions.filter((item) => {
        const key = normalizeApplicationName(item.appName)
        if (existing.has(key)) return false
        existing.add(key)
        return true
      })
      if (additions.length < subscriptions.length) {
        toast.error(`${subscriptions.length - additions.length} duplicate application row(s) were not added.`)
      }
      return {
        ...current,
        organization: { ...current.organization, demoMode: false },
        spendingHistory: [],
        subscriptions: [...additions, ...current.subscriptions],
        activity: [{ id: crypto.randomUUID(), action: `Imported ${additions.length} subscriptions`, date: new Date().toISOString() }, ...current.activity],
      }
    })
  }, [])

  const updateLicense = useCallback((licenseId, changes) => {
    setWorkspace((current) => {
      const target = current.licenses.find((license) => license.id === licenseId)
      const updatedEmail = changes.employeeEmail?.trim().toLowerCase()
      if (updatedEmail && current.licenses.some((license) => license.id !== licenseId
        && license.subscriptionId === target?.subscriptionId
        && license.employeeEmail?.trim().toLowerCase() === updatedEmail)) {
        toast.error('This person already has a license for the application.')
        return current
      }
      return {
        ...current,
        organization: { ...current.organization, demoMode: false },
        spendingHistory: [],
        licenses: current.licenses.map((license) => license.id === licenseId ? { ...license, ...changes } : license),
        activity: [{ id: crypto.randomUUID(), action: 'Updated a license record', date: new Date().toISOString() }, ...current.activity],
      }
    })
  }, [])

  const updateRecommendation = useCallback((recommendationId, changes) => {
    setWorkspace((current) => ({
      ...current,
      organization: { ...current.organization, demoMode: false },
      spendingHistory: [],
      recommendations: current.recommendations.map((recommendation) => recommendation.id === recommendationId
        ? { ...recommendation, ...changes, updatedAt: new Date().toISOString() }
        : recommendation),
      activity: [{ id: crypto.randomUUID(), action: `${changes.status ?? 'Updated'} a recommendation`, date: new Date().toISOString() }, ...current.activity],
    }))
  }, [])

  const generate = useCallback(() => {
    setWorkspace((current) => {
      const existing = new Set(current.recommendations.map((recommendation) => recommendation.id))
      const recommendations = generateRecommendations(current.subscriptions, current.licenses, current.thresholds, current.organization.currency)
        .filter((recommendation) => !existing.has(recommendation.id))
      if (!recommendations.length) toast('All current opportunities have already been analyzed.')
      else toast.success(`Generated ${recommendations.length} new recommendation${recommendations.length === 1 ? '' : 's'}.`)
      return {
        ...current,
        recommendations: [...recommendations, ...current.recommendations],
        activity: recommendations.length
          ? [{ id: crypto.randomUUID(), action: `Generated ${recommendations.length} recommendations`, date: new Date().toISOString() }, ...current.activity]
          : current.activity,
      }
    })
  }, [])

  const updateSettings = useCallback((changes) => {
    setWorkspace((current) => ({
      ...current,
      ...changes,
      organization: changes.organization ? { ...current.organization, ...changes.organization } : current.organization,
      user: changes.user ? { ...current.user, ...changes.user } : current.user,
      thresholds: changes.thresholds ? { ...current.thresholds, ...changes.thresholds } : current.thresholds,
      notifications: changes.notifications ? { ...current.notifications, ...changes.notifications } : current.notifications,
    }))
    toast.success('Settings saved.')
  }, [])

  const clearWorkspace = useCallback(() => {
    setWorkspace((current) => ({
      ...current,
      organization: { ...current.organization, demoMode: false },
      subscriptions: [],
      licenses: [],
      recommendations: [],
      spendingHistory: [],
      activity: [{ id: crypto.randomUUID(), action: 'Workspace data cleared', date: new Date().toISOString() }],
    }))
    toast.success('Workspace data cleared.')
  }, [])

  const loadDemo = useCallback(() => {
    setWorkspace(createDemoWorkspace())
    toast.success('The Northstar Labs demo organization is ready.')
  }, [])

  const value = useMemo(() => ({
    ...workspace,
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
    loadDemo,
  }), [workspace, addSubscription, updateSubscription, deleteSubscription, addSubscriptions, addLicenses, importLicenseActivity, updateLicense, updateRecommendation, generate, updateSettings, clearWorkspace, loadDemo])

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function WorkspaceProvider({ children }) {
  const auth = useAuth()
  if (auth.configured) return <RemoteWorkspaceProvider key={auth.session?.user.id}>{children}</RemoteWorkspaceProvider>
  return <DemoWorkspaceProvider>{children}</DemoWorkspaceProvider>
}
