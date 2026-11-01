import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { isValidDateOnly } from '../domain/analytics.js'
import { useCurrencyFormatter } from './useCurrencyFormatter.js'
import { useWorkspace } from '../state/WorkspaceContext.js'

const categories = ['Productivity', 'Design', 'Development', 'Communication', 'Project Management', 'Marketing', 'Cloud Storage', 'Infrastructure', 'Security', 'CRM', 'Sales', 'Customer Support', 'Other']

function SubscriptionFormModal({ subscription, onClose, onSave }) {
  const billingDivisors = { monthly: 1, quarterly: 3, annually: 12 }
  const money = useCurrencyFormatter()
  const { organization } = useWorkspace()
  const [values, setValues] = useState({
    appName: subscription?.appName ?? '',
    vendor: subscription?.vendor ?? '',
    category: subscription?.category ?? 'Productivity',
    billingAmount: subscription?.billingAmount ?? (subscription?.monthlyCost ? subscription.monthlyCost * billingDivisors[subscription.billingFrequency ?? 'monthly'] : ''),
    billingFrequency: subscription?.billingFrequency ?? 'monthly',
    totalSeats: subscription?.totalSeats ?? '',
    assignedSeats: subscription?.assignedSeats ?? '',
    renewalDate: subscription?.renewalDate ?? '',
    department: subscription?.department ?? '',
    owner: subscription?.owner ?? '',
    status: subscription?.status ?? 'Active',
    description: subscription?.description ?? '',
    seatCost: subscription?.seatCost ?? (subscription?.totalSeats ? Math.round((subscription.monthlyCost / subscription.totalSeats) * 100) / 100 : null),
  })
  const [error, setError] = useState('')

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }))
    setError('')
  }

  function submit(event) {
    event.preventDefault()
    const totalSeats = Number(values.totalSeats)
    const assignedSeats = Number(values.assignedSeats)
    const billingAmount = Number(values.billingAmount)
    if (!values.appName.trim() || !values.vendor.trim() || !values.renewalDate || !values.owner.trim() || !values.department.trim()) {
      setError('Complete the required fields before saving.')
      return
    }
    if (!Number.isFinite(billingAmount) || billingAmount < 0) {
      setError('Billing amount must be a non-negative number.')
      return
    }
    if (!Number.isInteger(totalSeats) || totalSeats < 1 || !Number.isInteger(assignedSeats) || assignedSeats < 0 || assignedSeats > totalSeats) {
      setError('Assigned seats must be a whole number between zero and total seats.')
      return
    }
    if (!isValidDateOnly(values.renewalDate)) {
      setError('Enter a valid renewal date.')
      return
    }
    const divisor = billingDivisors[values.billingFrequency]
    onSave({
      ...values,
      id: subscription?.id ?? crypto.randomUUID(),
      appName: values.appName.trim(),
      vendor: values.vendor.trim(),
      monthlyCost: Math.round((billingAmount / divisor) * 100) / 100,
      billingAmount,
      totalSeats,
      assignedSeats,
      seatCost: values.seatCost,
      description: values.description.trim(),
    })
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section aria-labelledby="subscription-modal-title" aria-modal="true" className="modal subscription-modal" role="dialog">
        <div className="modal-header">
          <div><span className="eyebrow">{subscription ? 'SUBSCRIPTION DETAILS' : 'NEW COMMITMENT'}</span><h2 id="subscription-modal-title">{subscription ? 'Edit subscription' : 'Add subscription'}</h2><p>Enter the plan, ownership, and renewal details.</p></div>
          <button aria-label="Close dialog" className="icon-button" onClick={onClose} type="button"><X size={18} /></button>
        </div>
        <form className="form-grid" onSubmit={submit}>
          <label>Application name<input autoFocus onChange={(event) => update('appName', event.target.value)} placeholder="e.g. Figma" required value={values.appName} /></label>
          <label>Vendor<input onChange={(event) => update('vendor', event.target.value)} placeholder="e.g. Figma, Inc." required value={values.vendor} /></label>
          <label>Category<select onChange={(event) => update('category', event.target.value)} value={values.category}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
          <label>Billing frequency<select onChange={(event) => update('billingFrequency', event.target.value)} value={values.billingFrequency}><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="annually">Annual</option></select></label>
          <label>Billing amount ({organization.currency})<input min="0" onChange={(event) => update('billingAmount', event.target.value)} required step="0.01" type="number" value={values.billingAmount} /></label>
          <label>Total seats<input min="1" onChange={(event) => update('totalSeats', event.target.value)} required step="1" type="number" value={values.totalSeats} /></label>
          <label>Assigned seats<input min="0" onChange={(event) => update('assignedSeats', event.target.value)} required step="1" type="number" value={values.assignedSeats} /></label>
          <label>Renewal date<input onChange={(event) => update('renewalDate', event.target.value)} required type="date" value={values.renewalDate} /></label>
          <label>Department<input onChange={(event) => update('department', event.target.value)} placeholder="e.g. Engineering" required value={values.department} /></label>
          <label>Subscription owner<input onChange={(event) => update('owner', event.target.value)} placeholder="name@company.com" required value={values.owner} /></label>
          <label>Status<select onChange={(event) => update('status', event.target.value)} value={values.status}><option>Active</option><option>Trial</option><option>Inactive</option></select></label>
          <label className="form-wide">Description<input onChange={(event) => update('description', event.target.value)} placeholder="Optional context about this subscription" value={values.description} /></label>
          <p className="form-help form-wide">Normalized monthly cost: {money(Number(values.billingAmount || 0) / billingDivisors[values.billingFrequency], false, 2)}</p>
          {error && <p className="form-error form-wide" role="alert">{error}</p>}
          <div className="modal-actions form-wide"><button className="secondary-button" onClick={onClose} type="button">Cancel</button><button className="primary-button" type="submit"><Check size={15} />{subscription ? 'Save changes' : 'Add subscription'}</button></div>
        </form>
      </section>
    </div>
  )
}

export default SubscriptionFormModal
