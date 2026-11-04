import { useEffect, useState } from 'react'
import { CalendarDays, Pencil, Plus, Trash2 } from 'lucide-react'
import type { Note } from '@/data/types'
import { createNote, deleteNote, noteStore, updateNote, userStore, useResource } from '@/api/data'
import { formatEGP, formatDate } from '../../../utils/format'
import { Button } from '@/components/ui/Form'
import { FilterBar, type FilterValues } from '@/components/ui/FilterBar'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { NoteModal } from './NoteModal'

export function NotesPage() {
  const { data: notes, status, error, refresh } = useResource(noteStore)
  const { data: users } = useResource(userStore)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Note | null>(null)
  const [deleting, setDeleting] = useState<Note | null>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const [filters, setFilters] = useState<FilterValues>({})

  // Date range is the only server filter for notes.
  useEffect(() => {
    noteStore.setParams({ from: filters.from, to: filters.to })
    void noteStore.ensure()
  }, [filters])

  /** Create or update via the API, then reconcile the store. */
  const save = async (draft: { content: string; amount: number | null; userId: string | null }) => {
    setBusy(true)
    setActionError('')
    try {
      const payload = {
        content: draft.content,
        amount: draft.amount ?? undefined,
        userId: draft.userId ?? undefined,
      }
      const saved = editing
        ? await updateNote(editing.id, payload)
        : await createNote(payload)
      noteStore.upsert(saved)
      setFormOpen(false)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not save the note')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (note: Note) => {
    setBusy(true)
    setActionError('')
    try {
      await deleteNote(note.id)
      noteStore.remove(note.id)
      setDeleting(null)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not delete the note')
      setDeleting(null)
    } finally {
      setBusy(false)
    }
  }

  if (status === 'error' && notes.length === 0) {
    return (
      <div className="mx-auto max-w-md rounded-card bg-surface p-8 text-center shadow-card">
        <p className="text-sm font-semibold text-ink">Couldn't load notes</p>
        <p className="mt-1 text-sm text-muted">{error}</p>
        <Button className="mt-4" onClick={refresh}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-ink">Daily Notes</h2>
          <p className="mt-1 text-sm text-muted">Shift logbook for the workshop — {notes.length} notes</p>
        </div>
        <Button
          onClick={() => (setEditing(null), setFormOpen(true))}
          disabled={busy}
        >
          <Plus size={16} /> Add note
        </Button>
      </header>

      {actionError && (
        <p className="rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger">{actionError}</p>
      )}
      {status === 'loading' && notes.length > 0 && (
        <p className="text-xs text-muted">Refreshing data…</p>
      )}

      <div className="rounded-card bg-surface shadow-card">
        <FilterBar
          filters={[
            { key: 'from', type: 'date', label: 'From date' },
            { key: 'to', type: 'date', label: 'To date' },
          ]}
          values={filters}
          onChange={(key, value) => setFilters((f) => ({ ...f, [key]: value }))}
          onReset={() => setFilters({})}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {notes.map((n) => (
          <article key={n.id} className="rounded-card bg-surface p-5 shadow-card">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-medium text-muted">
                <CalendarDays size={14} /> {formatDate(n.createdAt)}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => (setEditing(n), setFormOpen(true))}
                  className="rounded-lg p-1.5 text-muted hover:bg-canvas hover:text-ink"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => setDeleting(n)}
                  className="rounded-lg p-1.5 text-muted hover:bg-danger-bg hover:text-danger"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
            {n.user && (
              <span className="mt-3 inline-flex rounded-md bg-primary-light px-2.5 py-1 text-xs font-medium text-primary">
                {n.user.username}
              </span>
            )}
            <p className="mt-2 text-sm leading-6 text-ink">{n.content}</p>
            {n.amount !== null && (
              <p className="mt-3 text-sm font-semibold text-ink">
                Amount: <span className="text-primary">{formatEGP(n.amount)}</span>
              </p>
            )}
            <p className="mt-3 text-xs text-muted">Logged by {n.admin.username}</p>
          </article>
        ))}
        {notes.length === 0 && (
          <p className="col-span-full rounded-card bg-surface p-10 text-center text-sm text-muted shadow-card">
            {status === 'loading' ? 'Loading notes…' : 'No notes yet — add the first one.'}
          </p>
        )}
      </div>

      {formOpen && (
        <NoteModal
          note={editing}
          users={users}
          onSave={(draft) => void save(draft)}
          onClose={() => setFormOpen(false)}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete note"
          message="Delete this note permanently?"
          onConfirm={() => void remove(deleting)}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  )
}
