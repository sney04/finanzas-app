import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useAuth } from '@/hooks/useAuth'
import {
  addUserSavingsGoal,
  deleteUserSavingsGoal,
  subscribeToUserSavingsGoals,
  updateUserSavingsGoal,
} from '@/services/savingsGoalService'
import {
  SAVINGS_GOAL_STATUS_LABELS,
  SavingsGoal,
  SavingsGoalFormData,
  SavingsGoalStatus,
} from '@/types/savingsGoal'
import { CurrencyCode } from '@/types/userProfile'
import { toLocalDateString } from '@/utils/date'

interface SavingsGoalsSectionProps {
  currencyCode?: CurrencyCode
}

export function SavingsGoalsSection({
  currencyCode = 'COP',
}: SavingsGoalsSectionProps) {
  const { user } = useAuth()
  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Modales Meta (Crear / Editar)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null)
  const [saving, setSaving] = useState(false)

  // Modal Registrar Avance / Abono
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false)
  const [selectedGoalForDeposit, setSelectedGoalForDeposit] = useState<SavingsGoal | null>(null)
  const [depositAmount, setDepositAmount] = useState('')
  const [savingDeposit, setSavingDeposit] = useState(false)

  // Eliminación
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // Formulario local
  const [formData, setFormData] = useState<SavingsGoalFormData>({
    nombre: '',
    objetivo: '',
    montoActual: '0',
    fechaObjetivo: toLocalDateString(),
    estado: 'active',
    descripcion: '',
  })

  // Sincronización en tiempo real con Firestore
  useEffect(() => {
    if (!user?.uid) {
      setGoals([])
      setLoading(false)
      return
    }
    setLoading(true)
    const unsubscribe = subscribeToUserSavingsGoals(
      user.uid,
      (data) => {
        setGoals(data)
        setLoading(false)
        setError('')
      },
      (err) => {
        console.error('Error cargando metas de ahorro:', err)
        setError('No se pudieron cargar las metas de ahorro.')
        setLoading(false)
      },
    )
    return unsubscribe
  }, [user?.uid])

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: currencyCode,
        maximumFractionDigits: 0,
      }),
    [currencyCode],
  )

  // Cálculo total ahorrado acumulado
  const totalAhorradoAcumulado = useMemo(
    () => goals.reduce((acc, g) => acc + (g.montoActual || 0), 0),
    [goals],
  )

  function handleOpenCreate() {
    setEditingGoal(null)
    setFormData({
      nombre: '',
      objetivo: '',
      montoActual: '0',
      fechaObjetivo: toLocalDateString(),
      estado: 'active',
      descripcion: '',
    })
    setIsModalOpen(true)
  }

  function handleOpenEdit(goal: SavingsGoal) {
    setEditingGoal(goal)
    setFormData({
      nombre: goal.nombre,
      objetivo: String(goal.objetivo),
      montoActual: String(goal.montoActual),
      fechaObjetivo: goal.fechaObjetivo || toLocalDateString(),
      estado: goal.estado,
      descripcion: goal.descripcion || '',
    })
    setIsModalOpen(true)
  }

  function handleCloseModal() {
    if (saving) return
    setIsModalOpen(false)
    setEditingGoal(null)
  }

  function handleOpenDeposit(goal: SavingsGoal) {
    setSelectedGoalForDeposit(goal)
    setDepositAmount('')
    setIsDepositModalOpen(true)
  }

  function handleCloseDepositModal() {
    if (savingDeposit) return
    setIsDepositModalOpen(false)
    setSelectedGoalForDeposit(null)
    setDepositAmount('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.uid) return

    const nombreTrimmed = formData.nombre.trim()
    if (!nombreTrimmed) {
      toast.error('El nombre de la meta es obligatorio.')
      return
    }

    const objNum = Number(formData.objetivo)
    if (isNaN(objNum) || objNum <= 0) {
      toast.error('El monto objetivo debe ser mayor a 0.')
      return
    }

    const actualNum = Number(formData.montoActual || '0')
    if (isNaN(actualNum) || actualNum < 0) {
      toast.error('El monto actual no puede ser negativo.')
      return
    }

    if (!formData.fechaObjetivo) {
      toast.error('Ingresa una fecha objetivo válida.')
      return
    }

    // Determinar automáticamente el estado si alcanza el objetivo
    let estadoFinal: SavingsGoalStatus = formData.estado || 'active'
    if (actualNum >= objNum) {
      estadoFinal = 'completed'
    } else if (estadoFinal === 'completed' && actualNum < objNum) {
      estadoFinal = 'active'
    }

    try {
      setSaving(true)
      if (editingGoal) {
        await updateUserSavingsGoal(user.uid, editingGoal.id, {
          nombre: nombreTrimmed,
          objetivo: objNum,
          montoActual: actualNum,
          fechaObjetivo: formData.fechaObjetivo,
          estado: estadoFinal,
          descripcion: formData.descripcion?.trim(),
        })
        toast.success('✓ Meta de ahorro actualizada correctamente.')
      } else {
        await addUserSavingsGoal(user.uid, {
          userId: user.uid,
          nombre: nombreTrimmed,
          objetivo: objNum,
          montoActual: actualNum,
          fechaObjetivo: formData.fechaObjetivo,
          estado: estadoFinal,
          descripcion: formData.descripcion?.trim(),
        })
        toast.success(
          estadoFinal === 'completed'
            ? '🎉 ¡Meta creada y completada!'
            : '✓ Meta de ahorro creada correctamente.',
        )
      }
      setIsModalOpen(false)
      setEditingGoal(null)
    } catch (err) {
      console.error('Error guardando meta de ahorro:', err)
      toast.error('No se pudo guardar la meta de ahorro.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmitDeposit(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.uid || !selectedGoalForDeposit) return

    const abonoVal = Number(depositAmount)
    if (isNaN(abonoVal) || abonoVal <= 0) {
      toast.error('Ingresa un monto válido mayor a 0.')
      return
    }

    const nuevoMontoActual = selectedGoalForDeposit.montoActual + abonoVal
    const nuevoEstado: SavingsGoalStatus =
      nuevoMontoActual >= selectedGoalForDeposit.objetivo
        ? 'completed'
        : selectedGoalForDeposit.estado === 'cancelled'
        ? 'cancelled'
        : 'active'

    try {
      setSavingDeposit(true)
      await updateUserSavingsGoal(user.uid, selectedGoalForDeposit.id, {
        montoActual: nuevoMontoActual,
        estado: nuevoEstado,
      })

      toast.success(
        nuevoEstado === 'completed'
          ? '🎉 ¡Felicidades! Has alcanzado la meta de ahorro.'
          : '✓ Avance a la meta de ahorro registrado.',
      )
      handleCloseDepositModal()
    } catch (err) {
      console.error('Error registrando avance de ahorro:', err)
      toast.error('No se pudo registrar el avance.')
    } finally {
      setSavingDeposit(false)
    }
  }

  async function executeDeleteGoal() {
    if (!user?.uid || !confirmDeleteId) return
    const id = confirmDeleteId
    try {
      setDeletingId(id)
      setConfirmDeleteId(null)
      await deleteUserSavingsGoal(user.uid, id)
      toast.success('✓ Meta de ahorro eliminada correctamente.')
    } catch (err) {
      console.error('Error eliminando meta de ahorro:', err)
      toast.error('No se pudo eliminar la meta de ahorro.')
    } finally {
      setDeletingId(null)
    }
  }

  const getStatusBadge = (estado: SavingsGoalStatus) => {
    switch (estado) {
      case 'active':
        return (
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
            {SAVINGS_GOAL_STATUS_LABELS.active}
          </span>
        )
      case 'completed':
        return (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
            🎉 {SAVINGS_GOAL_STATUS_LABELS.completed}
          </span>
        )
      case 'cancelled':
        return (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
            {SAVINGS_GOAL_STATUS_LABELS.cancelled}
          </span>
        )
    }
  }

  return (
    <div className="rounded-2xl border border-brand-100 bg-white p-5 shadow-sm dark:border-brand-700/60 dark:bg-brand-800/80">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-brand-900 dark:text-white flex items-center gap-2">
            <span>🐖</span> Metas de Ahorro
          </h2>
          <p className="text-xs text-brand-500 dark:text-brand-400">
            Total acumulado:{' '}
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {currencyFormatter.format(totalAhorradoAcumulado)}
            </span>
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="rounded-lg bg-gold-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-gold-400 active:scale-95 shadow-sm"
        >
          + Nueva Meta
        </button>
      </div>

      {error && (
        <p className="mb-3 text-xs text-red-500 dark:text-red-400">{error}</p>
      )}

      {loading ? (
        <div className="py-6 text-center text-xs text-brand-400 dark:text-brand-500">
          Cargando metas de ahorro...
        </div>
      ) : goals.length === 0 ? (
        <div className="rounded-xl border border-dashed border-brand-200 py-6 text-center dark:border-brand-700">
          <p className="text-sm text-brand-500 dark:text-brand-400">
            No has creado metas de ahorro todavía.
          </p>
          <button
            onClick={handleOpenCreate}
            className="mt-2 text-xs font-semibold text-gold-600 hover:underline dark:text-gold-400"
          >
            Crear mi primera meta de ahorro
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => {
            const porcentaje =
              goal.objetivo > 0
                ? Math.round((goal.montoActual / goal.objetivo) * 100)
                : 0
            const montoRestante = Math.max(0, goal.objetivo - goal.montoActual)
            const isCompleted = goal.estado === 'completed' || porcentaje >= 100
            const barWidth = Math.min(100, porcentaje)

            return (
              <div
                key={goal.id}
                className="rounded-xl border border-brand-100 bg-brand-50/50 p-4 transition dark:border-brand-700/50 dark:bg-brand-900/40"
              >
                <div className="flex flex-col justify-between sm:flex-row sm:items-center">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-brand-900 dark:text-white">
                        {goal.nombre}
                      </p>
                      {getStatusBadge(goal.estado)}
                    </div>
                    <p className="text-xs text-brand-500 dark:text-brand-400">
                      Fecha objetivo:{' '}
                      <span className="font-semibold text-brand-700 dark:text-brand-200">
                        {goal.fechaObjetivo}
                      </span>
                    </p>
                    {goal.descripcion && (
                      <p className="text-xs text-brand-400 dark:text-brand-500 italic">
                        "{goal.descripcion}"
                      </p>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-brand-100 pt-3 sm:mt-0 sm:border-0 sm:pt-0 sm:justify-end sm:gap-4">
                    <div className="text-left sm:text-right">
                      <p className="text-[10px] text-brand-400 uppercase tracking-wide">
                        Ahorrado / Objetivo
                      </p>
                      <p
                        className={`text-sm font-bold ${
                          isCompleted
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-blue-600 dark:text-blue-400'
                        }`}
                      >
                        {currencyFormatter.format(goal.montoActual)}{' '}
                        <span className="text-xs font-normal text-brand-400">
                          / {currencyFormatter.format(goal.objetivo)}
                        </span>
                      </p>
                      {!isCompleted && (
                        <p className="text-[10px] text-brand-400">
                          Faltan: {currencyFormatter.format(montoRestante)}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenDeposit(goal)}
                        className="rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-500 active:scale-95"
                        title="Registrar avance de ahorro"
                      >
                        💵 Abonar
                      </button>
                      <button
                        onClick={() => handleOpenEdit(goal)}
                        className="rounded-lg p-1.5 text-brand-400 hover:bg-brand-100 hover:text-brand-700 dark:hover:bg-brand-700 dark:hover:text-white"
                        title="Editar meta"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(goal.id)}
                        className="rounded-lg p-1.5 text-brand-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                        title="Eliminar meta"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>

                {/* Barra de progreso de ahorro */}
                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between text-[11px] font-medium text-brand-500 dark:text-brand-400">
                    <span>Progreso de ahorro</span>
                    <span className="font-bold text-brand-900 dark:text-white">
                      {porcentaje}%
                    </span>
                  </div>
                  <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-brand-100 dark:bg-brand-700">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isCompleted ? 'bg-emerald-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Meta (Creación / Edición) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-brand-800">
            <h3 className="mb-4 text-lg font-bold text-brand-900 dark:text-white">
              {editingGoal ? 'Editar Meta de Ahorro' : 'Nueva Meta de Ahorro'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-brand-700 dark:text-brand-300 mb-1">
                  Nombre de la meta *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Fondo de emergencia, Viaje vacaciones, Licencia"
                  value={formData.nombre}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, nombre: e.target.value }))
                  }
                  className="input-field w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-brand-700 dark:text-brand-300 mb-1">
                    Monto Objetivo ({currencyCode}) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="2000000"
                    value={formData.objetivo}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, objetivo: e.target.value }))
                    }
                    className="input-field w-full"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-brand-700 dark:text-brand-300 mb-1">
                    Monto Actual ({currencyCode}) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0"
                    value={formData.montoActual}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, montoActual: e.target.value }))
                    }
                    className="input-field w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-brand-700 dark:text-brand-300 mb-1">
                    Fecha Objetivo *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.fechaObjetivo}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        fechaObjetivo: e.target.value,
                      }))
                    }
                    className="input-field w-full"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-brand-700 dark:text-brand-300 mb-1">
                    Estado *
                  </label>
                  <select
                    value={formData.estado}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        estado: e.target.value as SavingsGoalStatus,
                      }))
                    }
                    className="input-field w-full"
                  >
                    {Object.entries(SAVINGS_GOAL_STATUS_LABELS).map(
                      ([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-700 dark:text-brand-300 mb-1">
                  Descripción / Propósito (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Ahorro mensual de 200.000 COP"
                  value={formData.descripcion}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, descripcion: e.target.value }))
                  }
                  className="input-field w-full"
                />
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
                  {saving ? 'Guardando...' : editingGoal ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Registrar Avance de Ahorro */}
      {isDepositModalOpen && selectedGoalForDeposit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-brand-800">
            <h3 className="mb-1 text-lg font-bold text-brand-900 dark:text-white">
              Registrar Avance de Ahorro
            </h3>
            <p className="mb-4 text-xs text-brand-500 dark:text-brand-400">
              Meta: <span className="font-semibold text-brand-900 dark:text-white">{selectedGoalForDeposit.nombre}</span> • Actual: <span className="font-bold text-emerald-600">{currencyFormatter.format(selectedGoalForDeposit.montoActual)}</span> / {currencyFormatter.format(selectedGoalForDeposit.objetivo)}
            </p>

            <form onSubmit={handleSubmitDeposit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-brand-700 dark:text-brand-300 mb-1">
                  Monto a Abonar al Ahorro ({currencyCode}) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="50000"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="input-field w-full"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseDepositModal}
                  disabled={savingDeposit}
                  className="rounded-lg border border-brand-200 px-4 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-50 dark:border-brand-700 dark:text-brand-300 dark:hover:bg-brand-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingDeposit}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
                >
                  {savingDeposit ? 'Guardando...' : 'Confirmar Avance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmación de eliminación */}
      {confirmDeleteId && (
        <ConfirmDialog
          title="Eliminar meta de ahorro"
          message="¿Estás seguro de que deseas eliminar esta meta de ahorro? Esta acción no se puede deshacer."
          confirmLabel="Sí, eliminar"
          loading={deletingId !== null}
          onConfirm={executeDeleteGoal}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  )
}
