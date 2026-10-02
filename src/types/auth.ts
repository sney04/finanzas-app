import type { UserProfile } from '@/types/userProfile'
import type { UserInfo } from 'firebase/auth'

export interface AppUser extends Omit<UserProfile, 'createdAt' | 'updatedAt'> {
  uid: string
  providerData: UserInfo[]
}

export interface LoginFormData {
  email: string
  password: string
}

export interface RegisterFormData {
  nombre: string
  email: string
  password: string
  confirmPassword: string
}

export interface AuthContextType {
  user: AppUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  loginWithGoogle: () => Promise<void>
  linkGoogle: () => Promise<void>
  register: (nombre: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  /** Actualiza el nombre visible en Firestore y en el estado local. */
  updateNombre: (nombre: string) => Promise<void>
}

