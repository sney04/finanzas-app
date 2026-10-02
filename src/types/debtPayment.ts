export interface DebtPayment {
  id: string
  userId: string
  debtId: string
  monto: number
  fecha: string
  descripcion?: string
  createdAt: string
}

export interface DebtPaymentFormData {
  debtId: string
  monto: string
  fecha: string
  descripcion?: string
}
