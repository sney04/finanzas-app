import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
  updateDoc,
} from 'firebase/firestore'
import { db } from '@/firebase/config'
import { Account } from '@/types/account'

function normalizeDate(value: unknown): string {
  if (typeof value === 'string') return value
  if (value instanceof Timestamp) return value.toDate().toISOString()
  if (value instanceof Date) return value.toISOString()
  return new Date().toISOString()
}

function toAccount(id: string, data: Omit<Account, 'id'>): Account {
  return {
    id,
    userId: data.userId || '',
    nombre: data.nombre,
    tipo: data.tipo,
    saldo: Number(data.saldo) || 0,
    moneda: data.moneda || 'COP',
    descripcion: data.descripcion || '',
    createdAt: normalizeDate(data.createdAt),
    updatedAt: data.updatedAt ? normalizeDate(data.updatedAt) : undefined,
  }
}

export function subscribeToUserAccounts(
  uid: string,
  onData: (accounts: Account[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const accountsRef = collection(db, 'users', uid, 'accounts')
  const q = query(accountsRef, orderBy('nombre', 'asc'))

  return onSnapshot(
    q,
    (snapshot) =>
      onData(
        snapshot.docs.map((docSnap) =>
          toAccount(docSnap.id, docSnap.data() as Omit<Account, 'id'>),
        ),
      ),
    onError,
  )
}

export async function getUserAccounts(uid: string): Promise<Account[]> {
  const accountsRef = collection(db, 'users', uid, 'accounts')
  const q = query(accountsRef, orderBy('nombre', 'asc'))
  const snapshot = await getDocs(q)

  return snapshot.docs.map((docSnap) =>
    toAccount(docSnap.id, docSnap.data() as Omit<Account, 'id'>),
  )
}

export async function addUserAccount(
  uid: string,
  account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const accountsRef = collection(db, 'users', uid, 'accounts')
  const docRef = await addDoc(accountsRef, {
    ...account,
    userId: uid,
    createdAt: serverTimestamp(),
  })
  return docRef.id
}

export async function updateUserAccount(
  uid: string,
  accountId: string,
  account: Partial<Omit<Account, 'id' | 'userId' | 'createdAt'>>,
): Promise<void> {
  const accountRef = doc(db, 'users', uid, 'accounts', accountId)
  await updateDoc(accountRef, {
    ...account,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteUserAccount(
  uid: string,
  accountId: string,
): Promise<void> {
  const accountRef = doc(db, 'users', uid, 'accounts', accountId)
  await deleteDoc(accountRef)
}
