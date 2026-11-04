import { useState } from 'react'
import { CalendarDays, Pencil, Plus, Trash2 } from 'lucide-react'
import { NOTES } from '@/data/users'
import type { Note } from '@/data/types'
import { formatDate, todayISO } from '../../../utils/format'
import { Button, Field, Select, Textarea, TextInput } from '@/components/ui/Form'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

const tags = ['Maintenance', 'Sales', 'General', 'Orders'] as const

const tagTone = {
  Maintenance: 'warning',
  Sales: 'success',
  General: 'primary',
  Orders: 'primary',
} as const

const emptyNote = (): Note => ({
  id: '',
  date: todayISO(),
  title: '',
  content: '',
  tag: 'General',
})

export function NotesPage() {
  const [notes, setNotes] = useState<Note[]>(NOTES)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Note | null>(null)
  const [deleting, setDeleting] = useState<Note | null>(null)

  const save = (note: Note) => {
    setNotes((prev) =>
      note.id ? prev.map((n) => (n.id === note.id ? note : n)) : [...prev, { ...note, id: `n-${Date.now()}` }],
    )
    setFormOpen(false)
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-ink">Daily Notes</h2>
          <p className="mt-1 text-sm text-muted">Shift logbook for the workshop — {notes.length} notes</p>
        </div>
        <Button onClick={() => (setEditing(emptyNote()), setFormOpen(true))}>
          <Plus size={16} /> Add note
        </Button>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {notes.map((n) => (
          <article key={n.id} className="rounded-card bg-surface p-5 shadow-card">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-medium text-muted">
                <CalendarDays size={14} /> {formatDate(n.date)}
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
            <span
              className={`mt-3 inline-flex rounded-md px-2.5 py-1 text-xs font-medium ${
                tagTone[n.tag] === 'warning'
                  ? 'bg-warning-bg text-warning'
                  : tagTone[n.tag] === 'success'
                    ? 'bg-success-bg text-success'
                    : 'bg-primary-light text-primary'
              }`}
            >
              {n.tag}
            </span>
            <h3 className="mt-2 text-[15px] font-semibold text-ink">{n.title}</h3>
            <p className="mt-1.5 text-sm leading-6 text-muted">{n.content}</p>
          </article>
        ))}
      </div>

      {formOpen && editing && <NoteModal note={editing} onSave={save} onClose={() => setFormOpen(false)} />}
      {deleting && (
        <ConfirmDialog
          title="Delete note"
          message={`Delete “${deleting.title}”?`}
          onConfirm={() => {
            setNotes((prev) => prev.filter((n) => n.id !== deleting.id))
            setDeleting(null)
          }}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  )
}

function NoteModal({ note, onSave, onClose }: { note: Note; onSave: (n: Note) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<Note>(note)
  const isNew = !note.id
  const set = <K extends keyof Note>(key: K, value: Note[K]) => setDraft((d) => ({ ...d, [key]: value }))
  const valid = draft.title.trim() && draft.content.trim()

  return (
    <Modal title={isNew ? 'Add note' : 'Edit note'} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (valid) onSave(draft)
        }}
        className="space-y-4"
      >
        <Field label="Title">
          <TextInput autoFocus required value={draft.title} onChange={(e) => set('title', e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Date">
            <TextInput type="date" required value={draft.date} onChange={(e) => set('date', e.target.value)} />
          </Field>
          <Field label="Tag">
            <Select value={draft.tag} onChange={(e) => set('tag', e.target.value as Note['tag'])}>
              {tags.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Content">
          <Textarea required value={draft.content} onChange={(e) => set('content', e.target.value)} />
        </Field>
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
