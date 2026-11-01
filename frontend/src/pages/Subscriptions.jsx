import { useMemo, useState } from 'react'
import { useOutletContext, useSearchParams } from 'react-router-dom'
import { ArrowDownUp, Download, Ellipsis, FileUp, Plus, Search, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import ImportDialog from '../components/ImportDialog.jsx'
import SubscriptionFormModal from '../components/SubscriptionFormModal.jsx'
import { EmptyState, PageHeader, StatusPill } from '../components/ui.jsx'
import { useCurrencyFormatter } from '../components/useCurrencyFormatter.js'
import { useWorkspace } from '../state/WorkspaceContext.js'

const categories = ['All categories', 'Productivity', 'Design', 'Development', 'Communication', 'Project Management', 'Marketing', 'Cloud Storage', 'Infrastructure', 'Security', 'CRM', 'Sales', 'Customer Support', 'Other']

function SubscriptionsPage() {
  const workspace = useWorkspace()
  const { search: globalSearch } = useOutletContext()
  const money = useCurrencyFormatter()
  const [searchParams] = useSearchParams()
  const { subscriptions, addSubscription, addSubscriptions, updateSubscription, deleteSubscription } = workspace
  const [localSearch, setLocalSearch] = useState(searchParams.get('search') ?? '')
  const [category, setCategory] = useState('All categories')
  const [status, setStatus] = useState('All statuses')
  const [sort, setSort] = useState('cost')
  const [modal, setModal] = useState(null)
  const [importOpen, setImportOpen] = useState(false)
  const filtered = useMemo(() => subscriptions.filter((item) => {
    const query = `${globalSearch} ${localSearch}`.trim().toLowerCase()
    return (!query || `${item.appName} ${item.vendor} ${item.category} ${item.department} ${item.owner}`.toLowerCase().includes(query))
      && (category === 'All categories' || item.category === category)
      && (status === 'All statuses' || item.status === status)
  }).sort((left, right) => sort === 'renewal'
    ? new Date(left.renewalDate) - new Date(right.renewalDate)
    : Number(right.monthlyCost) - Number(left.monthlyCost)), [subscriptions, globalSearch, localSearch, category, status, sort])
  const totalMonthly = subscriptions.reduce((sum, item) => sum + Number(item.monthlyCost || 0), 0)

  async function saveSubscription(values) {
    let saved
    if (modal?.subscription) {
      saved = await updateSubscription(modal.subscription.id, values)
      if (!workspace.isCloud) toast.success(`${values.appName} was updated.`)
    } else {
      saved = await addSubscription(values)
      if (!workspace.isCloud) toast.success(`${values.appName} was added.`)
    }
    if (saved === false) return
    setModal(null)
  }

  function removeSubscription(item) {
    if (!window.confirm(`Remove ${item.appName} and its associated license records? This cannot be undone.`)) return
    Promise.resolve(deleteSubscription(item.id)).then((result) => {
      if (result !== false && !workspace.isCloud) toast.success(`${item.appName} was removed.`)
    })
  }

  return (
    <div className="page-content">
      <PageHeader eyebrow="MANAGEMENT" title="Subscriptions" description="Keep every software commitment, renewal, and owner in one place." actions={<><button className="secondary-button" onClick={() => setImportOpen(true)} type="button"><FileUp size={15} /> Import CSV</button><button className="primary-button" onClick={() => setModal({})} type="button"><Plus size={16} /> Add subscription</button></>} />
      <section className="metrics-grid compact-metrics">
        <div className="mini-metric"><span>Tracked applications</span><strong>{subscriptions.length}</strong><small>Across {new Set(subscriptions.map((item) => item.category)).size} categories</small></div>
        <div className="mini-metric"><span>Monthly commitment</span><strong>{money(totalMonthly)}</strong><small>Normalized billing run rate</small></div>
        <div className="mini-metric"><span>Renewing in 30 days</span><strong>{subscriptions.filter((item) => { const days = Math.ceil((new Date(`${item.renewalDate}T00:00:00`) - new Date()) / 86_400_000); return days >= 0 && days <= 30 }).length}</strong><small>Review before you renew</small></div>
      </section>
      <section className="card management-card">
        <div className="table-toolbar">
          <label className="filter-search"><Search size={15} /><input aria-label="Filter subscriptions" onChange={(event) => setLocalSearch(event.target.value)} placeholder="Search applications, vendors, owners..." value={localSearch} /></label>
          <div className="filter-controls">
            <select aria-label="Filter category" onChange={(event) => setCategory(event.target.value)} value={category}>{categories.map((item) => <option key={item}>{item}</option>)}</select>
            <select aria-label="Filter status" onChange={(event) => setStatus(event.target.value)} value={status}>{['All statuses', 'Active', 'Trial', 'Inactive'].map((item) => <option key={item}>{item}</option>)}</select>
            <button className="secondary-button sort-button" onClick={() => setSort((value) => value === 'cost' ? 'renewal' : 'cost')} type="button"><ArrowDownUp size={14} />Sort by {sort === 'cost' ? 'cost' : 'renewal'}</button>
          </div>
        </div>
        {filtered.length === 0 ? <EmptyState icon={Search} title="No subscriptions found" description={subscriptions.length ? 'Try changing your search or filters.' : 'Add your first subscription or load the demo organization.'} action={subscriptions.length === 0 && <button className="primary-button" onClick={() => setModal({})} type="button"><Plus size={15} /> Add subscription</button>} /> : (
          <div className="table-scroll">
            <table className="data-table">
              <thead><tr><th>Application</th><th>Vendor</th><th>Category</th><th>Monthly cost</th><th>Total seats</th><th>Assigned</th><th>Renewal date</th><th>Status</th><th>Owner</th><th>Actions</th></tr></thead>
              <tbody>{filtered.map((item) => <tr key={item.id}>
                <td><span className="table-app"><span className="app-monogram">{item.appName.slice(0, 1)}</span><strong>{item.appName}</strong></span></td>
                <td>{item.vendor}</td><td>{item.category}</td><td className="table-number">{money(item.monthlyCost)}<small>/mo</small></td>
                <td>{item.totalSeats}</td><td>{item.assignedSeats} <span className="muted-table">/ {item.totalSeats}</span></td>
                <td>{new Date(`${item.renewalDate}T00:00:00`).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                <td><StatusPill status={item.status} /></td><td>{item.owner || '—'}</td>
                <td><div className="row-actions"><button aria-label={`View ${item.appName} details`} className="row-action-button" onClick={() => setModal({ detail: item })} type="button"><Ellipsis size={15} /></button><button aria-label={`Edit ${item.appName}`} className="row-action-button" onClick={() => setModal({ subscription: item })} type="button"><Download size={14} /></button><button aria-label={`Delete ${item.appName}`} className="row-action-button danger-action" onClick={() => removeSubscription(item)} type="button"><Trash2 size={14} /></button></div></td>
              </tr>)}</tbody>
            </table>
          </div>
        )}
        {filtered.length > 0 && <div className="table-footer"><span>Showing {filtered.length} of {subscriptions.length} subscriptions</span><span>Monthly commitment: <strong>{money(totalMonthly)}</strong></span></div>}
      </section>
      {modal?.subscription && <SubscriptionFormModal onClose={() => setModal(null)} onSave={saveSubscription} subscription={modal.subscription} />}
      {modal && !modal.subscription && !modal.detail && <SubscriptionFormModal onClose={() => setModal(null)} onSave={saveSubscription} />}
      {modal?.detail && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null) }}><section aria-labelledby="subscription-detail-title" aria-modal="true" className="modal detail-modal" role="dialog"><div className="modal-header"><div><span className="eyebrow">APPLICATION DETAILS</span><h2 id="subscription-detail-title">{modal.detail.appName}</h2><p>{modal.detail.vendor}</p></div><button aria-label="Close dialog" className="icon-button" onClick={() => setModal(null)} type="button">×</button></div><div className="detail-grid">{[['Category', modal.detail.category], ['Monthly cost', money(modal.detail.monthlyCost)], ['Billing frequency', modal.detail.billingFrequency], ['Seats', `${modal.detail.assignedSeats} assigned of ${modal.detail.totalSeats}`], ['Renewal', modal.detail.renewalDate], ['Department', modal.detail.department], ['Owner', modal.detail.owner], ['Status', modal.detail.status]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value || '—'}</strong></div>)}</div><div className="modal-actions"><button className="secondary-button" onClick={() => setModal({ subscription: modal.detail })} type="button">Edit details</button><button className="primary-button" onClick={() => setModal(null)} type="button">Done</button></div></section></div>}
      {importOpen && <ImportDialog existingRows={subscriptions} onClose={() => setImportOpen(false)} onImport={(items) => addSubscriptions(items)} subscriptions={subscriptions} type="subscriptions" />}
    </div>
  )
}

export default SubscriptionsPage