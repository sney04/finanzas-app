import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react'
import toast from 'react-hot-toast'
import { BottomNav } from '@/components/BottomNav'
import { FABMenu, FABMenuOption } from '@/components/FABMenu'
import { TransactionFormModal } from '@/components/TransactionFormModal'
import { useAuth } from '@/hooks/useAuth'
import { getUserAccounts } from '@/services/accountService'
import { getUserCategories } from '@/services/categoryService'
import {
  addUserTransaction,
  executeAccountTransfer,
  updateAccountTransfer,
  updateUserTransaction,
} from '@/services/transactionService'
import { getUserProfile } from '@/services/userProfileService'
import { Account } from '@/types/account'
import { CustomCategory } from '@/types/category'
import { Transaction, TransactionType } from '@/types/transaction'
import { DEFAULT_CURRENCY, CurrencyCode } from '@/types/userProfile'

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

export interface OpenModalOptions {
  type?: TransactionType
  transaction?: Transaction
}

interface AppLayoutContextType {
  openTransactionModal: (opts?: OpenModalOptions) => void
  closeTransactionModal: () => void
}

const AppLayoutContext = createContext<AppLayoutContextType | undefined>(undefined)

export function useAppLayout() {
  const context = useContext(AppLayoutContext)
  if (!context) {
    return {
      openTransactionModal: () => {},
      closeTransactionModal: () => {},
    }
  }
  return context
}

interface AppLayoutProps {
  children: ReactNode
}

/**
 * Layout compartido de las páginas privadas: centraliza la navegación
 * (BottomNav), el menú de acciones del botón "+" (FABMenu) y la apertura
 * unificada del formulario de movimientos (creación, edición y transferencias).
 */
export function AppLayout({ children }: AppLayoutProps) {
  const { user } = useAuth()

  // ── Menú de acciones del FAB ──────────────────────────────────────────────
  const [fabOpen, setFabOpen] = useState(false)

  // ── Modal de transacción (creación / edición) ─────────────────────────────
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [modalDefaultType, setModalDefaultType] = useState<TransactionType>('expense')
  const [saving, setSaving] = useState(false)

  // ── Datos de apoyo para el modal (categorías, cuentas y moneda) ───────────
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([])
  const [userAccounts, setUserAccounts] = useState<Account[]>([])
  const [currencyCode, setCurrencyCode] = useState<CurrencyCode>(DEFAULT_CURRENCY)

  useEffect(() => {
    let isCurrentUser = true
    if (!user?.uid) {
      setCustomCategories([])
      setUserAccounts([])
      setCurrencyCode(DEFAULT_CURRENCY)
      return () => {
        isCurrentUser = false
      }
    }
    const uid = user.uid
    async function fetchSupportData() {
      try {
        const categories = await getUserCategories(uid)
        if (isCurrentUser) setCustomCategories(categories)
      } catch (error) {
        console.error('Error cargando categorías:', error)
      }
      try {
        const accounts = await getUserAccounts(uid)
        if (isCurrentUser) setUserAccounts(accounts)
      } catch (error) {
        console.error('Error cargando cuentas para el modal:', error)
      }
      try {
        const profile = await getUserProfile(uid)
        if (isCurrentUser && profile) setCurrencyCode(profile.moneda)
      } catch (error) {
        console.error('Error cargando perfil:', error)
      }
    }
    fetchSupportData()
    return () => {
      isCurrentUser = false
    }
  }, [user?.uid, modalOpen])

  const availableCategories = useMemo(
    () => [...new Set([...DEFAULT_CATEGORIES, ...customCategories.map((c) => c.name)])].sort(),
    [customCategories],
  )

  // ─── Controladores de Apertura del Modal ─────────────────────────────────

  function openTransactionModal(opts?: OpenModalOptions) {
    if (opts?.transaction) {
      setEditingTransaction(opts.transaction)
      setModalDefaultType(opts.transaction.type)
    } else {
      setEditingTransaction(null)
      setModalDefaultType(opts?.type || 'expense')
    }
    setModalOpen(true)
  }

  function handleCloseModal() {
    if (saving) return
    setModalOpen(false)
    setEditingTransaction(null)
  }

  function handleFabSelect(option: FABMenuOption) {
    if (option !== 'income' && option !== 'expense' && option !== 'transfer') return
    openTransactionModal({ type: option })
  }

  async function handleSaveTransaction(data: Omit<Transaction, 'id' | 'userId'>) {
    if (!user?.uid) {
      toast.error('Debes iniciar sesión para registrar movimientos.')
      return
    }

    try {
      setSaving(true)

      if (data.type === 'transfer') {
        if (!data.accountId || !data.destinationAccountId) {
          toast.error('Debes seleccionar la cuenta de origen y la cuenta de destino.')
          setSaving(false)
          return
        }
        if (data.accountId === data.destinationAccountId) {
          toast.error('La cuenta de origen y de destino deben ser diferentes.')
          setSaving(false)
          return
        }

        if (editingTransaction) {
          await updateAccountTransfer(user.uid, editingTransaction.id, {
            originAccountId: data.accountId,
            destinationAccountId: data.destinationAccountId,
            amount: data.amount,
            date: data.date,
            description: data.description,
            category: data.category || 'Transferencia',
          })
          toast.success('✓ Transferencia actualizada correctamente.')
        } else {
          await executeAccountTransfer(user.uid, {
            originAccountId: data.accountId,
            destinationAccountId: data.destinationAccountId,
            amount: data.amount,
            date: data.date,
            description: data.description,
            category: data.category || 'Transferencia',
          })
          toast.success('✓ Transferencia entre cuentas realizada correctamente.')
        }
        setModalOpen(false)
        setEditingTransaction(null)
        return
      }

      if (editingTransaction) {
        await updateUserTransaction(user.uid, editingTransaction.id, {
          ...data,
          userId: user.uid,
        })
        toast.success('✓ Movimiento actualizado correctamente.')
      } else {
        await addUserTransaction(user.uid, { ...data, userId: user.uid })
        toast.success(
          data.type === 'income'
            ? '✓ Ingreso registrado correctamente.'
            : '✓ Gasto registrado correctamente.',
        )
      }
      setModalOpen(false)
      setEditingTransaction(null)
    } catch (error: unknown) {
      console.error('Error guardando movimiento:', error)
      const message = error instanceof Error ? error.message : 'No se pudo guardar el movimiento.'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppLayoutContext.Provider
      value={{ openTransactionModal, closeTransactionModal: handleCloseModal }}
    >
      <div className="min-h-screen bg-surface-light text-brand-900 dark:bg-surface-dark dark:text-white pb-24">
        {children}

        <FABMenu
          isOpen={fabOpen}
          onClose={() => setFabOpen(false)}
          onSelectOption={handleFabSelect}
        />

        <BottomNav
          onAddPress={() => setFabOpen((open) => !open)}
          disabled={saving}
        />

        {modalOpen && (
          <TransactionFormModal
            availableCategories={availableCategories}
            accounts={userAccounts}
            editingTransaction={editingTransaction}
            defaultType={modalDefaultType}
            saving={saving}
            currencyPlaceholder={currencyCode === 'COP' ? '250000' : '100'}
            onSave={handleSaveTransaction}
            onCancel={handleCloseModal}
          />
        )}
      </div>
    </AppLayoutContext.Provider>
  )
}
