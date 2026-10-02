import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useAuth } from '@/hooks/useAuth'
import {
  addUserAccount,
  deleteUserAccount,
  subscribeToUserAccounts,
  updateUserAccount,
} from '@/services/accountService'
import {
  Account,
  ACCOUNT_TYPE_LABELS,
  AccountFormData,
  AccountType,
} from '@/types/account'
import { CurrencyCode } from '@/types/userProfile'

interface AccountsSectionProps {
  currencyCode?: CurrencyCode
}

export function AccountsSection({ currencyCode = 'COP' }: AccountsSectionProps) {
  const { user } = useAuth()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [saving, setSaving] = useState(false)

  // Eliminación
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // Formulario local
  const [formData, setFormData] = useState<AccountFormData>({
    nombre: '',
    tipo: 'efectivo',
    saldo: '',
    descripcion: '',
  })

  // Sincronización en tiempo real con Firestore
  useEffect(() => {
    if (!user?.uid) {
      setAccounts([])
      setLoading(false)
      return
    }
    setLoading(true)
    const unsubscribe = subscribeToUserAccounts(
      user.uid,
      (data) => {
        setAccounts(data)
        setLoading(false)
        setError('')
      },
      (err) => {
        console.error('Error cargando cuentas:', err)
        setError('No se pudieron cargar las cuentas.')
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

  const totalSaldoCuentas = useMemo(
    () => accounts.reduce((acc, a) => acc + (a.saldo || 0), 0),
    [accounts],
  )

  function handleOpenCreate() {
    setEditingAccount(null)
    setFormData({
      nombre: '',
      tipo: 'efectivo',
      saldo: '',
      descripcion: '',
    })
    setIsModalOpen(true)
  }

  function handleOpenEdit(account: Account) {
    setEditingAccount(account)
    setFormData({
      nombre: account.nombre,
      tipo: account.tipo,
      saldo: String(account.saldo),
      descripcion: account.descripcion || '',
    })
    setIsModalOpen(true)
  }

  function handleCloseModal() {
    if (saving) return
    setIsModalOpen(false)
    setEditingAccount(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.uid) return

    const nombreTrimmed = formData.nombre.trim()
    if (!nombreTrimmed) {
      toast.error('El nombre de la cuenta es obligatorio.')
      return
    }

    const saldoNum = Number(formData.saldo)
    if (isNaN(saldoNum)) {
      toast.error('Ingresa un saldo válido.')
      return
    }

    try {
      setSaving(true)
      if (editingAccount) {
        await updateUserAccount(user.uid, editingAccount.id, {
          nombre: nombreTrimmed,
          tipo: formData.tipo,
          saldo: saldoNum,
          moneda: currencyCode,
          descripcion: formData.descripcion?.trim(),
        })
        toast.success('✓ Cuenta actualizada correctamente.')
      } else {
        await addUserAccount(user.uid, {
          userId: user.uid,
          nombre: nombreTrimmed,
          tipo: formData.tipo,
          saldo: saldoNum,
          moneda: currencyCode,
          descripcion: formData.descripcion?.trim(),
        })
        toast.success('✓ Cuenta creada correctamente.')
      }
      setIsModalOpen(false)
      setEditingAccount(null)
    } catch (err) {
      console.error('Error guardando cuenta:', err)
      toast.error('No se pudo guardar la cuenta.')
    } finally {
      setSaving(false)
    }
  }

  async function executeDeleteAccount() {
    if (!user?.uid || !confirmDeleteId) return
    const id = confirmDeleteId
    try {
      setDeletingId(id)
      setConfirmDeleteId(null)
      await deleteUserAccount(user.uid, id)
      toast.success('✓ Cuenta eliminada correctamente.')
    } catch (err) {
      console.error('Error eliminando cuenta:', err)
      toast.error('No se pudo eliminar la cuenta.')
    } finally {
      setDeletingId(null)
    }
  }

  const getAccountIcon = (tipo: AccountType) => {
    switch (tipo) {
      case 'efectivo':
        return '💵'
      case 'bancaria':
        return '🏦'
      case 'nequi':
        return '📱'
      case 'daviplata':
        return '💳'
      default:
        return '💰'
    }
  }

  return (
    <div className="rounded-2xl border border-brand-100 bg-white p-5 shadow-sm dark:border-brand-700/60 dark:bg-brand-800/80">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-brand-900 dark:text-white flex items-center gap-2">
            <span>💳</span> Mis Cuentas
          </h2>
          <p className="text-xs text-brand-500 dark:text-brand-400">
            Total en cuentas: <span className="font-semibold text-brand-900 dark:text-white">{currencyFormatter.format(totalSaldoCuentas)}</span>
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="rounded-lg bg-gold-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-gold-400 active:scale-95 shadow-sm"
        >
          + Nueva Cuenta
        </button>
      </div>

      {error && (
        <p className="mb-3 text-xs text-red-500 dark:text-red-400">{error}</p>
      )}

      {loading ? (
        <div className="py-6 text-center text-xs text-brand-400 dark:text-brand-500">
          Cargando cuentas...
        </div>
      ) : accounts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-brand-200 py-6 text-center dark:border-brand-700">
          <p className="text-sm text-brand-500 dark:text-brand-400">
            No tienes cuentas registradas aún.
          </p>
          <button
            onClick={handleOpenCreate}
            className="mt-2 text-xs font-semibold text-gold-600 hover:underline dark:text-gold-400"
          >
            Registrar mi primera cuenta
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className="flex items-center justify-between rounded-xl border border-brand-100 bg-brand-50/50 p-3 transition hover:border-brand-200 dark:border-brand-700/50 dark:bg-brand-900/40 dark:hover:border-brand-600"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-xl shadow-xs dark:bg-brand-800">
                  {getAccountIcon(acc.tipo)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-brand-900 dark:text-white">
                      {acc.nombre}
                    </p>
                    <span className="rounded-md bg-brand-100 px-1.5 py-0.5 text-[10px] font-medium text-brand-700 dark:bg-brand-700/80 dark:text-brand-300">
                      {ACCOUNT_TYPE_LABELS[acc.tipo] || acc.tipo}
                    </span>
                  </div>
                  {acc.descripcion && (
                    <p className="text-xs text-brand-400 dark:text-brand-500 line-clamp-1">
                      {acc.descripcion}
                    </p>
                  )}
                  <p className="text-sm font-bold text-gold-600 dark:text-gold-400">
                    {currencyFormatter.format(acc.saldo)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleOpenEdit(acc)}
                  className="rounded-lg p-1.5 text-brand-400 hover:bg-brand-100 hover:text-brand-700 dark:hover:bg-brand-700 dark:hover:text-white"
                  title="Editar cuenta"
                >
                  ✏️
                </button>
                <button
                  onClick={() => setConfirmDeleteId(acc.id)}
                  className="rounded-lg p-1.5 text-brand-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                  title="Eliminar cuenta"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Creación / Edición */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-brand-800">
            <h3 className="mb-4 text-lg font-bold text-brand-900 dark:text-white">
              {editingAccount ? 'Editar Cuenta' : 'Nueva Cuenta'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-brand-700 dark:text-brand-300 mb-1">
                  Nombre de la cuenta *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Nomina Banco, Nequi Personal"
                  value={formData.nombre}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, nombre: e.target.value }))
                  }
                  className="input-field w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-700 dark:text-brand-300 mb-1">
                  Tipo de cuenta *
                </label>
                <select
                  value={formData.tipo}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      tipo: e.target.value as AccountType,
                    }))
                  }
                  className="input-field w-full"
                >
                  {Object.entries(ACCOUNT_TYPE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-700 dark:text-brand-300 mb-1">
                  Saldo actual ({currencyCode}) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="0"
                  value={formData.saldo}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, saldo: e.target.value }))
                  }
                  className="input-field w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-700 dark:text-brand-300 mb-1">
                  Descripción / Notas (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Cuenta principal para gastos del hogar"
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
                  {saving ? 'Guardando...' : editingAccount ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmación de eliminación */}
      {confirmDeleteId && (
        <ConfirmDialog
          title="Eliminar cuenta"
          message="¿Estás seguro de que deseas eliminar esta cuenta? Los datos históricos asociados no se borrarán pero la cuenta dejará de estar disponible."
          confirmLabel="Sí, eliminar"
          loading={deletingId !== null}
          onConfirm={executeDeleteAccount}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  )
}
