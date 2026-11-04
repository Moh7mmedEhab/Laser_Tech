import { useRef, useState } from 'react'
import { Check, Camera } from 'lucide-react'
import { Button, Field, TextInput } from '@/components/ui/Form'

const initialProfile = { name: 'Devon Lane', email: 'devon@lasertech.com' }

export function SettingsPage() {
  const [profile, setProfile] = useState(initialProfile)
  const [savedProfile, setSavedProfile] = useState(false)
  const [avatar, setAvatar] = useState('')
  const [pwSaved, setPwSaved] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const uploadAvatar = (file: File | undefined) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setAvatar(String(reader.result))
    reader.readAsDataURL(file)
  }

  const initials = profile.name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

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
            <p className="font-semibold text-ink">{profile.name || 'Unnamed'}</p>
            <p className="text-sm text-muted">Admin</p>
          </div>
        </div>

        <form
          className="mt-5 grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault()
            setSavedProfile(true)
            setTimeout(() => setSavedProfile(false), 2500)
          }}
        >
          <Field label="Full name">
            <TextInput
              required
              value={profile.name}
              onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
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
          <div className="flex items-center gap-3 sm:col-span-2">
            <Button type="submit">Save profile</Button>
            {savedProfile && (
              <span className="flex items-center gap-1.5 text-sm font-medium text-success">
                <Check size={15} /> Profile updated
              </span>
            )}
          </div>
        </form>
      </section>

      {/* Password */}
      <section className="rounded-card bg-surface p-6 shadow-card">
        <h3 className="text-sm font-semibold text-ink">Change password</h3>
        <PasswordForm onSaved={() => {
          setPwSaved(true)
          setTimeout(() => setPwSaved(false), 2500)
        }} />
        {pwSaved && (
          <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-success">
            <Check size={15} /> Password changed
          </p>
        )}
      </section>
    </div>
  )
}

function PasswordForm({ onSaved }: { onSaved: () => void }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')

  const submit = (e: React.FormEvent) => {
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
    setCurrent('')
    setNext('')
    setConfirm('')
    onSaved()
  }

  const inputCls =
    'w-full rounded-lg border border-line bg-canvas px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:bg-surface'
  const fields = [
    ['Current password', current, setCurrent],
    ['New password', next, setNext],
    ['Confirm new password', confirm, setConfirm],
  ] as const

  return (
    <form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-3">
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
        <Button type="submit">Update password</Button>
      </div>
    </form>
  )
}
