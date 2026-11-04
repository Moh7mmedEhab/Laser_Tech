import { useState } from 'react'
import { MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { USERS } from '@/data/users'
import type { User } from '@/data/types'
import { formatDate, todayISO } from '../../../utils/format'
import { Button, StatusPill, TextInput, Select, Field } from '@/components/ui/Form'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

const roles = ['Admin', 'Technician', 'Accountant'] as const
const PAGE_SIZE = 8

const emptyUser = (): User => ({
  id: '',
  name: '',
  email: '',
  role: 'Technician',
  active: true,
  joinedAt: todayISO(),
})

const avatarTones = ['bg-primary', 'bg-indigo-400', 'bg-cyan-500', 'bg-amber-500', 'bg-emerald-500']

export function UsersPage() {
  const [users, setUsers] = useState<User[]>(USERS)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [deleting, setDeleting] = useState<User | null>(null)
  const [menuId, setMenuId] = useState<string | null>(null)

  const openCreate = () => {
    setEditing(emptyUser())
    setFormOpen(true)
  }
  const save = (user: User) => {
    setUsers((prev) =>
      user.id ? prev.map((u) => (u.id === user.id ? user : u)) : [...prev, { ...user, id: `u-${Date.now()}` }],
    )
    setFormOpen(false)
  }
  const toggleActive = (user: User) =>
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, active: !u.active } : u)))

  const visible = users.slice(0, PAGE_SIZE)

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-ink">Users</h2>
          <p className="mt-1 text-sm text-muted">
            {users.length} users · {users.filter((u) => u.active).length} active
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} /> Add user
        </Button>
      </header>

      <div className="rounded-card bg-surface shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs font-semibold text-muted">
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">Status</th>
              <th className="w-12 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((u, i) => (
              <tr key={u.id} className="border-b border-line transition-colors hover:bg-canvas/70">
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${
                        avatarTones[i % avatarTones.length]
                      }`}
                    >
                      {u.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                    </span>
                    <div>
                      <p className="font-medium text-ink">{u.name}</p>
                      <p className="text-xs text-muted">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <StatusPill tone={u.role === 'Admin' ? 'primary' : 'warning'} label={u.role} />
                </td>
                <td className="px-4 py-3.5 text-muted">{formatDate(u.joinedAt)}</td>
                <td className="px-4 py-3.5">
                  <button onClick={() => toggleActive(u)} title="Toggle active">
                    <StatusPill tone={u.active ? 'success' : 'error'} label={u.active ? 'Active' : 'Disabled'} />
                  </button>
                </td>
                <td className="relative px-4 py-3.5">
                  <button
                    onClick={() => setMenuId(menuId === u.id ? null : u.id)}
                    className="rounded-lg p-1.5 text-muted hover:bg-canvas hover:text-ink"
                  >
                    <MoreHorizontal size={18} />
                  </button>
                  {menuId === u.id && (
                    <div
                      onMouseDown={(e) => e.preventDefault()}
                      onBlur={() => setMenuId(null)}
                      tabIndex={-1}
                      className="absolute right-3 top-[calc(100%-14px)] z-10 w-40 rounded-card border border-line bg-surface p-1.5 shadow-card"
                    >
                      <button
                        onClick={() => (setEditing(u), setFormOpen(true), setMenuId(null))}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink hover:bg-canvas"
                      >
                        <Pencil size={15} className="text-muted" /> Edit
                      </button>
                      <button
                        onClick={() => (setDeleting(u), setMenuId(null))}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-danger hover:bg-danger-bg"
                      >
                        <Trash2 size={15} /> Delete
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {formOpen && editing && (
        <UserModal user={editing} onSave={save} onClose={() => setFormOpen(false)} />
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete user"
          message={`Remove ${deleting.name} (${deleting.email})?`}
          onConfirm={() => {
            setUsers((prev) => prev.filter((u) => u.id !== deleting.id))
            setDeleting(null)
          }}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  )
}

function UserModal({ user, onSave, onClose }: { user: User; onSave: (u: User) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<User>(user)
  const isNew = !user.id
  const set = <K extends keyof User>(key: K, value: User[K]) => setDraft((d) => ({ ...d, [key]: value }))
  const valid = draft.name.trim() && /^\S+@\S+\.\S+$/.test(draft.email)

  return (
    <Modal title={isNew ? 'Add user' : 'Edit user'} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (valid) onSave(draft)
        }}
        className="space-y-4"
      >
        <Field label="Full name">
          <TextInput autoFocus required value={draft.name} onChange={(e) => set('name', e.target.value)} />
        </Field>
        <Field label="Email">
          <TextInput type="email" required value={draft.email} onChange={(e) => set('email', e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Role">
            <Select value={draft.role} onChange={(e) => set('role', e.target.value as User['role'])}>
              {roles.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={draft.active ? '1' : '0'} onChange={(e) => set('active', e.target.value === '1')}>
              <option value="1">Active</option>
              <option value="0">Disabled</option>
            </Select>
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!valid}>
            {isNew ? 'Add user' : 'Save changes'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
