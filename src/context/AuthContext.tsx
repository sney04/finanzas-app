import { createContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/firebase/config'
import {
  deleteAuthUser,
  loginUser,
  loginWithGoogleUser,
  linkGoogleToCurrentUser,
  logoutUser,
  registerUser,
  resetUserPassword,
} from '@/services/authService'
import {
  normalizeAuthProfileName,
  normalizeAuthProfilePhotoUrl,
  provisionUserProfile,
  updateUserProfile,
} from '@/services/userProfileService'
import type { AppUser, AuthContextType } from '@/types/auth'
import { DEFAULT_CURRENCY, DEFAULT_SAVINGS_GOAL } from '@/types/userProfile'

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

function buildFallbackUser(firebaseUser: NonNullable<typeof auth.currentUser>): AppUser {
  return {
    uid: firebaseUser.uid,
    providerData: firebaseUser.providerData,
    email: firebaseUser.email,
    nombre: normalizeAuthProfileName(firebaseUser.displayName, firebaseUser.email),
    apellido: null,
    telefono: firebaseUser.phoneNumber,
    fotoUrl: normalizeAuthProfilePhotoUrl(firebaseUser.photoURL),
    moneda: DEFAULT_CURRENCY,
    metaAhorroMensual: DEFAULT_SAVINGS_GOAL,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)
  const authGeneration = useRef(0)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      const generation = ++authGeneration.current

      if (firebaseUser) {
        try {
          const profile = await provisionUserProfile(firebaseUser)
          if (generation !== authGeneration.current) return
          setUser({ ...profile, uid: firebaseUser.uid, email: firebaseUser.email, providerData: firebaseUser.providerData })
        } catch (error) {
          console.error('No se pudo cargar o crear el perfil del usuario:', error)
          if (generation !== authGeneration.current) return
          setUser(buildFallbackUser(firebaseUser))
        }
      } else {
        setUser(null)
      }

      if (generation === authGeneration.current) {
        setLoading(false)
      }
    })

    return () => {
      authGeneration.current += 1
      unsubscribe()
    }
  }, [])

  async function login(email: string, password: string) {
    await loginUser(email, password)
    // onAuthStateChanged updates the authenticated user and profile.
  }

  async function loginWithGoogle() {
    await loginWithGoogleUser()
    // onAuthStateChanged provisions the profile and updates the authenticated user.
  }

  async function linkGoogle() {
    const linkedUser = await linkGoogleToCurrentUser()
    authGeneration.current += 1
    setUser((prev) => prev && prev.uid === linkedUser.uid
      ? { ...prev, providerData: linkedUser.providerData }
      : prev)
  }

  async function register(nombre: string, email: string, password: string) {
    const usuario = await registerUser(nombre, email, password)

    try {
      const profile = await provisionUserProfile(usuario, nombre)

      authGeneration.current += 1
      setUser({ ...profile, nombre: nombre.trim(), uid: usuario.uid, email: usuario.email, providerData: usuario.providerData })
    } catch (error) {
      try {
        await deleteAuthUser(usuario)
      } catch {
        // Preserve the original error if the account could not be rolled back.
      }

      throw error
    }
  }

  async function logout() {
    await logoutUser()
  }

  async function resetPassword(email: string) {
    await resetUserPassword(email)
  }

  async function updateNombre(nombre: string) {
    if (!user?.uid) throw new Error('No hay sesión activa.')

    const nombreTrimmed = nombre.trim()
    if (!nombreTrimmed || nombreTrimmed.length < 2 || nombreTrimmed.length > 100) {
      throw new Error('El nombre debe tener entre 2 y 100 caracteres.')
    }

    await updateUserProfile(user.uid, { nombre: nombreTrimmed })

    authGeneration.current += 1
    setUser((prev) => prev ? { ...prev, nombre: nombreTrimmed } : prev)
  }

  const value: AuthContextType = {
    user,
    loading,
    login,
    loginWithGoogle,
    linkGoogle,
    register,
    logout,
    resetPassword,
    updateNombre,
  }

  // Protected routes handle their own loading state while Firebase restores the session.
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

