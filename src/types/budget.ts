export type BudgetPeriod = 'monthly' | 'yearly'

export interface Budget {
  id: string
  userId: string
  categoria: string
  montoPresupuesto: number
  periodo: BudgetPeriod
  createdAt: string
  updatedAt?: string
}

export interface BudgetFormData {
  categoria: string
  montoPresupuesto: string
  periodo?: BudgetPeriod
}

export const BUDGET_PERIOD_LABELS: Record<BudgetPeriod, string> = {
  monthly: 'Mensual',
  yearly: 'Anual',
}
