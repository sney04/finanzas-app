export type SavingsGoalStatus = 'active' | 'completed' | 'cancelled'

export interface SavingsGoal {
  id: string
  userId: string
  nombre: string
  objetivo: number
  montoActual: number
  fechaObjetivo: string
  estado: SavingsGoalStatus
  descripcion?: string
  createdAt: string
  updatedAt?: string
}

export interface SavingsGoalFormData {
  nombre: string
  objetivo: string
  montoActual: string
  fechaObjetivo: string
  estado?: SavingsGoalStatus
  descripcion?: string
}

export const SAVINGS_GOAL_STATUS_LABELS: Record<SavingsGoalStatus, string> = {
  active: 'Activa',
  completed: 'Completada',
  cancelled: 'Cancelada',
}

export const SAVINGS_GOAL_STATUS_COLORS: Record<SavingsGoalStatus, string> = {
  active: 'text-blue-600 dark:text-blue-400',
  completed: 'text-green-600 dark:text-green-400',
  cancelled: 'text-gray-600 dark:text-gray-400',
}
