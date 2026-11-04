import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowDownRight, ArrowUpRight, Boxes, ReceiptText, TriangleAlert, Users } from 'lucide-react'
import { revenueTrend } from '@/data/stats'
import { CategoryDonut } from '@/components/stats/CategoryDonut'
import { WeeklyBillsBar } from '@/components/stats/WeeklyBillsBar'

const cards = [
  { label: 'Revenue', value: 'EGP 758,740', delta: '+24%', down: false, icon: ReceiptText, tone: 'bg-primary-light text-primary' },
  { label: 'Products Sold', value: '1,846', delta: '+16%', down: false, icon: Boxes, tone: 'bg-success-bg text-success' },
  { label: 'Low Stock', value: '8 items', delta: '-3%', down: true, icon: TriangleAlert, tone: 'bg-warning-bg text-warning' },
  { label: 'Active Users', value: '6', delta: '+2', down: false, icon: Users, tone: 'bg-primary-light text-primary' },
]

export function StatsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold text-ink">
          Hello, Devon Lane <span className="align-middle">👏</span>
        </h2>
        <p className="mt-1 text-sm text-muted">Here’s what’s happening at Laser Tech this month.</p>
      </header>

      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {cards.map(({ label, value, delta, down, icon: Icon, tone }) => (
          <article key={label} className="rounded-card bg-surface p-5 shadow-card">
            <div className="flex items-center justify-between">
              <span className={`flex size-10 items-center justify-center rounded-lg ${tone}`}>
                <Icon size={19} />
              </span>
              <span
                className={`flex items-center gap-1 text-xs font-semibold ${down ? 'text-danger' : 'text-success'}`}
              >
                {down ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                {delta}
              </span>
            </div>
            <p className="mt-4 text-sm text-muted">{label}</p>
            <p className="mt-1 text-xl font-semibold text-ink">{value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-card bg-surface p-5 shadow-card xl:col-span-2">
          <h3 className="text-sm font-semibold text-ink">Revenue trend (2026)</h3>
          <p className="text-xs text-muted">Monthly gross sales, in thousands of EGP</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366F1" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                <Tooltip
                  formatter={(v: unknown) => [`EGP ${v}k`, 'Revenue']}
                  contentStyle={{ borderRadius: 8, borderColor: '#E5E7EB', fontSize: 12 }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#6366F1"
                  strokeWidth={2.5}
                  fill="url(#revenueFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <CategoryDonut />
        <div className="xl:col-span-3">
          <WeeklyBillsBar />
        </div>
      </section>
    </div>
  )
}
