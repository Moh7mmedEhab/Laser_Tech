import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { salesByCategory } from '@/data/stats'

const COLORS = ['#6366F1', '#818CF8', '#A5B4FC', '#06B6D4', '#C7D2FE']

export function CategoryDonut() {
  return (
    <div className="rounded-card bg-surface p-5 shadow-card">
      <h3 className="text-sm font-semibold text-ink">Sales by category</h3>
      <p className="text-xs text-muted">Share of revenue this month</p>
      <div className="mt-2 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={salesByCategory} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="85%" paddingAngle={3}>
              {salesByCategory.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: unknown) => [`${v}%`, 'Share']}
              contentStyle={{ borderRadius: 8, borderColor: '#E5E7EB', fontSize: 12 }}
            />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
