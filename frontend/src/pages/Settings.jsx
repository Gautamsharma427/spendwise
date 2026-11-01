import { useCallback, useEffect, useState } from 'react'
import { Bell, Building2, CircleHelp, Database, RotateCw, Save, ShieldCheck, Trash2, Monitor, XCircle } from 'lucide-react'
import { PageHeader } from '../components/ui.jsx'
import { useWorkspace } from '../state/WorkspaceContext.js'
import { useAuth } from '../auth/AuthContext.js'
import { apiRequest } from '../api/client.js'

function SettingsPage() {
  const workspace = useWorkspace()
  const { session } = useAuth()
  const { organization, user, thresholds, notifications, updateSettings, loadDemo, clearWorkspace } = workspace
  const isCloud = workspace.isCloud
  const canEditProfile = !isCloud || user.role === 'Admin'
  const canManageMonitoring = isCloud && user.role === 'Admin'
  const [organizationName, setOrganizationName] = useState(organization.name)
  const [currency, setCurrency] = useState(organization.currency)
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const [thresholdValues, setThresholdValues] = useState(thresholds)
  const [notificationValues, setNotificationValues] = useState(notifications)
  const [formError, setFormError] = useState('')
  const [monitoring, setMonitoring] = useState({ devices: [], mappings: [], usage: [] })
  const [monitoringLoading, setMonitoringLoading] = useState(canManageMonitoring)
  const [monitoringError, setMonitoringError] = useState('')
  const [employeeEmail, setEmployeeEmail] = useState('')
  const [deviceName, setDeviceName] = useState('')
  const [enrollmentCode, setEnrollmentCode] = useState('')
  const [mappingSelections, setMappingSelections] = useState({})

  const loadMonitoring = useCallback(async () => {
    if (!canManageMonitoring || !session?.access_token) return
    try {
      setMonitoring(await apiRequest('/monitoring/overview', session.access_token))
    } catch (error) {
      console.error('Could not load monitoring data:', error)
      setMonitoringError(error.message)
    } finally {
      setMonitoringLoading(false)
    }
  }, [canManageMonitoring, session])

  useEffect(() => {
    if (!canManageMonitoring || !session?.access_token) return undefined
    let active = true
    apiRequest('/monitoring/overview', session.access_token)
      .then((result) => { if (active) setMonitoring(result) })
      .catch((error) => {
        if (!active) return
        console.error('Could not load monitoring data:', error)
        setMonitoringError(error.message)
      })
      .finally(() => { if (active) setMonitoringLoading(false) })
    return () => { active = false }
  }, [canManageMonitoring, session?.access_token])

  function refreshMonitoring() {
    setMonitoringError('')
    setMonitoringLoading(true)
    void loadMonitoring()
  }

  async function createEnrollment(event) {
    event.preventDefault()
    setEnrollmentCode('')
    try {
      const result = await apiRequest('/monitoring/enrollments', session.access_token, {
        method: 'POST',
        body: { employeeEmail, deviceName },
      })
      setEnrollmentCode(result.code)
      setEmployeeEmail('')
      setDeviceName('')
      await loadMonitoring()
    } catch (error) {
      console.error('Could not create monitoring enrollment:', error)
      setMonitoringError(error.message)
    }
  }

  async function mapApplication(appId) {
    const subscriptionId = mappingSelections[appId]
    if (!subscriptionId) {
      setMonitoringError('Select a subscription before mapping this application.')
      return
    }
    try {
      await apiRequest('/monitoring/app-mappings', session.access_token, {
        method: 'PUT',
        body: { appId, subscriptionId },
      })
      await loadMonitoring()
    } catch (error) {
      console.error('Could not map monitored application:', error)
      setMonitoringError(error.message)
    }
  }

  async function revokeDevice(device) {
    if (!window.confirm(`Revoke monitoring for ${device.deviceName}? The agent will stop uploading activity.`)) return
    try {
      await apiRequest(`/monitoring/devices/${device.id}`, session.access_token, { method: 'DELETE' })
      await loadMonitoring()
    } catch (error) {
      console.error('Could not revoke monitoring device:', error)
      setMonitoringError(error.message)
    }
  }

  function formatUsage(seconds) {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return hours ? `${hours}h ${minutes}m` : `${minutes}m`
  }

  function save() {
    if (!organizationName.trim() || !name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormError('Enter an organization name, your name, and a valid email address.')
      return
    }
    const values = Object.values(thresholdValues).map(Number)
    if (values.some((value) => !Number.isInteger(value) || value < 1) || !(values[0] < values[1] && values[1] < values[2])) {
      setFormError('Inactivity thresholds must be positive whole days in ascending order.')
      return
    }
    setFormError('')
    updateSettings({
      organization: { name: organizationName.trim(), currency, demoMode: false },
      user: { name: name.trim(), email: email.trim() },
      thresholds: Object.fromEntries(Object.entries(thresholdValues).map(([key, value]) => [key, Number(value)])),
      notifications: notificationValues,
    })
  }

  function resetDemo() {
    if (window.confirm('Replace current workspace data with the Northstar Labs sample organization? The current local workspace will be overwritten.')) loadDemo()
  }

  function resetWorkspace() {
    const prompt = isCloud
      ? 'Permanently remove all subscriptions in this organization? Their linked licenses and recommendations will also be removed. This cannot be undone.'
      : 'Permanently remove every subscription, license, and recommendation saved in this browser? This cannot be undone.'
    if (window.confirm(prompt)) clearWorkspace()
  }

  return (
    <div className="page-content">
      <PageHeader eyebrow="CONFIGURATION" title="Settings" description="Manage your organization, optimization rules, notifications, and workspace data." actions={<button className="primary-button" onClick={save} type="button"><Save size={15} /> Save changes</button>} />
      {formError && <p className="form-error settings-error" role="alert">{formError}</p>}
      <div className="settings-layout">
        <section className="card settings-card">
          <div className="settings-section-title"><span className="settings-icon"><Building2 size={17} /></span><div><h2>Organization profile</h2><p>Workspace and reporting preferences.</p></div></div>
          <div className="settings-form-grid"><label>Organization name<input disabled={!canEditProfile} onChange={(event) => setOrganizationName(event.target.value)} value={organizationName} /></label><label>Reporting currency<select disabled={!canEditProfile} onChange={(event) => setCurrency(event.target.value)} value={currency}><option value="INR">Indian Rupee (INR)</option><option value="USD">US Dollar (USD)</option><option value="EUR">Euro (EUR)</option><option value="GBP">British Pound (GBP)</option></select></label><label>Your name<input disabled={!canEditProfile} onChange={(event) => setName(event.target.value)} value={name} /></label><label>Email address<input onChange={(event) => setEmail(event.target.value)} readOnly={isCloud} type="email" value={email} /></label></div>
        </section>
        <section className="card settings-card">
          <div className="settings-section-title"><span className="settings-icon"><ShieldCheck size={17} /></span><div><h2>License inactivity rules</h2><p>Unknown or invalid activity dates are never flagged as inactive.</p></div></div>
          <div className="threshold-grid">{[['lowActivityDays', 'Low activity after', '0–N days are active'], ['potentialDays', 'Potentially unused after', 'N–N days: review'], ['highPriorityDays', 'High-priority review after', 'More than N days: priority']].map(([key, label, detail]) => <label key={key}>{label}<div className="number-input"><input max="3650" min="1" onChange={(event) => setThresholdValues((current) => ({ ...current, [key]: event.target.value }))} type="number" value={thresholdValues[key]} /><span>days</span></div><small>{detail}</small></label>)}</div>
        </section>
        <section className="card settings-card">
          <div className="settings-section-title"><span className="settings-icon"><Bell size={17} /></span><div><h2>Notifications</h2><p>Choose which reminders appear in your workspace.</p></div></div>
          <div className="preference-list">{[['renewals', 'Renewal reminders', 'Upcoming contract renewals and review windows.'], ['optimization', 'Optimization opportunities', 'New inactive-seat and duplicate-tool findings.'], ['weeklyDigest', 'Weekly digest', 'A weekly summary of your spend and savings.']].map(([key, title, detail]) => <label className="preference-row" key={key}><span><strong>{title}</strong><small>{detail}</small></span><input checked={Boolean(notificationValues[key])} onChange={(event) => setNotificationValues((current) => ({ ...current, [key]: event.target.checked }))} type="checkbox" /></label>)}</div>
        </section>
        <section className="card settings-card">
          <div className="settings-section-title"><span className="settings-icon"><ShieldCheck size={17} /></span><div><h2>Recommendation engine</h2><p>Rules are transparent, repeatable, and run inside the SpendWise backend.</p></div></div>
          <div className="integration-status"><span className="connection-indicator" /><span><strong>No external recommendation service</strong><small>Inactivity and renewal dates are evaluated against your thresholds. Savings are prorated from subscription and license costs, capped at subscription spend. Category matches are review prompts only, not proof that products overlap.</small></span><span className="local-badge">DETERMINISTIC</span></div>
        </section>
        {canManageMonitoring && <section className="card settings-card">
          <div className="settings-section-title"><span className="settings-icon"><Monitor size={17} /></span><div><h2>Employee usage agent</h2><p>Transparent Windows-agent enrollment and recent foreground-app usage. Window titles and app content are not collected.</p></div></div>
          <form className="settings-form-grid" onSubmit={createEnrollment}>
            <label>Employee work email<input autoComplete="email" onChange={(event) => setEmployeeEmail(event.target.value)} required type="email" value={employeeEmail} /></label>
            <label>Managed device name<input onChange={(event) => setDeviceName(event.target.value)} required value={deviceName} /></label>
            <button className="primary-button" type="submit">Create one-time enrollment code</button>
          </form>
          <a className="template-link" href="https://github.com/Gautamsharma427/spendwise/releases/latest/download/SpendWiseAgent.exe" rel="noreferrer" target="_blank">Download Windows usage agent</a>
          {enrollmentCode && <div className="notice-banner"><ShieldCheck size={16} /><span><strong>Code shown once · expires in 24 hours</strong><br />Give this code to the employee or IT administrator to enroll the named device. The agent stores only its device credential after enrollment.</span><code>{enrollmentCode}</code></div>}
          {monitoringError && <p className="form-error" role="alert">{monitoringError}</p>}
          <div className="data-controls"><strong>{monitoring.devices.filter((device) => !device.revokedAt).length} enrolled devices</strong><span>Usage is retained for 90 days; this dashboard summarizes the latest 30 days.</span><button className="secondary-button" disabled={monitoringLoading} onClick={refreshMonitoring} type="button"><RotateCw size={14} /> Refresh</button></div>
          {monitoring.devices.length > 0 && <div className="table-scroll"><table className="data-table"><thead><tr><th>Employee</th><th>Device</th><th>Last activity upload</th><th>Status</th><th>Action</th></tr></thead><tbody>{monitoring.devices.map((device) => <tr key={device.id}><td>{device.employeeEmail}</td><td>{device.deviceName}</td><td>{device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString() : 'No activity uploaded yet'}</td><td>{device.revokedAt ? 'Revoked' : 'Authorized'}</td><td>{!device.revokedAt && <button className="text-action danger-text" onClick={() => revokeDevice(device)} type="button"><XCircle size={14} /> Revoke</button>}</td></tr>)}</tbody></table></div>}
          {monitoring.usage.length > 0 && <>
            <h3>Map detected applications to subscriptions</h3>
            <p className="form-help">Windows reports executable names, not SaaS vendor names. A browser reports only browser use, not which websites were open; do not map a shared browser process to one specific subscription. Map each process once; future activity will update matched employees’ license last-used dates.</p>
            <div className="table-scroll"><table className="data-table"><thead><tr><th>Detected process</th><th>Subscription</th><th>Action</th></tr></thead><tbody>{[...new Map(monitoring.usage.map((row) => [row.appId, row])).values()].map((row) => {
              const mapping = monitoring.mappings.find((item) => item.appId === row.appId)
              return <tr key={row.appId}><td>{row.appId}</td><td><select aria-label={`Subscription mapping for ${row.appId}`} onChange={(event) => setMappingSelections((current) => ({ ...current, [row.appId]: event.target.value }))} value={mappingSelections[row.appId] ?? mapping?.subscriptionId ?? ''}><option value="">Choose subscription…</option>{workspace.subscriptions.map((subscription) => <option key={subscription.id} value={subscription.id}>{subscription.appName}</option>)}</select>{mapping && <small> Currently mapped to {mapping.subscriptionAppName}</small>}</td><td><button className="secondary-button" onClick={() => mapApplication(row.appId)} type="button">{mapping ? 'Update mapping' : 'Map app'}</button></td></tr>
            })}</tbody></table></div>
            <h3>Recent employee app activity</h3>
            <div className="table-scroll"><table className="data-table"><thead><tr><th>Employee</th><th>Application process</th><th>Mapped subscription</th><th>Active time · 30 days</th><th>Active days</th><th>Last activity</th></tr></thead><tbody>{monitoring.usage.map((row) => <tr key={`${row.employeeEmail}:${row.appId}`}><td>{row.employeeEmail}</td><td>{row.appId}</td><td>{row.subscriptionAppName || 'Not mapped'}</td><td>{formatUsage(row.activeSeconds)}</td><td>{row.activeDays}</td><td>{row.lastActivityDate}</td></tr>)}</tbody></table></div>
          </>}
          {monitoringLoading && <p className="form-help">Loading device and app usage data…</p>}
          <p className="form-help">Employees must receive the monitoring notice before installation. The visible agent runs in the signed-in user session, monitors foreground process names and active time only, and can be revoked here. It never requests employee passwords or runs with administrator privileges. Browser process activity cannot identify which website is open.</p>
        </section>}
        <section className="card settings-card">
          <div className="settings-section-title"><span className="settings-icon"><Database size={17} /></span><div><h2>Data management</h2><p>Demo data and workspace records are stored in this browser.</p></div></div>
          <div className="data-controls"><div><strong>{workspace.subscriptions.length} subscriptions · {workspace.licenses.length} licenses · {workspace.recommendations.length} recommendations</strong><small>{organization.demoMode ? 'Northstar Labs illustrative demo dataset' : isCloud ? 'Persisted in your authenticated Supabase organization' : 'Local workspace data'}</small></div>{!isCloud && <button className="secondary-button" onClick={resetDemo} type="button"><RotateCw size={14} /> Load demo organization</button>}{canEditProfile && <button className="danger-button" onClick={resetWorkspace} type="button"><Trash2 size={14} /> {isCloud ? 'Clear organization data' : 'Clear workspace data'}</button>}</div>
        </section>
        <section className="settings-footnote"><CircleHelp size={15} /><span>{isCloud ? 'Subscriptions, licenses, and recommendations are stored in Supabase. Inactivity thresholds and notification preferences are saved in this browser for this signed-in account.' : 'SpendWise demo workspace data is stored locally in this browser.'}</span></section>
      </div>
    </div>
  )
}

export default SettingsPage