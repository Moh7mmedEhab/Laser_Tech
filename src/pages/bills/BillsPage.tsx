import { useMemo, useState } from 'react'
import { Eye, MoreHorizontal, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { BILLS } from '@/data/bills'
import type { Bill, BillStatus } from '@/data/types'
import { formatEGP, formatDate, todayISO } from '../../../utils/format'
import { Button, StatusPill } from '@/components/ui/Form'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { BillDrawer } from './BillDrawer'

const statusTone = { paid: 'success', pending: 'warning', overdue: 'error' } as const
const statusLabel = { paid: 'Paid', pending: 'Pending', overdue: 'Overdue' } as const

const emptyBill = (): Bill => ({
  id: '',
  client: '',
  phone: '',
  itemsCount: 1,
  total: 0,
  issuedAt: todayISO(),
  status: 'pending',
})

export function BillsPage() {
  const [bills, setBills] = useState<Bill[]>(BILLS)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | BillStatus>('all')
  const [editing, setEditing] = useState<Bill | null>(null)
  const [viewing, setViewing] = useState<Bill | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<Bill | null>(null)
  const [menuId, setMenuId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return bills.filter(
      (b) =>
        (statusFilter === 'all' || b.status === statusFilter) &&
        (b.id.toLowerCase().includes(q) || b.client.toLowerCase().includes(q)),
    )
  }, [bills, query, statusFilter])

  const openCreate = () => {
    setEditing(emptyBill())
    setFormOpen(true)
  }
  const save = (bill: Bill) => {
    setBills((prev) =>
      bill.id
        ? prev.map((b) => (b.id === bill.id ? bill : b))
        : [...prev, { ...bill, id: `BILL-${243 + prev.length}` }],
    )
    setFormOpen(false)
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-ink">Bills</h2>
          <p className="mt-1 text-sm text-muted">
            {filtered.length} bills · total{' '}
            <span className="font-medium text-ink">
              {formatEGP(filtered.reduce((s, b) => s + b.total, 0))}
            </span>
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} /> Create bill
        </Button>
      </header>

      <div className="rounded-card bg-surface shadow-card">
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <div className="relative min-w-56 flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for bill or client"
              className="h-10 w-full rounded-lg border border-line bg-canvas pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted focus:border-primary focus:bg-surface"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="h-10 rounded-lg border border-line bg-canvas px-3 text-sm outline-none focus:border-primary focus:bg-surface"
          >
            <option value="all">All statuses</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs font-semibold text-muted">
              <th className="px-4 py-3">Bill #</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Items</th>
              <th className="px-4 py-3">Issued</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="w-12 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => (
              <tr key={b.id} className="border-b border-line transition-colors hover:bg-canvas/70">
                <td className="px-4 py-3.5 font-medium text-ink">{b.id}</td>
                <td className="px-4 py-3.5">
                  <p className="font-medium text-ink">{b.client}</p>
                  <p className="text-xs text-muted">{b.phone}</p>
                </td>
                <td className="px-4 py-3.5 text-muted">{b.itemsCount}</td>
                <td className="px-4 py-3.5 text-muted">{formatDate(b.issuedAt)}</td>
                <td className="px-4 py-3.5">
                  <StatusPill tone={statusTone[b.status]} label={statusLabel[b.status]} />
                </td>
                <td className="px-4 py-3.5 text-right font-semibold text-ink">{formatEGP(b.total)}</td>
                <td className="relative px-4 py-3.5">
                  <button
                    onClick={() => setMenuId(menuId === b.id ? null : b.id)}
                    className="rounded-lg p-1.5 text-muted hover:bg-canvas hover:text-ink"
                  >
                    <MoreHorizontal size={18} />
                  </button>
                  {menuId === b.id && (
                    <div
                      onMouseDown={(e) => e.preventDefault()}
                      onBlur={() => setMenuId(null)}
                      tabIndex={-1}
                      className="absolute right-3 top-[calc(100%-14px)] z-10 w-44 rounded-card border border-line bg-surface p-1.5 shadow-card"
                    >
                      {(
                        [
                          ['View bill', Eye, () => (setViewing(b), setMenuId(null))],
                          ['Edit bill', Pencil, () => (setEditing(b), setFormOpen(true), setMenuId(null))],
                          ['Delete bill', Trash2, () => (setDeleting(b), setMenuId(null))],
                        ] as const
                      ).map(([label, Icon, action], i) => (
                        <button
                          key={label}
                          onClick={action}
                          className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-canvas ${
                            i === 2 ? 'text-danger hover:bg-danger-bg' : 'text-ink'
                          }`}
                        >
                          <Icon size={15} className={i === 2 ? '' : 'text-muted'} /> {label}
                        </button>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted">
                  No bills match your filters
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {formOpen && editing && (
        <BillDrawer
          bill={editing}
          onSave={save}
          onClose={() => {
            setFormOpen(false)
            setEditing(null)
          }}
        />
      )}
      {viewing && <ViewBillModal bill={viewing} onClose={() => setViewing(null)} />}
      {deleting && (
        <ConfirmDialog
          title="Delete bill"
          message={`Delete bill ${deleting.id} for ${deleting.client}?`}
          onConfirm={() => {
            setBills((prev) => prev.filter((b) => b.id !== deleting.id))
            setDeleting(null)
          }}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  )
}

/** Read-only summary of a bill opened from the row menu. */
function ViewBillModal({ bill, onClose }: { bill: Bill; onClose: () => void }) {
  const avg = bill.itemsCount ? bill.total / bill.itemsCount : 0
  return (
    <Modal title={bill.id} onClose={onClose}>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div className="col-span-2">
          <dt className="text-xs font-semibold text-muted">Client</dt>
          <dd className="font-medium text-ink">{bill.client} · {bill.phone}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-muted">Issued</dt>
          <dd className="text-ink">{formatDate(bill.issuedAt)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-muted">Status</dt>
          <dd>
            <StatusPill tone={statusTone[bill.status]} label={statusLabel[bill.status]} />
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-muted">Items</dt>
          <dd className="text-ink">{bill.itemsCount}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-muted">Avg. per item</dt>
          <dd className="text-ink">{formatEGP(avg)}</dd>
        </div>
        <div className="rounded-card bg-surface col-span-2 flex justify-between p-3">
          <span className="text-muted font-semibold text-sm text-muted">Total</span>
          <span className="font-semibold text-ink">{formatEGP(bill.total)}</span>
        </div>
      </dl>
    </Modal>
  )
}
