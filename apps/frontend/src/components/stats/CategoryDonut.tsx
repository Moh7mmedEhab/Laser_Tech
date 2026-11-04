import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

export type CategorySlice = { name: string; value: number; revenue: number }

const COLORS = ['#6366F1', '#818CF8', '#A5B4FC', '#06B6D4', '#C7D2FE']

/** Revenue share per product category, computed by the stats page. */
export function CategoryDonut({ data }: { data: CategorySlice[] }) {
  return (
    <div className="rounded-card bg-surface p-5 shadow-card">
      <h3 className="text-sm font-semibold text-ink">Sales by category</h3>
      <p className="text-xs text-muted">Share of revenue, all recorded bills</p>
      <div className="mt-2 h-72">
        {data.length === 0 ? (
          <p className="flex h-full items-center justify-center text-sm text-muted">
            No sales recorded yet
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="85%" paddingAngle={3}>
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: unknown) => [`${Number(v).toFixed(1)}%`, 'Share']}
                contentStyle={{ borderRadius: 8, borderColor: '#E5E7EB', fontSize: 12 }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
