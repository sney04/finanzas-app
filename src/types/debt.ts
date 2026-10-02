export type DebtStatus = 'active' | 'paid' | 'cancelled'

export interface Debt {
  id: string
  userId: string
  nombre: string
  acreedor: string
  montoOriginal: number
  saldoPendiente: number
  fechaVencimiento: string
  estado: DebtStatus
  descripcion?: string
  createdAt: string
  updatedAt?: string
}

export interface DebtFormData {
  nombre: string
  acreedor: string
  montoOriginal: string
  saldoPendiente: string
  fechaVencimiento: string
  estado?: DebtStatus
  descripcion?: string
}

export const DEBT_STATUS_LABELS: Record<DebtStatus, string> = {
  active: 'Activa',
  paid: 'Pagada',
  cancelled: 'Cancelada',
}

export const DEBT_STATUS_COLORS: Record<DebtStatus, string> = {
  active: 'text-red-600 dark:text-red-400',
  paid: 'text-green-600 dark:text-green-400',
  cancelled: 'text-gray-600 dark:text-gray-400',
}
