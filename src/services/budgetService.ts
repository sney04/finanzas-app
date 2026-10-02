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
import { Budget } from '@/types/budget'

function normalizeDate(value: unknown): string {
  if (typeof value === 'string') return value
  if (value instanceof Timestamp) return value.toDate().toISOString()
  if (value instanceof Date) return value.toISOString()
  return new Date().toISOString()
}

function toBudget(id: string, data: Omit<Budget, 'id'>): Budget {
  return {
    id,
    userId: data.userId || '',
    categoria: data.categoria,
    montoPresupuesto: Number(data.montoPresupuesto) || 0,
    periodo: data.periodo || 'monthly',
    createdAt: normalizeDate(data.createdAt),
    updatedAt: data.updatedAt ? normalizeDate(data.updatedAt) : undefined,
  }
}

export function subscribeToUserBudgets(
  uid: string,
  onData: (budgets: Budget[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const budgetsRef = collection(db, 'users', uid, 'budgets')
  const q = query(budgetsRef, orderBy('categoria', 'asc'))

  return onSnapshot(
    q,
    (snapshot) =>
      onData(
        snapshot.docs.map((docSnap) =>
          toBudget(docSnap.id, docSnap.data() as Omit<Budget, 'id'>),
        ),
      ),
    onError,
  )
}

export async function getUserBudgets(uid: string): Promise<Budget[]> {
  const budgetsRef = collection(db, 'users', uid, 'budgets')
  const q = query(budgetsRef, orderBy('categoria', 'asc'))
  const snapshot = await getDocs(q)

  return snapshot.docs.map((docSnap) =>
    toBudget(docSnap.id, docSnap.data() as Omit<Budget, 'id'>),
  )
}

export async function addUserBudget(
  uid: string,
  budget: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const budgetsRef = collection(db, 'users', uid, 'budgets')
  const docRef = await addDoc(budgetsRef, {
    ...budget,
    userId: uid,
    createdAt: serverTimestamp(),
  })
  return docRef.id
}

export async function updateUserBudget(
  uid: string,
  budgetId: string,
  budget: Partial<Omit<Budget, 'id' | 'userId' | 'createdAt'>>,
): Promise<void> {
  const budgetRef = doc(db, 'users', uid, 'budgets', budgetId)
  await updateDoc(budgetRef, {
    ...budget,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteUserBudget(
  uid: string,
  budgetId: string,
): Promise<void> {
  const budgetRef = doc(db, 'users', uid, 'budgets', budgetId)
  await deleteDoc(budgetRef)
}
