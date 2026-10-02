import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { ReactNode } from 'react'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface-light text-brand-700 dark:bg-surface-dark dark:text-white">
        Cargando tu información…
      </main>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
