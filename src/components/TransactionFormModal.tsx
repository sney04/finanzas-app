import { useEffect, useRef, useState } from 'react'
import { Account } from '@/types/account'
import { Transaction, TransactionFormData, TransactionType } from '@/types/transaction'
import { isValidDateString, toLocalDateString } from '@/utils/date'

interface FormErrors {
  amount?: string
  category?: string
  date?: string
  description?: string
  accountId?: string
  destinationAccountId?: string
}

type TransactionSaveData = Omit<Transaction, 'id' | 'userId'>

interface TransactionFormModalProps {
  /** Categorías disponibles (predeterminadas + personalizadas). */
  availableCategories: string[]
  /** Cuentas del usuario para transferencias. */
  accounts?: Account[]
  /** Si se pasa, el formulario entra en modo edición. */
  editingTransaction?: Transaction | null
  /** Tipo por defecto al abrir en modo creación (income | expense | transfer). */
  defaultType?: TransactionType
  /** Indica que hay una operación de guardado en curso. */
  saving: boolean
  /** Moneda activa del usuario para el placeholder del monto. */
  currencyPlaceholder?: string
  onSave: (data: TransactionSaveData) => Promise<void>
  onCancel: () => void
}

function buildInitialForm(
  editingTransaction?: Transaction | null,
  defaultType: TransactionType = 'expense',
): TransactionFormData {
  if (editingTransaction) {
    return {
      type: editingTransaction.type,
      amount: String(editingTransaction.amount),
      category: editingTransaction.category,
      accountId: editingTransaction.accountId || '',
      destinationAccountId: editingTransaction.destinationAccountId || '',
      description: editingTransaction.description,
      date: editingTransaction.date,
    }
  }
  return {
    type: defaultType,
    amount: '',
    category: defaultType === 'transfer' ? 'Transferencia' : '',
    accountId: '',
    destinationAccountId: '',
    description: '',
    date: toLocalDateString(),
  }
}

export function TransactionFormModal({
  availableCategories,
  accounts = [],
  editingTransaction,
  defaultType = 'expense',
  saving,
  currencyPlaceholder = '250000',
  onSave,
  onCancel,
}: TransactionFormModalProps) {
  const isEditing = Boolean(editingTransaction)

  const [form, setForm] = useState<TransactionFormData>(() =>
    buildInitialForm(editingTransaction, defaultType),
  )
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)

  useEffect(() => {
    setForm(buildInitialForm(editingTransaction, defaultType))
    setErrors({})
    setSubmitAttempted(false)
  }, [editingTransaction, defaultType])

  const amountRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    amountRef.current?.focus()
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !saving) onCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [saving, onCancel])

  function handleChange<K extends keyof TransactionFormData>(
    key: K,
    value: TransactionFormData[K],
  ) {
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      if (key === 'type' && value === 'transfer' && !prev.category) {
        next.category = 'Transferencia'
      }
      return next
    })
    if (submitAttempted && errors[key as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }))
    }
  }

  function validate(): FormErrors {
    const newErrors: FormErrors = {}
    const amount = Number(form.amount)

    if (!form.amount || !Number.isFinite(amount) || amount <= 0) {
      newErrors.amount = 'Ingresa un monto válido mayor a 0.'
    }

    if (form.type === 'transfer') {
      if (!form.accountId) {
        newErrors.accountId = 'Selecciona la cuenta de origen.'
      }
      if (!form.destinationAccountId) {
        newErrors.destinationAccountId = 'Selecciona la cuenta de destino.'
      } else if (form.accountId && form.accountId === form.destinationAccountId) {
        newErrors.destinationAccountId = 'La cuenta de destino debe ser diferente a la de origen.'
      }
    } else {
      if (!form.category.trim()) {
        newErrors.category = 'Selecciona una categoría.'
      } else if (form.category.trim().length > 100) {
        newErrors.category = 'La categoría no puede superar los 100 caracteres.'
      }
    }

    if (!isValidDateString(form.date)) {
      newErrors.date = 'Selecciona una fecha válida.'
    }
    if (form.description.trim().length > 300) {
      newErrors.description = 'La descripción no puede superar los 300 caracteres.'
    }

    return newErrors
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitAttempted(true)

    const newErrors = validate()
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    await onSave({
      type: form.type,
      amount: Number(form.amount),
      category: form.type === 'transfer' ? 'Transferencia' : form.category.trim(),
      accountId: form.accountId || '',
      destinationAccountId: form.type === 'transfer' ? form.destinationAccountId : undefined,
      description: form.description.trim(),
      date: form.date,
    })
  }

  const isIncome = form.type === 'income'
  const isTransfer = form.type === 'transfer'

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={isEditing ? 'Editar movimiento' : 'Registrar movimiento'}
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onCancel()
      }}
    >
      <div className="w-full max-w-md rounded-t-3xl bg-white shadow-2xl dark:bg-brand-800 sm:rounded-3xl">
        {/* Selector de Tipo (Creación) */}
        {!isEditing && (
          <div className="grid grid-cols-3 rounded-t-3xl overflow-hidden text-xs sm:text-sm">
            <button
              type="button"
              onClick={() => handleChange('type', 'income')}
              className={`flex items-center justify-center gap-1.5 py-3.5 font-bold transition focus:outline-none ${
                isIncome
                  ? 'bg-emerald-500 text-white'
                  : 'bg-brand-50 text-brand-400 hover:bg-emerald-50 hover:text-emerald-600 dark:bg-brand-900 dark:text-brand-400'
              }`}
            >
              <span className="text-base" aria-hidden="true">↑</span>
              Ingreso
            </button>
            <button
              type="button"
              onClick={() => handleChange('type', 'expense')}
              className={`flex items-center justify-center gap-1.5 py-3.5 font-bold transition focus:outline-none ${
                form.type === 'expense'
                  ? 'bg-red-500 text-white'
                  : 'bg-brand-50 text-brand-400 hover:bg-red-50 hover:text-red-600 dark:bg-brand-900 dark:text-brand-400'
              }`}
            >
              <span className="text-base" aria-hidden="true">↓</span>
              Gasto
            </button>
            <button
              type="button"
              onClick={() => handleChange('type', 'transfer')}
              className={`flex items-center justify-center gap-1.5 py-3.5 font-bold transition focus:outline-none ${
                isTransfer
                  ? 'bg-gold-500 text-white'
                  : 'bg-brand-50 text-brand-400 hover:bg-gold-50 hover:text-gold-600 dark:bg-brand-900 dark:text-brand-400'
              }`}
            >
              <span className="text-base" aria-hidden="true">🔄</span>
              Transferencia
            </button>
          </div>
        )}

        {/* Header Edición */}
        {isEditing && (
          <div
            className={`flex items-center justify-between rounded-t-3xl px-5 py-4 ${
              isIncome
                ? 'bg-emerald-500'
                : isTransfer
                ? 'bg-gold-500'
                : 'bg-red-500'
            }`}
          >
            <div className="flex items-center gap-2 text-white">
              <span className="text-xl" aria-hidden="true">
                {isIncome ? '↑' : isTransfer ? '🔄' : '↓'}
              </span>
              <span className="font-bold">
                Editar {isIncome ? 'ingreso' : isTransfer ? 'transferencia' : 'gasto'}
              </span>
            </div>
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              aria-label="Cerrar"
              className="rounded-full p-1 text-white/80 transition hover:text-white disabled:opacity-50"
            >
              ✕
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4 p-5">
          {!isEditing && (
            <div
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold ${
                isIncome
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                  : isTransfer
                  ? 'bg-gold-50 text-gold-700 dark:bg-gold-900/30 dark:text-gold-300'
                  : 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300'
              }`}
            >
              <span aria-hidden="true">{isIncome ? '↑' : isTransfer ? '🔄' : '↓'}</span>
              Registrando {isIncome ? 'un ingreso' : isTransfer ? 'una transferencia entre cuentas' : 'un gasto'}
            </div>
          )}

          {/* Formulario Transferencia entre Cuentas */}
          {isTransfer && (
            <div className="space-y-3 rounded-2xl bg-brand-50 p-4 dark:bg-brand-900/40">
              <div>
                <label className="block text-xs font-semibold text-brand-700 dark:text-brand-300 mb-1">
                  Cuenta Origen (de donde sale el dinero) *
                </label>
                <select
                  value={form.accountId}
                  onChange={(e) => handleChange('accountId', e.target.value)}
                  disabled={saving}
                  className="input-field w-full"
                >
                  <option value="" disabled>Selecciona la cuenta origen</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.nombre} (Saldo: ${acc.saldo})
                    </option>
                  ))}
                </select>
                {errors.accountId && (
                  <p className="field-error" role="alert">{errors.accountId}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-700 dark:text-brand-300 mb-1">
                  Cuenta Destino (a donde entra el dinero) *
                </label>
                <select
                  value={form.destinationAccountId}
                  onChange={(e) => handleChange('destinationAccountId', e.target.value)}
                  disabled={saving}
                  className="input-field w-full"
                >
                  <option value="" disabled>Selecciona la cuenta destino</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.nombre} (Saldo: ${acc.saldo})
                    </option>
                  ))}
                </select>
                {errors.destinationAccountId && (
                  <p className="field-error" role="alert">{errors.destinationAccountId}</p>
                )}
              </div>
            </div>
          )}

          {/* Monto */}
          <div>
            <label
              htmlFor="modal-amount"
              className="mb-1 block text-sm font-medium text-brand-700 dark:text-brand-100"
            >
              Monto <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              ref={amountRef}
              id="modal-amount"
              type="number"
              inputMode="numeric"
              min="1"
              value={form.amount}
              onChange={(e) => handleChange('amount', e.target.value)}
              disabled={saving}
              placeholder={currencyPlaceholder}
              className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition focus:ring-2 dark:bg-brand-900 dark:text-white ${
                errors.amount
                  ? 'border-red-400 focus:border-red-400 focus:ring-red-400/30'
                  : 'border-brand-200 focus:border-brand-400 focus:ring-brand-400/30 dark:border-brand-600'
              }`}
            />
            {errors.amount && (
              <p className="field-error" role="alert">{errors.amount}</p>
            )}
          </div>

          {/* Categoría (solo para ingresos/gastos) */}
          {!isTransfer && (
            <div>
              <label
                htmlFor="modal-category"
                className="mb-1 block text-sm font-medium text-brand-700 dark:text-brand-100"
              >
                Categoría <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <select
                id="modal-category"
                value={form.category}
                onChange={(e) => handleChange('category', e.target.value)}
                disabled={saving}
                className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition focus:ring-2 dark:bg-brand-900 dark:text-white ${
                  errors.category
                    ? 'border-red-400 focus:border-red-400 focus:ring-red-400/30'
                    : 'border-brand-200 focus:border-brand-400 focus:ring-brand-400/30 dark:border-brand-600'
                }`}
              >
                <option value="" disabled>Selecciona una categoría</option>
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              {errors.category && (
                <p className="field-error" role="alert">{errors.category}</p>
              )}
            </div>
          )}

          {/* Fecha */}
          <div>
            <label
              htmlFor="modal-date"
              className="mb-1 block text-sm font-medium text-brand-700 dark:text-brand-100"
            >
              Fecha <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="modal-date"
              type="date"
              value={form.date}
              onChange={(e) => handleChange('date', e.target.value)}
              disabled={saving}
              className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition focus:ring-2 dark:bg-brand-900 dark:text-white dark:[color-scheme:dark] ${
                errors.date
                  ? 'border-red-400 focus:border-red-400 focus:ring-red-400/30'
                  : 'border-brand-200 focus:border-brand-400 focus:ring-brand-400/30 dark:border-brand-600'
              }`}
            />
            {errors.date && (
              <p className="field-error" role="alert">{errors.date}</p>
            )}
          </div>

          {/* Descripción (opcional) */}
          <div>
            <label
              htmlFor="modal-description"
              className="mb-1 block text-sm font-medium text-brand-700 dark:text-brand-100"
            >
              Descripción{' '}
              <span className="font-normal text-brand-400">(opcional)</span>
            </label>
            <input
              id="modal-description"
              type="text"
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              disabled={saving}
              maxLength={300}
              placeholder="Ej: Transferencia Nequi, pago de factura…"
              className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition focus:ring-2 dark:bg-brand-900 dark:text-white ${
                errors.description
                  ? 'border-red-400 focus:border-red-400 focus:ring-red-400/30'
                  : 'border-brand-200 focus:border-brand-400 focus:ring-brand-400/30 dark:border-brand-600'
              }`}
            />
            {errors.description && (
              <p className="field-error" role="alert">{errors.description}</p>
            )}
          </div>

          {/* Acciones */}
          <div className="flex gap-3 pt-1 pb-safe">
            <button
              type="submit"
              disabled={saving}
              className={`flex-1 rounded-xl py-2.5 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                isIncome
                  ? 'bg-emerald-500 hover:bg-emerald-600'
                  : isTransfer
                  ? 'bg-gold-500 hover:bg-gold-600'
                  : 'bg-red-500 hover:bg-red-600'
              }`}
            >
              {saving
                ? 'Guardando…'
                : isEditing
                  ? `Guardar ${isIncome ? 'ingreso' : isTransfer ? 'transferencia' : 'gasto'}`
                  : `Registrar ${isIncome ? 'ingreso' : isTransfer ? 'transferencia' : 'gasto'}`}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="rounded-xl border border-brand-200 px-4 py-2.5 text-sm font-semibold text-brand-500 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-brand-600 dark:hover:bg-brand-900"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
