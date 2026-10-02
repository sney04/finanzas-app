import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useAuth } from '@/hooks/useAuth'
import {
  addUserDebtPayment,
  deleteUserDebtPayment,
  subscribeToUserDebtPayments,
  updateUserDebtPayment,
} from '@/services/debtPaymentService'
import {
  addUserDebt,
  deleteUserDebt,
  subscribeToUserDebts,
  updateUserDebt,
} from '@/services/debtService'
import {
  Debt,
  DEBT_STATUS_COLORS,
  DEBT_STATUS_LABELS,
  DebtFormData,
  DebtStatus,
} from '@/types/debt'
import { DebtPayment, DebtPaymentFormData } from '@/types/debtPayment'
import { CurrencyCode } from '@/types/userProfile'
import { toLocalDateString } from '@/utils/date'

interface DebtsSectionProps {
  currencyCode?: CurrencyCode
}

export function DebtsSection({ currencyCode = 'COP' }: DebtsSectionProps) {
  const { user } = useAuth()

  // Deudas
  const [debts, setDebts] = useState<Debt[]>([])
  const [loadingDebts, setLoadingDebts] = useState(true)
  const [errorDebts, setErrorDebts] = useState('')

  // Pagos
  const [payments, setPayments] = useState<DebtPayment[]>([])

  // Modal Deuda (Crear/Editar)
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false)
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null)
  const [savingDebt, setSavingDebt] = useState(false)

  // Modal Pago (Crear/Editar)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [selectedDebtForPayment, setSelectedDebtForPayment] = useState<Debt | null>(null)
  const [editingPayment, setEditingPayment] = useState<DebtPayment | null>(null)
  const [savingPayment, setSavingPayment] = useState(false)

  // Visualizar Historial de Pagos de una Deuda
  const [expandedDebtId, setExpandedDebtId] = useState<string | null>(null)

  // Eliminación Deuda
  const [deletingDebtId, setDeletingDebtId] = useState<string | null>(null)
  const [confirmDeleteDebtId, setConfirmDeleteDebtId] = useState<string | null>(null)

  // Eliminación Pago
  const [deletingPayment, setDeletingPayment] = useState<DebtPayment | null>(null)
  const [confirmDeletePayment, setConfirmDeletePayment] = useState<DebtPayment | null>(null)

  // Formularios locales
  const [debtFormData, setDebtFormData] = useState<DebtFormData>({
    nombre: '',
    acreedor: '',
    montoOriginal: '',
    saldoPendiente: '',
    fechaVencimiento: toLocalDateString(),
    estado: 'active',
    descripcion: '',
  })

  const [paymentFormData, setPaymentFormData] = useState<DebtPaymentFormData>({
    debtId: '',
    monto: '',
    fecha: toLocalDateString(),
    descripcion: '',
  })

  // Sincronización de Deudas en tiempo real
  useEffect(() => {
    if (!user?.uid) {
      setDebts([])
      setLoadingDebts(false)
      return
    }
    setLoadingDebts(true)
    const unsubscribe = subscribeToUserDebts(
      user.uid,
      (data) => {
        setDebts(data)
        setLoadingDebts(false)
        setErrorDebts('')
      },
      (err) => {
        console.error('Error cargando deudas:', err)
        setErrorDebts('No se pudieron cargar las deudas.')
        setLoadingDebts(false)
      },
    )
    return unsubscribe
  }, [user?.uid])

  // Sincronización de Pagos en tiempo real
  useEffect(() => {
    if (!user?.uid) {
      setPayments([])
      return
    }
    const unsubscribe = subscribeToUserDebtPayments(
      user.uid,
      (data) => {
        setPayments(data)
      },
      (err) => {
        console.error('Error cargando pagos de deudas:', err)
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

  // Cálculo total pendiente de deudas activas
  const totalSaldoPendiente = useMemo(
    () =>
      debts
        .filter((d) => d.estado === 'active')
        .reduce((sum, d) => sum + (d.saldoPendiente || 0), 0),
    [debts],
  )

  // ─── Handlers de Deuda ───────────────────────────────────────────────────

  function handleOpenCreateDebt() {
    setEditingDebt(null)
    setDebtFormData({
      nombre: '',
      acreedor: '',
      montoOriginal: '',
      saldoPendiente: '',
      fechaVencimiento: toLocalDateString(),
      estado: 'active',
      descripcion: '',
    })
    setIsDebtModalOpen(true)
  }

  function handleOpenEditDebt(debt: Debt) {
    setEditingDebt(debt)
    setDebtFormData({
      nombre: debt.nombre,
      acreedor: debt.acreedor,
      montoOriginal: String(debt.montoOriginal),
      saldoPendiente: String(debt.saldoPendiente),
      fechaVencimiento: debt.fechaVencimiento || toLocalDateString(),
      estado: debt.estado,
      descripcion: debt.descripcion || '',
    })
    setIsDebtModalOpen(true)
  }

  function handleCloseDebtModal() {
    if (savingDebt) return
    setIsDebtModalOpen(false)
    setEditingDebt(null)
  }

  async function handleSubmitDebt(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.uid) return

    const nombreTrimmed = debtFormData.nombre.trim()
    const acreedorTrimmed = debtFormData.acreedor.trim()

    if (!nombreTrimmed) {
      toast.error('El nombre de la deuda es obligatorio.')
      return
    }
    if (!acreedorTrimmed) {
      toast.error('El acreedor es obligatorio.')
      return
    }

    const montoOrig = Number(debtFormData.montoOriginal)
    if (isNaN(montoOrig) || montoOrig <= 0) {
      toast.error('El monto original debe ser mayor a 0.')
      return
    }

    const saldoPend = Number(debtFormData.saldoPendiente)
    if (isNaN(saldoPend) || saldoPend < 0) {
      toast.error('El saldo pendiente no puede ser negativo.')
      return
    }
    if (saldoPend > montoOrig) {
      toast.error('El saldo pendiente no puede superar el monto original.')
      return
    }

    try {
      setSavingDebt(true)
      if (editingDebt) {
        await updateUserDebt(user.uid, editingDebt.id, {
          nombre: nombreTrimmed,
          acreedor: acreedorTrimmed,
          montoOriginal: montoOrig,
          saldoPendiente: saldoPend,
          fechaVencimiento: debtFormData.fechaVencimiento,
          estado: debtFormData.estado || 'active',
          descripcion: debtFormData.descripcion?.trim(),
        })
        toast.success('✓ Deuda actualizada correctamente.')
      } else {
        await addUserDebt(user.uid, {
          userId: user.uid,
          nombre: nombreTrimmed,
          acreedor: acreedorTrimmed,
          montoOriginal: montoOrig,
          saldoPendiente: saldoPend,
          fechaVencimiento: debtFormData.fechaVencimiento,
          estado: debtFormData.estado || 'active',
          descripcion: debtFormData.descripcion?.trim(),
        })
        toast.success('✓ Deuda creada correctamente.')
      }
      setIsDebtModalOpen(false)
      setEditingDebt(null)
    } catch (err) {
      console.error('Error guardando deuda:', err)
      toast.error('No se pudo guardar la deuda.')
    } finally {
      setSavingDebt(false)
    }
  }

  async function executeDeleteDebt() {
    if (!user?.uid || !confirmDeleteDebtId) return
    const id = confirmDeleteDebtId
    try {
      setDeletingDebtId(id)
      setConfirmDeleteDebtId(null)
      await deleteUserDebt(user.uid, id)
      toast.success('✓ Deuda eliminada correctamente.')
    } catch (err) {
      console.error('Error eliminando deuda:', err)
      toast.error('No se pudo eliminar la deuda.')
    } finally {
      setDeletingDebtId(null)
    }
  }

  // ─── Handlers de Pagos de Deudas ─────────────────────────────────────────

  function handleOpenCreatePayment(debt: Debt) {
    if (debt.estado === 'paid') {
      toast.error('Esta deuda ya se encuentra completamente pagada.')
      return
    }
    setSelectedDebtForPayment(debt)
    setEditingPayment(null)
    setPaymentFormData({
      debtId: debt.id,
      monto: String(debt.saldoPendiente),
      fecha: toLocalDateString(),
      descripcion: '',
    })
    setIsPaymentModalOpen(true)
  }

  function handleOpenEditPayment(payment: DebtPayment) {
    const associatedDebt = debts.find((d) => d.id === payment.debtId)
    if (!associatedDebt) {
      toast.error('No se encontró la deuda asociada.')
      return
    }
    setSelectedDebtForPayment(associatedDebt)
    setEditingPayment(payment)
    setPaymentFormData({
      debtId: payment.debtId,
      monto: String(payment.monto),
      fecha: payment.fecha || toLocalDateString(),
      descripcion: payment.descripcion || '',
    })
    setIsPaymentModalOpen(true)
  }

  function handleClosePaymentModal() {
    if (savingPayment) return
    setIsPaymentModalOpen(false)
    setSelectedDebtForPayment(null)
    setEditingPayment(null)
  }

  async function handleSubmitPayment(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.uid || !selectedDebtForPayment) return

    const montoVal = Number(paymentFormData.monto)
    if (isNaN(montoVal) || montoVal <= 0) {
      toast.error('El monto del pago debe ser mayor a 0.')
      return
    }

    if (!paymentFormData.fecha) {
      toast.error('La fecha del pago es requerida.')
      return
    }

    const currentDebt = selectedDebtForPayment

    if (editingPayment) {
      try {
        setSavingPayment(true)
        await updateUserDebtPayment(user.uid, editingPayment.id, {
          monto: montoVal,
          fecha: paymentFormData.fecha,
          descripcion: paymentFormData.descripcion?.trim(),
        })

        toast.success('✓ Pago actualizado correctamente.')
        handleClosePaymentModal()
      } catch (err) {
        console.error('Error actualizando pago:', err)
        toast.error(err instanceof Error ? err.message : 'No se pudo actualizar el pago.')
      } finally {
        setSavingPayment(false)
      }
    } else {
      try {
        setSavingPayment(true)
        await addUserDebtPayment(user.uid, {
          userId: user.uid,
          debtId: currentDebt.id,
          monto: montoVal,
          fecha: paymentFormData.fecha,
          descripcion: paymentFormData.descripcion?.trim(),
        })

        toast.success('✓ Pago a deuda registrado correctamente.')
        handleClosePaymentModal()
      } catch (err) {
        console.error('Error registrando pago de deuda:', err)
        toast.error(err instanceof Error ? err.message : 'No se pudo registrar el pago.')
      } finally {
        setSavingPayment(false)
      }
    }
  }

  async function executeDeletePayment() {
    if (!user?.uid || !confirmDeletePayment) return
    const payment = confirmDeletePayment

    try {
      setDeletingPayment(payment)
      setConfirmDeletePayment(null)

      await deleteUserDebtPayment(user.uid, payment.id)

      toast.success('✓ Pago eliminado y saldo restaurado correctamente.')
    } catch (err) {
      console.error('Error eliminando pago:', err)
      toast.error(err instanceof Error ? err.message : 'No se pudo eliminar el pago.')
    } finally {
      setDeletingPayment(null)
    }
  }

  const getStatusBadge = (estado: DebtStatus) => {
    switch (estado) {
      case 'active':
        return (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-300">
            {DEBT_STATUS_LABELS.active}
          </span>
        )
      case 'paid':
        return (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
            {DEBT_STATUS_LABELS.paid}
          </span>
        )
      case 'cancelled':
        return (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
            {DEBT_STATUS_LABELS.cancelled}
          </span>
        )
    }
  }

  return (
    <div className="rounded-2xl border border-brand-100 bg-white p-5 shadow-sm dark:border-brand-700/60 dark:bg-brand-800/80">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-brand-900 dark:text-white flex items-center gap-2">
            <span>📋</span> Gestor de Deudas y Pagos
          </h2>
          <p className="text-xs text-brand-500 dark:text-brand-400">
            Total pendiente (activas):{' '}
            <span className="font-semibold text-red-600 dark:text-red-400">
              {currencyFormatter.format(totalSaldoPendiente)}
            </span>
          </p>
        </div>
        <button
          onClick={handleOpenCreateDebt}
          className="rounded-lg bg-gold-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-gold-400 active:scale-95 shadow-sm"
        >
          + Nueva Deuda
        </button>
      </div>

      {errorDebts && (
        <p className="mb-3 text-xs text-red-500 dark:text-red-400">{errorDebts}</p>
      )}

      {loadingDebts ? (
        <div className="py-6 text-center text-xs text-brand-400 dark:text-brand-500">
          Cargando deudas...
        </div>
      ) : debts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-brand-200 py-6 text-center dark:border-brand-700">
          <p className="text-sm text-brand-500 dark:text-brand-400">
            No tienes deudas registradas.
          </p>
          <button
            onClick={handleOpenCreateDebt}
            className="mt-2 text-xs font-semibold text-gold-600 hover:underline dark:text-gold-400"
          >
            Registrar mi primera deuda
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {debts.map((debt) => {
            const debtPayments = payments.filter((p) => p.debtId === debt.id)
            const isExpanded = expandedDebtId === debt.id

            return (
              <div
                key={debt.id}
                className="rounded-xl border border-brand-100 bg-brand-50/50 p-4 transition dark:border-brand-700/50 dark:bg-brand-900/40"
              >
                <div className="flex flex-col justify-between sm:flex-row sm:items-center">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-brand-900 dark:text-white">
                        {debt.nombre}
                      </p>
                      {getStatusBadge(debt.estado)}
                    </div>
                    <p className="text-xs text-brand-500 dark:text-brand-400">
                      Acreedor:{' '}
                      <span className="font-semibold text-brand-700 dark:text-brand-200">
                        {debt.acreedor}
                      </span>
                      <span className="mx-2">•</span>
                      Vence: <span className="font-medium">{debt.fechaVencimiento}</span>
                    </p>
                    {debt.descripcion && (
                      <p className="text-xs text-brand-400 dark:text-brand-500 italic">
                        "{debt.descripcion}"
                      </p>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-brand-100 pt-3 sm:mt-0 sm:border-0 sm:pt-0 sm:justify-end sm:gap-4">
                    <div className="text-left sm:text-right">
                      <p className="text-[10px] text-brand-400 uppercase tracking-wide">
                        Saldo Pendiente
                      </p>
                      <p
                        className={`text-sm font-bold ${DEBT_STATUS_COLORS[debt.estado]}`}
                      >
                        {currencyFormatter.format(debt.saldoPendiente)}
                      </p>
                      <p className="text-[10px] text-brand-400">
                        Original: {currencyFormatter.format(debt.montoOriginal)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {debt.estado !== 'paid' && (
                        <button
                          onClick={() => handleOpenCreatePayment(debt)}
                          className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-500 active:scale-95"
                          title="Registrar Pago a esta deuda"
                        >
                          💳 Abonar
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenEditDebt(debt)}
                        className="rounded-lg p-1.5 text-brand-400 hover:bg-brand-100 hover:text-brand-700 dark:hover:bg-brand-700 dark:hover:text-white"
                        title="Editar deuda"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => setConfirmDeleteDebtId(debt.id)}
                        className="rounded-lg p-1.5 text-brand-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                        title="Eliminar deuda"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>

                {/* Botón ver/ocultar historial de pagos */}
                <div className="mt-3 flex items-center justify-between border-t border-brand-100/60 pt-2 text-xs dark:border-brand-700/60">
                  <button
                    onClick={() =>
                      setExpandedDebtId(isExpanded ? null : debt.id)
                    }
                    className="flex items-center gap-1 font-semibold text-brand-600 hover:text-brand-900 dark:text-brand-400 dark:hover:text-white"
                  >
                    <span>{isExpanded ? '▼' : '▶'}</span>
                    <span>
                      Historial de pagos ({debtPayments.length})
                    </span>
                  </button>
                </div>

                {/* Sub-sección Historial de Pagos Desplegable */}
                {isExpanded && (
                  <div className="mt-3 space-y-2 rounded-xl bg-white p-3 border border-brand-100 dark:border-brand-700 dark:bg-brand-800">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-brand-800 dark:text-brand-200">
                        Historial de Abonos / Pagos
                      </p>
                      {debt.estado !== 'paid' && (
                        <button
                          onClick={() => handleOpenCreatePayment(debt)}
                          className="text-xs font-semibold text-emerald-600 hover:underline dark:text-emerald-400"
                        >
                          + Nuevo Abono
                        </button>
                      )}
                    </div>

                    {debtPayments.length === 0 ? (
                      <p className="py-2 text-center text-xs text-brand-400">
                        No hay abonos registrados para esta deuda.
                      </p>
                    ) : (
                      <div className="divide-y divide-brand-100 dark:divide-brand-700">
                        {debtPayments.map((payment) => (
                          <div
                            key={payment.id}
                            className="flex items-center justify-between py-2 text-xs"
                          >
                            <div>
                              <p className="font-semibold text-brand-900 dark:text-white">
                                {currencyFormatter.format(payment.monto)}
                              </p>
                              <p className="text-[10px] text-brand-400">
                                Fecha: {payment.fecha}
                                {payment.descripcion ? ` • ${payment.descripcion}` : ''}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleOpenEditPayment(payment)}
                                className="p-1 text-brand-400 hover:text-brand-700 dark:hover:text-white"
                                title="Editar pago"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => setConfirmDeletePayment(payment)}
                                className="p-1 text-brand-400 hover:text-red-500"
                                title="Eliminar pago"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Deuda (Creación / Edición) */}
      {isDebtModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-brand-800">
            <h3 className="mb-4 text-lg font-bold text-brand-900 dark:text-white">
              {editingDebt ? 'Editar Deuda' : 'Nueva Deuda'}
            </h3>

            <form onSubmit={handleSubmitDebt} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-brand-700 dark:text-brand-300 mb-1">
                  Nombre de la deuda *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Tarjeta de Crédito, Préstamo coche"
                  value={debtFormData.nombre}
                  onChange={(e) =>
                    setDebtFormData((prev) => ({ ...prev, nombre: e.target.value }))
                  }
                  className="input-field w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-700 dark:text-brand-300 mb-1">
                  Acreedor *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Banco Bancolombia, Pedro Pérez"
                  value={debtFormData.acreedor}
                  onChange={(e) =>
                    setDebtFormData((prev) => ({ ...prev, acreedor: e.target.value }))
                  }
                  className="input-field w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-brand-700 dark:text-brand-300 mb-1">
                    Monto Original ({currencyCode}) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="1000000"
                    value={debtFormData.montoOriginal}
                    onChange={(e) => {
                      const val = e.target.value
                      setDebtFormData((prev) => ({
                        ...prev,
                        montoOriginal: val,
                        saldoPendiente: !editingDebt && !prev.saldoPendiente ? val : prev.saldoPendiente,
                      }))
                    }}
                    className="input-field w-full"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-brand-700 dark:text-brand-300 mb-1">
                    Saldo Pendiente ({currencyCode}) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="500000"
                    value={debtFormData.saldoPendiente}
                    onChange={(e) =>
                      setDebtFormData((prev) => ({ ...prev, saldoPendiente: e.target.value }))
                    }
                    className="input-field w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-brand-700 dark:text-brand-300 mb-1">
                    Fecha de Vencimiento *
                  </label>
                  <input
                    type="date"
                    required
                    value={debtFormData.fechaVencimiento}
                    onChange={(e) =>
                      setDebtFormData((prev) => ({
                        ...prev,
                        fechaVencimiento: e.target.value,
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
                    value={debtFormData.estado}
                    onChange={(e) =>
                      setDebtFormData((prev) => ({
                        ...prev,
                        estado: e.target.value as DebtStatus,
                      }))
                    }
                    className="input-field w-full"
                  >
                    {Object.entries(DEBT_STATUS_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-700 dark:text-brand-300 mb-1">
                  Descripción / Notas (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Cuotas mensuales de 100,000 COP"
                  value={debtFormData.descripcion}
                  onChange={(e) =>
                    setDebtFormData((prev) => ({ ...prev, descripcion: e.target.value }))
                  }
                  className="input-field w-full"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseDebtModal}
                  disabled={savingDebt}
                  className="rounded-lg border border-brand-200 px-4 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-50 dark:border-brand-700 dark:text-brand-300 dark:hover:bg-brand-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingDebt}
                  className="rounded-lg bg-gold-500 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-gold-400 disabled:opacity-50"
                >
                  {savingDebt ? 'Guardando...' : editingDebt ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Pago de Deuda (Creación / Edición) */}
      {isPaymentModalOpen && selectedDebtForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-brand-800">
            <h3 className="mb-1 text-lg font-bold text-brand-900 dark:text-white">
              {editingPayment ? 'Editar Pago / Abono' : 'Registrar Pago / Abono'}
            </h3>
            <p className="mb-4 text-xs text-brand-500 dark:text-brand-400">
              Deuda: <span className="font-semibold text-brand-900 dark:text-white">{selectedDebtForPayment.nombre}</span> ({selectedDebtForPayment.acreedor}) • Saldo actual: <span className="font-bold text-red-500">{currencyFormatter.format(selectedDebtForPayment.saldoPendiente)}</span>
            </p>

            <form onSubmit={handleSubmitPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-brand-700 dark:text-brand-300 mb-1">
                  Monto del Abono ({currencyCode}) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="0"
                  value={paymentFormData.monto}
                  onChange={(e) =>
                    setPaymentFormData((prev) => ({ ...prev, monto: e.target.value }))
                  }
                  className="input-field w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-700 dark:text-brand-300 mb-1">
                  Fecha del Pago *
                </label>
                <input
                  type="date"
                  required
                  value={paymentFormData.fecha}
                  onChange={(e) =>
                    setPaymentFormData((prev) => ({ ...prev, fecha: e.target.value }))
                  }
                  className="input-field w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-700 dark:text-brand-300 mb-1">
                  Descripción / Referencia (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Pago de cuota mensual #3 vía Nequi"
                  value={paymentFormData.descripcion}
                  onChange={(e) =>
                    setPaymentFormData((prev) => ({ ...prev, descripcion: e.target.value }))
                  }
                  className="input-field w-full"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleClosePaymentModal}
                  disabled={savingPayment}
                  className="rounded-lg border border-brand-200 px-4 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-50 dark:border-brand-700 dark:text-brand-300 dark:hover:bg-brand-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPayment}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50"
                >
                  {savingPayment ? 'Procesando...' : editingPayment ? 'Actualizar Pago' : 'Confirmar Pago'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmación de eliminación de Deuda */}
      {confirmDeleteDebtId && (
        <ConfirmDialog
          title="Eliminar deuda"
          message="¿Estás seguro de que deseas eliminar esta deuda? La acción no se puede deshacer."
          confirmLabel="Sí, eliminar"
          loading={deletingDebtId !== null}
          onConfirm={executeDeleteDebt}
          onCancel={() => setConfirmDeleteDebtId(null)}
        />
      )}

      {/* Confirmación de eliminación de Pago */}
      {confirmDeletePayment && (
        <ConfirmDialog
          title="Eliminar pago de deuda"
          message={`¿Eliminar el abono de ${currencyFormatter.format(confirmDeletePayment.monto)} realizado el ${confirmDeletePayment.fecha}? El saldo pendiente de la deuda se restaurará automáticamente.`}
          confirmLabel="Sí, eliminar pago"
          loading={deletingPayment !== null}
          onConfirm={executeDeletePayment}
          onCancel={() => setConfirmDeletePayment(null)}
        />
      )}
    </div>
  )
}
