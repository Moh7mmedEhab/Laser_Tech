import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { ApiUser, Bill, BillItemInput, Product } from '@/data/types'
import { Button, Field, Select, Textarea, TextInput } from '@/components/ui/Form'
import { Drawer } from '@/components/ui/Drawer'
import { formatEGP } from '../../../utils/format'

/** What the page turns into a create/update API call. */
export type BillDraft = {
  userId: string
  notes: string
  items: BillItemInput[]
}

const emptyDraft = (): BillDraft => ({ userId: '', notes: '', items: [] })

/**
 * Create / edit drawer. The client never sends prices: the total shown here
 * is estimated from current product prices, and the server re-snapshots
 * unitPrice on save (so the numbers match unless an admin repriced in
 * between — the saved bill is the source of truth).
 */
export function BillDrawer({
  bill,
  users,
  products,
  onSave,
  onClose,
}: {
  bill: Bill | null
  users: ApiUser[]
  products: Product[]
  onSave: (draft: BillDraft) => void
  onClose: () => void
}) {
  const isNew = !bill
  const [draft, setDraft] = useState<BillDraft>(() =>
    isNew
      ? emptyDraft()
      : {
          userId: bill.user.id,
          notes: bill.notes ?? '',
          items: bill.items.map(({ productId, quantity }) => ({ productId, quantity })),
        },
  )

  const priceOf = (productId: string) => products.find((p) => p.id === productId)?.price ?? 0
  const total = draft.items.reduce((sum, it) => sum + priceOf(it.productId) * it.quantity, 0)
  const valid =
    draft.userId !== '' &&
    draft.items.length > 0 &&
    draft.items.every((it) => it.productId !== '' && it.quantity >= 1)

  const setItem = (index: number, patch: Partial<BillItemInput>) =>
    setDraft((d) => ({
      ...d,
      items: d.items.map((it, i) => (i === index ? { ...it, ...patch } : it)),
    }))

  return (
    <Drawer title={isNew ? 'Create bill' : 'Edit bill'} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (valid) onSave(draft)
        }}
        className="space-y-4"
      >
        <Field label="Client">
          <Select
            autoFocus
            required
            value={draft.userId}
            onChange={(e) => setDraft((d) => ({ ...d, userId: e.target.value }))}
          >
            <option value="" disabled>
              Select a client…
            </option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.username}
              </option>
            ))}
          </Select>
        </Field>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted">Items</p>
          {draft.items.length === 0 && (
            <p className="rounded-lg bg-canvas px-3 py-2 text-xs text-muted">
              No line items yet — add a product below.
            </p>
          )}
          {draft.items.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <Select
                required
                className="min-w-0 flex-1"
                value={item.productId}
                onChange={(e) => setItem(index, { productId: e.target.value })}
              >
                <option value="" disabled>
                  Select product…
                </option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {formatEGP(p.price)}
                  </option>
                ))}
              </Select>
              <TextInput
                type="number"
                min={1}
                required
                aria-label="Quantity"
                className="w-20 shrink-0"
                value={item.quantity}
                onChange={(e) => setItem(index, { quantity: Number(e.target.value) })}
              />
              <button
                type="button"
                aria-label="Remove item"
                onClick={() =>
                  setDraft((d) => ({ ...d, items: d.items.filter((_, i) => i !== index) }))
                }
                className="rounded-lg p-2 text-muted transition-colors hover:bg-danger-bg hover:text-danger"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => setDraft((d) => ({ ...d, items: [...d.items, { productId: '', quantity: 1 }] }))}
          >
            <Plus size={16} /> Add item
          </Button>
        </div>

        <Field label="Notes (optional)">
          <Textarea
            rows={3}
            value={draft.notes}
            onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
            placeholder="Delivery details, custom specs…"
          />
        </Field>

        <div className="flex justify-between rounded-card bg-canvas p-3 text-sm">
          <span className="font-medium text-muted">Estimated total</span>
          <span className="font-semibold text-ink">{formatEGP(total)}</span>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!valid}>
            {isNew ? 'Create bill' : 'Save changes'}
          </Button>
        </div>
      </form>
    </Drawer>
  )
}
