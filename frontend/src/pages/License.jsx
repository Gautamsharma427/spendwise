import { useMemo, useState } from 'react'
import { ArrowDownUp, CheckCircle2, FileUp, Search, ShieldAlert, Users, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import ImportDialog from '../components/ImportDialog.jsx'
import { EmptyState, MetricCard, PageHeader, StatusPill } from '../components/ui.jsx'
import { useCurrencyFormatter } from '../components/useCurrencyFormatter.js'
import { useWorkspace } from '../state/WorkspaceContext.js'
import { classifyLicense, getInactivityDays, getLicenseAnalytics } from '../domain/analytics.js'

function LicensePage() {
  const workspace = useWorkspace()
  const money = useCurrencyFormatter()
  const { licenses, subscriptions, thresholds, updateLicense, addLicenses, importLicenseActivity, user } = workspace
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All statuses')
  const [sortInactive, setSortInactive] = useState(true)
  const [page, setPage] = useState(0)
  const [importOpen, setImportOpen] = useState(false)
  const metrics = getLicenseAnalytics(licenses, thresholds)
  const filtered = useMemo(() => licenses.filter((license) => {
    const status = classifyLicense(license, thresholds)
    return (!query || `${license.employeeName} ${license.employeeEmail} ${license.appName} ${license.department}`.toLowerCase().includes(query.toLowerCase()))
      && (statusFilter === 'All statuses' || status === statusFilter)
  }).sort((left, right) => sortInactive
    ? (getInactivityDays(right.lastActive) ?? -1) - (getInactivityDays(left.lastActive) ?? -1)
    : left.appName.localeCompare(right.appName)), [licenses, thresholds, query, statusFilter, sortInactive])
  const pageSize = 15
  const visible = filtered.slice(page * pageSize, (page + 1) * pageSize)
  const inactiveSpend = licenses.reduce((sum, license) => ['Potentially unused', 'High-priority review'].includes(classifyLicense(license, thresholds)) ? sum + (Number(license.monthlyCost) || 0) : sum, 0)

  async function saveLicenseChanges(license, changes, message) {
    const saved = await updateLicense(license.id, changes)
    if (saved !== false && !workspace.isCloud) toast.success(message)
  }

  function reclaim(license) {
    if (!window.confirm(`Confirm that access for ${license.employeeEmail} to ${license.appName} has been removed. This app will only record your action; it will not revoke external access.`)) return
    saveLicenseChanges(license, { reclaimedAt: new Date().toISOString() }, 'License marked reclaimed. External access was not changed.')
  }

  function reassign(license) {
    const email = window.prompt('Enter the new license owner email address:')
    if (!email) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error('Enter a valid email address.')
      return
    }
    saveLicenseChanges(license, { employeeEmail: email.trim(), employeeName: '', lastActive: '', assigned: true, reclaimedAt: null, excludedFromOptimization: false }, 'License assigned. Activity will show as unknown until data is imported.')
  }

  return (
    <div className="page-content">
      <PageHeader eyebrow="MANAGEMENT" title="License utilization" description="Find unused seats, understand activity, and optimize assignments without changing external access." actions={<>{user.role === 'Admin' && <button className="secondary-button" onClick={() => setImportOpen('activity')} type="button"><FileUp size={15} /> Sync usage CSV</button>}<button className="primary-button" onClick={() => setImportOpen('licenses')} type="button"><FileUp size={15} /> Import license CSV</button></>} />
      <section className="metrics-grid license-metrics">
        <MetricCard icon={Users} label="Total purchased" note="Imported and subscription seats" tone="blue" value={metrics.total} />
        <MetricCard icon={CheckCircle2} label="Assigned" note={`${metrics.unassigned} unassigned seats`} tone="purple" value={metrics.assigned} />
        <MetricCard icon={CheckCircle2} label="Recently active" note="Activity within the last 30 days" tone="green" value={metrics.active} />
        <MetricCard icon={ShieldAlert} label="Review recommended" note={`${money(inactiveSpend)} monthly list cost`} tone="amber" value={metrics.inactive} />
        <MetricCard icon={XCircle} label="Unassigned" note={`${metrics.unknown} unknown activity records`} tone="gray" value={metrics.unassigned} />
        <MetricCard icon={CheckCircle2} label="Utilization" note="Active assigned ÷ purchased seats" tone="green" value={`${metrics.utilization}%`} />
      </section>
      <section className="card management-card">
        <div className="table-toolbar">
          <label className="filter-search"><Search size={15} /><input aria-label="Search licenses" onChange={(event) => { setQuery(event.target.value); setPage(0) }} placeholder="Search people, applications, or departments..." value={query} /></label>
          <div className="filter-controls"><select aria-label="Filter license status" onChange={(event) => { setStatusFilter(event.target.value); setPage(0) }} value={statusFilter}>{['All statuses', 'Active', 'Low activity', 'Potentially unused', 'High-priority review', 'Unknown', 'Unassigned', 'Excluded', 'Reclaimed'].map((status) => <option key={status}>{status}</option>)}</select><button className="secondary-button sort-button" onClick={() => setSortInactive((value) => !value)} type="button"><ArrowDownUp size={14} />{sortInactive ? 'Most inactive' : 'Application'}</button></div>
        </div>
        {visible.length === 0 ? <EmptyState icon={Users} title="No license records found" description={licenses.length ? 'Try another search or status filter.' : 'Import a license CSV or load the demo organization.'} /> : (
          <div className="table-scroll"><table className="data-table license-table">
            <thead><tr><th>Employee</th><th>Email</th><th>Application</th><th>Department</th><th>License type</th><th>Last active</th><th>Inactive for</th><th>Monthly cost</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>{visible.map((license) => {
              const status = classifyLicense(license, thresholds)
              const days = getInactivityDays(license.lastActive)
              return <tr key={license.id}>
                <td>{license.employeeName || '—'}</td><td>{license.employeeEmail || 'Unassigned'}</td><td>{license.appName}</td><td>{license.department}</td><td>{license.licenseType}</td><td>{license.lastActive || 'Unknown'}</td><td>{days === null ? '—' : `${days} days`}</td><td>{license.monthlyCost === null ? '—' : money(license.monthlyCost)}</td><td><StatusPill status={status} /></td>
                <td><div className="row-actions">
                  {license.assigned && !license.reclaimedAt && !license.excludedFromOptimization && <button className="text-action" onClick={() => saveLicenseChanges(license, { underReview: !license.underReview }, license.underReview ? 'Removed from review queue.' : 'Added to the review queue.')} type="button">{license.underReview ? 'Unmark review' : 'Mark review'}</button>}
                  {!license.reclaimedAt && !license.excludedFromOptimization && status !== 'Unassigned' && <button className="text-action" onClick={() => saveLicenseChanges(license, { excludedFromOptimization: true }, 'License excluded from optimization.')} type="button">Exclude</button>}
                  {license.assigned && !license.reclaimedAt && <button className="text-action danger-text" onClick={() => reclaim(license)} type="button">Mark reclaimed</button>}
                  {(!license.assigned || license.reclaimedAt) && <button className="text-action" onClick={() => reassign(license)} type="button">Reassign</button>}
                </div></td>
              </tr>
            })}</tbody>
          </table></div>
        )}
        {filtered.length > 0 && <div className="table-footer"><span>Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, filtered.length)} of {filtered.length} license records</span><div className="pagination"><button className="secondary-button" disabled={page === 0} onClick={() => setPage((value) => value - 1)} type="button">Previous</button><button className="secondary-button" disabled={(page + 1) * pageSize >= filtered.length} onClick={() => setPage((value) => value + 1)} type="button">Next</button></div></div>}
      </section>
      <p className="page-footnote">Usage CSV imports update only the latest activity date for matched licenses; older records never overwrite newer activity. Use authorized provider exports—never employee passwords. Reclaiming a license records an authorized admin action only; SpendWise never revokes access in external services. Missing or invalid activity dates remain unknown.</p>
      {importOpen && <ImportDialog existingRows={licenses} onClose={() => setImportOpen(false)} onImport={importOpen === 'activity' ? importLicenseActivity : addLicenses} subscriptions={subscriptions} type={importOpen} />}
    </div>
  )
}

export default LicensePage