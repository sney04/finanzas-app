import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  deleteField,
  Timestamp,
  Unsubscribe,
  where,
} from 'firebase/firestore'
import { db } from '@/firebase/config'
import { DebtPayment } from '@/types/debtPayment'

function normalizeDate(value: unknown): string {
  if (typeof value === 'string') return value
  if (value instanceof Timestamp) return value.toDate().toISOString()
  if (value instanceof Date) return value.toISOString()
  return new Date().toISOString()
}

function toDebtPayment(id: string, data: Omit<DebtPayment, 'id'>): DebtPayment {
  return {
    id,
    userId: data.userId || '',
    debtId: data.debtId,
    monto: Number(data.monto) || 0,
    fecha: data.fecha,
    descripcion: data.descripcion || '',
    createdAt: normalizeDate(data.createdAt),
  }
}

export function subscribeToUserDebtPayments(
  uid: string,
  onData: (payments: DebtPayment[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const paymentsRef = collection(db, 'users', uid, 'debtPayments')
  const q = query(paymentsRef, orderBy('fecha', 'desc'))

  return onSnapshot(
    q,
    (snapshot) =>
      onData(
        snapshot.docs.map((docSnap) =>
          toDebtPayment(docSnap.id, docSnap.data() as Omit<DebtPayment, 'id'>),
        ),
      ),
    onError,
  )
}

export async function getUserDebtPayments(uid: string): Promise<DebtPayment[]> {
  const paymentsRef = collection(db, 'users', uid, 'debtPayments')
  const q = query(paymentsRef, orderBy('fecha', 'desc'))
  const snapshot = await getDocs(q)

  return snapshot.docs.map((docSnap) =>
    toDebtPayment(docSnap.id, docSnap.data() as Omit<DebtPayment, 'id'>),
  )
}

export async function getPaymentsByDebtId(
  uid: string,
  debtId: string,
): Promise<DebtPayment[]> {
  const paymentsRef = collection(db, 'users', uid, 'debtPayments')
  const q = query(paymentsRef, where('debtId', '==', debtId), orderBy('fecha', 'desc'))
  const snapshot = await getDocs(q)

  return snapshot.docs.map((docSnap) =>
    toDebtPayment(docSnap.id, docSnap.data() as Omit<DebtPayment, 'id'>),
  )
}

/**
 * Registra un pago y actualiza la deuda dentro de una única transacción.
 */
export async function addUserDebtPayment(
  uid: string,
  payment: Omit<DebtPayment, 'id' | 'createdAt'>,
): Promise<string> {
  validatePayment(payment.monto)

  const debtRef = doc(db, 'users', uid, 'debts', payment.debtId)
  const paymentRef = doc(collection(db, 'users', uid, 'debtPayments'))

  await runTransaction(db, async (transaction) => {
    const debtSnap = await transaction.get(debtRef)
    if (!debtSnap.exists()) {
      throw new Error('La deuda asociada no existe.')
    }

    const debt = debtSnap.data()
    const saldoPendiente = Number(debt.saldoPendiente)
    const montoOriginal = Number(debt.montoOriginal)

    validateDebtState(debt.estado, saldoPendiente, montoOriginal)

    if (payment.monto > saldoPendiente) {
      throw new Error('El monto del pago no puede superar el saldo pendiente de la deuda.')
    }

    const nuevoSaldo = saldoPendiente - payment.monto
    const nuevoEstado = nuevoSaldo === 0 ? 'paid' : 'active'

    transaction.set(paymentRef, {
      debtId: payment.debtId,
      monto: payment.monto,
      fecha: payment.fecha,
      ...(payment.descripcion?.trim() ? { descripcion: payment.descripcion.trim() } : {}),
      userId: uid,
      createdAt: serverTimestamp(),
    })

    transaction.update(debtRef, {
      saldoPendiente: nuevoSaldo,
      estado: nuevoEstado,
      updatedAt: serverTimestamp(),
    })
  })

  return paymentRef.id
}

/**
 * Edita un pago y recalcula la deuda a partir del saldo almacenado en Firestore.
 */
export async function updateUserDebtPayment(
  uid: string,
  paymentId: string,
  payment: Partial<Omit<DebtPayment, 'id' | 'userId' | 'createdAt'>>,
): Promise<void> {
  if (payment.monto !== undefined) validatePayment(payment.monto)

  const paymentRef = doc(db, 'users', uid, 'debtPayments', paymentId)

  await runTransaction(db, async (transaction) => {
    const paymentSnap = await transaction.get(paymentRef)
    if (!paymentSnap.exists()) {
      throw new Error('El pago que intentas editar no existe.')
    }

    const oldPayment = paymentSnap.data()
    const debtId = oldPayment.debtId
    if (typeof debtId !== 'string' || !debtId) {
      throw new Error('El pago no tiene una deuda asociada válida.')
    }

    const debtRef = doc(db, 'users', uid, 'debts', debtId)
    const debtSnap = await transaction.get(debtRef)
    if (!debtSnap.exists()) {
      throw new Error('La deuda asociada al pago no existe.')
    }

    const oldAmount = Number(oldPayment.monto)
    const newAmount = payment.monto ?? oldAmount
    const currentBalance = Number(debtSnap.data().saldoPendiente)
    const originalAmount = Number(debtSnap.data().montoOriginal)

    if (!Number.isFinite(oldAmount) || oldAmount <= 0) {
      throw new Error('El pago almacenado tiene un monto inválido.')
    }
    if (!Number.isFinite(currentBalance) || !Number.isFinite(originalAmount)) {
      throw new Error('Los valores de la deuda no son válidos.')
    }

    // El saldo actual ya refleja el pago original. Primero se revierte ese efecto.
    const saldoSinPago = currentBalance + oldAmount
    if (saldoSinPago > originalAmount) {
      throw new Error('La deuda tiene un saldo inconsistente; no se puede editar el pago de forma segura.')
    }
    if (newAmount > saldoSinPago) {
      throw new Error('El monto del nuevo pago no puede superar el saldo pendiente disponible.')
    }

    const nuevoSaldo = saldoSinPago - newAmount
    const nuevoEstado = nuevoSaldo === 0 ? 'paid' : 'active'

    if (payment.descripcion !== undefined) {
      transaction.update(paymentRef, {
        monto: newAmount,
        fecha: payment.fecha ?? oldPayment.fecha,
        descripcion: payment.descripcion.trim() ? payment.descripcion.trim() : deleteField(),
      })
    } else {
      transaction.update(paymentRef, {
        monto: newAmount,
        fecha: payment.fecha ?? oldPayment.fecha,
      })
    }
    transaction.update(debtRef, {
      saldoPendiente: nuevoSaldo,
      estado: nuevoEstado,
      updatedAt: serverTimestamp(),
    })
  })
}

/**
 * Elimina un pago y revierte exactamente su efecto sobre la deuda.
 */
export async function deleteUserDebtPayment(
  uid: string,
  paymentId: string,
): Promise<void> {
  const paymentRef = doc(db, 'users', uid, 'debtPayments', paymentId)

  await runTransaction(db, async (transaction) => {
    const paymentSnap = await transaction.get(paymentRef)
    if (!paymentSnap.exists()) {
      throw new Error('El pago ya no existe.')
    }

    const payment = paymentSnap.data()
    const debtId = payment.debtId
    const amount = Number(payment.monto)

    if (typeof debtId !== 'string' || !debtId || !Number.isFinite(amount) || amount <= 0) {
      throw new Error('El pago almacenado no es válido y no puede revertirse de forma segura.')
    }

    const debtRef = doc(db, 'users', uid, 'debts', debtId)
    const debtSnap = await transaction.get(debtRef)
    if (!debtSnap.exists()) {
      throw new Error('La deuda asociada al pago ya no existe.')
    }

    const debt = debtSnap.data()
    const currentBalance = Number(debt.saldoPendiente)
    const originalAmount = Number(debt.montoOriginal)

    if (!Number.isFinite(currentBalance) || !Number.isFinite(originalAmount)) {
      throw new Error('Los valores de la deuda no son válidos.')
    }

    const nuevoSaldo = currentBalance + amount
    if (nuevoSaldo > originalAmount) {
      throw new Error('La reversión del pago produciría un saldo superior al monto original de la deuda.')
    }

    transaction.update(debtRef, {
      saldoPendiente: nuevoSaldo,
      estado: nuevoSaldo === 0 ? 'paid' : 'active',
      updatedAt: serverTimestamp(),
    })
    transaction.delete(paymentRef)
  })
}

function validatePayment(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('El monto del pago debe ser mayor a 0.')
  }
}

function validateDebtState(
  estado: unknown,
  saldoPendiente: number,
  montoOriginal: number,
) {
  if (estado !== 'active' && estado !== 'paid' && estado !== 'cancelled') {
    throw new Error('El estado de la deuda no es válido.')
  }
  if (!Number.isFinite(montoOriginal) || montoOriginal <= 0) {
    throw new Error('El monto original de la deuda no es válido.')
  }
  if (!Number.isFinite(saldoPendiente) || saldoPendiente < 0 || saldoPendiente > montoOriginal) {
    throw new Error('El saldo pendiente de la deuda no es válido.')
  }
  if (estado === 'paid' && saldoPendiente !== 0) {
    throw new Error('La deuda marcada como pagada tiene un saldo pendiente inconsistente.')
  }
}
