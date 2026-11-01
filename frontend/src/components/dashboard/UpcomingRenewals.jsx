import { Calendar, ChevronRight } from 'lucide-react'
import { useCurrencyFormatter } from '../useCurrencyFormatter.js'

const renewals = [
  { name: 'Figma Professional', date: 'Nov 5, 2025', days: 7, cost: 12000, mark: 'F', tone: 'figma' },
  { name: 'Slack Business+', date: 'Nov 12, 2025', days: 14, cost: 8500, mark: 'S', tone: 'slack' },
  { name: 'Notion Enterprise', date: 'Nov 20, 2025', days: 22, cost: 15000, mark: 'N', tone: 'notion' },
  { name: 'Adobe Creative Cloud', date: 'Dec 1, 2025', days: 33, cost: 24000, mark: 'A', tone: 'adobe' },
]

function UpcomingRenewals() {
  const money = useCurrencyFormatter()

  return (
    <section className="panel renewals-panel">
      <div className="section-title-row">
        <div className="panel-heading"><span className="icon-tile icon-purple"><Calendar size={15} /></span><h2>Upcoming Renewals</h2></div>
        <button className="view-all-button" type="button">View All <ChevronRight size={12} /></button>
      </div>
      <div className="renewal-list">
        {renewals.map((renewal) => (
          <div className="renewal-row" key={renewal.name}>
            <span className={`brand-mark brand-${renewal.tone}`}>{renewal.mark}</span>
            <div className="renewal-copy"><strong>{renewal.name}</strong><span>{renewal.date}</span></div>
            <span className={`renewal-days ${renewal.days <= 7 ? 'renewal-soon' : ''}`}><i />{renewal.days} days</span>
            <strong className="renewal-cost">{money(renewal.cost)}</strong>
          </div>
        ))}
      </div>
    </section>
  )
}

export default UpcomingRenewals