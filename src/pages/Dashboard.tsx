import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import { useDarkMode } from '@/hooks/useDarkMode'
import { AppLayout, useAppLayout } from '@/components/AppLayout'
import { AccountsSection } from '@/components/AccountsSection'
import { DebtsSection } from '@/components/DebtsSection'
import { BudgetsSection } from '@/components/BudgetsSection'
import { SavingsGoalsSection } from '@/components/SavingsGoalsSection'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { FinancialCharts } from '@/components/FinancialCharts'
import { addUserCategory, deleteUserCategory, getUserCategories } from '@/services/categoryService'
import { deleteTransferTransaction, deleteUserTransaction, subscribeToUserTransactions } from '@/services/transactionService'
import { getUserProfile, updateUserProfile } from '@/services/userProfileService'
import { CustomCategory } from '@/types/category'
import { Transaction, TransactionType } from '@/types/transaction'
import { formatDayHeader, getYearMonth } from '@/utils/date'
import { getCategoryIcon } from '@/utils/categoryIcons'
import { DEFAULT_CURRENCY, DEFAULT_SAVINGS_GOAL, SUPPORTED_CURRENCIES, CurrencyCode } from '@/types/userProfile'

// ─── Constantes ───────────────────────────────────────────────────────────────

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

type TransactionFilter = 'all' | TransactionType

// Nombres de meses en español para el selector
const MONTH_NAMES = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sept', 'oct', 'nov', 'dic',
]

// ─── Componente ───────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user, logout, updateNombre } = useAuth()
  const [isDark, toggleDark] = useDarkMode()
  const { openTransactionModal } = useAppLayout()

  // ── Transacciones ──────────────────────────────────────────────────────────
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [transactionError, setTransactionError] = useState('')

  // ── Eliminación ────────────────────────────────────────────────────────────
  const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(null)
  const [confirmDeleteTransactionId, setConfirmDeleteTransactionId] = useState<string | null>(null)

  // ── Eliminación de categoría ───────────────────────────────────────────────
  const [confirmDeleteCategory, setConfirmDeleteCategory] = useState<CustomCategory | null>(null)

  // ── Sesión ─────────────────────────────────────────────────────────────────
  const [loggingOut, setLoggingOut] = useState(false)

  // ── Selector de período ────────────────────────────────────────────────────
  const currentYearMonth = getYearMonth()
  const [selectedYear, setSelectedYear] = useState(() => Number(currentYearMonth.slice(0, 4)))
  const [selectedMonth, setSelectedMonth] = useState(() => Number(currentYearMonth.slice(5, 7)))

  // ── Filtros de la lista ────────────────────────────────────────────────────
  const [typeFilter, setTypeFilter] = useState<TransactionFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [showAllTransactions, setShowAllTransactions] = useState(false)

  // ── Perfil ─────────────────────────────────────────────────────────────────
  const [currencyCode, setCurrencyCode] = useState<CurrencyCode>(DEFAULT_CURRENCY)
  const [savingsGoal, setSavingsGoal] = useState(DEFAULT_SAVINGS_GOAL)
  const [profileCurrency, setProfileCurrency] = useState<CurrencyCode>(DEFAULT_CURRENCY)
  const [profileSavingsGoal, setProfileSavingsGoal] = useState(String(DEFAULT_SAVINGS_GOAL))
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileNombre, setProfileNombre] = useState('')
  const [nombreError, setNombreError] = useState('')
  const [savingNombre, setSavingNombre] = useState(false)

  // ── Categorías personalizadas ──────────────────────────────────────────────
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([])
  const [categoryName, setCategoryName] = useState('')
  const [savingCategory, setSavingCategory] = useState(false)
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null)

  // ── Sección activa del sidebar (móvil) ─────────────────────────────────────
  const [sidebarSection, setSidebarSection] = useState<'resumen' | 'perfil' | null>(null)

  // ─── Formato de moneda ─────────────────────────────────────────────────────
  const currency = useMemo(
    () =>
      new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: currencyCode,
        maximumFractionDigits: 0,
      }),
    [currencyCode],
  )

  // ─── Suscripción a transacciones ───────────────────────────────────────────
  useEffect(() => {
    if (!user?.uid) {
      setTransactions([])
      setTransactionError('')
      setLoading(false)
      return
    }
    const uid = user.uid
    setTransactionError('')
    setLoading(true)
    return subscribeToUserTransactions(
      uid,
      (items) => { setTransactions(items); setTransactionError(''); setLoading(false) },
      (error) => {
        console.error('Error cargando movimientos:', error)
        setTransactionError('No se pudieron actualizar los movimientos. Intenta nuevamente.')
        toast.error('No se pudieron cargar los movimientos.')
        setLoading(false)
      },
    )
  }, [user?.uid])

  // ─── Carga de categorías personalizadas ────────────────────────────────────
  useEffect(() => {
    let isCurrentUser = true
    if (!user?.uid) {
      setCustomCategories([])
      return () => { isCurrentUser = false }
    }
    const uid = user.uid
    async function fetchCategories() {
      try {
        const categories = await getUserCategories(uid)
        if (isCurrentUser) setCustomCategories(categories)
      } catch (error) {
        console.error('Error cargando categorías:', error)
        toast.error('No se pudieron cargar las categorías personalizadas.')
      }
    }
    fetchCategories()
    return () => { isCurrentUser = false }
  }, [user?.uid])

  // ─── Carga del perfil ──────────────────────────────────────────────────────
  useEffect(() => {
    let isCurrentUser = true
    if (!user?.uid) {
      setCurrencyCode(DEFAULT_CURRENCY)
      setSavingsGoal(DEFAULT_SAVINGS_GOAL)
      setProfileCurrency(DEFAULT_CURRENCY)
      setProfileSavingsGoal(String(DEFAULT_SAVINGS_GOAL))
      setProfileNombre('')
      return () => { isCurrentUser = false }
    }
    const uid = user.uid
    async function fetchProfile() {
      try {
        const profile = await getUserProfile(uid)
        if (isCurrentUser && profile) {
          setCurrencyCode(profile.moneda)
          setSavingsGoal(profile.metaAhorroMensual)
          setProfileCurrency(profile.moneda)
          setProfileSavingsGoal(String(profile.metaAhorroMensual))
        }
      } catch (error) {
        console.error('Error cargando perfil:', error)
        toast.error('No se pudo cargar la configuración de tu perfil.')
      }
    }
    fetchProfile()
    return () => { isCurrentUser = false }
  }, [user?.uid])

  // ─── Sincronizar nombre ────────────────────────────────────────────────────
  useEffect(() => {
    if (user?.nombre) setProfileNombre(user.nombre)
  }, [user?.nombre])

  // ─── Cálculos derivados ────────────────────────────────────────────────────

  // Período seleccionado como string "YYYY-MM"
  const selectedPeriod = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`

  // Resumen del período seleccionado
  const periodSummary = useMemo(() => {
    const periodTransactions = transactions.filter((t) => t.date.startsWith(selectedPeriod))
    const ingresos = periodTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const gastos = periodTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    return { ingresos, gastos, saldo: ingresos - gastos }
  }, [transactions, selectedPeriod])

  // Resumen global (para las tarjetas de totales)
  const summary = useMemo(() => {
    const ingresos = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const gastos = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    return { ingresos, gastos, saldo: ingresos - gastos }
  }, [transactions])

  // Resumen del mes actual (para meta de ahorro)
  const currentMonthSummary = useMemo(() => {
    const currentMonth = getYearMonth()
    const monthTransactions = transactions.filter((t) => t.date.startsWith(currentMonth))
    const ingresosMes = monthTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const gastosMes = monthTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    const byCategory = monthTransactions
      .filter((t) => t.type === 'expense')
      .reduce<Record<string, number>>((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount
        return acc
      }, {})
    const topCategories = Object.entries(byCategory).sort(([, a], [, b]) => b - a).slice(0, 4)
    return { ingresosMes, gastosMes, saldoMes: ingresosMes - gastosMes, topCategories }
  }, [transactions])

  const avanceMeta = savingsGoal > 0
    ? Math.min(100, Math.max(0, Math.round((currentMonthSummary.saldoMes / savingsGoal) * 100)))
    : 0

  const availableCategories = useMemo(
    () => [...new Set([
      ...DEFAULT_CATEGORIES,
      ...customCategories.map((c) => c.name),
      ...transactions.map((t) => t.category),
    ])].sort(),
    [customCategories, transactions],
  )

  // Años disponibles para el selector
  const availableYears = useMemo(() => {
    const years = new Set<number>([selectedYear])
    transactions.forEach((t) => years.add(Number(t.date.slice(0, 4))))
    return [...years].sort().reverse()
  }, [transactions, selectedYear])

  // Transacciones del período filtradas
  const filteredTransactions = useMemo(() => {
    const term = searchTerm.trim().toLocaleLowerCase()
    return transactions.filter((t) => {
      const text = `${t.description} ${t.category}`.toLocaleLowerCase()
      return (
        t.date.startsWith(selectedPeriod) &&
        (typeFilter === 'all' || t.type === typeFilter) &&
        (!categoryFilter || t.category === categoryFilter) &&
        (!term || text.includes(term))
      )
    })
  }, [transactions, selectedPeriod, typeFilter, categoryFilter, searchTerm])

  // Transacciones agrupadas por fecha (para la vista de lista)
  const transactionsByDay = useMemo(() => {
    const groups: Record<string, Transaction[]> = {}
    filteredTransactions.forEach((t) => {
      if (!groups[t.date]) groups[t.date] = []
      groups[t.date].push(t)
    })
    // Ordenar días descendente
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a))
  }, [filteredTransactions])

  const VISIBLE_LIMIT = 10
  const visibleTransactions = showAllTransactions
    ? filteredTransactions
    : filteredTransactions.slice(0, VISIBLE_LIMIT)

  // Reconstruir grupos solo con los visibles
  const visibleByDay = useMemo(() => {
    const visibleIds = new Set(visibleTransactions.map((t) => t.id))
    return transactionsByDay
      .map(([date, items]) => [date, items.filter((t) => visibleIds.has(t.id))] as [string, Transaction[]])
      .filter(([, items]) => items.length > 0)
  }, [transactionsByDay, visibleTransactions])

  const isMutating =
    deletingTransactionId !== null ||
    loggingOut ||
    savingProfile ||
    savingNombre ||
    savingCategory ||
    deletingCategoryId !== null

  // ─── Handlers de modal ─────────────────────────────────────────────────────
  function openModalForNew(defaultType: TransactionType) {
    if (isMutating) return
    openTransactionModal({ type: defaultType })
  }

  function handleEdit(transaction: Transaction) {
    if (isMutating) return
    openTransactionModal({ transaction })
  }

  // ─── Handler eliminación ───────────────────────────────────────────────────
  function handleDelete(transactionId: string) {
    if (!user?.uid || isMutating) return
    setConfirmDeleteTransactionId(transactionId)
  }

  async function executeDeleteTransaction() {
    if (!user?.uid || !confirmDeleteTransactionId) return
    const transactionId = confirmDeleteTransactionId
    const targetTx = transactions.find((t) => t.id === transactionId)
    try {
      setDeletingTransactionId(transactionId)
      setConfirmDeleteTransactionId(null)
      if (targetTx?.type === 'transfer') {
        await deleteTransferTransaction(user.uid, targetTx)
      } else {
        await deleteUserTransaction(user.uid, transactionId)
      }
      toast.success('Movimiento eliminado correctamente.')
    } catch (error) {
      console.error('Error eliminando movimiento:', error)
      toast.error('No se pudo eliminar el movimiento.')
    } finally {
      setDeletingTransactionId(null)
    }
  }

  // ─── Handler nombre ────────────────────────────────────────────────────────
  async function handleNombreSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = profileNombre.trim()
    if (!trimmed || trimmed.length < 2) { setNombreError('El nombre debe tener al menos 2 caracteres.'); return }
    if (trimmed.length > 100) { setNombreError('El nombre no puede superar los 100 caracteres.'); return }
    if (trimmed === user?.nombre) { setNombreError('Es el mismo nombre actual.'); return }
    setNombreError('')
    try {
      setSavingNombre(true)
      await updateNombre(trimmed)
      toast.success('Nombre actualizado correctamente.')
    } catch (error) {
      console.error('Error actualizando nombre:', error)
      toast.error('No se pudo actualizar el nombre.')
    } finally {
      setSavingNombre(false)
    }
  }

  // ─── Handler perfil ────────────────────────────────────────────────────────
  async function handleProfileSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user?.uid) { toast.error('Debes iniciar sesión para guardar la configuración.'); return }
    const goal = Number(profileSavingsGoal)
    if (!Number.isFinite(goal) || goal < 0 || goal > 1_000_000_000) {
      toast.error('La meta debe estar entre 0 y 1.000.000.000.')
      return
    }
    try {
      setSavingProfile(true)
      await updateUserProfile(user.uid, { moneda: profileCurrency, metaAhorroMensual: goal })
      setCurrencyCode(profileCurrency)
      setSavingsGoal(goal)
      toast.success('Configuración guardada correctamente.')
    } catch (error) {
      console.error('Error guardando configuración:', error)
      toast.error('No se pudo guardar la configuración.')
    } finally {
      setSavingProfile(false)
    }
  }

  // ─── Handler categorías ────────────────────────────────────────────────────
  async function handleCategorySubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user?.uid) { toast.error('Debes iniciar sesión para crear categorías.'); return }
    const normalizedName = categoryName.trim()
    if (!normalizedName || normalizedName.length > 50) {
      toast.error('La categoría debe tener entre 1 y 50 caracteres.')
      return
    }
    if (availableCategories.some((c) => c.toLocaleLowerCase() === normalizedName.toLocaleLowerCase())) {
      toast.error('Ya existe una categoría con ese nombre.')
      return
    }
    try {
      setSavingCategory(true)
      const newCategory = await addUserCategory(user.uid, normalizedName)
      setCustomCategories((prev) => [...prev, newCategory].sort((a, b) => a.name.localeCompare(b.name)))
      setCategoryName('')
      toast.success('Categoría creada correctamente.')
    } catch (error) {
      console.error('Error creando categoría:', error)
      toast.error('No se pudo crear la categoría.')
    } finally {
      setSavingCategory(false)
    }
  }

  async function handleCategoryDelete(category: CustomCategory) {
    if (!user?.uid || isMutating) return
    if (transactions.some((t) => t.category.toLocaleLowerCase() === category.name.toLocaleLowerCase())) {
      toast.error('No puedes eliminar una categoría que tiene movimientos asociados.')
      return
    }
    setConfirmDeleteCategory(category)
  }

  async function executeDeleteCategory() {
    if (!user?.uid || !confirmDeleteCategory) return
    const category = confirmDeleteCategory
    try {
      setDeletingCategoryId(category.id)
      setConfirmDeleteCategory(null)
      await deleteUserCategory(user.uid, category.id)
      setCustomCategories((prev) => prev.filter((c) => c.id !== category.id))
      toast.success('Categoría eliminada correctamente.')
    } catch (error) {
      console.error('Error eliminando categoría:', error)
      toast.error('No se pudo eliminar la categoría.')
    } finally {
      setDeletingCategoryId(null)
    }
  }

  async function handleLogout() {
    if (isMutating) return
    try {
      setLoggingOut(true)
      await logout()
      toast.success('Sesión cerrada.')
    } catch (error) {
      console.error('Error cerrando sesión:', error)
      toast.error('No se pudo cerrar la sesión. Intenta nuevamente.')
    } finally {
      setLoggingOut(false)
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <AppLayout>
    <div className="min-h-screen bg-surface-light text-brand-900 dark:bg-surface-dark dark:text-white">

      {/* ══════════════════════════════════════════════════════════════════════
          HEADER
      ══════════════════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-30 border-b border-brand-100 bg-surface-light/95 backdrop-blur-sm dark:border-brand-700 dark:bg-surface-dark/95">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">

          {/* Fila principal del header */}
          <div className="flex items-center justify-between gap-2 py-3">

            {/* Selector de período (izquierda) */}
            <div className="flex items-center gap-1">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                aria-label="Año"
                className="cursor-pointer rounded-lg bg-brand-500 px-2 py-1 text-xs font-bold text-white focus:outline-none dark:bg-brand-700"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                aria-label="Mes"
                className="cursor-pointer rounded-lg bg-transparent px-1 py-1 text-sm font-semibold text-brand-500 focus:outline-none dark:text-brand-200"
              >
                {MONTH_NAMES.map((name, i) => (
                  <option key={i + 1} value={i + 1}>{name}</option>
                ))}
              </select>
            </div>

            {/* Título centrado */}
            <h1 className="absolute left-1/2 -translate-x-1/2 font-display text-base font-bold sm:text-lg">
              {user?.nombre}
            </h1>

            {/* Acciones (derecha) */}
            <div className="flex items-center gap-1.5">
              {/* Historial — solo sm+ */}
              <Link
                to="/historial"
                aria-label="Ver historial"
                className="hidden rounded-lg border border-brand-200 px-2.5 py-1.5 text-xs font-semibold text-brand-500 transition hover:bg-brand-50 dark:border-brand-600 dark:hover:bg-brand-800 sm:flex sm:items-center sm:gap-1"
              >
                <span aria-hidden="true">📋</span>
                <span className="hidden md:inline">Historial</span>
              </Link>

              {/* Toggle dark mode */}
              <button
                type="button"
                onClick={toggleDark}
                aria-label={isDark ? 'Modo claro' : 'Modo oscuro'}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-brand-200 text-sm transition hover:bg-brand-50 dark:border-brand-600 dark:hover:bg-brand-800"
              >
                {isDark ? '☀️' : '🌙'}
              </button>

              {/* Cerrar sesión — solo sm+ */}
              <button
                onClick={handleLogout}
                disabled={isMutating}
                className="hidden rounded-lg border border-brand-200 px-2.5 py-1.5 text-xs font-semibold text-brand-500 transition hover:bg-brand-50 disabled:opacity-60 dark:border-brand-600 dark:hover:bg-brand-800 sm:block"
              >
                {loggingOut ? 'Saliendo…' : 'Salir'}
              </button>
            </div>
          </div>

          {/* Resumen horizontal del período */}
          <div className="grid grid-cols-3 border-t border-brand-50 pb-2 pt-2 text-center dark:border-brand-700/50">
            <div>
              <p className="text-xs text-brand-400">Gastos</p>
              <p className="text-sm font-bold text-red-500 sm:text-base">
                {currency.format(periodSummary.gastos)}
              </p>
            </div>
            <div className="border-x border-brand-100 dark:border-brand-700">
              <p className="text-xs text-brand-400">Ingresos</p>
              <p className="text-sm font-bold text-emerald-600 sm:text-base">
                {currency.format(periodSummary.ingresos)}
              </p>
            </div>
            <div>
              <p className="text-xs text-brand-400">Saldo</p>
              <p className={`text-sm font-bold sm:text-base ${periodSummary.saldo >= 0 ? 'text-brand-700 dark:text-white' : 'text-red-500'}`}>
                {currency.format(periodSummary.saldo)}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════════════════
          MAIN
      ══════════════════════════════════════════════════════════════════════ */}
      <main className="mx-auto max-w-6xl px-0 pb-28 sm:px-6">

        {/* Grid principal: lista + sidebar */}
        <div className="lg:grid lg:gap-6 lg:grid-cols-[1fr_340px] lg:pt-6">

          {/* ── COLUMNA PRINCIPAL: lista de movimientos ───────────────────── */}
          <div>
            {/* Gestión de Cuentas */}
            <div className="mb-6 px-4 sm:px-0">
              <AccountsSection currencyCode={currencyCode} />
            </div>

            {/* Gestor de Deudas */}
            <div className="mb-6 px-4 sm:px-0">
              <DebtsSection currencyCode={currencyCode} />
            </div>

            {/* Control de Presupuestos */}
            <div className="mb-6 px-4 sm:px-0">
              <BudgetsSection currencyCode={currencyCode} transactions={transactions} />
            </div>

            {/* Metas de Ahorro */}
            <div className="mb-6 px-4 sm:px-0">
              <SavingsGoalsSection currencyCode={currencyCode} />
            </div>

            {/* Barra de filtros / búsqueda */}
            <div className="border-b border-brand-100 bg-surface-light px-4 py-2 dark:border-brand-700 dark:bg-surface-dark sm:px-0 sm:pb-3 sm:pt-0">
              <div className="flex items-center gap-2">
                {/* Búsqueda */}
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar…"
                  className="min-w-0 flex-1 rounded-xl border border-brand-200 bg-white px-3 py-1.5 text-sm dark:border-brand-600 dark:bg-brand-900"
                />

                {/* Botón toggle filtros */}
                <button
                  type="button"
                  onClick={() => setShowFilters((f) => !f)}
                  aria-expanded={showFilters}
                  aria-label="Filtros"
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-sm transition ${
                    showFilters || typeFilter !== 'all' || categoryFilter
                      ? 'border-brand-500 bg-brand-500 text-white'
                      : 'border-brand-200 text-brand-400 hover:bg-brand-50 dark:border-brand-600'
                  }`}
                >
                  ⊟
                </button>

                {/* Botones agregar — solo sm+ (en móvil usa FAB) */}
                <div className="hidden items-center gap-1.5 sm:flex">
                  <button
                    type="button"
                    onClick={() => openModalForNew('income')}
                    disabled={isMutating}
                    className="flex items-center gap-1 rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-600 disabled:opacity-60"
                  >
                    <span aria-hidden="true">↑</span> Ingreso
                  </button>
                  <button
                    type="button"
                    onClick={() => openModalForNew('expense')}
                    disabled={isMutating}
                    className="flex items-center gap-1 rounded-xl bg-red-500 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-red-600 disabled:opacity-60"
                  >
                    <span aria-hidden="true">↓</span> Gasto
                  </button>
                </div>
              </div>

              {/* Filtros expandibles */}
              {showFilters && (
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as TransactionFilter)}
                    className="rounded-xl border border-brand-200 bg-white px-3 py-1.5 text-xs dark:border-brand-600 dark:bg-brand-900"
                    aria-label="Tipo"
                  >
                    <option value="all">Todos</option>
                    <option value="income">Ingresos</option>
                    <option value="expense">Gastos</option>
                  </select>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="rounded-xl border border-brand-200 bg-white px-3 py-1.5 text-xs dark:border-brand-600 dark:bg-brand-900"
                    aria-label="Categoría"
                  >
                    <option value="">Categoría</option>
                    {availableCategories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => { setTypeFilter('all'); setCategoryFilter(''); setSearchTerm(''); setShowFilters(false) }}
                    className="rounded-xl border border-brand-200 px-3 py-1.5 text-xs font-medium text-brand-500 hover:bg-brand-50 dark:border-brand-600"
                  >
                    Limpiar
                  </button>
                </div>
              )}
            </div>

            {/* ── Lista de movimientos ─────────────────────────────────────── */}
            <section aria-label="Movimientos del período">
              {loading ? (
                <div className="flex flex-col items-center gap-2 py-16 text-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-500" aria-hidden="true" />
                  <p className="text-sm text-brand-400">Cargando movimientos…</p>
                </div>
              ) : transactionError ? (
                <p className="px-4 py-8 text-center text-sm text-red-500">{transactionError}</p>
              ) : filteredTransactions.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-4xl" aria-hidden="true">📭</p>
                  <p className="mt-3 text-sm text-brand-400">
                    {typeFilter !== 'all' || categoryFilter || searchTerm
                      ? 'No hay movimientos con ese filtro.'
                      : 'Aún no hay movimientos este mes.'}
                  </p>
                  {(typeFilter !== 'all' || categoryFilter || searchTerm) && (
                    <button
                      type="button"
                      onClick={() => { setTypeFilter('all'); setCategoryFilter(''); setSearchTerm('') }}
                      className="mt-2 text-sm font-medium text-brand-500 hover:underline"
                    >
                      Limpiar filtros
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* Grupos por día */}
                  {visibleByDay.map(([date, dayItems]) => {
                    const { day, weekday } = formatDayHeader(date)
                    const dayTotal = dayItems.reduce((s, t) => {
                      if (t.type === 'expense') return s - t.amount
                      if (t.type === 'income') return s + t.amount
                      return s
                    }, 0)

                    return (
                      <div key={date}>
                        {/* Separador de día */}
                        <div className="flex items-baseline justify-between border-b border-brand-100 bg-surface-light/80 px-4 py-2 dark:border-brand-700 dark:bg-surface-dark/80">
                          <div className="flex items-baseline gap-2">
                            <span className="text-sm font-semibold text-brand-700 dark:text-brand-200">
                              {day}
                            </span>
                            <span className="text-xs text-brand-400">{weekday}</span>
                          </div>
                          <span className={`text-xs font-semibold ${dayTotal >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {dayTotal >= 0 ? '+' : ''}{currency.format(dayTotal)}
                          </span>
                        </div>

                        {/* Movimientos del día */}
                        <div className="divide-y divide-brand-50 dark:divide-brand-700/40">
                          {dayItems.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center gap-3 px-4 py-3 transition hover:bg-brand-50/60 active:bg-brand-100/40 dark:hover:bg-brand-800/40"
                            >
                              {/* Ícono de categoría */}
                              <span
                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl ${
                                  item.type === 'income'
                                    ? 'bg-emerald-100 dark:bg-emerald-900/40'
                                    : 'bg-brand-50 dark:bg-brand-700/50'
                                }`}
                                aria-hidden="true"
                              >
                                {getCategoryIcon(item.category, item.type)}
                              </span>

                              {/* Nombre y categoría */}
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium leading-tight">
                                  {item.description || item.category}
                                </p>
                                {item.description && (
                                  <p className="truncate text-xs text-brand-400">{item.category}</p>
                                )}
                              </div>

                              {/* Monto + acciones */}
                              <div className="flex shrink-0 flex-col items-end gap-1">
                                <span
                                  className={`text-sm font-bold tabular-nums ${
                                    item.type === 'income'
                                      ? 'text-emerald-600'
                                      : item.type === 'expense'
                                        ? 'text-red-500'
                                        : 'text-brand-700 dark:text-white'
                                  }`}
                                  aria-label={`${
                                    item.type === 'income'
                                      ? 'Ingreso'
                                      : item.type === 'expense'
                                        ? 'Gasto'
                                        : 'Transferencia'
                                  }: ${currency.format(item.amount)}`}
                                >
                                  {item.type === 'income'
                                    ? '+'
                                    : item.type === 'expense'
                                      ? '−'
                                      : '↔ '}{currency.format(item.amount)}
                                </span>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleEdit(item)}
                                    disabled={isMutating}
                                    aria-label={`Editar ${item.description || item.category}`}
                                    className="text-xs text-brand-400 hover:text-brand-600 disabled:opacity-40"
                                  >
                                    Editar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(item.id)}
                                    disabled={isMutating}
                                    aria-label={`Eliminar ${item.description || item.category}`}
                                    className="text-xs text-red-400 hover:text-red-600 disabled:opacity-40"
                                  >
                                    {deletingTransactionId === item.id ? '…' : 'Eliminar'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}

                  {/* Ver más / menos */}
                  {filteredTransactions.length > VISIBLE_LIMIT && (
                    <div className="border-t border-brand-100 px-4 py-3 dark:border-brand-700">
                      <button
                        type="button"
                        onClick={() => setShowAllTransactions((p) => !p)}
                        className="w-full rounded-xl border border-brand-200 py-2.5 text-sm font-medium text-brand-500 transition hover:bg-brand-50 dark:border-brand-600 dark:hover:bg-brand-900"
                      >
                        {showAllTransactions
                          ? 'Mostrar menos'
                          : `Ver ${filteredTransactions.length - VISIBLE_LIMIT} más`}
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>
          </div>

          {/* ── COLUMNA LATERAL (sidebar) ─────────────────────────────────── */}
          {/* En móvil: secciones colapsables accesibles desde el BottomNav.   */}
          {/* En lg: siempre visible como columna lateral.                      */}
          <aside id="sidebar" className="space-y-4 px-4 pb-6 pt-4 sm:px-0 lg:pt-6">

            {/* Selector de sección en móvil */}
            <div className="flex gap-2 lg:hidden">
              <button
                type="button"
                onClick={() => setSidebarSection(sidebarSection === 'resumen' ? null : 'resumen')}
                aria-expanded={sidebarSection === 'resumen'}
                className={`flex-1 rounded-xl border py-2 text-sm font-semibold transition ${
                  sidebarSection === 'resumen'
                    ? 'border-brand-500 bg-brand-500 text-white'
                    : 'border-brand-200 text-brand-500 dark:border-brand-600'
                }`}
              >
                📊 Resumen del mes
              </button>
              <button
                type="button"
                onClick={() => setSidebarSection(sidebarSection === 'perfil' ? null : 'perfil')}
                aria-expanded={sidebarSection === 'perfil'}
                className={`flex-1 rounded-xl border py-2 text-sm font-semibold transition ${
                  sidebarSection === 'perfil'
                    ? 'border-brand-500 bg-brand-500 text-white'
                    : 'border-brand-200 text-brand-500 dark:border-brand-600'
                }`}
              >
                ⚙️ Configuración
              </button>
            </div>

            {/* Contenido del sidebar — siempre visible en lg */}
            <div className={`space-y-4 ${sidebarSection === null ? 'hidden lg:block' : 'block'}`}>

              {/* ── Este mes ────────────────────────────────────────────── */}
              {(sidebarSection === 'resumen' || sidebarSection === null) && (
                <div className="rounded-2xl border border-brand-100 bg-white p-4 shadow-soft dark:border-brand-700 dark:bg-brand-800 lg:block">
                  <h2 className="font-display text-base font-bold">Este mes</h2>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex items-center justify-between rounded-xl bg-brand-50 px-3 py-2 dark:bg-brand-900/40">
                      <span className="flex items-center gap-1.5 text-brand-400"><span aria-hidden="true">↑</span> Ingresos</span>
                      <span className="font-semibold text-emerald-600">{currency.format(currentMonthSummary.ingresosMes)}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-brand-50 px-3 py-2 dark:bg-brand-900/40">
                      <span className="flex items-center gap-1.5 text-brand-400"><span aria-hidden="true">↓</span> Gastos</span>
                      <span className="font-semibold text-red-500">{currency.format(currentMonthSummary.gastosMes)}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-brand-50 px-3 py-2 dark:bg-brand-900/40">
                      <span className="text-brand-400">Balance</span>
                      <span className={`font-semibold ${currentMonthSummary.saldoMes >= 0 ? 'text-brand-700 dark:text-white' : 'text-red-500'}`}>
                        {currency.format(currentMonthSummary.saldoMes)}
                      </span>
                    </div>
                  </div>

                  {/* Barra de progreso meta */}
                  <div className="mt-4 rounded-xl bg-brand-50 p-3 dark:bg-brand-900/40">
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="text-brand-400">Meta de ahorro</span>
                      <span className="font-semibold text-brand-700 dark:text-white">{avanceMeta}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-brand-100 dark:bg-brand-700">
                      <div
                        className={`h-full rounded-full transition-all ${avanceMeta >= 100 ? 'bg-emerald-500' : 'bg-brand-500'}`}
                        style={{ width: `${avanceMeta}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-brand-400">Objetivo: {currency.format(savingsGoal)}</p>
                  </div>

                  {/* Top categorías */}
                  {currentMonthSummary.topCategories.length > 0 && (
                    <div className="mt-4">
                      <p className="mb-2 text-xs font-semibold text-brand-400">Top categorías</p>
                      <div className="space-y-1.5">
                        {currentMonthSummary.topCategories.map(([cat, total]) => (
                          <div key={cat} className="flex items-center justify-between rounded-lg bg-brand-50 px-3 py-2 text-sm dark:bg-brand-900/40">
                            <span className="text-brand-500">{cat}</span>
                            <span className="font-semibold">{currency.format(total)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Gráficas financieras */}
                  <div className="mt-4 border-t border-brand-100 pt-4 dark:border-brand-700">
                    <FinancialCharts
                      topCategories={currentMonthSummary.topCategories}
                      ingresosMes={currentMonthSummary.ingresosMes}
                      gastosMes={currentMonthSummary.gastosMes}
                      formatCurrency={(v) => currency.format(v)}
                      isDark={isDark}
                    />
                  </div>

                  {/* Totales globales (resumen histórico) */}
                  <div className="mt-4 border-t border-brand-100 pt-3 dark:border-brand-700">
                    <p className="mb-2 text-xs font-semibold text-brand-400">Total histórico</p>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded-xl bg-brand-50 p-2 dark:bg-brand-900/40">
                        <p className="text-brand-400">Ingresos</p>
                        <p className="font-bold text-emerald-600">{currency.format(summary.ingresos)}</p>
                      </div>
                      <div className="rounded-xl bg-brand-50 p-2 dark:bg-brand-900/40">
                        <p className="text-brand-400">Gastos</p>
                        <p className="font-bold text-red-500">{currency.format(summary.gastos)}</p>
                      </div>
                      <div className="rounded-xl bg-brand-50 p-2 dark:bg-brand-900/40">
                        <p className="text-brand-400">Saldo</p>
                        <p className={`font-bold ${summary.saldo >= 0 ? 'text-brand-700 dark:text-white' : 'text-red-500'}`}>
                          {currency.format(summary.saldo)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Perfil + Config + Categorías ────────────────────────── */}
              {(sidebarSection === 'perfil' || sidebarSection === null) && (
                <>
                  {/* Perfil */}
                  <div className="rounded-2xl border border-brand-100 bg-white p-4 shadow-soft dark:border-brand-700 dark:bg-brand-800">
                    <h2 className="font-display text-base font-bold">Perfil</h2>
                    <form onSubmit={handleNombreSubmit} noValidate className="mt-3 space-y-3">
                      <div>
                        <label htmlFor="profile-nombre" className="mb-1 block text-sm text-brand-400">
                          Nombre visible
                        </label>
                        <input
                          id="profile-nombre"
                          type="text"
                          value={profileNombre}
                          onChange={(e) => { setProfileNombre(e.target.value); if (nombreError) setNombreError('') }}
                          disabled={isMutating}
                          maxLength={100}
                          autoComplete="name"
                          placeholder="¿Cómo quieres que te llamemos?"
                          className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition focus:ring-2 dark:bg-brand-900 dark:text-white ${
                            nombreError
                              ? 'border-red-400 focus:ring-red-400/30'
                              : 'border-brand-200 focus:border-brand-400 focus:ring-brand-400/30 dark:border-brand-600'
                          }`}
                        />
                        {nombreError && <p className="mt-1 text-xs text-red-500" role="alert">{nombreError}</p>}
                      </div>
                      <button type="submit" disabled={isMutating} className="btn-primary disabled:opacity-70">
                        {savingNombre ? 'Guardando…' : 'Actualizar nombre'}
                      </button>
                    </form>
                  </div>

                  {/* Configuración financiera */}
                  <div className="rounded-2xl border border-brand-100 bg-white p-4 shadow-soft dark:border-brand-700 dark:bg-brand-800">
                    <h2 className="font-display text-base font-bold">Configuración</h2>
                    <form onSubmit={handleProfileSubmit} className="mt-3 space-y-3">
                      <label className="block text-sm text-brand-400">
                        Moneda
                        <select
                          value={profileCurrency}
                          onChange={(e) => setProfileCurrency(e.target.value as CurrencyCode)}
                          disabled={isMutating}
                          className="mt-1 w-full rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm dark:border-brand-600 dark:bg-brand-900"
                        >
                          {SUPPORTED_CURRENCIES.map((code) => (
                            <option key={code} value={code}>{code}</option>
                          ))}
                        </select>
                      </label>
                      <label className="block text-sm text-brand-400">
                        Meta de ahorro mensual
                        <input
                          type="number"
                          min="0"
                          max="1000000000"
                          value={profileSavingsGoal}
                          onChange={(e) => setProfileSavingsGoal(e.target.value)}
                          disabled={isMutating}
                          className="mt-1 w-full rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm dark:border-brand-600 dark:bg-brand-900"
                        />
                      </label>
                      <button type="submit" disabled={isMutating} className="btn-primary disabled:opacity-70">
                        {savingProfile ? 'Guardando…' : 'Guardar configuración'}
                      </button>
                    </form>
                  </div>

                  {/* Categorías personalizadas */}
                  <div className="rounded-2xl border border-brand-100 bg-white p-4 shadow-soft dark:border-brand-700 dark:bg-brand-800">
                    <h2 className="font-display text-base font-bold">Categorías</h2>
                    <form onSubmit={handleCategorySubmit} className="mt-3 flex gap-2">
                      <input
                        type="text"
                        value={categoryName}
                        onChange={(e) => setCategoryName(e.target.value)}
                        disabled={isMutating}
                        maxLength={50}
                        placeholder="Nueva categoría"
                        className="min-w-0 flex-1 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm dark:border-brand-600 dark:bg-brand-900"
                      />
                      <button
                        type="submit"
                        disabled={isMutating}
                        className="rounded-xl border border-brand-200 px-3 py-2 text-sm font-semibold text-brand-500 transition hover:bg-brand-50 disabled:opacity-70 dark:border-brand-600"
                      >
                        {savingCategory ? '…' : 'Agregar'}
                      </button>
                    </form>
                    {customCategories.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {customCategories.map((cat) => (
                          <div key={cat.id} className="flex items-center justify-between rounded-lg bg-brand-50 px-3 py-2 text-sm dark:bg-brand-900/40">
                            <span>{cat.name}</span>
                            <button
                              type="button"
                              onClick={() => handleCategoryDelete(cat)}
                              disabled={isMutating}
                              className="text-xs font-medium text-red-400 hover:text-red-600 disabled:opacity-50"
                            >
                              {deletingCategoryId === cat.id ? '…' : 'Eliminar'}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Cerrar sesión (solo móvil) */}
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={isMutating}
                    className="w-full rounded-xl border border-red-200 py-2.5 text-sm font-semibold text-red-500 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:hover:bg-red-900/20 lg:hidden"
                  >
                    {loggingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
                  </button>
                </>
              )}
            </div>
          </aside>
        </div>
      </main>

      {/* ══════════════════════════════════════════════════════════════════════
          MODALES
      ══════════════════════════════════════════════════════════════════════ */}

      {confirmDeleteTransactionId && (
        <ConfirmDialog
          title="Eliminar movimiento"
          message="Esta acción no se puede deshacer. El movimiento será eliminado permanentemente."
          confirmLabel="Sí, eliminar"
          loading={deletingTransactionId !== null}
          onConfirm={executeDeleteTransaction}
          onCancel={() => setConfirmDeleteTransactionId(null)}
        />
      )}

      {confirmDeleteCategory && (
        <ConfirmDialog
          title="Eliminar categoría"
          message={`¿Eliminar la categoría "${confirmDeleteCategory.name}"? Esta acción no se puede deshacer.`}
          confirmLabel="Sí, eliminar"
          loading={deletingCategoryId !== null}
          onConfirm={executeDeleteCategory}
          onCancel={() => setConfirmDeleteCategory(null)}
        />
      )}
    </div>
    </AppLayout>
  )
}
