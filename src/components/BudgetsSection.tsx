import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useAuth } from '@/hooks/useAuth'
import { getUserCategories } from '@/services/categoryService'
import {
  addUserBudget,
  deleteUserBudget,
  subscribeToUserBudgets,
  updateUserBudget,
} from '@/services/budgetService'
import {
  Budget,
  BUDGET_PERIOD_LABELS,
  BudgetFormData,
  BudgetPeriod,
} from '@/types/budget'
import { CustomCategory } from '@/types/category'
import { Transaction } from '@/types/transaction'
import { CurrencyCode } from '@/types/userProfile'
import { getYearMonth } from '@/utils/date'

const DEFAULT_CATEGORIES = [
  'Salario',
  'Freelance',
  'Alimentación',
  'Vivienda',
  'Transporte',
  'Entretenimiento',
  'Educación',
  'Servicios',
  'Otros',
]

interface BudgetsSectionProps {
  currencyCode?: CurrencyCode
  transactions?: Transaction[]
}

export function BudgetsSection({
  currencyCode = 'COP',
  transactions = [],
}: BudgetsSectionProps) {
  const { user } = useAuth()
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
  const [saving, setSaving] = useState(false)

  // Eliminación
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // Formulario local
  const [formData, setFormData] = useState<BudgetFormData>({
    categoria: DEFAULT_CATEGORIES[2], // Alimentación por defecto
    montoPresupuesto: '',
    periodo: 'monthly',
  })

  // Sincronización en tiempo real con Firestore para presupuestos
  useEffect(() => {
    if (!user?.uid) {
      setBudgets([])
      setLoading(false)
      return
    }
    setLoading(true)
    const unsubscribe = subscribeToUserBudgets(
      user.uid,
      (data) => {
        setBudgets(data)
        setLoading(false)
        setError('')
      },
      (err) => {
        console.error('Error cargando presupuestos:', err)
        setError('No se pudieron cargar los presupuestos.')
        setLoading(false)
      },
    )
    return unsubscribe
  }, [user?.uid])

  // Cargar categorías del usuario para el selector
  useEffect(() => {
    if (!user?.uid) return
    let isCurrent = true
    getUserCategories(user.uid)
      .then((cats) => {
        if (isCurrent) setCustomCategories(cats)
      })
      .catch((err) => console.error('Error cargando categorías para presupuestos:', err))
    return () => {
      isCurrent = false
    }
  }, [user?.uid])

  const availableCategories = useMemo(
    () =>
      [
        ...new Set([
          ...DEFAULT_CATEGORIES,
          ...customCategories.map((c) => c.name),
          ...transactions.map((t) => t.category),
        ]),
      ].sort(),
    [customCategories, transactions],
  )

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: currencyCode,
        maximumFractionDigits: 0,
      }),
    [currencyCode],
  )

  // Períodos de tiempo actuales
  const currentMonth = getYearMonth() // "YYYY-MM"
  const currentYear = new Date().getFullYear().toString() // "YYYY"

  // Cálculo de gastos y porcentajes por presupuesto
  const budgetsWithCalculations = useMemo(() => {
    return budgets.map((b) => {
      const isMonthly = b.periodo === 'monthly'
      const periodPrefix = isMonthly ? currentMonth : currentYear

      // Sumar transacciones de tipo gasto en la misma categoría y período
      const gastoRealizado = transactions
        .filter(
          (t) =>
            t.type === 'expense' &&
            t.category === b.categoria &&
            t.date.startsWith(periodPrefix),
        )
        .reduce((sum, t) => sum + (t.amount || 0), 0)

      const montoDisponible = b.montoPresupuesto - gastoRealizado
      const porcentaje =
        b.montoPresupuesto > 0
          ? Math.round((gastoRealizado / b.montoPresupuesto) * 100)
          : 0
      const excede = gastoRealizado > b.montoPresupuesto

      return {
        ...b,
        gastoRealizado,
        montoDisponible,
        porcentaje,
        excede,
      }
    })
  }, [budgets, transactions, currentMonth, currentYear])

  function handleOpenCreate() {
    setEditingBudget(null)
    setFormData({
      categoria: availableCategories[0] || 'Alimentación',
      montoPresupuesto: '',
      periodo: 'monthly',
    })
    setIsModalOpen(true)
  }

  function handleOpenEdit(budget: Budget) {
    setEditingBudget(budget)
    setFormData({
      categoria: budget.categoria,
      montoPresupuesto: String(budget.montoPresupuesto),
      periodo: budget.periodo,
    })
    setIsModalOpen(true)
  }

  function handleCloseModal() {
    if (saving) return
    setIsModalOpen(false)
    setEditingBudget(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.uid) return

    const catTrimmed = formData.categoria.trim()
    if (!catTrimmed) {
      toast.error('Selecciona una categoría válida.')
      return
    }

    const montoNum = Number(formData.montoPresupuesto)
    if (isNaN(montoNum) || montoNum <= 0) {
      toast.error('El monto asignado al presupuesto debe ser mayor a 0.')
      return
    }

    const periodoVal: BudgetPeriod = formData.periodo || 'monthly'

    try {
      setSaving(true)
      if (editingBudget) {
        await updateUserBudget(user.uid, editingBudget.id, {
          categoria: catTrimmed,
          montoPresupuesto: montoNum,
          periodo: periodoVal,
        })
        toast.success('✓ Presupuesto actualizado correctamente.')
      } else {
        await addUserBudget(user.uid, {
          userId: user.uid,
          categoria: catTrimmed,
          montoPresupuesto: montoNum,
          periodo: periodoVal,
        })
        toast.success('✓ Presupuesto creado correctamente.')
      }
      setIsModalOpen(false)
      setEditingBudget(null)
    } catch (err) {
      console.error('Error guardando presupuesto:', err)
      toast.error('No se pudo guardar el presupuesto.')
    } finally {
      setSaving(false)
    }
  }

  async function executeDeleteBudget() {
    if (!user?.uid || !confirmDeleteId) return
    const id = confirmDeleteId
    try {
      setDeletingId(id)
      setConfirmDeleteId(null)
      await deleteUserBudget(user.uid, id)
      toast.success('✓ Presupuesto eliminado correctamente.')
    } catch (err) {
      console.error('Error eliminando presupuesto:', err)
      toast.error('No se pudo eliminar el presupuesto.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="rounded-2xl border border-brand-100 bg-white p-5 shadow-sm dark:border-brand-700/60 dark:bg-brand-800/80">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-brand-900 dark:text-white flex items-center gap-2">
            <span>🎯</span> Control de Presupuestos
          </h2>
          <p className="text-xs text-brand-500 dark:text-brand-400">
            Límite de gastos por categoría en el período actual.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="rounded-lg bg-gold-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-gold-400 active:scale-95 shadow-sm"
        >
          + Nuevo Presupuesto
        </button>
      </div>

      {error && (
        <p className="mb-3 text-xs text-red-500 dark:text-red-400">{error}</p>
      )}

      {loading ? (
        <div className="py-6 text-center text-xs text-brand-400 dark:text-brand-500">
          Cargando presupuestos...
        </div>
      ) : budgetsWithCalculations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-brand-200 py-6 text-center dark:border-brand-700">
          <p className="text-sm text-brand-500 dark:text-brand-400">
            No has asignado presupuestos por categoría.
          </p>
          <button
            onClick={handleOpenCreate}
            className="mt-2 text-xs font-semibold text-gold-600 hover:underline dark:text-gold-400"
          >
            Crear mi primer presupuesto
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {budgetsWithCalculations.map((b) => {
            const barWidth = Math.min(100, b.porcentaje)
            const isWarning = b.porcentaje >= 80 && b.porcentaje <= 100
            const isExceeded = b.excede

            let progressColor = 'bg-emerald-500'
            if (isWarning) progressColor = 'bg-amber-500'
            if (isExceeded) progressColor = 'bg-red-500'

            return (
              <div
                key={b.id}
                className="rounded-xl border border-brand-100 bg-brand-50/50 p-4 transition dark:border-brand-700/50 dark:bg-brand-900/40"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-brand-900 dark:text-white">
                      {b.categoria}
                    </span>
                    <span className="rounded-md bg-brand-100 px-1.5 py-0.5 text-[10px] font-medium text-brand-700 dark:bg-brand-700 dark:text-brand-300">
                      {BUDGET_PERIOD_LABELS[b.periodo]}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(b)}
                      className="rounded-lg p-1 text-brand-400 hover:bg-brand-100 hover:text-brand-700 dark:hover:bg-brand-700 dark:hover:text-white"
                      title="Editar presupuesto"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(b.id)}
                      className="rounded-lg p-1 text-brand-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                      title="Eliminar presupuesto"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Barra de progreso */}
                <div className="relative mb-2 h-2.5 w-full overflow-hidden rounded-full bg-brand-100 dark:bg-brand-700">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="text-brand-500 dark:text-brand-400">Gastado: </span>
                    <span className="font-semibold text-brand-900 dark:text-white">
                      {currencyFormatter.format(b.gastoRealizado)}
                    </span>
                    <span className="text-brand-400 dark:text-brand-500"> / {currencyFormatter.format(b.montoPresupuesto)}</span>
                  </div>

                  <div className="text-right">
                    {isExceeded ? (
                      <span className="font-bold text-red-500">
                        ⚠️ Excedido en {currencyFormatter.format(Math.abs(b.montoDisponible))} ({b.porcentaje}%)
                      </span>
                    ) : (
                      <span className="font-medium text-brand-600 dark:text-brand-300">
                        Disponible: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{currencyFormatter.format(b.montoDisponible)}</span> ({b.porcentaje}%)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Creación / Edición de Presupuesto */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-brand-800">
            <h3 className="mb-4 text-lg font-bold text-brand-900 dark:text-white">
              {editingBudget ? 'Editar Presupuesto' : 'Nuevo Presupuesto'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-brand-700 dark:text-brand-300 mb-1">
                  Categoría *
                </label>
                <select
                  value={formData.categoria}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, categoria: e.target.value }))
                  }
                  className="input-field w-full"
                >
                  {availableCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-700 dark:text-brand-300 mb-1">
                  Monto Máximo del Presupuesto ({currencyCode}) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="500000"
                  value={formData.montoPresupuesto}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      montoPresupuesto: e.target.value,
                    }))
                  }
                  className="input-field w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-700 dark:text-brand-300 mb-1">
                  Período *
                </label>
                <select
                  value={formData.periodo}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      periodo: e.target.value as BudgetPeriod,
                    }))
                  }
                  className="input-field w-full"
                >
                  {Object.entries(BUDGET_PERIOD_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={saving}
                  className="rounded-lg border border-brand-200 px-4 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-50 dark:border-brand-700 dark:text-brand-300 dark:hover:bg-brand-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-gold-500 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-gold-400 disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : editingBudget ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmación de eliminación */}
      {confirmDeleteId && (
        <ConfirmDialog
          title="Eliminar presupuesto"
          message="¿Estás seguro de que deseas eliminar este presupuesto? Las transacciones asociadas no sufrirán cambios."
          confirmLabel="Sí, eliminar"
          loading={deletingId !== null}
          onConfirm={executeDeleteBudget}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  )
}
