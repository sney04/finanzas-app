import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import { useDarkMode } from '@/hooks/useDarkMode'
import { AppLayout } from '@/components/AppLayout'
import { subscribeToUserTransactions } from '@/services/transactionService'
import { getUserProfile } from '@/services/userProfileService'
import { Transaction } from '@/types/transaction'
import { CurrencyCode, DEFAULT_CURRENCY } from '@/types/userProfile'
import { formatDateForDisplay, getYearMonth } from '@/utils/date'

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export default function Informes() {
  const { user } = useAuth()
  const [isDark, toggleDark] = useDarkMode()

  // ── Datos del usuario ────────────────────────────────────────────────────────
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [currencyCode, setCurrencyCode] = useState<CurrencyCode>(DEFAULT_CURRENCY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // ── Filtros de período ──────────────────────────────────────────────────────
  const currentYearMonth = getYearMonth()
  const [selectedYear, setSelectedYear] = useState(() => Number(currentYearMonth.slice(0, 4)))
  const [selectedMonth, setSelectedMonth] = useState<number>(() => Number(currentYearMonth.slice(5, 7))) // 0 = Todo el año
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

  // ── Carga de Perfil (Moneda) ─────────────────────────────────────────────────
  useEffect(() => {
    let isCurrent = true
    if (!user?.uid) return
    const uid = user.uid
    getUserProfile(uid)
      .then((profile) => {
        if (isCurrent && profile) setCurrencyCode(profile.moneda)
      })
      .catch((err) => console.error('Error al cargar perfil en Informes:', err))
    return () => { isCurrent = false }
  }, [user?.uid])

  // ── Suscripción en Tiempo Real a Firestore ─────────────────────────────────
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
        console.error('Error al cargar transacciones en Informes:', err)
        setError('No se pudieron obtener los datos para generar el informe.')
        toast.error('Error al cargar datos financieros.')
        setLoading(false)
      },
    )
    return () => unsubscribe()
  }, [user?.uid])

  // ── Años disponibles ────────────────────────────────────────────────────────
  const availableYears = useMemo(() => {
    const years = new Set<number>([selectedYear])
    transactions.forEach((t) => {
      const y = Number(t.date.slice(0, 4))
      if (y > 1900 && y < 2100) years.add(y)
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

  // ── Transacciones del Período Filtrado ──────────────────────────────────────
  const filteredTransactions = useMemo(() => {
    const periodPrefix = selectedMonth > 0
      ? `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`
      : `${selectedYear}-`

    return transactions.filter((t) => {
      const matchPeriod = t.date.startsWith(periodPrefix)
      const matchCategory = !categoryFilter || t.category === categoryFilter
      return matchPeriod && matchCategory
    })
  }, [transactions, selectedYear, selectedMonth, categoryFilter])

  // ── Métricas Financieras (Resumen) ──────────────────────────────────────────
  const { ingresosTotal, gastosTotal, transferenciasTotal, balanceTotal } = useMemo(() => {
    let ingresos = 0
    let gastos = 0
    let transferencias = 0

    filteredTransactions.forEach((t) => {
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
  }, [filteredTransactions])

  // ── Gastos por Categoría ────────────────────────────────────────────────────
  const categoryExpenses = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {}

    filteredTransactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        if (!map[t.category]) {
          map[t.category] = { total: 0, count: 0 }
        }
        map[t.category].total += t.amount
        map[t.category].count += 1
      })

    const items = Object.entries(map).map(([name, data]) => {
      const pct = gastosTotal > 0 ? Math.round((data.total / gastosTotal) * 100) : 0
      return {
        name,
        total: data.total,
        count: data.count,
        percentage: pct,
      }
    })

    return items.sort((a, b) => b.total - a.total)
  }, [filteredTransactions, gastosTotal])

  // ── Desglose Mensual (para Vista Anual) ─────────────────────────────────────
  const monthlyBreakdown = useMemo(() => {
    if (selectedMonth !== 0) return []

    return MONTH_NAMES.map((name, index) => {
      const mNum = index + 1
      const mPrefix = `${selectedYear}-${String(mNum).padStart(2, '0')}`
      const mtxs = transactions.filter((t) => t.date.startsWith(mPrefix) && (!categoryFilter || t.category === categoryFilter))

      let ing = 0
      let gas = 0
      let trf = 0

      mtxs.forEach((t) => {
        if (t.type === 'income') ing += t.amount
        else if (t.type === 'expense') gas += t.amount
        else if (t.type === 'transfer') trf += t.amount
      })

      return {
        monthName: name,
        monthIndex: mNum,
        ingresos: ing,
        gastos: gas,
        balance: ing - gas,
        transferencias: trf,
        count: mtxs.length,
      }
    })
  }, [transactions, selectedYear, selectedMonth, categoryFilter])

  // ── Exportación CSV Nativa ──────────────────────────────────────────────────
  function handleExportCSV() {
    if (filteredTransactions.length === 0) {
      toast.error('No hay movimientos para exportar en este período.')
      return
    }

    const periodLabel = selectedMonth === 0
      ? `Año_${selectedYear}`
      : `${MONTH_NAMES[selectedMonth - 1]}_${selectedYear}`

    const escapeCSVText = (value: string): string => {
      const escaped = value.replace(/"/g, '""')
      const safeValue = /^[=+\-@]/.test(escaped) ? `'${escaped}` : escaped
      return `"${safeValue}"`
    }

    const headers = ['ID', 'Fecha', 'Tipo', 'Categoría', 'Descripción', 'Monto', 'Moneda']
    const rows = filteredTransactions.map((t) => {
      const tipoStr = t.type === 'income' ? 'Ingreso' : t.type === 'expense' ? 'Gasto' : 'Transferencia'
      return [
        t.id,
        t.date,
        tipoStr,
        escapeCSVText(t.category || ''),
        escapeCSVText(t.description || ''),
        String(t.amount),
        currencyCode,
      ]
    })

    const csvContent = [headers, ...rows].map((r) => r.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `finanzas04-informe-${periodLabel}.csv`
    link.click()
    URL.revokeObjectURL(url)

    toast.success(`Informe CSV exportado (${filteredTransactions.length} registros).`)
  }

  // ── Restablecer Filtros ─────────────────────────────────────────────────────
  function resetFilters() {
    setSelectedYear(Number(currentYearMonth.slice(0, 4)))
    setSelectedMonth(Number(currentYearMonth.slice(5, 7)))
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
                  Informes Financieros
                </h1>
                <p className="text-xs text-brand-400">
                  Resumen ejecutivo y exportación de datos de {user?.nombre || 'usuario'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleDark}
                  aria-label={isDark ? 'Modo claro' : 'Modo oscuro'}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-brand-200 text-sm transition hover:bg-brand-50 dark:border-brand-600 dark:hover:bg-brand-800"
                >
                  {isDark ? '☀️' : '🌙'}
                </button>

                <button
                  type="button"
                  onClick={handleExportCSV}
                  disabled={loading || filteredTransactions.length === 0}
                  className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-brand-600 disabled:opacity-50"
                >
                  <span aria-hidden="true">⬇</span>
                  <span>Exportar CSV</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* ── MAIN CONTENT ────────────────────────────────────────────────── */}
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 space-y-6">

          {/* ── BARRA DE FILTROS ──────────────────────────────────────────── */}
          <section
            aria-label="Filtros de informe"
            className="rounded-2xl border border-brand-100 bg-white p-4 shadow-soft dark:border-brand-700 dark:bg-brand-800"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-50 pb-3 dark:border-brand-700/50">
              <h2 className="text-sm font-semibold text-brand-700 dark:text-white flex items-center gap-1.5">
                <span aria-hidden="true">📄</span> Período del Informe
              </h2>
              {(categoryFilter || selectedMonth === 0) && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-xs font-medium text-brand-500 hover:underline dark:text-brand-300"
                >
                  Restablecer período
                </button>
              )}
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {/* Año */}
              <div>
                <label htmlFor="report-year" className="mb-1 block text-xs text-brand-400">
                  Año
                </label>
                <select
                  id="report-year"
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
                <label htmlFor="report-month" className="mb-1 block text-xs text-brand-400">
                  Mes / Período
                </label>
                <select
                  id="report-month"
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

              {/* Categoría */}
              <div>
                <label htmlFor="report-category" className="mb-1 block text-xs text-brand-400">
                  Categoría
                </label>
                <select
                  id="report-category"
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

          {/* ── CARDS DE RESUMEN EJECUTIVO ───────────────────────────────── */}
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
              <p className="text-xs text-brand-400">Balance Neto</p>
              <p className={`mt-1 text-base font-bold sm:text-xl ${balanceTotal >= 0 ? 'text-brand-700 dark:text-white' : 'text-red-500'}`}>
                {currency.format(balanceTotal)}
              </p>
            </div>

            <div className="rounded-2xl border border-brand-100 bg-white p-4 shadow-soft dark:border-brand-700 dark:bg-brand-800">
              <p className="text-xs text-brand-400">Transferencias</p>
              <p className="mt-1 text-base font-bold text-brand-500 dark:text-brand-300 sm:text-xl">
                {currency.format(transferenciasTotal)}
              </p>
              <p className="mt-0.5 text-[10px] text-brand-400">Fondos reubicados</p>
            </div>
          </div>

          {/* ── MENSAJE DE CARGA / ERROR / ESTADO VACÍO ──────────────────── */}
          {loading ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-500" aria-hidden="true" />
              <p className="text-sm text-brand-400">Generando informe financiero…</p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
              <p className="text-sm font-semibold">{error}</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="rounded-2xl border border-brand-100 bg-white p-12 text-center shadow-soft dark:border-brand-700 dark:bg-brand-800">
              <span className="text-4xl" aria-hidden="true">📑</span>
              <h3 className="mt-3 text-base font-bold text-brand-800 dark:text-white">Sin datos para este informe</h3>
              <p className="mt-1 text-xs text-brand-400 max-w-sm mx-auto">
                No hay movimientos registrados en {selectedMonth === 0 ? `el año ${selectedYear}` : `${MONTH_NAMES[selectedMonth - 1]} de ${selectedYear}`}.
              </p>
            </div>
          ) : (
            <div className="space-y-6">

              {/* ── SECCIÓN 1: GASTOS POR CATEGORÍA ─────────────────────── */}
              <section
                aria-label="Informe de gastos por categoría"
                className="rounded-2xl border border-brand-100 bg-white p-5 shadow-soft dark:border-brand-700 dark:bg-brand-800"
              >
                <div className="flex items-center justify-between border-b border-brand-50 pb-3 dark:border-brand-700/50">
                  <div>
                    <h2 className="font-display text-base font-bold text-brand-900 dark:text-white">
                      Distribución de Gastos por Categoría
                    </h2>
                    <p className="text-xs text-brand-400">
                      Detalle de egresos y participación porcentual en el período
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-brand-500 dark:text-brand-300">
                    {categoryExpenses.length} {categoryExpenses.length === 1 ? 'categoría' : 'categorías'}
                  </span>
                </div>

                {categoryExpenses.length === 0 ? (
                  <p className="py-8 text-center text-xs text-brand-400">
                    No se registraron gastos en el período seleccionado.
                  </p>
                ) : (
                  <div className="mt-4 space-y-4">
                    {categoryExpenses.map((cat) => (
                      <div key={cat.name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-brand-800 dark:text-brand-100">
                            {cat.name} <span className="font-normal text-brand-400">({cat.count} {cat.count === 1 ? 'movimiento' : 'movimientos'})</span>
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-brand-500 dark:text-brand-300">{cat.percentage}%</span>
                            <span className="text-red-500">{currency.format(cat.total)}</span>
                          </div>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-brand-50 dark:bg-brand-900/50">
                          <div
                            className="h-full rounded-full bg-brand-500 transition-all dark:bg-brand-400"
                            style={{ width: `${Math.min(100, Math.max(0, cat.percentage))}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* ── SECCIÓN 2: DESGLOSE ANUAL MES POR MES (SI APLICA) ────── */}
              {selectedMonth === 0 && monthlyBreakdown.length > 0 && (
                <section
                  aria-label="Desglose mensual del año"
                  className="rounded-2xl border border-brand-100 bg-white p-5 shadow-soft dark:border-brand-700 dark:bg-brand-800"
                >
                  <h2 className="mb-3 font-display text-base font-bold text-brand-900 dark:text-white border-b border-brand-50 pb-2 dark:border-brand-700/50">
                    Desglose Mensual ({selectedYear})
                  </h2>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-brand-100 text-left font-semibold text-brand-400 dark:border-brand-700">
                          <th className="py-2.5 px-3">Mes</th>
                          <th className="py-2.5 px-3 text-right">Ingresos</th>
                          <th className="py-2.5 px-3 text-right">Gastos</th>
                          <th className="py-2.5 px-3 text-right">Balance</th>
                          <th className="py-2.5 px-3 text-right">Transferencias</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-brand-50 dark:divide-brand-700/40">
                        {monthlyBreakdown.map((m) => (
                          <tr key={m.monthIndex} className="hover:bg-brand-50/50 dark:hover:bg-brand-900/30">
                            <td className="py-2.5 px-3 font-semibold text-brand-800 dark:text-white">
                              {m.monthName}
                            </td>
                            <td className="py-2.5 px-3 text-right font-medium text-emerald-600">
                              {m.ingresos > 0 ? currency.format(m.ingresos) : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-medium text-red-500">
                              {m.gastos > 0 ? currency.format(m.gastos) : '—'}
                            </td>
                            <td className={`py-2.5 px-3 text-right font-bold ${m.balance >= 0 ? 'text-brand-700 dark:text-white' : 'text-red-500'}`}>
                              {currency.format(m.balance)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-medium text-brand-500 dark:text-brand-300">
                              {m.transferencias > 0 ? currency.format(m.transferencias) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* ── SECCIÓN 3: LISTADO DETALLADO DE MOVIMIENTOS ─────────── */}
              <section
                aria-label="Detalle de movimientos del informe"
                className="rounded-2xl border border-brand-100 bg-white p-5 shadow-soft dark:border-brand-700 dark:bg-brand-800"
              >
                <div className="flex items-center justify-between border-b border-brand-50 pb-3 dark:border-brand-700/50">
                  <h2 className="font-display text-base font-bold text-brand-900 dark:text-white">
                    Detalle de Movimientos ({filteredTransactions.length})
                  </h2>
                  <span className="text-xs text-brand-400">
                    {selectedMonth === 0 ? `Año ${selectedYear}` : `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`}
                  </span>
                </div>

                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-brand-100 text-left font-semibold text-brand-400 dark:border-brand-700">
                        <th className="py-2 px-3">Fecha</th>
                        <th className="py-2 px-3">Tipo</th>
                        <th className="py-2 px-3">Categoría</th>
                        <th className="py-2 px-3">Descripción</th>
                        <th className="py-2 px-3 text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-50 dark:divide-brand-700/40">
                      {filteredTransactions.slice(0, 100).map((t) => (
                        <tr key={t.id} className="hover:bg-brand-50/50 dark:hover:bg-brand-900/30">
                          <td className="py-2.5 px-3 whitespace-nowrap text-brand-400">
                            {formatDateForDisplay(t.date)}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span
                              className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                t.type === 'income'
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                  : t.type === 'expense'
                                  ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300'
                                  : 'bg-brand-100 text-brand-700 dark:bg-brand-700 dark:text-brand-200'
                              }`}
                            >
                              {t.type === 'income' ? 'Ingreso' : t.type === 'expense' ? 'Gasto' : 'Transferencia'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-medium text-brand-700 dark:text-brand-200">
                            {t.category}
                          </td>
                          <td className="py-2.5 px-3 text-brand-500 dark:text-brand-300 max-w-[200px] truncate">
                            {t.description || '—'}
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right font-bold whitespace-nowrap ${
                              t.type === 'income'
                                ? 'text-emerald-600'
                                : t.type === 'expense'
                                ? 'text-red-500'
                                : 'text-brand-700 dark:text-white'
                            }`}
                          >
                            {t.type === 'income' ? '+' : t.type === 'expense' ? '−' : ''}{currency.format(t.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {filteredTransactions.length > 100 && (
                    <p className="mt-3 text-center text-xs text-brand-400">
                      Mostrando los primeros 100 de {filteredTransactions.length} registros. Usa &quot;Exportar CSV&quot; para descargar el archivo completo.
                    </p>
                  )}
                </div>
              </section>

            </div>
          )}

        </main>
      </div>
    </AppLayout>
  )
}
