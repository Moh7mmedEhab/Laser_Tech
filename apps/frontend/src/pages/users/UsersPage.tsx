import { useState } from 'react'
import { MoreHorizontal, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { ROLE_OPTIONS, roleLabel, type ApiUser, type Role } from '@/data/types'
import { createUser, deleteUser, updateUser, userStore, useResource } from '@/api/data'
import { formatDate } from '../../../utils/format'
import { Button, StatusPill, TextInput, Select, Field } from '@/components/ui/Form'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

const PAGE_SIZE = 8

const emptyUser = (): ApiUser => ({
  id: '',
  username: '',
  email: '',
  phone: '',
  role: 'USER',
  createdAt: '',
  updatedAt: '',
})

const avatarTones = ['bg-primary', 'bg-indigo-400', 'bg-cyan-500', 'bg-amber-500', 'bg-emerald-500']

const roleTone: Record<Role, 'primary' | 'warning' | 'success'> = {
  ADMIN: 'primary',
  EMPLOYEE: 'warning',
  USER: 'success',
}

/** Fields + password the modal edits; passwords are write-only. */
type UserForm = {
  username: string
  email: string
  phone: string
  role: Role
  password: string
}

const toForm = (u: ApiUser | null): UserForm => ({
  username: u?.username ?? '',
  email: u?.email ?? '',
  phone: u?.phone ?? '',
  role: u?.role ?? 'USER',
  password: '',
})

export function UsersPage() {
  const { data: users, status, error, refresh } = useResource(userStore)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ApiUser | null>(null)
  const [deleting, setDeleting] = useState<ApiUser | null>(null)
  const [menuId, setMenuId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')

  const filtered = users.filter((u) => {
    const q = query.trim().toLowerCase()
    return (
      !q ||
      u.username.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.phone.includes(q.trim())
    )
  })

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const openCreate = () => {
    setEditing(emptyUser())
    setFormOpen(true)
  }
  const openEdit = (u: ApiUser) => {
    setEditing(u)
    setFormOpen(true)
    setMenuId(null)
  }

  /** Create or update via the API, then reconcile the store. */
  const save = async (form: UserForm) => {
    setBusy(true)
    setActionError('')
    try {
      const saved = editing?.id
        ? await updateUser(editing.id, {
            username: form.username,
            email: form.email,
            phone: form.phone,
            role: form.role,
            // Only send a password when the admin typed a new one.
            ...(form.password ? { password: form.password } : {}),
          })
        : await createUser({
            username: form.username,
            email: form.email,
            phone: form.phone,
            role: form.role,
            password: form.password,
          })
      userStore.upsert(saved)
      setFormOpen(false)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not save the user')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (u: ApiUser) => {
    setBusy(true)
    setActionError('')
    try {
      await deleteUser(u.id)
      userStore.remove(u.id)
      setDeleting(null)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not delete the user')
      setDeleting(null)
    } finally {
      setBusy(false)
    }
  }

  if (status === 'error' && users.length === 0) {
    return (
      <div className="mx-auto max-w-md rounded-card bg-surface p-8 text-center shadow-card">
        <p className="text-sm font-semibold text-ink">Couldn't load users</p>
        <p className="mt-1 text-sm text-muted">{error}</p>
        <Button className="mt-4" onClick={refresh}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-ink">Users</h2>
          <p className="mt-1 text-sm text-muted">{users.length} users</p>
        </div>
        <Button onClick={openCreate} disabled={busy}>
          <Plus size={16} /> Add user
        </Button>
      </header>

      {actionError && (
        <p className="rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger">{actionError}</p>
      )}
      {status === 'loading' && users.length > 0 && (
        <p className="text-xs text-muted">Refreshing data…</p>
      )}

      <div className="rounded-card bg-surface shadow-card">
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <div className="relative min-w-56 flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search users"
              className="h-10 w-full rounded-lg border border-line bg-canvas pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted focus:border-primary focus:bg-surface"
            />
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs font-semibold text-muted">
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Bills</th>
              <th className="px-4 py-3">Joined</th>
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
                      {u.username.slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <p className="font-medium text-ink">{u.username}</p>
                      <p className="text-xs text-muted">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-muted">{u.phone}</td>
                <td className="px-4 py-3.5">
                  <StatusPill tone={roleTone[u.role]} label={roleLabel(u.role)} />
                </td>
                <td className="px-4 py-3.5 text-muted">{u.billCount ?? 0}</td>
                <td className="px-4 py-3.5 text-muted">{formatDate(u.createdAt)}</td>
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
                        onClick={() => openEdit(u)}
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
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted">
                  {status === 'loading' ? 'Loading users…' : 'No users match your search'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {pageCount > 1 && (
          <div className="flex items-center justify-end gap-3 border-t border-line px-4 py-3 text-xs text-muted">
            <button
              className="rounded-lg px-3 py-1.5 hover:bg-canvas"
              disabled={safePage <= 1}
              onClick={() => setPage(safePage - 1)}
            >
              Previous
            </button>
            Page {safePage} of {pageCount}
            <button
              className="rounded-lg px-3 py-1.5 hover:bg-canvas"
              disabled={safePage >= pageCount}
              onClick={() => setPage(safePage + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {formOpen && editing && (
        <UserModal user={editing} onSave={(form) => void save(form)} onClose={() => setFormOpen(false)} />
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete user"
          message={`Remove ${deleting.username} (${deleting.email})? This cannot be undone.`}
          onConfirm={() => void remove(deleting)}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  )
}

function UserModal({
  user,
  onSave,
  onClose,
}: {
  user: ApiUser
  onSave: (u: UserForm) => void
  onClose: () => void
}) {
  const isNew = !user.id
  const [form, setForm] = useState<UserForm>(() => toForm(user))
  const set = <K extends keyof UserForm>(key: K, value: UserForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const emailOk = /^\S+@\S+\.\S+$/.test(form.email)
  const phoneOk = /^[0-9+\-\s()]{7,20}$/.test(form.phone)
  const passwordOk = isNew ? form.password.length >= 8 : form.password === '' || form.password.length >= 8
  const valid = form.username.trim().length >= 3 && emailOk && phoneOk && passwordOk

  return (
    <Modal title={isNew ? 'Add user' : 'Edit user'} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (valid) onSave(form)
        }}
        className="space-y-4"
      >
        <Field label="Username">
          <TextInput
            autoFocus
            required
            minLength={3}
            maxLength={32}
            pattern="[a-zA-Z0-9_.\-]+"
            title="3–32 characters: letters, digits, dot, dash, underscore"
            value={form.username}
            onChange={(e) => set('username', e.target.value)}
          />
        </Field>
        <Field label="Email">
          <TextInput type="email" required value={form.email} onChange={(e) => set('email', e.target.value)} />
        </Field>
        <Field label="Phone">
          <TextInput
            required
            pattern="[0-9+\-\s()]{7,20}"
            title="7–20 digits, may contain + - ( ) and spaces"
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
            placeholder="+20 100 000 0001"
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Role">
            <Select value={form.role} onChange={(e) => set('role', e.target.value as Role)}>
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={isNew ? 'Password' : 'New password'}>
            <TextInput
              type="password"
              required={isNew}
              minLength={8}
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              placeholder={isNew ? 'At least 8 characters' : 'Leave empty to keep current'}
            />
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
