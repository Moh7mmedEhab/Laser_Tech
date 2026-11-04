import { useEffect, useRef, useState } from 'react'
import { Check, Camera, Loader2, LogOut, Smartphone, Monitor, Terminal } from 'lucide-react'
import { roleLabel, type ApiMe } from '@/data/types'
import { authStore, listLoginHistory, listSessions, revokeAllOtherSessions, useAuth, type SessionRow } from '@/api/auth'
import { Button, Field, TextInput } from '@/components/ui/Form'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { LoadingDots } from '@/components/ui/Loading'
import { formatDate } from '../../utils/format'

type ProfileForm = { username: string; email: string; phone: string }

const toForm = (user: ApiMe | null): ProfileForm => ({
  username: user?.username ?? '',
  email: user?.email ?? '',
  phone: user?.phone ?? '',
})

export function SettingsPage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<ProfileForm>(() => toForm(user))
  const [savedProfile, setSavedProfile] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [avatar, setAvatar] = useState('')
  const [pwSaved, setPwSaved] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const uploadAvatar = (file: File | undefined) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setAvatar(String(reader.result))
    reader.readAsDataURL(file)
  }

  const initials =
    user?.username
      .slice(0, 2)
      .toUpperCase() ?? ''

  /**
   * Save the self profile (`PATCH /auth/me`). The store's merged response
   * updates the topbar automatically.
   */
  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileError('')
    const payload: Partial<Pick<ApiMe, 'username' | 'email' | 'phone'>> = {
      username: profile.username,
      email: profile.email,
    }
    if (profile.phone.trim()) payload.phone = profile.phone
    try {
      const saved = await authStore.updateProfile(payload)
      setProfile((p) => ({ ...p, phone: saved.phone ?? '' }))
      setSavedProfile(true)
      window.setTimeout(() => setSavedProfile(false), 2500)
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Could not update the profile')
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <h2 className="text-2xl font-semibold text-ink">Settings</h2>
        <p className="mt-1 text-sm text-muted">Manage your profile and account security.</p>
      </header>

      {/* Profile */}
      <section className="rounded-card bg-surface p-6 shadow-card">
        <h3 className="text-sm font-semibold text-ink">Profile</h3>
        <div className="mt-4 flex items-center gap-4">
          <div className="relative size-16 shrink-0">
            {avatar ? (
              <img src={avatar} alt="Profile" className="size-16 rounded-full object-cover" />
            ) : (
              <span className="flex size-16 items-center justify-center rounded-full bg-primary text-lg font-semibold text-white">
                {initials}
              </span>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              title="Upload photo"
              className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full bg-surface text-muted shadow-card hover:text-primary"
            >
              <Camera size={14} />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => uploadAvatar(e.target.files?.[0])}
            />
          </div>
          <div>
            <p className="font-semibold text-ink">{user?.username || 'Unnamed'}</p>
            <p className="text-sm text-muted">
              {user ? roleLabel(user.role) : ''} · {user?.email}
            </p>
          </div>
        </div>

        <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={(e) => void saveProfile(e)}>
          <Field label="Username">
            <TextInput
              required
              minLength={3}
              maxLength={32}
              pattern="[a-zA-Z0-9_.\-]+"
              title="3–32 characters: letters, digits, dot, dash, underscore"
              value={profile.username}
              onChange={(e) => setProfile((p) => ({ ...p, username: e.target.value }))}
            />
          </Field>
          <Field label="Email">
            <TextInput
              type="email"
              required
              value={profile.email}
              onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
            />
          </Field>
          <Field label="Phone">
            <TextInput
              pattern="[0-9+\-\s()]{7,20}"
              title="7–20 digits, may contain + - ( ) and spaces"
              value={profile.phone}
              onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
              placeholder="+20 100 000 0001"
            />
          </Field>
          <div className="flex items-center gap-3 sm:col-span-2">
            <Button type="submit">Save profile</Button>
            {savedProfile && (
              <span className="flex items-center gap-1.5 text-sm font-medium text-success">
                <Check size={15} /> Profile updated
              </span>
            )}
          </div>
          {profileError && (
            <p className="rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger sm:col-span-2">
              {profileError}
            </p>
          )}
        </form>
      </section>

      {/* Password */}
      <section className="rounded-card bg-surface p-6 shadow-card">
        <h3 className="text-sm font-semibold text-ink">Change password</h3>
        <PasswordForm
          onSaved={() => {
            setPwSaved(true)
            window.setTimeout(() => setPwSaved(false), 2500)
          }}
        />
        {pwSaved && (
          <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-success">
            <Check size={15} /> Password changed — other devices have been signed out.
          </p>
        )}
      </section>

      <SessionsCard />
      <LoginHistoryCard />
    </div>
  )
}

function PasswordForm({ onSaved }: { onSaved: () => void }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (next.length < 8) {
      setError('New password must be at least 8 characters.')
      return
    }
    if (next !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setError('')
    setBusy(true)
    try {
      await authStore.changePassword(current, next)
      setCurrent('')
      setNext('')
      setConfirm('')
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change the password')
    } finally {
      setBusy(false)
    }
  }

  const inputCls =
    'w-full rounded-lg border border-line bg-canvas px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:bg-surface'
  const fields = [
    ['Current password', current, setCurrent],
    ['New password', next, setNext],
    ['Confirm new password', confirm, setConfirm],
  ] as const

  return (
    <form onSubmit={(e) => void submit(e)} className="mt-4 grid gap-4 sm:grid-cols-3">
      {fields.map(([label, value, setValue], i) => (
        <label key={label} className="block">
          <span className="mb-1.5 block text-xs font-semibold text-muted">{label}</span>
          <input
            type="password"
            required
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className={inputCls}
          />
          {i === 2 && confirm && confirm === next && (
            <Check size={14} className="mt-1 text-success" />
          )}
        </label>
      ))}
      <div className="sm:col-span-3">
        {error && <p className="mb-3 rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger">{error}</p>}
        <Button type="submit" disabled={busy}>
          {busy && <Loader2 size={15} className="animate-spin" />}
          Update password
        </Button>
      </div>
    </form>
  )
}

/** Short, friendly device label from a session's user agent. */
function deviceLabel(ua: string | null): string {
  if (!ua) return 'Unknown device'
  if (/iphone|android|mobile/i.test(ua)) return 'Mobile browser'
  if (/curl|httpie|insomnia|postman/i.test(ua)) return 'API client'
  if (/node/i.test(ua)) return 'Node client'
  return 'Desktop browser'
}

function SessionIcon({ ua }: { ua: string | null }) {
  if (ua && /iphone|android|mobile/i.test(ua)) return <Smartphone size={15} />
  if (ua && /node|curl|httpie|insomnia|postman/i.test(ua)) return <Terminal />
  return <Monitor size={15} />
}

/** Active sessions with a "log out everywhere else" action. */
function SessionsCard() {
  const [sessions, setSessions] = useState<SessionRow[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [message, setMessage] = useState('')

  const load = async () => {
    try {
      setSessions(await listSessions())
    } catch {
      setSessions([])
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only
  }, [])

  const revoke = async () => {
    setBusy(true)
    setMessage('')
    try {
      await revokeAllOtherSessions()
      await load()
      setMessage('All other devices have been signed out.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not sign out other devices')
    } finally {
      setBusy(false)
      setConfirming(false)
    }
  }

  return (
    <section className="rounded-card bg-surface p-6 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-ink">Active devices</h3>
        <Button variant="danger" disabled={busy || (sessions?.length ?? 0) <= 1} onClick={() => setConfirming(true)}>
          <LogOut size={15} /> Log out other devices
        </Button>
      </div>
      {message && <p className="mt-3 text-sm font-medium text-success">{message}</p>}

      <ul className="mt-4 divide-y divide-line">
        {sessions?.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-3 py-3 text-sm">
            <div className="flex items-center gap-3">
              <span className="flex size-8 items-center justify-center rounded-lg bg-canvas text-muted">
                <SessionIcon ua={s.userAgent} />
              </span>
              <div>
                <p className="font-medium text-ink">
                  {s.current ? 'This device' : deviceLabel(s.userAgent)}{' '}
                  {s.current && <span className="rounded-md bg-success-bg px-1.5 py-0.5 text-[11px] font-medium text-success">active</span>}
                </p>
                <p className="text-xs text-muted">Signed in {formatDate(s.createdAt)}</p>
              </div>
            </div>
          </li>
        ))}
        {sessions?.length === 0 && <li className="py-3 text-sm text-muted">No active sessions.</li>}
        {sessions === null && (
          <li className="flex items-center gap-2 py-3 text-sm text-muted">
            <LoadingDots /> Loading sessions…
          </li>
        )}
      </ul>

      {confirming && (
        <ConfirmDialog
          title="Log out other devices"
          message="Every other signed-in device will be logged out. This device stays signed in."
          onConfirm={() => void revoke()}
          onCancel={() => setConfirming(false)}
        />
      )}
    </section>
  )
}

function LoginHistoryCard() {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listLoginHistory>> | null>(null)

  useEffect(() => {
    let cancelled = false
    listLoginHistory()
      .then((history) => {
        if (!cancelled) setRows(history)
      })
      .catch(() => setRows([]))
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="rounded-card bg-surface p-6 shadow-card">
      <h3 className="text-sm font-semibold text-ink">Login history</h3>
      <p className="mt-1 text-xs text-muted">Recent sign-ins for your account (this admin).</p>
      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs font-semibold text-muted">
            <th className="py-2">When</th>
            <th className="py-2">Device</th>
            <th className="py-2">IP</th>
          </tr>
        </thead>
        <tbody>
          {rows?.map((row) => (
            <tr key={row.id} className="border-b border-line/60">
              <td className="py-2.5 text-ink">{formatDate(row.createdAt)}</td>
              <td className="py-2.5 text-muted">{deviceLabel(row.userAgent)}</td>
              <td className="py-2.5 text-muted">{row.ip ?? '—'}</td>
            </tr>
          ))}
          {rows?.length === 0 && (
            <tr>
              <td colSpan={3} className="py-3 text-muted">No recorded logins yet.</td>
            </tr>
          )}
          {rows === null && (
            <tr>
              <td colSpan={3}>
                <span className="flex items-center gap-2 py-3 text-sm text-muted">
                  <LoadingDots /> Loading history…
                </span>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  )
}
