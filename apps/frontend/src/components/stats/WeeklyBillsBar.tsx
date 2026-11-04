import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { weeklyBills } from '@/data/stats'

export function WeeklyBillsBar() {
  return (
    <div className="rounded-card bg-surface p-5 shadow-card">
      <h3 className="text-sm font-semibold text-ink">Bills this week</h3>
      <p className="text-xs text-muted">Paid, pending and overdue bills per day</p>
      <div className="mt-4 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={weeklyBills} margin={{ top: 8, right: 8, left: -24, bottom: 0 }} barGap={2}>
            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
            <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
            <Tooltip
              contentStyle={{ borderRadius: 8, borderColor: '#E5E7EB', fontSize: 12 }}
              cursor={{ fill: '#EEF2FF' }}
            />
            <Bar dataKey="paid" stackId="a" fill="#6366F1" radius={[0, 0, 4, 4]} />
            <Bar dataKey="pending" stackId="a" fill="#FBBF24" />
            <Bar dataKey="overdue" stackId="a" fill="#F87171" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
