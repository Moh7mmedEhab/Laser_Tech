import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Search } from 'lucide-react'

const destinations = [
  { label: 'Statistics', to: '/' },
  { label: 'Products', to: '/products' },
  { label: 'Bills', to: '/bills' },
  { label: 'Users', to: '/users' },
  { label: 'Daily Notes', to: '/daily-notes' },
  { label: 'Settings', to: '/settings' },
]

export function SearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    if (open) setQuery('')
  }, [open])

  if (!open) return null

  const results = destinations.filter((d) =>
    d.label.toLowerCase().includes(query.trim().toLowerCase()),
  )

  const go = (to: string) => {
    onClose()
    navigate(to)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-ink/30 px-4 pt-24"
      onMouseDown={onClose}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-card border border-line bg-surface shadow-card"
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search size={18} className="text-muted" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && results[0]) go(results[0].to)
              if (e.key === 'Escape') onClose()
            }}
            placeholder="Search pages…"
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted"
          />
          <kbd className="rounded-md border border-line px-1.5 py-0.5 text-[11px] text-muted">
            Esc
          </kbd>
        </div>
        <ul className="max-h-72 overflow-y-auto p-2">
          {results.map((r) => (
            <li key={r.to}>
              <button
                onClick={() => go(r.to)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ink hover:bg-primary-light hover:text-primary"
              >
                {r.label}
              </button>
            </li>
          ))}
          {results.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-muted">
              No results for “{query}”
            </li>
          )}
        </ul>
      </div>
    </div>
  )
}
