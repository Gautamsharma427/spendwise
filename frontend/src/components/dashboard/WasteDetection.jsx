import { ArrowRight, Check, Sparkles } from 'lucide-react'
import { useCurrencyFormatter } from '../useCurrencyFormatter.js'

const recommendations = [
  { title: 'Review unused seats', detail: '18 seats across 6 subscriptions', saving: 54000, icon: Sparkles },
  { title: 'Consolidate overlapping tools', detail: '3 tools have similar features', saving: 42000, icon: ArrowRight },
  { title: 'Right-size your plans', detail: '5 accounts are on premium plans', saving: 32400, icon: Check },
]

function WasteDetection({ onViewRecommendations }) {
  const money = useCurrencyFormatter()

  return (
    <section className="panel recommendations-panel">
      <div className="section-title-row">
        <div><h2>Recommended actions</h2><p>Personalized ways to reduce SaaS spend</p></div>
        <span className="recommendation-badge"><Check size={12} /> Data-driven</span>
      </div>
      <div className="recommendation-list">
        {recommendations.map(({ title, detail, saving, icon: Icon }) => (
          <div className="recommendation-row" key={title}>
            <span className="recommendation-icon"><Icon size={15} /></span>
            <div><strong>{title}</strong><span>{detail}</span></div>
            <strong>{money(saving)} / yr</strong>
          </div>
        ))}
      </div>
      <button className="primary-button" onClick={onViewRecommendations} type="button">Explore all recommendations <ArrowRight size={14} /></button>
    </section>
  )
}

export default WasteDetection