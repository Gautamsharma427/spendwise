import { useMemo } from 'react'
import { Download, FileSpreadsheet, ShieldAlert } from 'lucide-react'
import { EmptyState, MetricCard, PageHeader, SectionHeading } from '../components/ui.jsx'
import { useCurrencyFormatter } from '../components/useCurrencyFormatter.js'
import { useWorkspace } from '../state/WorkspaceContext.js'
import { classifyLicense, getDashboardMetrics } from '../domain/analytics.js'

function escapeCsv(value) {
  const text = String(value ?? '')
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
  return `"${safe.replaceAll('"', '""')}"`
}

function ReportsPage() {
  const { subscriptions, licenses, recommendations, thresholds, organization } = useWorkspace()
  const money = useCurrencyFormatter()
  const metrics = getDashboardMetrics(subscriptions, licenses, recommendations, thresholds)
  const unusedSpend = licenses.reduce((sum, license) => ['Potentially unused', 'High-priority review'].includes(classifyLicense(license, thresholds)) ? sum + (Number(license.monthlyCost) || 0) : sum, 0)
  const history = recommendations.filter((item) => ['Completed', 'Dismissed', 'Approved'].includes(item.status)).sort((left, right) => new Date(right.updatedAt || right.createdAt) - new Date(left.updatedAt || left.createdAt))
  const rows = useMemo(() => [
    ['Report', 'Value', 'Details'],
    ['Monthly SaaS spend', metrics.monthlySpend, 'Subscription costs normalized to monthly'],
    ['Annualized SaaS spend', metrics.annualSpend, 'Monthly spend × 12'],
    ['Potential monthly savings', metrics.potentialMonthlySavings, 'Inactive-license estimates; not realized'],
    ['Verified monthly savings', metrics.verifiedMonthlySavings, 'Completed and administrator-verified only'],
    ['Inactive license list cost', unusedSpend, 'Eligible license cost, capped by application subscription spend'],
    ['Subscription count', subscriptions.length, 'All tracked applications'],
    ['Purchased licenses', metrics.total, 'Includes assigned and unassigned seats'],
    ...subscriptions.map((item) => [`Subscription: ${item.appName}`, item.monthlyCost, `${item.vendor} · ${item.category} · ${item.status} · ${item.totalSeats} total / ${item.assignedSeats} assigned · renews ${item.renewalDate}`]),
    ...history.map((item) => [`Recommendation: ${item.title}`, item.status === 'Completed' ? item.verifiedMonthlySavings : item.estimatedMonthlySavings, `${item.status} · ${item.type} · ${item.appName} · ${item.status === 'Completed' ? 'verified monthly savings' : 'estimated monthly savings only'}`]),
  ], [metrics, unusedSpend, subscriptions, history])

  function exportReport() {
    const csv = rows.map((row) => row.map(escapeCsv).join(',')).join('\r\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `spendwise-report-${new Date().toISOString().slice(0, 10)}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="page-content">
      <PageHeader eyebrow="FINANCE" title="Reports" description="Export an auditable snapshot of subscription spend, license exposure, and optimization activity." actions={<button className="primary-button" disabled={!subscriptions.length && !licenses.length} onClick={exportReport} type="button"><Download size={15} /> Export CSV report</button>} />
      {organization.demoMode && <div className="notice-banner"><FileSpreadsheet size={16} /><span>Demo data is illustrative. Exports include only the records currently in this workspace.</span></div>}
      <section className="metrics-grid reports-metrics">
        <MetricCard icon={FileSpreadsheet} label="Monthly SaaS spend" note="Normalized recurring commitments" tone="purple" value={money(metrics.monthlySpend)} />
        <MetricCard icon={FileSpreadsheet} label="Annualized spend" note="Current run rate × 12" tone="blue" value={money(metrics.annualSpend)} />
        <MetricCard icon={ShieldAlert} label="Potential savings" note="Estimated; not realized" tone="amber" value={money(metrics.potentialMonthlySavings)} />
        <MetricCard icon={FileSpreadsheet} label="Verified savings" note="Completed actions only" tone="green" value={money(metrics.verifiedMonthlySavings)} />
      </section>
      <section className="report-grid">
        <article className="card content-card"><SectionHeading title="Report contents" description="Every export uses current workspace data." /><div className="report-content-list">{[['Unused-license exposure', money(unusedSpend)], ['Applications tracked', subscriptions.length], ['Purchased license records', metrics.total], ['Active recommendations', recommendations.filter((item) => item.status === 'Pending' || item.status === 'Approved').length], ['Optimization history', history.length]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><button className="secondary-button report-download" disabled={!subscriptions.length && !licenses.length} onClick={exportReport} type="button"><Download size={14} /> Download complete CSV</button></article>
        <article className="card content-card"><SectionHeading title="Optimization history" description="Approvals are not counted as realized savings." />{history.length === 0 ? <EmptyState icon={FileSpreadsheet} title="No optimization history yet" description="Approved, dismissed, and completed recommendations will appear here." /> : <div className="history-list">{history.slice(0, 8).map((item) => <div className="history-item" key={item.id}><span className={`history-marker history-${item.status.toLowerCase()}`} /><div><strong>{item.title}</strong><small>{item.status} · {new Date(item.updatedAt || item.createdAt).toLocaleDateString('en-IN')}</small></div><strong>{item.status === 'Completed' ? money(item.verifiedMonthlySavings) : item.status === 'Approved' ? 'Not realized' : '—'}</strong></div>)}</div>}</article>
      </section>
      <p className="page-footnote">CSV exports quote all values and neutralize spreadsheet formula prefixes. Monthly costs are in {organization.currency}; dates use ISO format.</p>
    </div>
  )
}

export default ReportsPage
