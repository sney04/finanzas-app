export type AccountType = 'efectivo' | 'bancaria' | 'nequi' | 'daviplata' | 'otro'

export interface Account {
  id: string
  userId: string
  nombre: string
  tipo: AccountType
  saldo: number
  moneda: string
  descripcion?: string
  createdAt: string
  updatedAt?: string
}

export interface AccountFormData {
  nombre: string
  tipo: AccountType
  saldo: string
  moneda?: string
  descripcion?: string
}

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  efectivo: 'Efectivo',
  bancaria: 'Cuenta Bancaria',
  nequi: 'Nequi',
  daviplata: 'Daviplata',
  otro: 'Otra',
}
