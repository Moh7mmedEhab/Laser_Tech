import { useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import type { FormEvent } from 'react'
import { Button, TextInput } from './Form'
import { Modal } from './Modal'
import { LoadingDots } from './Loading'

/**
 * Destructive-action confirmation that requires the signed-in admin's own
 * password. Used where a confirm alone isn't enough (e.g. deleting a user,
 * which cascades to their bills and notes). The confirm button stays
 * disabled until something is typed, and the parent keeps dialog state so a
 * failed attempt shows the error inline without losing the password input.
 */
export function PasswordConfirmDialog({
  title,
  message,
  confirmLabel = 'Delete',
  busy = false,
  error = '',
  onConfirm,
  onCancel,
}: {
  title: string
  /** What will happen, including any cascade warnings. */
  message: string
  confirmLabel?: string
  busy?: boolean
  error?: string
  /** Receives the typed password; stays open on failure. */
  onConfirm: (password: string) => void
  onCancel: () => void
}) {
  const [password, setPassword] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (password && !busy) onConfirm(password)
  }

  return (
    <Modal title={title} onClose={onCancel}>
      <form onSubmit={submit} className="space-y-4">
        <div className="flex gap-2.5 rounded-lg bg-danger-bg p-3 text-sm text-danger">
          <TriangleAlert size={16} className="mt-0.5 shrink-0" />
          <p className="whitespace-pre-line">{message}</p>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-muted">Your admin password</span>
          <TextInput
            autoFocus
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Type your password to confirm"
          />
        </label>

        {error && <p className="text-sm font-medium text-danger">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" disabled={busy || password === ''}>
            {busy ? (
              <span className="inline-flex items-center gap-2">
                <LoadingDots /> Working…
              </span>
            ) : (
              confirmLabel
            )}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
