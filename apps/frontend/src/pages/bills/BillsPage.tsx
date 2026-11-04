import { useEffect, useMemo, useState } from 'react'
import { Eye, MoreHorizontal, Pencil, Plus, Printer, Trash2 } from 'lucide-react'
import type { Bill } from '@/data/types'
import { billStore, createBill, deleteBill, productStore, updateBill, userStore, useResource } from '@/api/data'
import { formatEGP, formatDate } from '../../../utils/format'
import { Button } from '@/components/ui/Form'
import { FilterBar, SortTh, type FilterValues } from '@/components/ui/FilterBar'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { BillDrawer, type BillDraft } from './BillDrawer'

/** CUIDs are long — display a stable short label instead of the raw id. */
const billLabel = (id: string) => `#${id.slice(-6).toUpperCase()}`

/** Column-header sort mapping: UI field → server `sort` value. */
const SORT_FIELDS = { createdAt: 'newest', amount: 'amount' } as const

export function BillsPage() {
  const { data: bills, status, error, refresh } = useResource(billStore)
  const { data: products } = useResource(productStore)
  const { data: users } = useResource(userStore)
  const admins = useMemo(() => {
    const seen = new Map<string, string>()
    for (const b of bills) seen.set(b.admin.id, b.admin.username)
    for (const u of users) {
      if (u.role === 'ADMIN' && !seen.has(u.id)) seen.set(u.id, u.username)
    }
    return [...seen.entries()].map(([value, label]) => ({ value, label }))
  }, [bills, users])

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Bill | null>(null)
  const [viewing, setViewing] = useState<Bill | null>(null)
  const [deleting, setDeleting] = useState<Bill | null>(null)
  const [menuId, setMenuId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const [filters, setFilters] = useState<FilterValues>({})
  const [sort, setSort] = useState<{ field: string | null; dir: 'asc' | 'desc' }>({
    field: null,
    dir: 'desc',
  })

  // Column-header field → server `sort` value.

  // Server does the filtering + sorting; the table renders the full window.
  useEffect(() => {
    billStore.setParams({
      search: filters.search,
      userId: filters.userId,
      adminId: filters.adminId,
      from: filters.from,
      to: filters.to,
      minAmount: filters.minAmount,
      maxAmount: filters.maxAmount,
      sort: sort.field ? SORT_FIELDS[sort.field as keyof typeof SORT_FIELDS] : undefined,
      order: sort.field ? sort.dir : undefined,
    })
    void billStore.ensure()
  }, [filters, sort])

  /** Click cycles asc → desc → server default. */
  const onSort = (field: string, dir: 'asc' | 'desc') => {
    if (sort.field === field && sort.dir === 'desc') setSort({ field: null, dir: 'desc' })
    else setSort({ field, dir })
  }

  /** Print opens a dedicated tab with a print-ready layout. */
  const printBill = (bill: Bill) => {
    setMenuId(null)
    window.open(`/bills/${bill.id}/print`, '_blank', 'noopener')
  }

  /** Create or update via the API; stores reconcile via upsert. */
  const save = async (draft: BillDraft) => {
    setBusy(true)
    setActionError('')
    try {
      const payload = {
        userId: draft.userId,
        notes: draft.notes.trim() || undefined,
        items: draft.items,
      }
      const saved = editing
        ? await updateBill(editing.id, payload)
        : await createBill(payload)
      billStore.upsert(saved)
      setFormOpen(false)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not save the bill')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (bill: Bill) => {
    setBusy(true)
    setActionError('')
    try {
      await deleteBill(bill.id)
      billStore.remove(bill.id)
      setDeleting(null)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not delete the bill')
      setDeleting(null)
    } finally {
      setBusy(false)
    }
  }

  if (status === 'error' && bills.length === 0) {
    return (
      <div className="mx-auto max-w-md rounded-card bg-surface p-8 text-center shadow-card">
        <p className="text-sm font-semibold text-ink">Couldn't load bills</p>
        <p className="mt-1 text-sm text-muted">{error}</p>
        <Button className="mt-4" onClick={refresh}>Retry</Button>
      </div>
    )
  }

  const totalAmount = bills.reduce((sum, b) => sum + b.amount, 0)

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-ink">Bills</h2>
          <p className="mt-1 text-sm text-muted">
            {bills.length} bills · total{' '}
            <span className="font-medium text-ink">{formatEGP(totalAmount)}</span>
          </p>
        </div>
        <Button
          onClick={() => (setEditing(null), setFormOpen(true))}
          disabled={busy}
        >
          <Plus size={16} /> Create bill
        </Button>
      </header>

      {actionError && (
        <p className="rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger">{actionError}</p>
      )}
      {status === 'loading' && bills.length > 0 && (
        <p className="text-xs text-muted">Refreshing data…</p>
      )}

      <div className="rounded-card bg-surface shadow-card">
        <FilterBar
          filters={[
            { key: 'search', type: 'text', label: 'Bills', placeholder: 'Search client or product' },
            {
              key: 'userId',
              type: 'select',
              label: 'Client',
              options: users.map((u) => ({ value: u.id, label: u.username })),
            },
            {
              key: 'adminId',
              type: 'select',
              label: 'Issued by',
              options: admins,
            },
            { key: 'from', type: 'date', label: 'From date' },
            { key: 'to', type: 'date', label: 'To date' },
            { key: 'minAmount', type: 'number', label: 'Min amount (EGP)', placeholder: '0' },
            { key: 'maxAmount', type: 'number', label: 'Max amount (EGP)', placeholder: '∞' },
          ]}
          values={filters}
          onChange={(key, value) => setFilters((f) => ({ ...f, [key]: value }))}
          onReset={() => setFilters({})}
        />

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs font-semibold text-muted">
              <th className="px-4 py-3">Bill #</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Items</th>
              <SortTh label="Issued" field="createdAt" activeField={sort.field ?? ''} activeDir={sort.dir} onSort={onSort} />
              <SortTh label="Amount" field="amount" activeField={sort.field ?? ''} activeDir={sort.dir} onSort={onSort} align="right" />
              <th className="w-12 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {bills.map((b) => {
              const units = b.items.reduce((sum, it) => sum + it.quantity, 0)
              return (
                <tr key={b.id} className="border-b border-line transition-colors hover:bg-canvas/70">
                  <td className="px-4 py-3.5 font-medium text-ink">{billLabel(b.id)}</td>
                  <td className="px-4 py-3.5">
                    <p className="font-medium text-ink">{b.user.username}</p>
                    {b.admin.id !== b.user.id && (
                      <p className="text-xs text-muted">by {b.admin.username}</p>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-muted">{units}</td>
                  <td className="px-4 py-3.5 text-muted">{formatDate(b.createdAt)}</td>
                  <td className="px-4 py-3.5 text-right font-semibold text-ink">{formatEGP(b.amount)}</td>
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
                            ['Print bill', Printer, () => printBill(b)],
                            ['Delete bill', Trash2, () => (setDeleting(b), setMenuId(null))],
                          ] as const
                        ).map(([label, Icon, action], i) => (
                          <button
                            key={label}
                            onClick={action}
                            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-canvas ${
                              i === 3 ? 'text-danger hover:bg-danger-bg' : 'text-ink'
                            }`}
                          >
                            <Icon size={15} className={i === 3 ? '' : 'text-muted'} /> {label}
                          </button>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
            {bills.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted">
                  {status === 'loading' ? 'Loading bills…' : 'No bills match your filters'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {formOpen && (
        <BillDrawer
          bill={editing}
          users={users}
          products={products}
          onSave={(draft) => void save(draft)}
          onClose={() => {
            setFormOpen(false)
            setEditing(null)
          }}
        />
      )}
      {viewing && <ViewBillModal bill={viewing} products={products} onClose={() => setViewing(null)} />}
      {deleting && (
        <ConfirmDialog
          title="Delete bill"
          message={`Delete bill ${billLabel(deleting.id)} for ${deleting.user.username}? Its items return to stock.`}
          onConfirm={() => void remove(deleting)}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  )
}

/** Read-only summary of a bill opened from the row menu. */
function ViewBillModal({
  bill,
  products,
  onClose,
}: {
  bill: Bill
  products: { id: string; name: string }[]
  onClose: () => void
}) {
  const units = bill.items.reduce((sum, it) => sum + it.quantity, 0)
  const avg = units ? bill.amount / units : 0
  return (
    <Modal title={`Bill ${billLabel(bill.id)}`} onClose={onClose}>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div className="col-span-2">
          <dt className="text-xs font-semibold text-muted">Client</dt>
          <dd className="font-medium text-ink">
            {bill.user.username} · issued by {bill.admin.username}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-muted">Issued</dt>
          <dd className="text-ink">{formatDate(bill.createdAt)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-muted">Units</dt>
          <dd className="text-ink">{units}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-muted">Avg. per unit</dt>
          <dd className="text-ink">{formatEGP(avg)}</dd>
        </div>
        {bill.notes && (
          <div className="col-span-2">
            <dt className="text-xs font-semibold text-muted">Notes</dt>
            <dd className="text-ink">{bill.notes}</dd>
          </div>
        )}
        <div className="col-span-2">
          <dt className="text-xs font-semibold text-muted">Line items</dt>
          <dd>
            <ul className="divide-y divide-line overflow-hidden rounded-card border border-line">
              {bill.items.map((item) => (
                <li key={item.id} className="flex items-center justify-between px-3 py-2">
                  <span className="text-ink">
                    {item.quantity} ×{' '}
                    <span className="text-muted">
                      {products.find((p) => p.id === item.productId)?.name ?? item.productId}
                    </span>
                  </span>
                  <span className="font-medium text-ink">
                    {formatEGP(item.unitPrice * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>
          </dd>
        </div>
        <div className="col-span-2 flex justify-between rounded-card bg-canvas p-3">
          <span className="text-sm font-semibold text-muted">Total</span>
          <span className="font-semibold text-ink">{formatEGP(bill.amount)}</span>
        </div>
      </dl>
    </Modal>
  )
}
