import type { Timestamp } from 'firebase/firestore'

export const DEFAULT_SAVINGS_GOAL = 700000
export const DEFAULT_CURRENCY = 'COP' as const

export const SUPPORTED_CURRENCIES = ['COP', 'USD', 'EUR'] as const

export type CurrencyCode = typeof SUPPORTED_CURRENCIES[number]

export interface UserProfile {
  nombre: string
  apellido: string | null
  email: string | null
  telefono: string | null
  fotoUrl: string | null
  moneda: CurrencyCode
  metaAhorroMensual: number
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}
