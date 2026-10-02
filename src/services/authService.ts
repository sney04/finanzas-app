import {
  createUserWithEmailAndPassword,
  deleteUser,
  linkWithPopup,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile,
} from 'firebase/auth'
import type { User } from 'firebase/auth'

import { auth } from '@/firebase/config'

export async function registerUser(
  nombre: string,
  email: string,
  password: string
): Promise<User> {
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  )

  try {
    await updateProfile(userCredential.user, { displayName: nombre })
  } catch (error) {
    try {
      await deleteAuthUser(userCredential.user)
    } catch {
      // Conserva el error original aunque la compensación no sea posible.
    }

    throw error
  }

  return userCredential.user
}

export async function loginUser(
  email: string,
  password: string
): Promise<User> {
  const userCredential = await signInWithEmailAndPassword(
    auth,
    email,
    password
  )

  return userCredential.user
}

export async function logoutUser(): Promise<void> {
  await signOut(auth)
}

export async function resetUserPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email)
}

export async function deleteAuthUser(user: User): Promise<void> {
  await deleteUser(user)
}

export async function loginWithGoogleUser(): Promise<User> {
  const userCredential = await signInWithPopup(auth, new GoogleAuthProvider())
  return userCredential.user
}

export async function linkGoogleToCurrentUser(): Promise<User> {
  const currentUser = auth.currentUser
  if (!currentUser) throw new Error('auth/no-current-user')

  const userCredential = await linkWithPopup(currentUser, new GoogleAuthProvider())
  return userCredential.user
}

