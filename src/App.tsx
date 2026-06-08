import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { ProtectedRoute, GuestRoute } from '@/router/index'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { EvaluacionPage } from '@/pages/evaluacion/EvaluacionPage'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/api/auth'
import { ToastProvider } from '@/lib/toast'

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading } = useAuthStore()

  useEffect(() => {
    const token = sessionStorage.getItem('access_token')
    if (!token) {
      setLoading(false)
      return
    }
    authApi.me()
      .then(setUser)
      .catch(() => {
        authApi.refresh()
          .then(() => authApi.me())
          .then(setUser)
          .catch(() => setUser(null))
      })
  }, [setUser, setLoading])

  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
      <AuthInitializer>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          <Route element={<GuestRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/evaluacion/:id" element={<EvaluacionPage />} />
          </Route>
        </Routes>
      </AuthInitializer>
      </ToastProvider>
    </BrowserRouter>
  )
}
