import { useMemo } from 'react'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Boxes, ReceiptText, TriangleAlert, Users } from 'lucide-react'
import { LOW_STOCK_THRESHOLD } from '@/data/types'
import { billStore, productStore, userStore, useResource } from '@/api/data'
import { useAuth } from '@/api/auth'
import { formatEGP } from '../../utils/format'
import { CategoryDonut, type CategorySlice } from '@/components/stats/CategoryDonut'
import { WeeklyBillsBar, type WeeklyBucket } from '@/components/stats/WeeklyBillsBar'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// One clock read per module load keeps renders pure (oxlint react/purity).
const NOW = new Date()
const THIS_YEAR = NOW.getFullYear()

export function StatsPage() {
  const { user } = useAuth()
  const { data: bills, status: billStatus, error, refresh } = useResource(billStore)
  const { data: products } = useResource(productStore)
  const { data: users } = useResource(userStore)

  const stats = useMemo(() => {
    const revenue = bills.reduce((sum, b) => sum + b.amount, 0)
    const unitsSold = bills.reduce(
      (sum, b) => sum + b.items.reduce((s, it) => s + it.quantity, 0),
      0,
    )
    const lowStock = products.filter((p) => p.quantity < LOW_STOCK_THRESHOLD).length

    // Revenue per month over the current calendar year.
    const byMonth = MONTHS.map((month) => ({ month, revenue: 0 }))
    for (const bill of bills) {
      const d = new Date(bill.createdAt)
      if (d.getFullYear() === NOW.getFullYear() && bill.amount > 0) {
        byMonth[d.getMonth()].revenue += bill.amount
      }
    }
    // Revenue trend in thousands of EGP keeps the axis readable.
    const trend = byMonth.map((m) => ({ month: m.month, revenue: Math.round(m.revenue / 100) / 10 }))

    // Category revenue share across all bills.
    const revenueByCategory = new Map<string, number>()
    for (const bill of bills) {
      for (const item of bill.items) {
        const product = products.find((p) => p.id === item.productId)
        const category = product?.category ?? 'Other'
        revenueByCategory.set(category, (revenueByCategory.get(category) ?? 0) + item.unitPrice * item.quantity)
      }
    }
    const categoryRevenue = [...revenueByCategory.entries()].sort((a, b) => b[1] - a[1])
    const categorySum = categoryRevenue.reduce((s, [, v]) => s + v, 0) || 1
    const categories: CategorySlice[] = categoryRevenue.map(([name, catRevenue]) => ({
      name,
      revenue: catRevenue,
      value: (catRevenue / categorySum) * 100,
    }))

    // Bills per day for the trailing 7 days (today last).
    const week: WeeklyBucket[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(THIS_YEAR, NOW.getMonth(), NOW.getDate() - i)
      const day = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
      const dayBills = bills.filter((b) => {
        const bd = new Date(b.createdAt)
        return new Date(bd.getFullYear(), bd.getMonth(), bd.getDate()).getTime() === day
      })
      week.push({
        day: i === 0 ? 'Today' : DAYS[d.getDay()],
        bills: dayBills.length,
        revenue: dayBills.reduce((s, b) => s + b.amount, 0),
      })
    }

    return { revenue, unitsSold, lowStock, trend, categories, week }
  }, [bills, products])

  const cards = [
    { label: 'Revenue', value: formatEGP(stats.revenue), sub: `${bills.length} bills`, icon: ReceiptText, tone: 'bg-primary-light text-primary' },
    { label: 'Products Sold', value: stats.unitsSold.toLocaleString('en-EG'), sub: 'units across all bills', icon: Boxes, tone: 'bg-success-bg text-success' },
    { label: 'Low Stock', value: `${stats.lowStock} items`, sub: `under ${LOW_STOCK_THRESHOLD} in stock`, icon: TriangleAlert, tone: 'bg-warning-bg text-warning' },
    { label: 'Users', value: String(users.length), sub: 'registered accounts', icon: Users, tone: 'bg-primary-light text-primary' },
  ]

  if (billStatus === 'error' && bills.length === 0) {
    return (
      <div className="mx-auto max-w-md rounded-card bg-surface p-8 text-center shadow-card">
        <p className="text-sm font-semibold text-ink">Couldn't load statistics</p>
        <p className="mt-1 text-sm text-muted">{error}</p>
        <button
          onClick={refresh}
          className="mt-4 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold text-ink">
          Hello, {user?.username ?? 'there'} <span className="align-middle">👏</span>
        </h2>
        <p className="mt-1 text-sm text-muted">Here’s what’s happening at Laser Tech this month.</p>
      </header>

      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {cards.map(({ label, value, sub, icon: Icon, tone }) => (
          <article key={label} className="rounded-card bg-surface p-5 shadow-card">
            <div className="flex items-center justify-between">
              <span className={`flex size-10 items-center justify-center rounded-lg ${tone}`}>
                <Icon size={19} />
              </span>
            </div>
            <p className="mt-4 text-sm text-muted">{label}</p>
            <p className="mt-1 text-xl font-semibold text-ink">{value}</p>
            <p className="mt-0.5 text-xs text-muted">{sub}</p>
          </article>
        ))}
      </section>

      {billStatus === 'loading' && bills.length === 0 ? (
        <p className="text-sm text-muted">Loading statistics…</p>
      ) : (
        <section className="grid gap-4 xl:grid-cols-3">
          <div className="rounded-card bg-surface p-5 shadow-card xl:col-span-2">
            <h3 className="text-sm font-semibold text-ink">Revenue trend ({THIS_YEAR})</h3>
            <p className="text-xs text-muted">Monthly gross sales, in thousands of EGP</p>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.trend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
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
          <CategoryDonut data={stats.categories} />
          <div className="xl:col-span-3">
            <WeeklyBillsBar data={stats.week} />
          </div>
        </section>
      )}
    </div>
  )
}
