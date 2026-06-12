import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuthStore()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900" />
      </div>
    )
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}

export function GuestRoute() {
  const { isAuthenticated, isLoading } = useAuthStore()

  if (isLoading) return null

  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Outlet />
}

/**
 * Protects routes that require rol='Admin'.
 * Redirects unauthenticated users to /login and non-Admin users to /dashboard.
 */
export function AdminRoute() {
  const { isAuthenticated, isLoading, user } = useAuthStore()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900" />
      </div>
    )
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (user?.rol !== 'Admin') return <Navigate to="/dashboard" replace />

  return <Outlet />
}
