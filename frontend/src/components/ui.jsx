import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'

export function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <div className="page-header">
      <div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </div>
  )
}

export function MetricCard({ icon: Icon, label, value, note, tone = 'purple', trend }) {
  return (
    <article className="metric-card">
      <div className="metric-topline"><span className={`metric-icon metric-${tone}`}><Icon size={17} /></span>{trend && <span className={`metric-trend ${trend === 'up' ? 'trend-up' : trend === 'down' ? 'trend-down' : ''}`}>{trend === 'up' ? <ArrowUpRight size={13} /> : trend === 'down' ? <ArrowDownRight size={13} /> : <Minus size={13} />}{trend === 'up' ? '12%' : trend === 'down' ? '8%' : '—'}</span>}</div>
      <span className="metric-label">{label}</span>
      <strong className="metric-value">{value}</strong>
      <span className="metric-note">{note}</span>
    </article>
  )
}

export function SectionHeading({ title, description, action }) {
  return <div className="section-heading"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{action}</div>
}

export function EmptyState({ icon: Icon = Minus, title, description, action }) {
  return <div className="empty-state"><span className="empty-icon"><Icon size={21} /></span><strong>{title}</strong><p>{description}</p>{action}</div>
}

export function StatusPill({ status }) {
  const variant = status.toLowerCase().replace(/[^a-z]+/g, '-')
  return <span className={`status-pill pill-${variant}`}>{status}</span>
}
