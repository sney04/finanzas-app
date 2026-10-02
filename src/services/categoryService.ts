import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { CustomCategory } from '@/types/category'

export async function getUserCategories(uid: string): Promise<CustomCategory[]> {
  const categoriesRef = collection(db, 'users', uid, 'categories')
  const categoriesQuery = query(categoriesRef, orderBy('name', 'asc'))
  const snapshot = await getDocs(categoriesQuery)

  return snapshot.docs.map((categoryDoc) => ({
    id: categoryDoc.id,
    name: categoryDoc.data().name as string,
  }))
}

export async function addUserCategory(uid: string, name: string): Promise<CustomCategory> {
  const categoryReference = await addDoc(collection(db, 'users', uid, 'categories'), { name })

  return {
    id: categoryReference.id,
    name,
  }
}

export async function deleteUserCategory(uid: string, categoryId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'categories', categoryId))
}
