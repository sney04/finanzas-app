import { useEffect, useRef } from 'react'

interface ConfirmDialogProps {
  /** Título del diálogo, ej: "Eliminar movimiento" */
  title: string
  /** Descripción del impacto de la acción */
  message: string
  /** Texto del botón de confirmación (default: "Eliminar") */
  confirmLabel?: string
  /** Texto del botón de cancelar (default: "Cancelar") */
  cancelLabel?: string
  /** Si true, el botón de confirmar tiene estilo destructivo (rojo) */
  danger?: boolean
  /** Indica que la acción está en curso — deshabilita botones */
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Eliminar',
  cancelLabel = 'Cancelar',
  danger = true,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // Foco en el botón de cancelar al abrir (acción segura por defecto)
  const cancelRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    cancelRef.current?.focus()
  }, [])

  // Cerrar con Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !loading) onCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [loading, onCancel])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onCancel()
      }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-brand-800">
        {/* Icono */}
        <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${danger ? 'bg-red-100 dark:bg-red-900/40' : 'bg-brand-100 dark:bg-brand-700'}`}>
          <span className="text-xl" aria-hidden="true">
            {danger ? '🗑️' : '❓'}
          </span>
        </div>

        {/* Texto */}
        <h2
          id="confirm-dialog-title"
          className="mt-4 text-center font-display text-lg font-bold text-brand-900 dark:text-white"
        >
          {title}
        </h2>
        <p
          id="confirm-dialog-message"
          className="mt-2 text-center text-sm leading-6 text-brand-400"
        >
          {message}
        </p>

        {/* Acciones */}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-xl border border-brand-200 py-2.5 text-sm font-semibold text-brand-500 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-brand-600 dark:hover:bg-brand-900"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 rounded-xl py-2.5 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
              danger
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-brand-500 hover:bg-brand-600'
            }`}
          >
            {loading ? 'Eliminando…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
