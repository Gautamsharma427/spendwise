function StatCard({ icon: Icon, label, value, change, note, trend, tone }) {
  const isPositive = trend === 'up-good' || trend === 'down-good'

  return (
    <article className="stat-card">
      <span className={`stat-icon icon-${tone}`}><Icon size={22} strokeWidth={2.2} /></span>
      <div className="stat-content">
        <span className="stat-label">{label}</span>
        <strong className="stat-value">{value}</strong>
        <span className={`stat-change ${isPositive ? 'change-good' : trend === 'savings' ? 'change-savings' : 'change-bad'}`}>
          {trend === 'up-bad' && <><span className="trend-arrow">↑</span> {change}</>}
          {trend === 'up-good' && <><span className="trend-arrow">↑</span> {change}</>}
          {trend === 'down-good' && <><span className="trend-arrow">↓</span> {change}</>}
          {trend === 'savings' && change}
          <span className="stat-note">{note}</span>
        </span>
      </div>
    </article>
  )
}

export default StatCard