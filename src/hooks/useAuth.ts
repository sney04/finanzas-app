import { useContext } from 'react'
import { AuthContext } from '@/context/AuthContext'
import { AuthContextType } from '@/types/auth'

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)

  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de un <AuthProvider>')
  }

  return context
}
