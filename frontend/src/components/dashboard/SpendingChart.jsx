import { useState } from 'react'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChevronDown } from 'lucide-react'
import { useCurrencyFormatter } from '../useCurrencyFormatter.js'

const monthlySpending = [
  { month: 'Jan', tools: 1.18, infrastructure: 0.55, others: 0.23, total: 2.22 },
  { month: 'Feb', tools: 1.23, infrastructure: 0.59, others: 0.25, total: 2.35 },
  { month: 'Mar', tools: 1.15, infrastructure: 0.54, others: 0.23, total: 2.18 },
  { month: 'Apr', tools: 1.42, infrastructure: 0.62, others: 0.28, total: 2.74 },
  { month: 'May', tools: 1.21, infrastructure: 0.49, others: 0.27, total: 2.31 },
  { month: 'Jun', tools: 1.26, infrastructure: 0.57, others: 0.25, total: 2.39 },
  { month: 'Jul', tools: 1.2, infrastructure: 0.5, others: 0.23, total: 2.25 },
  { month: 'Aug', tools: 1.56, infrastructure: 0.66, others: 0.31, total: 3.03 },
  { month: 'Sep', tools: 1.52, infrastructure: 0.7, others: 0.32, total: 3.08 },
  { month: 'Oct', tools: 1.75, infrastructure: 0.73, others: 0.32, total: 3.42 },
  { month: 'Nov', tools: 1.54, infrastructure: 0.68, others: 0.34, total: 3.08 },
  { month: 'Dec', tools: 1.61, infrastructure: 0.69, others: 0.36, total: 3.15 },
]

const categories = [
  { name: 'Productivity', percent: '32%', amount: 32, color: '#7658ff' },
  { name: 'Development', percent: '24%', amount: 24, color: '#438df5' },
  { name: 'Design', percent: '14%', amount: 14, color: '#ff8669' },
  { name: 'Marketing', percent: '12%', amount: 12, color: '#5eabf5' },
  { name: 'Sales', percent: '8%', amount: 8, color: '#de6ec9' },
  { name: 'Others', percent: '10%', amount: 10, color: '#aaa6c7' },
]

function SpendingTooltip({ active, payload, label, money }) {
  if (!active || !payload?.length) return null

  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      {payload.map((item) => (
        <span key={item.dataKey} style={{ color: item.color }}>
          {item.name}: {money(item.value * 100000)}
        </span>
      ))}
    </div>
  )
}

function CategoryBreakdown({ money }) {
  const radius = 54
  const circumference = 2 * Math.PI * radius

  return (
    <div className="category-chart">
      <svg aria-label="Monthly spending by category" className="category-donut" role="img" viewBox="0 0 144 144">
        <circle className="donut-track" cx="72" cy="72" r={radius} />
        {categories.map((category, index) => {
          const dash = (category.amount / 100) * circumference
          const offset = categories.slice(0, index).reduce((total, previous) => total + (previous.amount / 100) * circumference, 0)
          return (
            <circle
              className="donut-segment"
              cx="72"
              cy="72"
              key={category.name}
              r={radius}
              stroke={category.color}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 72 72)"
            />
          )
        })}
      </svg>
      <div className="donut-center"><strong>{money(248500)}</strong><span>per month</span></div>
    </div>
  )
}

function SpendingChart() {
  const money = useCurrencyFormatter()
  const [period, setPeriod] = useState('Last 12 months')
  const [categoryPeriod, setCategoryPeriod] = useState('This month')
  const visibleMonthlySpending = period === 'Last 6 months' ? monthlySpending.slice(-6) : monthlySpending

  return (
    <>
      <section className="panel spending-panel">
        <div className="section-title-row">
          <div><h2>Spending Overview</h2><p>Your SaaS spending over the last 12 months</p></div>
          <label className="select-wrap">
            <select aria-label="Spending chart period" onChange={(event) => setPeriod(event.target.value)} value={period}>
              <option>Last 12 months</option><option>Last 6 months</option><option>This year</option>
            </select>
            <ChevronDown size={13} />
          </label>
        </div>
        <div className="spending-chart">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={visibleMonthlySpending} margin={{ top: 10, right: 9, left: -13, bottom: 0 }}>
              <CartesianGrid stroke="#202a3e" strokeDasharray="2 3" vertical />
              <XAxis axisLine={false} dataKey="month" tick={{ fill: '#8f99b0', fontSize: 9 }} tickLine={false} tickMargin={7} />
              <YAxis axisLine={false} domain={[0, 4]} tick={{ fill: '#8f99b0', fontSize: 9 }} tickFormatter={(value) => money(value * 100000)} tickLine={false} ticks={[0, 1, 2, 3, 4]} width={65} />
              <Tooltip content={<SpendingTooltip money={money} />} />
              <Bar dataKey="tools" fill="#7057f6" name="Tools" stackId="spend" />
              <Bar dataKey="infrastructure" fill="#4590f8" name="Infrastructure" stackId="spend" />
              <Bar dataKey="others" fill="#e66bb9" name="Others" radius={[3, 3, 0, 0]} stackId="spend" />
              <Line activeDot={{ r: 3, fill: '#fff', strokeWidth: 0 }} dataKey="total" dot={{ r: 2, fill: '#f5f6fb', strokeWidth: 0 }} name="Total" stroke="#f5f6fb" strokeWidth={1.4} type="monotone" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-legend">
          <span><i className="legend-dot legend-purple" />Tools</span>
          <span><i className="legend-dot legend-blue" />Infrastructure</span>
          <span><i className="legend-dot legend-pink" />Others</span>
          <span><i className="legend-line" />Total</span>
        </div>
      </section>

      <section className="panel category-panel">
        <div className="section-title-row">
          <h2>Spending by Category</h2>
          <label className="select-wrap compact-select">
            <select aria-label="Category spending period" onChange={(event) => setCategoryPeriod(event.target.value)} value={categoryPeriod}>
              <option>This month</option><option>Last month</option><option>This year</option>
            </select>
            <ChevronDown size={12} />
          </label>
        </div>
        <div className="category-content">
          <CategoryBreakdown money={money} />
          <div className="category-legend">
            {categories.map((category) => (
              <div key={category.name}><span><i style={{ backgroundColor: category.color }} />{category.name}</span><strong>{category.percent}</strong></div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

export default SpendingChart