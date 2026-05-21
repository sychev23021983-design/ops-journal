import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import IncidentsPage from './pages/IncidentsPage'
import ReportPage from './pages/ReportPage'
import SettingsPage from './pages/SettingsPage'
import { getToken } from './api/client'

function RequireAuth({ children }) {
  const token = getToken()
  if (!token) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"  element={<DashboardPage />} />
          <Route path="incidents"  element={<IncidentsPage />} />
          <Route path="report"     element={<ReportPage />} />
          <Route path="settings"   element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
