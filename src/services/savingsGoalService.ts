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
import { SavingsGoal } from '@/types/savingsGoal'

function normalizeDate(value: unknown): string {
  if (typeof value === 'string') return value
  if (value instanceof Timestamp) return value.toDate().toISOString()
  if (value instanceof Date) return value.toISOString()
  return new Date().toISOString()
}

function toSavingsGoal(id: string, data: Omit<SavingsGoal, 'id'>): SavingsGoal {
  return {
    id,
    userId: data.userId || '',
    nombre: data.nombre,
    objetivo: Number(data.objetivo) || 0,
    montoActual: Number(data.montoActual) || 0,
    fechaObjetivo: data.fechaObjetivo,
    estado: data.estado || 'active',
    descripcion: data.descripcion || '',
    createdAt: normalizeDate(data.createdAt),
    updatedAt: data.updatedAt ? normalizeDate(data.updatedAt) : undefined,
  }
}

export function subscribeToUserSavingsGoals(
  uid: string,
  onData: (goals: SavingsGoal[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const goalsRef = collection(db, 'users', uid, 'savingsGoals')
  const q = query(goalsRef, orderBy('createdAt', 'desc'))

  return onSnapshot(
    q,
    (snapshot) =>
      onData(
        snapshot.docs.map((docSnap) =>
          toSavingsGoal(docSnap.id, docSnap.data() as Omit<SavingsGoal, 'id'>),
        ),
      ),
    onError,
  )
}

export async function getUserSavingsGoals(uid: string): Promise<SavingsGoal[]> {
  const goalsRef = collection(db, 'users', uid, 'savingsGoals')
  const q = query(goalsRef, orderBy('createdAt', 'desc'))
  const snapshot = await getDocs(q)

  return snapshot.docs.map((docSnap) =>
    toSavingsGoal(docSnap.id, docSnap.data() as Omit<SavingsGoal, 'id'>),
  )
}

export async function addUserSavingsGoal(
  uid: string,
  goal: Omit<SavingsGoal, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const goalsRef = collection(db, 'users', uid, 'savingsGoals')
  const docRef = await addDoc(goalsRef, {
    ...goal,
    userId: uid,
    createdAt: serverTimestamp(),
  })
  return docRef.id
}

export async function updateUserSavingsGoal(
  uid: string,
  goalId: string,
  goal: Partial<Omit<SavingsGoal, 'id' | 'userId' | 'createdAt'>>,
): Promise<void> {
  const goalRef = doc(db, 'users', uid, 'savingsGoals', goalId)
  await updateDoc(goalRef, {
    ...goal,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteUserSavingsGoal(
  uid: string,
  goalId: string,
): Promise<void> {
  const goalRef = doc(db, 'users', uid, 'savingsGoals', goalId)
  await deleteDoc(goalRef)
}
