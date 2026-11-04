import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Bell, ChevronDown, LogOut, Search, Settings, User } from 'lucide-react'
import { SearchModal } from './SearchModal'
import { authStore, useAuth } from '@/api/auth'
import { roleLabel } from '@/data/types'

export function Topbar() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()
  const { user } = useAuth()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const logout = async () => {
    await authStore.logout()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-20 flex h-20 items-center gap-4 border-b border-line bg-surface px-6">
      <h1 className="text-lg font-semibold text-ink">
        Laser Tech <span className="text-muted font-normal">— Workspace</span>
      </h1>

      <button
        onClick={() => setSearchOpen(true)}
        className="ml-4 flex h-10 w-72 items-center gap-2 rounded-lg border border-line bg-canvas px-3 text-sm text-muted transition-colors hover:border-primary hover:bg-surface"
      >
        <Search size={16} />
        Search
        <kbd className="ml-auto rounded-md border border-line bg-surface px-1.5 py-0.5 text-[11px] font-medium">
          Ctrl+K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-2">
        <Link
          to="/settings"
          title="Settings"
          className="flex size-10 items-center justify-center rounded-lg text-muted transition-colors hover:bg-canvas hover:text-ink"
        >
          <Settings size={19} />
        </Link>

        <button
          title="Notifications"
          className="relative flex size-10 items-center justify-center rounded-lg text-muted transition-colors hover:bg-canvas hover:text-ink"
        >
          <Bell size={19} />
          <span className="absolute right-2 top-2 size-2 rounded-full bg-danger ring-2 ring-surface" />
        </button>

        <div className="relative ml-2">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            onBlur={() => setMenuOpen(false)}
            data-testid="profile-menu"
            className="flex items-center gap-3 rounded-lg py-1.5 pl-1.5 pr-3 transition-colors hover:bg-canvas"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
              {user?.username.slice(0, 2).toUpperCase() ?? '—'}
            </span>
            <span className="text-left leading-tight">
              <span className="block text-sm font-semibold text-ink">{user?.username}</span>
              <span className="block text-xs text-muted">{user ? roleLabel(user.role) : ''}</span>
            </span>
            <ChevronDown size={16} className="text-muted" />
          </button>

          {menuOpen && (
            <div
              onMouseDown={(e) => e.preventDefault()}
              className="absolute right-0 top-[calc(100%+8px)] w-48 rounded-card border border-line bg-surface p-1.5 shadow-card"
            >
              <Link
                to="/settings"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink hover:bg-canvas"
              >
                <User size={16} className="text-muted" /> My Profile
              </Link>
              <button
                onClick={logout}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-danger hover:bg-danger-bg"
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>

      {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}
    </header>
  )
}
