export type TransactionType = 'income' | 'expense' | 'transfer'

export interface Transaction {
  id: string
  type: TransactionType
  amount: number
  category: string
  accountId: string
  destinationAccountId?: string
  description: string
  date: string
  createdAt?: string
  userId: string
}

export interface TransactionFormData {
  type: TransactionType
  amount: string
  category: string
  accountId?: string
  destinationAccountId?: string
  description: string
  date: string
}
