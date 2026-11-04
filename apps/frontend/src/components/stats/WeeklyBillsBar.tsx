import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export type WeeklyBucket = { day: string; bills: number; revenue: number }

/** Daily bill count for the trailing week, computed by the stats page. */
export function WeeklyBillsBar({ data }: { data: WeeklyBucket[] }) {
  return (
    <div className="rounded-card bg-surface p-5 shadow-card">
      <h3 className="text-sm font-semibold text-ink">Bills this week</h3>
      <p className="text-xs text-muted">Bill count per day, last 7 days</p>
      <div className="mt-4 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
            <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
            <Tooltip
              formatter={(v: unknown, key) => (key === 'revenue' ? undefined : [String(v), 'Bills'])}
              contentStyle={{ borderRadius: 8, borderColor: '#E5E7EB', fontSize: 12 }}
              cursor={{ fill: '#EEF2FF' }}
            />
            <Bar dataKey="bills" fill="#6366F1" radius={[4, 4, 0, 0]} maxBarSize={36} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
