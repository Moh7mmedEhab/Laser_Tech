import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProductsPage } from '@/pages/ProductsPage'
import { BillsPage } from '@/pages/BillsPage'
import { UsersPage } from '@/pages/UsersPage'
import { NotesPage } from '@/pages/NotesPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { LoginPage } from '@/pages/LoginPage'

// Recharts is heavy — the statistics page is code-split out of the main bundle.
const StatsPage = lazy(() => import('@/pages/StatsPage').then((m) => ({ default: m.StatsPage })))

export default function App() {
  return (
    <Suspense fallback={<div className="p-10 text-sm text-muted">Loading…</div>}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<StatsPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/bills" element={<BillsPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/daily-notes" element={<NotesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
