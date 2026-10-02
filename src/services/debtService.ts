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
import { Debt } from '@/types/debt'

function normalizeDate(value: unknown): string {
  if (typeof value === 'string') return value
  if (value instanceof Timestamp) return value.toDate().toISOString()
  if (value instanceof Date) return value.toISOString()
  return new Date().toISOString()
}

function toDebt(id: string, data: Omit<Debt, 'id'>): Debt {
  return {
    id,
    userId: data.userId || '',
    nombre: data.nombre,
    acreedor: data.acreedor,
    montoOriginal: Number(data.montoOriginal) || 0,
    saldoPendiente: Number(data.saldoPendiente) || 0,
    fechaVencimiento: data.fechaVencimiento,
    estado: data.estado || 'active',
    descripcion: data.descripcion || '',
    createdAt: normalizeDate(data.createdAt),
    updatedAt: data.updatedAt ? normalizeDate(data.updatedAt) : undefined,
  }
}

export function subscribeToUserDebts(
  uid: string,
  onData: (debts: Debt[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const debtsRef = collection(db, 'users', uid, 'debts')
  const q = query(debtsRef, orderBy('createdAt', 'desc'))

  return onSnapshot(
    q,
    (snapshot) =>
      onData(
        snapshot.docs.map((docSnap) =>
          toDebt(docSnap.id, docSnap.data() as Omit<Debt, 'id'>),
        ),
      ),
    onError,
  )
}

export async function getUserDebts(uid: string): Promise<Debt[]> {
  const debtsRef = collection(db, 'users', uid, 'debts')
  const q = query(debtsRef, orderBy('createdAt', 'desc'))
  const snapshot = await getDocs(q)

  return snapshot.docs.map((docSnap) =>
    toDebt(docSnap.id, docSnap.data() as Omit<Debt, 'id'>),
  )
}

export async function addUserDebt(
  uid: string,
  debt: Omit<Debt, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const debtsRef = collection(db, 'users', uid, 'debts')
  const docRef = await addDoc(debtsRef, {
    ...debt,
    userId: uid,
    createdAt: serverTimestamp(),
  })
  return docRef.id
}

export async function updateUserDebt(
  uid: string,
  debtId: string,
  debt: Partial<Omit<Debt, 'id' | 'userId' | 'createdAt'>>,
): Promise<void> {
  const debtRef = doc(db, 'users', uid, 'debts', debtId)
  await updateDoc(debtRef, {
    ...debt,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteUserDebt(
  uid: string,
  debtId: string,
): Promise<void> {
  const debtRef = doc(db, 'users', uid, 'debts', debtId)
  await deleteDoc(debtRef)
}
