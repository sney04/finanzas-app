import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import { useDarkMode } from '@/hooks/useDarkMode'
import { AppLayout } from '@/components/AppLayout'
import { EvolutionChart, EvolutionDataPoint, FinancialCharts } from '@/components/FinancialCharts'
import { subscribeToUserTransactions } from '@/services/transactionService'
import { subscribeToUserAccounts } from '@/services/accountService'
import { getUserProfile } from '@/services/userProfileService'
import { Transaction, TransactionType } from '@/types/transaction'
import { Account } from '@/types/account'
import { CurrencyCode, DEFAULT_CURRENCY } from '@/types/userProfile'
import { getYearMonth } from '@/utils/date'

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

type MovementTypeFilter = 'all' | TransactionType

export default function Graficos() {
  const { user } = useAuth()
  const [isDark, toggleDark] = useDarkMode()

  // ── Datos de Firestore ──────────────────────────────────────────────────────
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [currencyCode, setCurrencyCode] = useState<CurrencyCode>(DEFAULT_CURRENCY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // ── Filtros ─────────────────────────────────────────────────────────────────
  const currentYearMonth = getYearMonth()
  const [selectedYear, setSelectedYear] = useState(() => Number(currentYearMonth.slice(0, 4)))
  const [selectedMonth, setSelectedMonth] = useState<number>(() => Number(currentYearMonth.slice(5, 7))) // 0 = Todo el año
  const [typeFilter, setTypeFilter] = useState<MovementTypeFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('')

  // ── Formateador de Moneda ───────────────────────────────────────────────────
  const currency = useMemo(
    () =>
      new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: currencyCode,
        maximumFractionDigits: 0,
      }),
    [currencyCode],
  )

  // ── Carga de perfil (moneda) ─────────────────────────────────────────────────
  useEffect(() => {
    let isCurrent = true
    if (!user?.uid) return
    const uid = user.uid
    async function loadProfile() {
      try {
        const profile = await getUserProfile(uid)
        if (isCurrent && profile) {
          setCurrencyCode(profile.moneda)
        }
      } catch (err) {
        console.error('Error al cargar perfil en Gráficos:', err)
      }
    }
    loadProfile()
    return () => { isCurrent = false }
  }, [user?.uid])

  // ── Suscripción en tiempo real a transacciones ─────────────────────────────
  useEffect(() => {
    if (!user?.uid) {
      setTransactions([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    const unsubscribe = subscribeToUserTransactions(
      user.uid,
      (items) => {
        setTransactions(items)
        setLoading(false)
      },
      (err) => {
        console.error('Error al cargar transacciones en Gráficos:', err)
        setError('No se pudieron cargar los datos financieros para los gráficos.')
        toast.error('Error cargando movimientos para gráficos.')
        setLoading(false)
      },
    )
    return () => unsubscribe()
  }, [user?.uid])

  // ── Suscripción en tiempo real a cuentas ───────────────────────────────────
  useEffect(() => {
    if (!user?.uid) {
      setAccounts([])
      return
    }
    const unsubscribe = subscribeToUserAccounts(
      user.uid,
      (items) => setAccounts(items),
      (err) => console.error('Error cargando cuentas en Gráficos:', err),
    )
    return () => unsubscribe()
  }, [user?.uid])

  // ── Años disponibles ────────────────────────────────────────────────────────
  const availableYears = useMemo(() => {
    const years = new Set<number>([selectedYear])
    transactions.forEach((t) => {
      const year = Number(t.date.slice(0, 4))
      if (year > 1900 && year < 2100) years.add(year)
    })
    return [...years].sort((a, b) => b - a)
  }, [transactions, selectedYear])

  // ── Categorías disponibles ──────────────────────────────────────────────────
  const availableCategories = useMemo(() => {
    const cats = new Set<string>()
    transactions.forEach((t) => {
      if (t.category) cats.add(t.category)
    })
    return [...cats].sort()
  }, [transactions])

  // ── Transacciones del Período Seleccionado ────────────────────────────────
  const periodTransactions = useMemo(() => {
    const periodPrefix = selectedMonth > 0
      ? `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`
      : `${selectedYear}-`

    return transactions.filter((t) => {
      const matchesPeriod = t.date.startsWith(periodPrefix)
      const matchesType = typeFilter === 'all' || t.type === typeFilter
      const matchesCat = !categoryFilter || t.category === categoryFilter
      return matchesPeriod && matchesType && matchesCat
    })
  }, [transactions, selectedYear, selectedMonth, typeFilter, categoryFilter])

  // ── Métricas principales (Excluyendo Transferencias de Ingresos/Gastos) ────
  const { ingresosTotal, gastosTotal, transferenciasTotal, balanceTotal } = useMemo(() => {
    let ingresos = 0
    let gastos = 0
    let transferencias = 0

    periodTransactions.forEach((t) => {
      if (t.type === 'income') ingresos += t.amount
      else if (t.type === 'expense') gastos += t.amount
      else if (t.type === 'transfer') transferencias += t.amount
    })

    return {
      ingresosTotal: ingresos,
      gastosTotal: gastos,
      transferenciasTotal: transferencias,
      balanceTotal: ingresos - gastos,
    }
  }, [periodTransactions])

  // ── Gastos por Categoría ────────────────────────────────────────────────────
  const topCategories = useMemo(() => {
    const byCategory: Record<string, number> = {}
    periodTransactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        byCategory[t.category] = (byCategory[t.category] || 0) + t.amount
      })

    return Object.entries(byCategory).sort(([, a], [, b]) => b - a) as [string, number][]
  }, [periodTransactions])

  // ── Evolución Temporal ──────────────────────────────────────────────────────
  const evolutionData = useMemo<EvolutionDataPoint[]>(() => {
    if (selectedMonth === 0) {
      // Vista Anual: Agrupar por Mes (Ene..Dic)
      return MONTH_NAMES.map((name, index) => {
        const monthNum = index + 1
        const monthPrefix = `${selectedYear}-${String(monthNum).padStart(2, '0')}`
        const monthTxs = transactions.filter((t) => {
          const matchDate = t.date.startsWith(monthPrefix)
          const matchCat = !categoryFilter || t.category === categoryFilter
          return matchDate && matchCat
        })

        const ingresos = monthTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
        const gastos = monthTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

        return {
          label: name.slice(0, 3),
          Ingresos: ingresos,
          Gastos: gastos,
        }
      })
    } else {
      // Vista Mensual: Agrupar por días con actividad del mes
      const monthPrefix = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`
      const daysMap: Record<string, { ingresos: number; gastos: number }> = {}

      transactions
        .filter((t) => t.date.startsWith(monthPrefix) && (!categoryFilter || t.category === categoryFilter))
        .forEach((t) => {
          const dayLabel = t.date.slice(8, 10)
          if (!daysMap[dayLabel]) {
            daysMap[dayLabel] = { ingresos: 0, gastos: 0 }
          }
          if (t.type === 'income') daysMap[dayLabel].ingresos += t.amount
          if (t.type === 'expense') daysMap[dayLabel].gastos += t.amount
        })

      const sortedDays = Object.keys(daysMap).sort((a, b) => Number(a) - Number(b))

      if (sortedDays.length === 0) {
        return []
      }

      return sortedDays.map((day) => ({
        label: `Día ${Number(day)}`,
        Ingresos: daysMap[day].ingresos,
        Gastos: daysMap[day].gastos,
      }))
    }
  }, [transactions, selectedYear, selectedMonth, categoryFilter])

  // ── Saldo total real de cuentas ──────────────────────────────────────────────
  const totalBalanceCuentas = useMemo(() => {
    return accounts.reduce((s, a) => s + a.saldo, 0)
  }, [accounts])

  // ── Limpiar filtros ────────────────────────────────────────────────────────
  function resetFilters() {
    setSelectedYear(Number(currentYearMonth.slice(0, 4)))
    setSelectedMonth(Number(currentYearMonth.slice(5, 7)))
    setTypeFilter('all')
    setCategoryFilter('')
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-surface-light text-brand-900 pb-20 dark:bg-surface-dark dark:text-white">

        {/* ── HEADER ───────────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-30 border-b border-brand-100 bg-surface-light/95 backdrop-blur-sm dark:border-brand-700 dark:bg-surface-dark/95">
          <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-display font-bold sm:text-2xl">
                  Gráficos y Estadísticas
                </h1>
                <p className="text-xs text-brand-400">
                  Análisis visual de ingresos, gastos y evolución de {user?.nombre || 'usuario'}
                </p>
              </div>
              <button
                type="button"
                onClick={toggleDark}
                aria-label={isDark ? 'Modo claro' : 'Modo oscuro'}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-brand-200 text-sm transition hover:bg-brand-50 dark:border-brand-600 dark:hover:bg-brand-800"
              >
                {isDark ? '☀️' : '🌙'}
              </button>
            </div>
          </div>
        </header>

        {/* ── MAIN CONTENT ────────────────────────────────────────────────── */}
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 space-y-6">

          {/* ── BARRA DE FILTROS ──────────────────────────────────────────── */}
          <section
            aria-label="Filtros de gráficos"
            className="rounded-2xl border border-brand-100 bg-white p-4 shadow-soft dark:border-brand-700 dark:bg-brand-800"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-50 pb-3 dark:border-brand-700/50">
              <h2 className="text-sm font-semibold text-brand-700 dark:text-white flex items-center gap-1.5">
                <span aria-hidden="true">⚙️</span> Filtros de Análisis
              </h2>
              {(typeFilter !== 'all' || categoryFilter || selectedMonth === 0) && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-xs font-medium text-brand-500 hover:underline dark:text-brand-300"
                >
                  Restablecer período y filtros
                </button>
              )}
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {/* Año */}
              <div>
                <label htmlFor="filter-year" className="mb-1 block text-xs text-brand-400">
                  Año
                </label>
                <select
                  id="filter-year"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-semibold dark:border-brand-600 dark:bg-brand-900"
                >
                  {availableYears.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              {/* Mes */}
              <div>
                <label htmlFor="filter-month" className="mb-1 block text-xs text-brand-400">
                  Mes / Período
                </label>
                <select
                  id="filter-month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-full rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-semibold dark:border-brand-600 dark:bg-brand-900"
                >
                  <option value={0}>Todo el año ({selectedYear})</option>
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={idx + 1} value={idx + 1}>{name}</option>
                  ))}
                </select>
              </div>

              {/* Tipo de movimiento */}
              <div>
                <label htmlFor="filter-type" className="mb-1 block text-xs text-brand-400">
                  Tipo de movimiento
                </label>
                <select
                  id="filter-type"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as MovementTypeFilter)}
                  className="w-full rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-semibold dark:border-brand-600 dark:bg-brand-900"
                >
                  <option value="all">Todos los movimientos</option>
                  <option value="income">Solo Ingresos</option>
                  <option value="expense">Solo Gastos</option>
                  <option value="transfer">Solo Transferencias</option>
                </select>
              </div>

              {/* Categoría */}
              <div>
                <label htmlFor="filter-category" className="mb-1 block text-xs text-brand-400">
                  Categoría
                </label>
                <select
                  id="filter-category"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-semibold dark:border-brand-600 dark:bg-brand-900"
                >
                  <option value="">Todas las categorías</option>
                  {availableCategories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* ── CARDS DE RESUMEN DEL PERÍODO ─────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-brand-100 bg-white p-4 shadow-soft dark:border-brand-700 dark:bg-brand-800">
              <p className="text-xs text-brand-400">Ingresos Totales</p>
              <p className="mt-1 text-base font-bold text-emerald-600 sm:text-xl">
                {currency.format(ingresosTotal)}
              </p>
            </div>

            <div className="rounded-2xl border border-brand-100 bg-white p-4 shadow-soft dark:border-brand-700 dark:bg-brand-800">
              <p className="text-xs text-brand-400">Gastos Totales</p>
              <p className="mt-1 text-base font-bold text-red-500 sm:text-xl">
                {currency.format(gastosTotal)}
              </p>
            </div>

            <div className="rounded-2xl border border-brand-100 bg-white p-4 shadow-soft dark:border-brand-700 dark:bg-brand-800">
              <p className="text-xs text-brand-400">Balance del Período</p>
              <p className={`mt-1 text-base font-bold sm:text-xl ${balanceTotal >= 0 ? 'text-brand-700 dark:text-white' : 'text-red-500'}`}>
                {currency.format(balanceTotal)}
              </p>
            </div>

            <div className="rounded-2xl border border-brand-100 bg-white p-4 shadow-soft dark:border-brand-700 dark:bg-brand-800">
              <p className="text-xs text-brand-400">Transferencias</p>
              <p className="mt-1 text-base font-bold text-brand-500 dark:text-brand-300 sm:text-xl">
                {currency.format(transferenciasTotal)}
              </p>
              <p className="mt-0.5 text-[10px] text-brand-400">Excluidas de ingresos/gastos</p>
            </div>
          </div>

          {/* ── MENSAJE DE CARGA / ERROR / VACÍO ───────────────────────────── */}
          {loading ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-500" aria-hidden="true" />
              <p className="text-sm text-brand-400">Procesando gráficos financieros…</p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
              <p className="text-sm font-semibold">{error}</p>
            </div>
          ) : periodTransactions.length === 0 ? (
            <div className="rounded-2xl border border-brand-100 bg-white p-12 text-center shadow-soft dark:border-brand-700 dark:bg-brand-800">
              <span className="text-4xl" aria-hidden="true">📊</span>
              <h3 className="mt-3 text-base font-bold text-brand-800 dark:text-white">Sin movimientos en este período</h3>
              <p className="mt-1 text-xs text-brand-400 max-w-sm mx-auto">
                No se encontraron datos financieros con los filtros seleccionados ({selectedMonth === 0 ? `Año ${selectedYear}` : `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`}).
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

              {/* ── BLOQUE 1: COMPARA INGRESOS VS GASTOS & CATEGORÍAS ───────── */}
              <div className="rounded-2xl border border-brand-100 bg-white p-5 shadow-soft dark:border-brand-700 dark:bg-brand-800 space-y-6">
                <h2 className="font-display text-base font-bold text-brand-900 dark:text-white border-b border-brand-50 pb-2 dark:border-brand-700/50">
                  Distribución y Comparación
                </h2>

                <FinancialCharts
                  topCategories={topCategories}
                  ingresosMes={ingresosTotal}
                  gastosMes={gastosTotal}
                  formatCurrency={(v) => currency.format(v)}
                  isDark={isDark}
                />
              </div>

              {/* ── BLOQUE 2: EVOLUCIÓN TEMPORAL ────────────────────────────── */}
              <div className="rounded-2xl border border-brand-100 bg-white p-5 shadow-soft dark:border-brand-700 dark:bg-brand-800 space-y-6">
                <div className="flex items-center justify-between border-b border-brand-50 pb-2 dark:border-brand-700/50">
                  <h2 className="font-display text-base font-bold text-brand-900 dark:text-white">
                    Evolución Temporal
                  </h2>
                  <span className="text-xs text-brand-400">
                    {selectedMonth === 0 ? `Evolución mensual ${selectedYear}` : `Actividad diaria en ${MONTH_NAMES[selectedMonth - 1]}`}
                  </span>
                </div>

                <EvolutionChart
                  data={evolutionData}
                  formatCurrency={(v) => currency.format(v)}
                  isDark={isDark}
                  title={selectedMonth === 0 ? `Tendencia mensual (${selectedYear})` : `Actividad por día (${MONTH_NAMES[selectedMonth - 1]})`}
                />

                {/* ── CUENTAS Y TRANSFERENCIAS ────────────────────────────── */}
                <div className="border-t border-brand-100 pt-4 dark:border-brand-700">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-brand-400">
                      Balances reales por Cuenta ({accounts.length})
                    </h3>
                    <span className="text-xs font-bold text-emerald-600">
                      Total: {currency.format(totalBalanceCuentas)}
                    </span>
                  </div>

                  {accounts.length === 0 ? (
                    <p className="text-xs text-brand-400 py-2">No se registraron cuentas de usuario.</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {accounts.map((acc) => (
                        <div
                          key={acc.id}
                          className="flex items-center justify-between rounded-xl bg-brand-50 px-3 py-2 text-xs dark:bg-brand-900/40"
                        >
                          <div>
                            <p className="font-semibold text-brand-800 dark:text-white">{acc.nombre}</p>
                            <p className="text-[10px] text-brand-400 capitalize">{acc.tipo}</p>
                          </div>
                          <span className="font-bold text-brand-700 dark:text-brand-200">
                            {currency.format(acc.saldo)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="mt-2 text-[10px] text-brand-400 italic">
                    ℹ️ Las transferencias mueven fondos entre tus cuentas sin contar como gasto ni como ingreso global.
                  </p>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </AppLayout>
  )
}
