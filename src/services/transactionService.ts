import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  DocumentSnapshot,
  Unsubscribe,
  updateDoc,
} from 'firebase/firestore'
import { db } from '@/firebase/config'
import { Transaction } from '@/types/transaction'
import { isValidDateString, toLocalDateString } from '@/utils/date'

function normalizeDate(value: unknown): string {
  if (typeof value === 'string' && isValidDateString(value)) return value
  if (value instanceof Timestamp) return toLocalDateString(value.toDate())
  if (value instanceof Date) return toLocalDateString(value)
  return toLocalDateString()
}

function toTransaction(id: string, data: Omit<Transaction, 'id'>): Transaction {
  return {
    id,
    type: data.type,
    amount: Number(data.amount) || 0,
    category: data.category,
    accountId: data.accountId || '',
    destinationAccountId: data.destinationAccountId || '',
    description: data.description || '',
    date: normalizeDate(data.date),
    userId: data.userId || '',
    createdAt: data.createdAt,
  }
}

function normalizeTransactionData(
  transaction: Omit<Transaction, 'id'>,
  uid: string,
) {
  const normalized: Partial<Omit<Transaction, 'id'>> = {
    type: transaction.type,
    amount: transaction.amount,
    category: transaction.category,
    accountId: transaction.accountId || '',
    description: transaction.description || '',
    date: transaction.date,
    userId: uid,
  }

  if (transaction.type === 'transfer') {
    if (!transaction.destinationAccountId) {
      throw new Error('Una transferencia requiere una cuenta de destino.')
    }
    normalized.destinationAccountId = transaction.destinationAccountId
  }

  if (transaction.createdAt !== undefined) {
    normalized.createdAt = transaction.createdAt
  }

  return normalized
}

export function subscribeToUserTransactions(
  uid: string,
  onData: (transactions: Transaction[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const transactionsRef = collection(db, 'users', uid, 'transactions')
  const q = query(transactionsRef, orderBy('date', 'desc'))

  return onSnapshot(
    q,
    (snapshot) =>
      onData(
        snapshot.docs.map((transactionDoc) =>
          toTransaction(
            transactionDoc.id,
            transactionDoc.data() as Omit<Transaction, 'id'>,
          ),
        ),
      ),
    onError,
  )
}

export async function addUserTransaction(uid: string, transaction: Omit<Transaction, 'id'>) {
  const transactionsRef = collection(db, 'users', uid, 'transactions')
  const data = normalizeTransactionData(transaction, uid)
  await addDoc(transactionsRef, {
    ...data,
    createdAt: serverTimestamp(),
  })
}

export async function updateUserTransaction(
  uid: string,
  transactionId: string,
  transaction: Omit<Transaction, 'id'>,
) {
  if (transaction.type === 'transfer') {
    throw new Error('Las transferencias deben actualizarse mediante la operación atómica de transferencia.')
  }

  const data = normalizeTransactionData(transaction, uid)
  delete data.createdAt
  await updateDoc(doc(db, 'users', uid, 'transactions', transactionId), data)
}

export async function deleteUserTransaction(uid: string, transactionId: string) {
  await deleteDoc(doc(db, 'users', uid, 'transactions', transactionId))
}

/**
 * Ejecuta una transferencia atómica entre dos cuentas del usuario en Firestore.
 */
export async function executeAccountTransfer(
  uid: string,
  transferData: {
    originAccountId: string
    destinationAccountId: string
    amount: number
    date: string
    description?: string
    category?: string
  },
): Promise<string> {
  validateTransferInput(transferData)

  const originRef = doc(db, 'users', uid, 'accounts', transferData.originAccountId)
  const destRef = doc(db, 'users', uid, 'accounts', transferData.destinationAccountId)
  const txRef = doc(collection(db, 'users', uid, 'transactions'))

  await runTransaction(db, async (transaction) => {
    const originSnap = await transaction.get(originRef)
    const destSnap = await transaction.get(destRef)

    const { originSaldo, destSaldo } = readTransferAccounts(originSnap, destSnap)

    if (originSaldo < transferData.amount) {
      throw new Error(
        `Saldo insuficiente en la cuenta de origen. Saldo disponible: ${originSaldo}`,
      )
    }

    transaction.update(originRef, {
      saldo: originSaldo - transferData.amount,
      updatedAt: serverTimestamp(),
    })
    transaction.update(destRef, {
      saldo: destSaldo + transferData.amount,
      updatedAt: serverTimestamp(),
    })
    transaction.set(txRef, {
      type: 'transfer',
      amount: transferData.amount,
      category: transferData.category || 'Transferencia',
      accountId: transferData.originAccountId,
      destinationAccountId: transferData.destinationAccountId,
      description: transferData.description || '',
      date: transferData.date,
      userId: uid,
      createdAt: serverTimestamp(),
    })
  })

  return txRef.id
}

/**
 * Actualiza una transferencia existente y sus saldos de forma atómica.
 */
export async function updateAccountTransfer(
  uid: string,
  transactionId: string,
  transferData: {
    originAccountId: string
    destinationAccountId: string
    amount: number
    date: string
    description?: string
    category?: string
  },
): Promise<void> {
  validateTransferInput(transferData)

  const txRef = doc(db, 'users', uid, 'transactions', transactionId)
  const newOriginRef = doc(db, 'users', uid, 'accounts', transferData.originAccountId)
  const newDestRef = doc(db, 'users', uid, 'accounts', transferData.destinationAccountId)

  await runTransaction(db, async (transaction) => {
    const txSnap = await transaction.get(txRef)
    if (!txSnap.exists()) {
      throw new Error('La transferencia que intentas editar no existe.')
    }

    const original = txSnap.data()
    if (
      original.type !== 'transfer' ||
      typeof original.accountId !== 'string' ||
      typeof original.destinationAccountId !== 'string' ||
      typeof original.amount !== 'number'
    ) {
      throw new Error('El movimiento seleccionado no es una transferencia válida.')
    }

    const oldOriginRef = doc(db, 'users', uid, 'accounts', original.accountId)
    const oldDestRef = doc(db, 'users', uid, 'accounts', original.destinationAccountId)

    const refs = new Map<string, ReturnType<typeof doc>>()
    for (const ref of [oldOriginRef, oldDestRef, newOriginRef, newDestRef]) {
      refs.set(ref.path, ref)
    }

    const snapshots = new Map<string, DocumentSnapshot>()
    for (const ref of refs.values()) {
      snapshots.set(ref.path, await transaction.get(ref))
    }

    const oldOriginSnap = snapshots.get(oldOriginRef.path)!
    const oldDestSnap = snapshots.get(oldDestRef.path)!
    const newOriginSnap = snapshots.get(newOriginRef.path)!
    const newDestSnap = snapshots.get(newDestRef.path)!

    if (!oldOriginSnap.exists() || !oldDestSnap.exists()) {
      throw new Error('No se pueden revertir los saldos originales porque una de las cuentas ya no existe.')
    }
    if (!newOriginSnap.exists() || !newDestSnap.exists()) {
      throw new Error('La cuenta de origen o destino seleccionada no existe.')
    }

    const oldAmount = original.amount
    const oldOriginSaldo = Number(oldOriginSnap.data().saldo)
    const oldDestSaldo = Number(oldDestSnap.data().saldo)

    if (!Number.isFinite(oldOriginSaldo) || !Number.isFinite(oldDestSaldo)) {
      throw new Error('Los saldos de las cuentas originales no son válidos.')
    }
    if (oldDestSaldo < oldAmount) {
      throw new Error(
        'No se puede editar la transferencia de forma segura: la cuenta destino no tiene saldo suficiente para revertir la operación original.',
      )
    }

    // Revertir exactamente el efecto anterior.
    const restoredOldOrigin = oldOriginSaldo + oldAmount
    const restoredOldDest = oldDestSaldo - oldAmount

    const newOriginSaldoBase =
      newOriginRef.path === oldOriginRef.path ? restoredOldOrigin : Number(newOriginSnap.data().saldo)
    const newDestSaldoBase =
      newDestRef.path === oldDestRef.path ? restoredOldDest : Number(newDestSnap.data().saldo)

    if (!Number.isFinite(newOriginSaldoBase) || !Number.isFinite(newDestSaldoBase)) {
      throw new Error('Los saldos de las nuevas cuentas no son válidos.')
    }
    if (newOriginSaldoBase < transferData.amount) {
      throw new Error(
        `Saldo insuficiente en la cuenta de origen. Saldo disponible: ${newOriginSaldoBase}`,
      )
    }

    // Aplicar el nuevo efecto, consolidando correctamente si las cuentas coinciden
    // con las cuentas originales.
    const finalBalances = new Map<string, number>()
    finalBalances.set(oldOriginRef.path, restoredOldOrigin)
    finalBalances.set(oldDestRef.path, restoredOldDest)
    finalBalances.set(newOriginRef.path, newOriginSaldoBase)
    finalBalances.set(newDestRef.path, newDestSaldoBase)

    finalBalances.set(
      newOriginRef.path,
      (finalBalances.get(newOriginRef.path) ?? newOriginSaldoBase) - transferData.amount,
    )
    finalBalances.set(
      newDestRef.path,
      (finalBalances.get(newDestRef.path) ?? newDestSaldoBase) + transferData.amount,
    )

    for (const [path, saldo] of finalBalances) {
      if (saldo < 0) {
        throw new Error('La edición de la transferencia produciría un saldo negativo.')
      }
      transaction.update(refs.get(path)!, {
        saldo,
        updatedAt: serverTimestamp(),
      })
    }

    transaction.update(txRef, {
      type: 'transfer',
      amount: transferData.amount,
      category: transferData.category || 'Transferencia',
      accountId: transferData.originAccountId,
      destinationAccountId: transferData.destinationAccountId,
      description: transferData.description || '',
      date: transferData.date,
    })
  })
}

/**
 * Elimina una transferencia atómicamente restaurando exactamente sus saldos.
 */
export async function deleteTransferTransaction(
  uid: string,
  tx: Transaction,
): Promise<void> {
  if (tx.type !== 'transfer' || !tx.accountId || !tx.destinationAccountId) {
    return deleteUserTransaction(uid, tx.id)
  }

  const originRef = doc(db, 'users', uid, 'accounts', tx.accountId)
  const destRef = doc(db, 'users', uid, 'accounts', tx.destinationAccountId)
  const txRef = doc(db, 'users', uid, 'transactions', tx.id)

  await runTransaction(db, async (transaction) => {
    const txSnap = await transaction.get(txRef)
    const originSnap = await transaction.get(originRef)
    const destSnap = await transaction.get(destRef)

    if (!txSnap.exists()) {
      throw new Error('La transferencia ya no existe.')
    }
    if (!originSnap.exists() || !destSnap.exists()) {
      throw new Error('No se puede revertir la transferencia porque una de sus cuentas ya no existe.')
    }

    const stored = txSnap.data()
    if (
      stored.type !== 'transfer' ||
      stored.accountId !== tx.accountId ||
      stored.destinationAccountId !== tx.destinationAccountId ||
      typeof stored.amount !== 'number'
    ) {
      throw new Error('La transferencia almacenada no coincide con los datos a revertir.')
    }

    const originSaldo = Number(originSnap.data().saldo)
    const destSaldo = Number(destSnap.data().saldo)
    if (!Number.isFinite(originSaldo) || !Number.isFinite(destSaldo)) {
      throw new Error('Los saldos de las cuentas no son válidos.')
    }
    if (destSaldo < stored.amount) {
      throw new Error(
        'No se puede eliminar la transferencia de forma segura: la cuenta destino no tiene saldo suficiente para revertirla.',
      )
    }

    transaction.update(originRef, {
      saldo: originSaldo + stored.amount,
      updatedAt: serverTimestamp(),
    })
    transaction.update(destRef, {
      saldo: destSaldo - stored.amount,
      updatedAt: serverTimestamp(),
    })
    transaction.delete(txRef)
  })
}

function validateTransferInput(data: {
  originAccountId: string
  destinationAccountId: string
  amount: number
  date: string
}) {
  if (!data.originAccountId || !data.destinationAccountId) {
    throw new Error('La transferencia requiere cuenta de origen y cuenta de destino.')
  }
  if (data.originAccountId === data.destinationAccountId) {
    throw new Error('La cuenta de origen y de destino deben ser diferentes.')
  }
  if (!Number.isFinite(data.amount) || data.amount <= 0) {
    throw new Error('El monto a transferir debe ser mayor a 0.')
  }
  if (!isValidDateString(data.date)) {
    throw new Error('La fecha de la transferencia no es válida.')
  }
}

function readTransferAccounts(
  originSnap: DocumentSnapshot,
  destSnap: DocumentSnapshot,
) {
  if (!originSnap.exists()) {
    throw new Error('La cuenta de origen seleccionada no existe.')
  }
  if (!destSnap.exists()) {
    throw new Error('La cuenta de destino seleccionada no existe.')
  }

  const originSaldo = Number(originSnap.data().saldo)
  const destSaldo = Number(destSnap.data().saldo)
  if (!Number.isFinite(originSaldo) || !Number.isFinite(destSaldo)) {
    throw new Error('El saldo de una de las cuentas no es válido.')
  }
  return { originSaldo, destSaldo }
}
