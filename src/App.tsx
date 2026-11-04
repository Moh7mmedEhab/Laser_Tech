import { Navigate, Route, Routes } from 'react-router'
import { AppLayout } from '@/components/layout/AppLayout'
import { StatsPage } from '@/pages/StatsPage'
import { ProductsPage } from '@/pages/ProductsPage'
import { BillsPage } from '@/pages/BillsPage'
import { UsersPage } from '@/pages/UsersPage'
import { NotesPage } from '@/pages/NotesPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { LoginPage } from '@/pages/LoginPage'

export default function App() {
  return (
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
  )
}
