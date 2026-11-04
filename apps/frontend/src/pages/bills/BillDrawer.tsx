import { useState } from 'react'
import type { Bill, BillStatus } from '@/data/types'
import { Button, Field, Select, TextInput } from '@/components/ui/Form'
import { Drawer } from '@/components/ui/Drawer'

export function BillDrawer({
  bill,
  onSave,
  onClose,
}: {
  bill: Bill
  onSave: (bill: Bill) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState<Bill>(bill)
  const isNew = !bill.id

  const set = <K extends keyof Bill>(key: K, value: Bill[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  const valid = draft.client.trim() && draft.itemsCount > 0 && draft.total > 0

  return (
    <Drawer title={isNew ? 'Create bill' : 'Edit bill'} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (valid) onSave(draft)
        }}
        className="space-y-4"
      >
        <Field label="Client name">
          <TextInput
            autoFocus
            required
            value={draft.client}
            onChange={(e) => set('client', e.target.value)}
            placeholder="e.g. Cairo Woodworks"
          />
        </Field>
        <Field label="Phone">
          <TextInput
            value={draft.phone}
            onChange={(e) => set('phone', e.target.value)}
            placeholder="01XX XXX XXXX"
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Items count">
            <TextInput
              type="number"
              min={1}
              required
              value={draft.itemsCount || ''}
              onChange={(e) => set('itemsCount', Number(e.target.value))}
            />
          </Field>
          <Field label="Total (EGP)">
            <TextInput
              type="number"
              min={1}
              required
              value={draft.total || ''}
              onChange={(e) => set('total', Number(e.target.value))}
            />
          </Field>
        </div>
        <Field label="Issue date">
          <TextInput
            type="date"
            required
            value={draft.issuedAt}
            onChange={(e) => set('issuedAt', e.target.value)}
          />
        </Field>
        <Field label="Status">
          <Select value={draft.status} onChange={(e) => set('status', e.target.value as BillStatus)}>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
          </Select>
        </Field>
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
