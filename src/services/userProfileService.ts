import type { User } from 'firebase/auth'
import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from 'firebase/firestore'
import { db } from '@/firebase/config'
import {
  DEFAULT_CURRENCY,
  DEFAULT_SAVINGS_GOAL,
  SUPPORTED_CURRENCIES,
  type CurrencyCode,
  type UserProfile,
} from '@/types/userProfile'

function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === 'string'
    && (SUPPORTED_CURRENCIES as readonly string[]).includes(value)
}

type AuthProfileFallback = Pick<User, 'email' | 'displayName' | 'phoneNumber' | 'photoURL'>

export type UserProfileUpdate = Partial<Pick<
  UserProfile,
  'nombre' | 'apellido' | 'moneda' | 'metaAhorroMensual'
>>

function fallbackName(user?: AuthProfileFallback): string {
  return normalizeAuthProfileName(user?.displayName ?? null, user?.email ?? null)
}

function boundedName(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null

  // Count Unicode code points so truncation never splits a surrogate pair.
  return Array.from(trimmed).slice(0, 100).join('').trim() || null
}

function normalizePhotoUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const candidate = value.trim()
  if (!candidate || candidate.length > 2048) return null

  try {
    const url = new URL(candidate)
    if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) {
      return null
    }

    const normalized = url.href
    return normalized.length <= 2048 ? normalized : null
  } catch {
    return null
  }
}

export function normalizeAuthProfileName(
  displayName: string | null,
  // email is accepted for interface compatibility but is intentionally NOT used
  // as a display-name source. Using an address as a visible name is avoided.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _email: string | null,
): string {
  const validDisplayName = boundedName(displayName)
  if (validDisplayName) return validDisplayName

  return 'Usuario'
}

export function normalizeAuthProfilePhotoUrl(photoURL: string | null): string | null {
  return normalizePhotoUrl(photoURL)
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

function normalizeUserProfile(
  data: Record<string, unknown>,
  authUser?: AuthProfileFallback,
): UserProfile {
  return {
    nombre: boundedName(nullableString(data.nombre)) ?? fallbackName(authUser),
    apellido: nullableString(data.apellido),
    email: data.email === undefined
      ? nullableString(authUser?.email)
      : nullableString(data.email),
    telefono: data.telefono === undefined
      ? nullableString(authUser?.phoneNumber)
      : nullableString(data.telefono),
    fotoUrl: data.fotoUrl === undefined
      ? normalizePhotoUrl(authUser?.photoURL)
      : normalizePhotoUrl(data.fotoUrl),
    moneda: isCurrencyCode(data.moneda) ? data.moneda : DEFAULT_CURRENCY,
    metaAhorroMensual:
      typeof data.metaAhorroMensual === 'number'
      && Number.isFinite(data.metaAhorroMensual)
      && data.metaAhorroMensual >= 0
        ? data.metaAhorroMensual
        : DEFAULT_SAVINGS_GOAL,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt : null,
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt : null,
  }
}

function initialProfileData(user: User, name?: string) {
  return {
    nombre: boundedName(name) ?? fallbackName(user),
    apellido: null,
    email: user.email,
    telefono: user.phoneNumber,
    fotoUrl: normalizePhotoUrl(user.photoURL),
    moneda: DEFAULT_CURRENCY,
    metaAhorroMensual: DEFAULT_SAVINGS_GOAL,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
}

/** Creates a profile only when it is missing; existing preferences are preserved. */
export async function provisionUserProfile(user: User, initialName?: string): Promise<UserProfile> {
  const profileRef = doc(db, 'users', user.uid)

  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(profileRef)
    if (snapshot.exists()) {
      const currentProfile = normalizeUserProfile(snapshot.data(), user)
      const requestedName = initialName?.trim()
      if (requestedName && requestedName !== currentProfile.nombre) {
        transaction.update(profileRef, {
          nombre: requestedName,
          updatedAt: serverTimestamp(),
        })
        return { ...currentProfile, nombre: requestedName }
      }
      return currentProfile
    }

    const newProfile = initialProfileData(user, initialName)
    transaction.set(profileRef, newProfile)
    return normalizeUserProfile(newProfile, user)
  })
}

export async function getUserProfile(
  uid: string,
  authUser?: AuthProfileFallback,
): Promise<UserProfile | null> {
  const profileSnapshot = await getDoc(doc(db, 'users', uid))

  if (!profileSnapshot.exists()) {
    return null
  }

  return normalizeUserProfile(profileSnapshot.data(), authUser)
}

export async function updateUserProfile(
  uid: string,
  profile: UserProfileUpdate,
): Promise<void> {
  if (profile.moneda !== undefined && !isCurrencyCode(profile.moneda)) {
    throw new Error('La moneda no está permitida.')
  }
  if (profile.metaAhorroMensual !== undefined
    && (!Number.isFinite(profile.metaAhorroMensual)
      || profile.metaAhorroMensual < 0
      || profile.metaAhorroMensual > 1_000_000_000)) {
    throw new Error('La meta de ahorro no es válida.')
  }
  if (profile.nombre !== undefined
    && (profile.nombre.trim().length < 2 || profile.nombre.trim().length > 100)) {
    throw new Error('El nombre debe tener entre 2 y 100 caracteres.')
  }
  if (profile.apellido !== undefined
    && profile.apellido !== null
    && profile.apellido.length > 100) {
    throw new Error('El apellido no puede superar 100 caracteres.')
  }

  await updateDoc(doc(db, 'users', uid), {
    ...profile,
    ...(profile.nombre !== undefined ? { nombre: profile.nombre.trim() } : {}),
    ...(profile.apellido !== undefined ? { apellido: profile.apellido?.trim() || null } : {}),
    updatedAt: serverTimestamp(),
  })
}
