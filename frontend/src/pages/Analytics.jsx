import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Activity, CircleDollarSign, Users } from 'lucide-react'
import { EmptyState, PageHeader, SectionHeading } from '../components/ui.jsx'
import { useCurrencyFormatter } from '../components/useCurrencyFormatter.js'
import { useWorkspace } from '../state/WorkspaceContext.js'
import { classifyLicense, DEFAULT_THRESHOLDS, getPotentialSavings } from '../domain/analytics.js'

const colors = ['#5667d9', '#19a77b', '#e5a331', '#818ba0', '#bc72c9', '#518aca', '#e07159', '#45a3aa']

function AnalyticsPage() {
  const { subscriptions, licenses, thresholds, organization } = useWorkspace()
  const money = useCurrencyFormatter()
  const [department, setDepartment] = useState('All departments')
  const departments = ['All departments', ...new Set(subscriptions.map((item) => item.department).filter(Boolean))]
  const selectedSubscriptions = subscriptions.filter((item) => department === 'All departments' || item.department === department)
  const selectedNames = new Set(selectedSubscriptions.map((item) => item.appName.toLowerCase()))
  const selectedLicenses = licenses.filter((item) => selectedNames.has(item.appName.toLowerCase()))
  const monthlySpend = selectedSubscriptions.reduce((sum, item) => sum + Number(item.monthlyCost || 0), 0)
  const uniqueEmployees = new Set(selectedLicenses.filter((item) => item.assigned).map((item) => item.employeeEmail).filter(Boolean)).size
  const costPerEmployee = uniqueEmployees ? monthlySpend / uniqueEmployees : 0
  const categoryTotals = new Map()
  for (const item of selectedSubscriptions) categoryTotals.set(item.category || 'Other', (categoryTotals.get(item.category || 'Other') ?? 0) + Number(item.monthlyCost || 0))
  const categories = [...categoryTotals].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  const departmentTotals = new Map()
  for (const item of subscriptions) departmentTotals.set(item.department || 'Unassigned', (departmentTotals.get(item.department || 'Unassigned') ?? 0) + Number(item.monthlyCost || 0))
  const departmentsBySpend = [...departmentTotals].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8)
  const topApps = [...selectedSubscriptions].sort((a, b) => b.monthlyCost - a.monthlyCost).slice(0, 8)
  const highUnused = selectedLicenses.filter((item) => ['Potentially unused', 'High-priority review'].includes(classifyLicense(item, thresholds)))
  const unusedByApp = [...highUnused.reduce((map, item) => map.set(item.appName, (map.get(item.appName) ?? 0) + (Number(item.monthlyCost) || 0)), new Map())]
    .map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5)

  return (
    <div className="page-content">
      <PageHeader eyebrow="ANALYTICS" title="Spending insights" description="Explore your subscription costs, department allocation, and license efficiency." actions={<label className="inline-select">Department<select aria-label="Filter by department" onChange={(event) => setDepartment(event.target.value)} value={department}>{departments.map((name) => <option key={name}>{name}</option>)}</select></label>} />
      {organization.demoMode && <div className="notice-banner"><Activity size={16} /><span>Sample historical trend data is illustrative. Cost and license breakdowns reflect the current demo organization’s subscriptions and imported seats.</span></div>}
      <section className="metrics-grid">
        <div className="mini-metric"><span>Monthly expenditure</span><strong>{money(monthlySpend)}</strong><small>{department}</small></div>
        <div className="mini-metric"><span>Cost per assigned employee</span><strong>{money(costPerEmployee)}</strong><small>{uniqueEmployees} unique license holders</small></div>
        <div className="mini-metric"><span>Unused-license expenditure</span><strong>{money(getPotentialSavings(selectedSubscriptions, selectedLicenses, thresholds))}</strong><small>{highUnused.length} seats flagged for review</small></div>
      </section>
      <section className="analytics-grid">
        <article className="card chart-card"><SectionHeading title="Spending by application" description={`Top recurring costs · ${department}`} />{topApps.length ? <div className="dashboard-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={topApps} layout="vertical" margin={{ top: 4, right: 24, left: 18, bottom: 0 }}><CartesianGrid stroke="#edf0f5" strokeDasharray="3 5" horizontal={false} /><XAxis type="number" tick={{ fill: '#7b8597', fontSize: 9 }} tickFormatter={(value) => `${Math.round(value / 1000)}k`} /><YAxis dataKey="appName" type="category" width={112} tick={{ fill: '#535d70', fontSize: 9 }} /><Tooltip formatter={(value) => money(value)} /><Bar dataKey="monthlyCost" fill="#5968dd" name="Monthly cost" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div> : <EmptyState icon={CircleDollarSign} title="No application costs" description="Add subscriptions to see spending insights." />}</article>
        <article className="card chart-card"><SectionHeading title="Category distribution" description="Share of recurring monthly spend" />{categories.length ? <div className="dashboard-chart category-chart-body"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={categories} dataKey="value" innerRadius="57%" outerRadius="80%" paddingAngle={3} stroke="none">{categories.map((item, index) => <Cell fill={colors[index % colors.length]} key={item.name} />)}</Pie><Tooltip formatter={(value) => money(value)} /></PieChart></ResponsiveContainer><div className="category-chart-center"><strong>{money(monthlySpend, true)}</strong><span>monthly</span></div><div className="category-legend">{categories.slice(0, 6).map((item, index) => <span key={item.name}><i style={{ backgroundColor: colors[index % colors.length] }} />{item.name}<strong>{money(item.value)}</strong></span>)}</div></div> : <EmptyState icon={CircleDollarSign} title="No category data" description="Add subscriptions to see a category breakdown." />}</article>
        <article className="card chart-card"><SectionHeading title="Department allocation" description="Recurring cost across all departments" />{departmentsBySpend.length ? <div className="dashboard-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={departmentsBySpend} margin={{ top: 8, right: 18, left: 4, bottom: 0 }}><CartesianGrid stroke="#edf0f5" strokeDasharray="3 5" vertical={false} /><XAxis dataKey="name" interval={0} tick={{ fill: '#7b8597', fontSize: 8 }} tickLine={false} /><YAxis axisLine={false} tick={{ fill: '#7b8597', fontSize: 9 }} tickFormatter={(value) => `${Math.round(value / 1000)}k`} tickLine={false} width={30} /><Tooltip formatter={(value) => money(value)} /><Bar dataKey="value" fill="#19a77b" name="Monthly cost" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div> : <EmptyState icon={Users} title="No department data" description="Add department assignments to subscriptions." />}</article>
        <article className="card chart-card"><SectionHeading title="Highest unused-license exposure" description="Estimated list cost for licenses requiring review" />{unusedByApp.length ? <div className="dashboard-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={unusedByApp} layout="vertical" margin={{ top: 4, right: 24, left: 18, bottom: 0 }}><CartesianGrid stroke="#edf0f5" strokeDasharray="3 5" horizontal={false} /><XAxis type="number" tick={{ fill: '#7b8597', fontSize: 9 }} tickFormatter={(value) => `${Math.round(value / 1000)}k`} /><YAxis dataKey="name" type="category" width={112} tick={{ fill: '#535d70', fontSize: 9 }} /><Tooltip formatter={(value) => money(value)} /><Bar dataKey="value" fill="#e5a331" name="Estimated monthly cost" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div> : <EmptyState icon={Activity} title="No reviewable inactive seats" description={`Activity thresholds: ${thresholds.lowActivityDays}, ${thresholds.potentialDays}, and ${thresholds.highPriorityDays} days.`} />}</article>
      </section>
      <p className="page-footnote">All figures use subscription monthly costs as the source of truth; license costs are shown as potential savings only and are capped at each application’s subscription spend. Thresholds: {Object.values(thresholds).join(' / ')} days (defaults {Object.values(DEFAULT_THRESHOLDS).join(' / ')}).</p>
    </div>
  )
}

export default AnalyticsPage