import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoadingLabel } from '@/components/ui/Loading'
import { authStore, useAuth } from '@/api/auth'
import { LoginPage } from '@/pages/LoginPage'

// Recharts is heavy — the statistics page is code-split out of the main bundle.
const StatsPage = lazy(() => import('@/pages/StatsPage').then((m) => ({ default: m.StatsPage })))
const ProductsPage = lazy(() =>
  import('@/pages/products/ProductsPage').then((m) => ({ default: m.ProductsPage })),
)
const BillsPage = lazy(() =>
  import('@/pages/bills/BillsPage').then((m) => ({ default: m.BillsPage })),
)
const UsersPage = lazy(() =>
  import('@/pages/users/UsersPage').then((m) => ({ default: m.UsersPage })),
)
const NotesPage = lazy(() =>
  import('@/pages/notes/NotesPage').then((m) => ({ default: m.NotesPage })),
)
const SettingsPage = lazy(() =>
  import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
)
const BillPrintPage = lazy(() =>
  import('@/pages/bills/BillPrintPage').then((m) => ({ default: m.BillPrintPage })),
)

/** Redirects signed-out visitors to /login, and signed-in ones away from it. */
function Guard({ children }: { children: React.ReactNode }) {
  const { user, settled } = useAuth()
  const location = useLocation()
  const onLogin = location.pathname === '/login'

  // Bootstrap the session exactly once, on the first render.
  useEffect(() => {
    void authStore.init()
  }, [])

  if (!settled) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <LoadingLabel label="Checking session" />
      </div>
    )
  }
  if (!user && !onLogin) return <Navigate to="/login" replace />
  if (user && onLogin) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Guard>
      <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center"><LoadingLabel /></div>}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          {/* Standalone print view — no app chrome, opens its own tab. */}
          <Route path="/bills/:id/print" element={<BillPrintPage />} />
          <Route element={<AppLayout />}>
            <Route path="/" element={<StatsPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/bills" element={<BillsPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/notes" element={<NotesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Guard>
  )
}
