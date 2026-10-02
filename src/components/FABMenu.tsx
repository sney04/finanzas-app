export type FABMenuOption = 'income' | 'expense' | 'transfer' | 'debt-payment'

interface FABMenuProps {
  isOpen: boolean
  onClose: () => void
  onSelectOption: (option: FABMenuOption) => void
}

export function FABMenu({ isOpen, onClose, onSelectOption }: FABMenuProps) {
  // Transferencia y pago de deuda siguen sin tipos/servicios; se muestran
  // deshabilitadas hasta que exista su lógica en fases posteriores.
  const options: {
    id: FABMenuOption
    label: string
    icon: string
    disabled?: boolean
    hint?: string
  }[] = [
    { id: 'income', label: 'Ingreso', icon: '💰' },
    { id: 'expense', label: 'Gasto', icon: '💸' },
    { id: 'transfer', label: 'Transferencia', icon: '🔄' },
    { id: 'debt-payment', label: 'Pago de deuda', icon: '💳', disabled: true, hint: 'Próximamente' },
  ]

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Cerrar menú"
      />

      {/* Menu */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Seleccionar tipo de movimiento"
        className="fixed bottom-20 left-1/2 z-50 w-full max-w-xs -translate-x-1/2 rounded-2xl bg-white shadow-2xl dark:bg-brand-800 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2"
      >
        <div className="p-4">
          <p className="mb-4 text-center text-sm font-semibold text-brand-600 dark:text-brand-300">
            Selecciona el tipo de movimiento
          </p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {options.map((option) => (
              <button
                key={option.id}
                onClick={() => {
                  if (option.disabled) return
                  onSelectOption(option.id)
                  onClose()
                }}
                disabled={option.disabled}
                aria-disabled={option.disabled}
                className="flex flex-col items-center gap-2 rounded-xl p-4 transition hover:bg-brand-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:active:scale-100 dark:hover:bg-brand-700 dark:disabled:hover:bg-transparent"
              >
                <span className="text-3xl" aria-hidden="true">{option.icon}</span>
                <span className="text-center text-xs font-medium text-brand-900 dark:text-white">
                  {option.label}
                </span>
                {option.hint && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-brand-300 dark:text-brand-400">
                    {option.hint}
                  </span>
                )}
              </button>
            ))}
          </div>

          <button
            onClick={onClose}
            className="mt-4 w-full rounded-lg bg-brand-100 px-4 py-2 text-sm font-medium text-brand-900 hover:bg-brand-200 dark:bg-brand-700 dark:text-white dark:hover:bg-brand-600"
          >
            Cancelar
          </button>
        </div>
      </div>
    </>
  )
}
