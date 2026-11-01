import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  CreditCard,
  FileUp,
  Lightbulb,
  Shield,
  Users,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useWorkspace } from '../state/WorkspaceContext.js'
import { classifyLicense, getDashboardMetrics, getUpcomingRenewals } from '../domain/analytics.js'
import { EmptyState, MetricCard, PageHeader, SectionHeading, StatusPill } from '../components/ui.jsx'
import { useCurrencyFormatter } from '../components/useCurrencyFormatter.js'

const chartColors = ['#5667d9', '#19a77b', '#e5a331', '#818ba0', '#bc72c9', '#518aca', '#e07159', '#45a3aa']

function DashboardPage() {
  const workspace = useWorkspace()
  const { subscriptions, licenses, recommendations, activity, thresholds, organization, user } = workspace
  const money = useCurrencyFormatter()
  const metrics = getDashboardMetrics(subscriptions, licenses, recommendations, thresholds)
  const renewals = getUpcomingRenewals(subscriptions).slice(0, 5)
  const highPriority = recommendations.filter((item) => item.status === 'Pending').sort((a, b) => ({ Critical: 0, High: 1, Medium: 2, Low: 3 }[a.priority] - { Critical: 0, High: 1, Medium: 2, Low: 3 }[b.priority])).slice(0, 4)
  const renewalCommitment = renewals.reduce((sum, item) => sum + Number(item.monthlyCost || 0), 0)
  const utilization = useMemo(() => {
    const counts = { Active: 0, 'Low activity': 0, 'Potentially unused': 0, 'High-priority review': 0, Unknown: 0, Unassigned: 0, Excluded: 0, Reclaimed: 0 }
    for (const license of licenses) counts[classifyLicense(license, thresholds)] += 1
    return Object.entries(counts).filter(([, value]) => value > 0).map(([name, value]) => ({ name, value }))
  }, [licenses, thresholds])
  const categorySpend = useMemo(() => {
    const totals = new Map()
    for (const item of subscriptions) totals.set(item.category || 'Other', (totals.get(item.category || 'Other') ?? 0) + Number(item.monthlyCost || 0))
    return [...totals].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [subscriptions])
  const savingsBars = [
    { name: 'Potential', value: metrics.potentialMonthlySavings },
    { name: 'Verified', value: metrics.verifiedMonthlySavings },
  ]

  return (
    <div className="page-content">
      <PageHeader eyebrow={`${organization.name}${organization.demoMode ? ' · DEMO DATA' : ''}`} title={`Good morning, ${user.name.split(' ')[0]}`} description="Here’s where your organization’s software spend stands today." actions={<Link className="secondary-button" to="/subscriptions"><FileUp size={15} /> Manage subscriptions</Link>} />
      {organization.demoMode && <div className="demo-banner"><span><span className="demo-dot" /> Demo organization <strong>Illustrative data, ready to explore</strong></span><Link to="/settings">Set up your workspace <ArrowRight size={14} /></Link></div>}
      <section className="metrics-grid">
        <MetricCard icon={CircleDollarSign} label="Monthly SaaS spend" note={`${money(metrics.annualSpend)} annualized`} tone="purple" value={money(metrics.monthlySpend)} />
        <MetricCard icon={Activity} label="Potential monthly savings" note={`${money(metrics.potentialAnnualSavings)} potential annual savings`} tone="green" value={money(metrics.potentialMonthlySavings)} />
        <MetricCard icon={Shield} label="Unused licenses" note={`${metrics.assigned} assigned of ${metrics.total} total`} tone="amber" value={`${metrics.inactive}`} />
        <MetricCard icon={CreditCard} label="Active subscriptions" note={`${subscriptions.filter((item) => item.status === 'Trial').length} trials · ${metrics.upcomingRenewals} renewals in 30 days`} tone="blue" value={`${metrics.activeSubscriptions}`} />
        <MetricCard icon={CalendarDays} label="Renewing in 30 days" note={`${money(renewalCommitment)} in monthly commitments`} tone="amber" value={`${metrics.upcomingRenewals}`} />
      </section>

      <section className="dashboard-chart-grid">
        <article className="card chart-card">
          <SectionHeading title="Monthly recurring spend" description={organization.demoMode ? 'Illustrative historical sample · current monthly run rate' : 'Current monthly cost by application'} />
          {subscriptions.length === 0 ? <EmptyState icon={CreditCard} title="No subscriptions to chart" description="Add a subscription or import a CSV to see your spending." action={<Link className="link-action" to="/subscriptions">Add a subscription <ArrowRight size={14} /></Link>} /> : (
            <div className="dashboard-chart area-chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={organization.demoMode ? workspace.spendingHistory : [...subscriptions].sort((a, b) => b.monthlyCost - a.monthlyCost).slice(0, 8).map((item) => ({ month: item.appName, spend: item.monthlyCost }))} margin={{ top: 10, right: 12, left: 2, bottom: 0 }}>
                  <defs><linearGradient id="spendFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#5968dd" stopOpacity={0.19} /><stop offset="100%" stopColor="#5968dd" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid stroke="#edf0f5" strokeDasharray="3 5" vertical={false} />
                  <XAxis axisLine={false} dataKey="month" tick={{ fill: '#7b8597', fontSize: 10 }} tickLine={false} tickMargin={9} />
                  <YAxis axisLine={false} tick={{ fill: '#7b8597', fontSize: 10 }} tickFormatter={(value) => `${Math.round(value / 1000)}k`} tickLine={false} width={34} />
                  <Tooltip formatter={(value) => money(value)} />
                  <Area activeDot={{ r: 4 }} dataKey="spend" fill="url(#spendFill)" name="Monthly spend" stroke="#5968dd" strokeWidth={2} type="monotone" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>

        <article className="card chart-card category-chart-card">
          <SectionHeading title="Spend by category" description="Monthly subscription cost" />
          {categorySpend.length === 0 ? <EmptyState icon={CircleDollarSign} title="No spend to break down" description="Add subscriptions to see category totals." /> : (
            <div className="dashboard-chart category-chart-body">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categorySpend} dataKey="value" innerRadius="58%" outerRadius="82%" paddingAngle={3} stroke="none">
                    {categorySpend.map((item, index) => <Cell fill={chartColors[index % chartColors.length]} key={item.name} />)}
                  </Pie>
                  <Tooltip formatter={(value) => money(value)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="category-chart-center"><strong>{money(metrics.monthlySpend, true)}</strong><span>monthly</span></div>
              <div className="category-legend">{categorySpend.slice(0, 5).map((item, index) => <span key={item.name}><i style={{ backgroundColor: chartColors[index % chartColors.length] }} />{item.name}<strong>{money(item.value)}</strong></span>)}</div>
            </div>
          )}
        </article>

        <article className="card chart-card">
          <SectionHeading title="License utilization" description="Assigned seats by current activity" />
          {licenses.length === 0 ? <EmptyState icon={Users} title="No license data yet" description="Import license records to measure utilization." action={<Link className="link-action" to="/licenses">Import licenses <ArrowRight size={14} /></Link>} /> : (
            <div className="dashboard-chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={utilization} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#edf0f5" strokeDasharray="3 5" vertical={false} />
                  <XAxis axisLine={false} dataKey="name" tick={{ fill: '#7b8597', fontSize: 8 }} tickLine={false} tickMargin={8} />
                  <YAxis allowDecimals={false} axisLine={false} tick={{ fill: '#7b8597', fontSize: 9 }} tickLine={false} width={28} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#5968dd" name="Licenses" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>

        <article className="card chart-card">
          <SectionHeading title="Potential vs. verified" description="Monthly savings · verified only after completion" />
          <div className="dashboard-chart savings-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={savingsBars} margin={{ top: 15, right: 12, left: 6, bottom: 0 }}>
                <CartesianGrid stroke="#edf0f5" strokeDasharray="3 5" vertical={false} />
                <XAxis axisLine={false} dataKey="name" tick={{ fill: '#7b8597', fontSize: 10 }} tickLine={false} />
                <YAxis axisLine={false} tick={{ fill: '#7b8597', fontSize: 9 }} tickFormatter={(value) => `${Math.round(value / 1000)}k`} tickLine={false} width={35} />
                <Tooltip formatter={(value) => money(value)} />
                <Bar dataKey="value" name="Monthly savings" radius={[5, 5, 0, 0]}>{savingsBars.map((item) => <Cell fill={item.name === 'Verified' ? '#1aa77a' : '#e5a331'} key={item.name} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="dashboard-bottom-grid">
        <article className="card content-card">
          <SectionHeading title="Upcoming renewals" description="Review upcoming commitments" action={<Link className="link-action" to="/subscriptions">View all <ArrowRight size={14} /></Link>} />
          {renewals.length === 0 ? <EmptyState icon={CalendarDays} title="No renewals in the next 30 days" description="Upcoming renewal alerts will appear here." /> : (
            <div className="renewal-table">{renewals.map((item) => (
              <div className="renewal-item" key={item.id}><span className="app-monogram">{item.appName.slice(0, 1)}</span><span className="renewal-info"><strong>{item.appName}</strong><small>{new Date(`${item.renewalDate}T00:00:00`).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</small></span><span className={`renewal-countdown ${item.daysUntilRenewal <= 7 ? 'countdown-soon' : ''}`}><Clock3 size={12} />{item.daysUntilRenewal === 0 ? 'Today' : `${item.daysUntilRenewal} days`}</span><strong className="renewal-amount">{money(item.monthlyCost)}</strong></div>
            ))}</div>
          )}
        </article>
        <article className="card content-card">
          <SectionHeading title="Priority recommendations" description="Evidence-based optimization opportunities" action={<Link className="link-action" to="/recommendations">View all <ArrowRight size={14} /></Link>} />
          {highPriority.length === 0 ? <EmptyState icon={Lightbulb} title="No pending recommendations" description="Run an analysis to find savings opportunities." action={<Link className="link-action" to="/recommendations">Open recommendations <ArrowRight size={14} /></Link>} /> : (
            <div className="priority-list">{highPriority.map((item) => <Link className="priority-item" key={item.id} to="/recommendations"><span className="priority-icon"><Lightbulb size={15} /></span><span className="priority-copy"><strong>{item.title}</strong><small>{item.appName} · {money(item.estimatedMonthlySavings)}/mo potential</small></span><StatusPill status={item.priority} /><ArrowRight size={14} /></Link>)}</div>
          )}
        </article>
        <article className="card content-card">
          <SectionHeading title="Recent activity" description="Latest changes in your workspace" />
          <div className="activity-list">{activity.slice(0, 5).map((item) => <div className="activity-item" key={item.id}><span className="activity-dot" /><span><strong>{item.action}</strong><small>{new Date(item.date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</small></span><ArrowUpRight size={13} /></div>)}</div>
        </article>
      </section>
    </div>
  )
}

export default DashboardPage