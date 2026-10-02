import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { ReactNode } from 'react'

export function PublicRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface-light text-brand-700 dark:bg-surface-dark dark:text-white">
        Cargando…
      </main>
    )
  }

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
