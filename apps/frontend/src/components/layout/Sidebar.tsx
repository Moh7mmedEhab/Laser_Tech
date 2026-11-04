import { NavLink } from 'react-router'
import {
  BarChart2,
  Box,
  Calendar,
  FileText,
  Users,
} from 'lucide-react'
import logo from '@/assets/logo.svg'

const items = [
  { label: 'Statistics', to: '/', icon: BarChart2 },
  { label: 'Products', to: '/products', icon: Box },
  { label: 'Bills', to: '/bills', icon: FileText },
  { label: 'Users', to: '/users', icon: Users },
  { label: 'Daily Notes', to: '/daily-notes', icon: Calendar },
] as const

export function Sidebar() {
  return (
    <aside className="sticky top-0 flex h-screen w-[260px] shrink-0 flex-col border-r border-line bg-surface">
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="flex size-10 items-center justify-center rounded-[10px] bg-primary-light p-1.5">
          <img src={logo} alt="Laser Tech" className="size-full" />
        </div>
        <div className="leading-tight">
          <p className="text-[15px] font-semibold text-ink">Laser Tech</p>
          <p className="text-xs font-medium text-muted">Admin Dashboard</p>
        </div>
      </div>

      <nav className="flex-1 px-4">
        <p className="px-2 pb-2 text-[11px] font-semibold tracking-wider text-muted">
          MAIN MENU
        </p>
        <ul className="space-y-1">
          {items.map(({ label, to, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-light text-primary'
                      : 'text-muted hover:bg-canvas hover:text-ink'
                  }`
                }
              >
                <Icon size={18} strokeWidth={2} />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4">
        <div className="rounded-card bg-primary-light p-4">
          <p className="text-sm font-semibold text-ink">Need help?</p>
          <p className="mt-1 text-xs leading-5 text-muted">
            Check the docs or contact support for anything about the dashboard.
          </p>
        </div>
      </div>
    </aside>
  )
}
