import { useState } from 'react'
import type { Product } from '@/data/types'
import { Button, Field, Select, TextInput } from '@/components/ui/Form'
import { Modal } from '@/components/ui/Modal'

const categories = ['Laser Tubes', 'Optics', 'Materials', 'Machine Parts', 'Fiber Sources', 'Safety']

export function ProductModal({
  product,
  onSave,
  onClose,
}: {
  product: Product
  onSave: (product: Product) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState<Product>(product)
  const isNew = !product.id

  const set = <K extends keyof Product>(key: K, value: Product[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  const valid = draft.name.trim() && draft.sku.trim() && draft.price > 0 && draft.quantity >= 0

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (valid) onSave(draft)
  }

  return (
    <Modal title={isNew ? 'Add product' : 'Edit product'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Product name">
          <TextInput
            autoFocus
            required
            value={draft.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="e.g. CO2 Laser Tube 80W"
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="SKU">
            <TextInput
              required
              value={draft.sku}
              onChange={(e) => set('sku', e.target.value.toUpperCase())}
              placeholder="LT-XX00"
            />
          </Field>
          <Field label="Category">
            <Select value={draft.category} onChange={(e) => set('category', e.target.value)}>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Price (EGP)">
            <TextInput
              type="number"
              min={1}
              required
              value={draft.price || ''}
              onChange={(e) => set('price', Number(e.target.value))}
              placeholder="0"
            />
          </Field>
          <Field label="Quantity in stock">
            <TextInput
              type="number"
              min={0}
              required
              value={draft.quantity}
              onChange={(e) => set('quantity', Number(e.target.value))}
              placeholder="0"
            />
          </Field>
        </div>
        {draft.quantity > 0 && draft.quantity < 10 && (
          <p className="rounded-lg bg-warning-bg px-3 py-2 text-xs font-medium text-warning">
            This quantity is below 10 — the product will be highlighted as low stock.
          </p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!valid}>
            {isNew ? 'Add product' : 'Save changes'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
