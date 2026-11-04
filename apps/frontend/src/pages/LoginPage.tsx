import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Check } from 'lucide-react'
import logo from '@/assets/logo.svg'

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || password.length < 6) {
      setError('Enter a valid email and a password of at least 6 characters.')
      return
    }
    // Frontend-only: navigation stands in for authentication until the API exists.
    navigate('/')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-4">
      <div className="w-full max-w-sm rounded-card bg-surface p-8 shadow-card">
        <div className="flex flex-col items-center text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary-light p-2">
            <img src={logo} alt="Laser Tech" className="size-full" />
          </div>
          <h1 className="mt-4 text-xl font-semibold text-ink">Laser Tech</h1>
          <p className="mt-1 text-sm text-muted">Sign in to your workspace</p>
        </div>

        <form onSubmit={submit} className="mt-7 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-muted">Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@lasertech.com"
              className="w-full rounded-lg border border-line bg-canvas px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted focus:border-primary focus:bg-surface"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-muted">Password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-line bg-canvas px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted focus:border-primary focus:bg-surface"
            />
          </label>

          {error && (
            <p className="rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger">{error}</p>
          )}

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
          >
            Sign in
          </button>
        </form>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted">
          <Check size={13} className="text-success" />
          Demo build — any email and 6+ character password works.
        </p>
      </div>
    </div>
  )
}
