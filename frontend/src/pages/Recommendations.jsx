import { useMemo, useState } from 'react'
import { Check, CheckCircle2, ChevronDown, ChevronUp, Clock3, Lightbulb, RotateCw, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { EmptyState, PageHeader, StatusPill } from '../components/ui.jsx'
import { useCurrencyFormatter } from '../components/useCurrencyFormatter.js'
import { useWorkspace } from '../state/WorkspaceContext.js'

const priorityOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 }

function formatEvidenceCurrency(line, money) {
  return line.replace(/[₹$€£]\s?([\d,]+(?:\.\d+)?)/g, (_match, amount) => money(Number(amount.replaceAll(',', ''))))
}

function RecommendationsPage() {
  const { recommendations, updateRecommendation, generateRecommendations: generate, organization, isCloud } = useWorkspace()
  const money = useCurrencyFormatter()
  const [statusFilter, setStatusFilter] = useState('Pending')
  const [priorityFilter, setPriorityFilter] = useState('All priorities')
  const [expanded, setExpanded] = useState('')
  const [completeItem, setCompleteItem] = useState(null)
  const [verifiedAmount, setVerifiedAmount] = useState('')
  const visible = useMemo(() => recommendations
    .filter((item) => (statusFilter === 'All' || item.status === statusFilter) && (priorityFilter === 'All priorities' || item.priority === priorityFilter))
    .sort((left, right) => (priorityOrder[left.priority] ?? 9) - (priorityOrder[right.priority] ?? 9)), [recommendations, statusFilter, priorityFilter])
  const pendingSavings = recommendations.filter((item) => item.status === 'Pending').reduce((sum, item) => sum + (Number(item.estimatedMonthlySavings) || 0), 0)
  const verifiedSavings = recommendations.filter((item) => item.status === 'Completed').reduce((sum, item) => sum + (Number(item.verifiedMonthlySavings) || 0), 0)

  async function dismiss(item) {
    if (!window.confirm(`Dismiss "${item.title}"? It will no longer appear in your pending queue.`)) return
    const saved = await updateRecommendation(item.id, { status: 'Dismissed' })
    if (saved !== false && !isCloud) toast.success('Recommendation dismissed.')
  }

  async function complete(event) {
    event.preventDefault()
    const amount = Number(verifiedAmount)
    if (!Number.isFinite(amount) || amount < 0) {
      toast.error('Enter verified monthly savings of zero or more.')
      return
    }
    const saved = await updateRecommendation(completeItem.id, { status: 'Completed', verifiedMonthlySavings: amount, completedAt: new Date().toISOString() })
    if (saved === false) return
    if (!isCloud) toast.success('Optimization completed. Verified savings are now included in realized totals.')
    setCompleteItem(null)
    setVerifiedAmount('')
  }

  return (
    <div className="page-content">
      <PageHeader eyebrow="OPTIMIZATION" title="Recommendations" description="Evidence-based actions to reduce waste without compromising team workflows." actions={<button className="primary-button" onClick={generate} type="button"><RotateCw size={15} /> Analyze workspace</button>} />
      {organization.demoMode
        ? <div className="notice-banner"><Lightbulb size={16} /><span><strong>Deterministic analysis</strong> Recommendations are calculated from recorded subscription, license, renewal, and usage data.</span></div>
        : isCloud && <div className="notice-banner"><Lightbulb size={16} /><span><strong>Transparent rules</strong> Review opportunities are generated from your configured inactivity thresholds, subscription costs, seat counts, categories, and renewal dates. The engine does not make provider calls.</span></div>}
      <section className="recommendation-summary-grid">
        <div className="summary-tile"><span>Pending opportunities</span><strong>{recommendations.filter((item) => item.status === 'Pending').length}</strong><small>Waiting for admin review</small></div>
        <div className="summary-tile"><span>Potential monthly savings</span><strong>{money(pendingSavings)}</strong><small>Estimated · not yet realized</small></div>
        <div className="summary-tile"><span>Verified monthly savings</span><strong className="success-text">{money(verifiedSavings)}</strong><small>Completed actions only</small></div>
        <div className="summary-tile"><span>Dismissed / completed</span><strong>{recommendations.filter((item) => ['Dismissed', 'Completed'].includes(item.status)).length}</strong><small>Optimization history</small></div>
      </section>
      <section className="card recommendation-list-card">
        <div className="recommendation-toolbar"><div className="filter-tabs" role="tablist" aria-label="Recommendation status">{['Pending', 'Approved', 'Completed', 'Dismissed', 'All'].map((status) => <button aria-selected={statusFilter === status} className={statusFilter === status ? 'filter-tab is-selected' : 'filter-tab'} key={status} onClick={() => setStatusFilter(status)} role="tab" type="button">{status}<span>{status === 'All' ? recommendations.length : recommendations.filter((item) => item.status === status).length}</span></button>)}</div><select aria-label="Filter recommendation priority" onChange={(event) => setPriorityFilter(event.target.value)} value={priorityFilter}>{['All priorities', 'Critical', 'High', 'Medium', 'Low'].map((priority) => <option key={priority}>{priority}</option>)}</select></div>
        {visible.length === 0 ? <EmptyState icon={Lightbulb} title={`No ${statusFilter.toLowerCase()} recommendations`} description="Analyze your workspace to generate review opportunities from current data." action={<button className="secondary-button" onClick={generate} type="button"><RotateCw size={14} /> Run analysis</button>} /> : (
          <div className="recommendation-cards">{visible.map((item) => {
            const isExpanded = expanded === item.id
            return <article className="recommendation-card" key={item.id}>
              <div className="recommendation-card-main">
                <span className={`recommendation-type-icon type-${item.type}`}><Lightbulb size={17} /></span>
                <div className="recommendation-description"><div className="recommendation-title-row"><h2>{item.title}</h2><StatusPill status={item.priority} /><StatusPill status={item.status} /></div><p>{item.explanation}</p><div className="recommendation-meta"><span>{item.appName}</span><span>{item.type.replaceAll('_', ' ')}</span><span><Clock3 size={12} />{new Date(item.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span></div></div>
                <div className="recommendation-impact"><strong>{money(item.estimatedMonthlySavings)}</strong><span>potential / mo</span><small>{money(item.estimatedAnnualSavings)} / yr</small></div>
                <button aria-label={`${isExpanded ? 'Hide' : 'View'} details for ${item.title}`} className="icon-button expand-button" onClick={() => setExpanded(isExpanded ? '' : item.id)} type="button">{isExpanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}</button>
              </div>
              {isExpanded && <div className="recommendation-evidence"><div><strong>Supporting evidence</strong>{item.evidence?.length ? <ul>{item.evidence.map((line) => <li key={line}>{formatEvidenceCurrency(line, money)}</li>)}</ul> : <p>No supporting evidence was recorded.</p>}</div><div><strong>Suggested action</strong><p>{item.suggestedAction || 'Review this opportunity with the application owner.'}</p>{item.risks && <p><strong>Risk / caveat: </strong>{item.risks}</p>}</div></div>}
              <div className="recommendation-card-footer"><span>{item.status === 'Completed' ? <><CheckCircle2 size={13} /> Verified savings: <strong>{money(item.verifiedMonthlySavings || 0)}/mo</strong></> : item.status === 'Approved' ? 'Approved · no realized savings recorded yet' : `Est. ${money(item.estimatedMonthlySavings)} monthly opportunity`}</span><div className="recommendation-actions">
                {item.status === 'Pending' && <><button className="secondary-button" onClick={() => dismiss(item)} type="button"><X size={14} /> Dismiss</button><button className="primary-button" onClick={async () => { const saved = await updateRecommendation(item.id, { status: 'Approved', approvedAt: new Date().toISOString() }); if (saved !== false && !isCloud) toast.success('Recommendation approved. Estimated savings are not counted as realized.') }} type="button"><Check size={14} /> Approve</button></>}
                {item.status === 'Approved' && <button className="primary-button" onClick={() => { setCompleteItem(item); setVerifiedAmount(String(item.estimatedMonthlySavings || '')) }} type="button"><CheckCircle2 size={14} /> Record completion</button>}
              </div></div>
            </article>
          })}</div>
        )}
      </section>
      {completeItem && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setCompleteItem(null) }}><section aria-labelledby="complete-title" aria-modal="true" className="modal completion-modal" role="dialog"><div className="modal-header"><div><span className="eyebrow">VERIFY OPTIMIZATION</span><h2 id="complete-title">Record completed savings</h2><p>{completeItem.appName} · Estimated {money(completeItem.estimatedMonthlySavings)} per month.</p></div><button aria-label="Close dialog" className="icon-button" onClick={() => setCompleteItem(null)} type="button"><X size={18} /></button></div><form onSubmit={complete}><label className="form-label">Verified monthly savings ({organization.currency})<input autoFocus min="0" onChange={(event) => setVerifiedAmount(event.target.value)} required step="0.01" type="number" value={verifiedAmount} /></label><p className="form-help">Only actual, administrator-verified savings count toward realized totals. Enter 0 if the completed action did not reduce spend.</p><div className="modal-actions"><button className="secondary-button" onClick={() => setCompleteItem(null)} type="button">Cancel</button><button className="primary-button" type="submit"><CheckCircle2 size={15} /> Record verified savings</button></div></form></section></div>}
    </div>
  )
}

export default RecommendationsPage
