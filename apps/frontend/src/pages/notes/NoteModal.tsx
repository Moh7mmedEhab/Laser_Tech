import { useState } from 'react'
import type { ApiUser, Note } from '@/data/types'
import { Button, Field, Select, Textarea, TextInput } from '@/components/ui/Form'
import { Modal } from '@/components/ui/Modal'

/**
 * Note create/edit modal. Notes target an optional USER (shift subject) and
 * optionally record an EGP amount.
 */
export function NoteModal({
  note,
  users,
  onSave,
  onClose,
}: {
  note: Note | null
  users: ApiUser[]
  onSave: (draft: { content: string; amount: number | null; userId: string | null }) => void
  onClose: () => void
}) {
  const isNew = !note
  const [content, setContent] = useState(() => note?.content ?? '')
  const [amount, setAmount] = useState(() => `${note?.amount ?? ''}`)
  const [userId, setUserId] = useState(() => note?.user?.id ?? '')

  const valid = content.trim().length > 0

  return (
    <Modal title={isNew ? 'Add note' : 'Edit note'} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (valid)
            onSave({
              content,
              // Empty string → no amount attached.
              amount: amount === '' ? null : Number(amount),
              userId: userId || null,
            })
        }}
        className="space-y-4"
      >
        <Field label="Content">
          <Textarea
            autoFocus
            required
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What happened during the shift…"
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Amount (EGP, optional)">
            <TextInput
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 250"
            />
          </Field>
          <Field label="Subject (optional)">
            <Select value={userId} onChange={(e) => setUserId(e.target.value)}>
              <option value="">General note</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.username}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!valid}>
            {isNew ? 'Add note' : 'Save changes'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
