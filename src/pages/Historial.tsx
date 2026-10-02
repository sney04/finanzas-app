import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import { useDarkMode } from '@/hooks/useDarkMode'
import { AppLayout } from '@/components/AppLayout'
import { subscribeToUserTransactions } from '@/services/transactionService'
import { getUserProfile } from '@/services/userProfileService'
import { Transaction, TransactionType } from '@/types/transaction'
import { DEFAULT_CURRENCY, CurrencyCode } from '@/types/userProfile'
import { formatDateForDisplay, getYearMonth } from '@/utils/date'

// ─── Constantes ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 25

type TransactionFilter = 'all' | TransactionType
type SortField = 'date' | 'amount' | 'category' | 'description'
type SortDir = 'asc' | 'desc'

// ─── Exportación CSV ──────────────────────────────────────────────────────────

function escapeCSVText(value: string): string {
  const escaped = value.replace(/"/g, '""')
  const safeValue = /^[=+\-@]/.test(escaped) ? `'${escaped}` : escaped
  return `"${safeValue}"`
}

function exportToCSV(transactions: Transaction[], currencyCode: string) {
  const header = ['Fecha', 'Tipo', 'Monto', 'Moneda', 'Categoría', 'Descripción']
  const rows = transactions.map((t) => [
    t.date,
    t.type === 'income' ? 'Ingreso' : t.type === 'expense' ? 'Gasto' : 'Transferencia',
    String(t.amount),
    currencyCode,
    escapeCSVText(t.category),
    escapeCSVText(t.description),
  ])

  const csv = [header, ...rows].map((r) => r.join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `finanzas04-historial-${getYearMonth()}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function Historial() {
  const { user } = useAuth()
  const [isDark, toggleDark] = useDarkMode()

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Perfil (moneda)
  const [currencyCode, setCurrencyCode] = useState<CurrencyCode>(DEFAULT_CURRENCY)

  // Filtros
  const [typeFilter, setTypeFilter] = useState<TransactionFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [monthFilter, setMonthFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  // Ordenamiento
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  // Paginación
  const [page, setPage] = useState(1)

  // ─── Formato de moneda ───────────────────────────────────────────────────
  const currency = useMemo(
    () =>
      new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: currencyCode,
        maximumFractionDigits: 0,
      }),
    [currencyCode],
  )

  // ─── Suscripción a transacciones ─────────────────────────────────────────
  useEffect(() => {
    if (!user?.uid) {
      setTransactions([])
      setLoading(false)
      return
    }
    setLoading(true)
    return subscribeToUserTransactions(
      user.uid,
      (items) => { setTransactions(items); setError(''); setLoading(false) },
      () => { setError('No se pudieron cargar los movimientos.'); setLoading(false) },
    )
  }, [user?.uid])

  // ─── Carga de perfil (moneda) ────────────────────────────────────────────
  useEffect(() => {
    if (!user?.uid) return
    let active = true
    getUserProfile(user.uid)
      .then((profile) => { if (active && profile) setCurrencyCode(profile.moneda) })
      .catch(() => { /* usa la moneda por defecto */ })
    return () => { active = false }
  }, [user?.uid])

  // ─── Categorías disponibles ──────────────────────────────────────────────
  const availableCategories = useMemo(
    () => [...new Set(transactions.map((t) => t.category))].sort(),
    [transactions],
  )

  // ─── Meses disponibles ───────────────────────────────────────────────────
  const availableMonths = useMemo(
    () => [...new Set(transactions.map((t) => t.date.slice(0, 7)))].sort().reverse(),
    [transactions],
  )

  // ─── Filtrado ────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLocaleLowerCase()
    return transactions.filter((t) => {
      const text = `${t.description} ${t.category}`.toLocaleLowerCase()
      return (
        (typeFilter === 'all' || t.type === typeFilter) &&
        (!categoryFilter || t.category === categoryFilter) &&
        (!monthFilter || t.date.startsWith(monthFilter)) &&
        (!term || text.includes(term))
      )
    })
  }, [transactions, typeFilter, categoryFilter, monthFilter, searchTerm])

  // ─── Ordenamiento ────────────────────────────────────────────────────────
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'date':        cmp = a.date.localeCompare(b.date); break
        case 'amount':      cmp = a.amount - b.amount; break
        case 'category':    cmp = a.category.localeCompare(b.category); break
        case 'description': cmp = a.description.localeCompare(b.description); break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortField, sortDir])

  // ─── Totales del filtro activo ───────────────────────────────────────────
  const totals = useMemo(() => {
    const ingresos = filtered.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const gastos   = filtered.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    return { ingresos, gastos, balance: ingresos - gastos }
  }, [filtered])

  // ─── Paginación ──────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const paginated  = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function handleSortClick(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir(field === 'date' ? 'desc' : 'asc')
    }
    setPage(1)
  }

  function handleFilterChange() {
    setPage(1)
  }

  function clearFilters() {
    setTypeFilter('all')
    setCategoryFilter('')
    setMonthFilter('')
    setSearchTerm('')
    setPage(1)
  }

  const hasActiveFilters = typeFilter !== 'all' || categoryFilter || monthFilter || searchTerm

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <span className="ml-1 text-brand-300 dark:text-brand-600">↕</span>
    return <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <AppLayout>
    <div className="min-h-screen bg-surface-light pb-20 text-brand-900 dark:bg-surface-dark dark:text-white">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-brand-100 bg-surface-light/90 backdrop-blur-sm dark:border-brand-700 dark:bg-surface-dark/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="flex items-center gap-1.5 rounded-lg border border-brand-200 px-3 py-2 text-xs font-semibold text-brand-500 transition hover:bg-brand-50 dark:border-brand-600 dark:hover:bg-brand-800"
              aria-label="Volver al Dashboard"
            >
              <span aria-hidden="true">←</span>
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
            <h1 className="font-display text-lg font-bold sm:text-xl">Historial</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle dark mode */}
            <button
              type="button"
              onClick={toggleDark}
              aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-brand-200 text-base transition hover:bg-brand-50 dark:border-brand-600 dark:hover:bg-brand-800"
            >
              {isDark ? '☀️' : '🌙'}
            </button>

            {/* Exportar CSV */}
            {filtered.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  exportToCSV(sorted, currencyCode)
                  toast.success(`${filtered.length} movimientos exportados.`)
                }}
                className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-xs font-bold text-white transition hover:bg-brand-600"
              >
                <span aria-hidden="true">⬇</span>
                <span>Exportar CSV</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Totales del filtro activo */}
        <section aria-label="Resumen del filtro" className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-brand-100 bg-white p-4 shadow-soft dark:border-brand-700 dark:bg-brand-800">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-xs text-emerald-600 dark:bg-emerald-900/40" aria-hidden="true">↑</span>
              <p className="text-sm text-brand-400">Ingresos</p>
            </div>
            <p className="mt-2 text-xl font-bold text-emerald-600">{currency.format(totals.ingresos)}</p>
          </div>
          <div className="rounded-2xl border border-brand-100 bg-white p-4 shadow-soft dark:border-brand-700 dark:bg-brand-800">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-100 text-xs text-red-500 dark:bg-red-900/40" aria-hidden="true">↓</span>
              <p className="text-sm text-brand-400">Gastos</p>
            </div>
            <p className="mt-2 text-xl font-bold text-red-500">{currency.format(totals.gastos)}</p>
          </div>
          <div className="rounded-2xl border border-brand-100 bg-white p-4 shadow-soft dark:border-brand-700 dark:bg-brand-800">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs text-brand-500 dark:bg-brand-700" aria-hidden="true">=</span>
              <p className="text-sm text-brand-400">Balance</p>
            </div>
            <p className={`mt-2 text-xl font-bold ${totals.balance >= 0 ? 'text-brand-700 dark:text-white' : 'text-red-500'}`}>
              {currency.format(totals.balance)}
            </p>
          </div>
        </section>

        {/* Filtros */}
        <section aria-label="Filtros" className="mb-4 rounded-2xl border border-brand-100 bg-white p-4 shadow-soft dark:border-brand-700 dark:bg-brand-800">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value as TransactionFilter); handleFilterChange() }}
              className="rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm dark:border-brand-600 dark:bg-brand-900"
              aria-label="Filtrar por tipo"
            >
              <option value="all">Todos</option>
              <option value="income">Ingresos</option>
              <option value="expense">Gastos</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); handleFilterChange() }}
              className="rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm dark:border-brand-600 dark:bg-brand-900"
              aria-label="Filtrar por categoría"
            >
              <option value="">Categoría</option>
              {availableCategories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={monthFilter}
              onChange={(e) => { setMonthFilter(e.target.value); handleFilterChange() }}
              className="rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm dark:border-brand-600 dark:bg-brand-900"
              aria-label="Filtrar por mes"
            >
              <option value="">Todos los meses</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              className="rounded-xl border border-brand-200 px-3 py-2 text-xs font-medium text-brand-500 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-brand-600 dark:hover:bg-brand-900"
            >
              Limpiar
            </button>
          </div>

          <div className="mt-2">
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); handleFilterChange() }}
              placeholder="Buscar por descripción o categoría…"
              className="w-full rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm dark:border-brand-600 dark:bg-brand-900"
            />
          </div>

          {/* Contador de resultados */}
          <p className="mt-2 text-xs text-brand-400">
            {loading ? 'Cargando…' : (
              filtered.length === transactions.length
                ? `${transactions.length} movimiento${transactions.length !== 1 ? 's' : ''} en total`
                : `${filtered.length} de ${transactions.length} movimiento${transactions.length !== 1 ? 's' : ''}`
            )}
          </p>
        </section>

        {/* Tabla */}
        <div className="rounded-2xl border border-brand-100 bg-white shadow-soft dark:border-brand-700 dark:bg-brand-800">
          {loading ? (
            <p className="py-16 text-center text-sm text-brand-400">Cargando movimientos…</p>
          ) : error ? (
            <p className="py-16 text-center text-sm text-red-500">{error}</p>
          ) : sorted.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-3xl" aria-hidden="true">📭</p>
              <p className="mt-3 text-sm text-brand-400">
                {hasActiveFilters ? 'No hay movimientos que coincidan con los filtros.' : 'Aún no tienes movimientos registrados.'}
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-3 text-sm font-medium text-brand-500 hover:underline"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Tabla — visible en sm+ */}
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-brand-100 dark:border-brand-700">
                      {(
                        [
                          { field: 'date' as SortField,        label: 'Fecha' },
                          { field: 'description' as SortField, label: 'Descripción' },
                          { field: 'category' as SortField,    label: 'Categoría' },
                          { field: 'amount' as SortField,      label: 'Monto' },
                        ] as const
                      ).map(({ field, label }) => (
                        <th
                          key={field}
                          scope="col"
                          onClick={() => handleSortClick(field)}
                          className="cursor-pointer select-none px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-brand-400 hover:text-brand-600 dark:hover:text-brand-200"
                        >
                          {label}
                          <SortIcon field={field} />
                        </th>
                      ))}
                      <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-brand-400">
                        Tipo
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-50 dark:divide-brand-700/50">
                    {paginated.map((t) => (
                      <tr
                        key={t.id}
                        className="transition hover:bg-brand-50/60 dark:hover:bg-brand-900/30"
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-brand-400">
                          {formatDateForDisplay(t.date)}
                        </td>
                        <td className="max-w-[220px] truncate px-4 py-3 font-medium">
                          {t.description || <span className="italic text-brand-300">Sin descripción</span>}
                        </td>
                        <td className="px-4 py-3 text-brand-500">{t.category}</td>
                        <td className={`whitespace-nowrap px-4 py-3 font-bold ${
                          t.type === 'income'
                            ? 'text-emerald-600'
                            : t.type === 'expense'
                              ? 'text-red-500'
                              : 'text-brand-700 dark:text-white'
                        }`}>
                          {t.type === 'income'
                            ? '+'
                            : t.type === 'expense'
                              ? '−'
                              : '↔ '}{currency.format(t.amount)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                              t.type === 'income'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                : t.type === 'expense'
                                  ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300'
                                  : 'bg-brand-100 text-brand-700 dark:bg-brand-700 dark:text-brand-100'
                            }`}
                          >
                            {t.type === 'income' ? '↑ Ingreso' : t.type === 'expense' ? '↓ Gasto' : '↔ Transferencia'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Lista de tarjetas — solo en móvil */}
              <div className="divide-y divide-brand-50 dark:divide-brand-700/50 sm:hidden">
                {paginated.map((t) => (
                  <div key={t.id} className="flex items-start gap-3 px-4 py-3">
                    <span
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        t.type === 'income'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300'
                      }`}
                      aria-label={t.type === 'income' ? 'Ingreso' : 'Gasto'}
                    >
                      {t.type === 'income' ? '↑' : '↓'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {t.description || <span className="italic text-brand-400">Sin descripción</span>}
                      </p>
                      <p className="mt-0.5 text-xs text-brand-400">
                        {t.category} · {formatDateForDisplay(t.date)}
                      </p>
                    </div>
                    <span className={`shrink-0 font-bold ${
                      t.type === 'income'
                        ? 'text-emerald-600'
                        : t.type === 'expense'
                          ? 'text-red-500'
                          : 'text-brand-700 dark:text-white'
                    }`}>
                      {t.type === 'income'
                        ? '+'
                        : t.type === 'expense'
                          ? '−'
                          : '↔ '}{currency.format(t.amount)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Paginación */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-brand-100 px-4 py-3 dark:border-brand-700">
                  <p className="text-xs text-brand-400">
                    Página {page} de {totalPages} · {filtered.length} resultados
                  </p>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      aria-label="Página anterior"
                      className="rounded-lg border border-brand-200 px-2.5 py-1.5 text-xs font-medium text-brand-500 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-brand-600 dark:hover:bg-brand-900"
                    >
                      ← Anterior
                    </button>

                    {/* Números de página — máximo 5 visibles */}
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                      .reduce<(number | '…')[]>((acc, p, idx, arr) => {
                        if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push('…')
                        acc.push(p)
                        return acc
                      }, [])
                      .map((p, idx) =>
                        p === '…' ? (
                          <span key={`ellipsis-${idx}`} className="px-1 py-1.5 text-xs text-brand-400">…</span>
                        ) : (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setPage(p as number)}
                            aria-current={page === p ? 'page' : undefined}
                            className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                              page === p
                                ? 'border-brand-500 bg-brand-500 text-white'
                                : 'border-brand-200 text-brand-500 hover:bg-brand-50 dark:border-brand-600 dark:hover:bg-brand-900'
                            }`}
                          >
                            {p}
                          </button>
                        ),
                      )}

                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      aria-label="Página siguiente"
                      className="rounded-lg border border-brand-200 px-2.5 py-1.5 text-xs font-medium text-brand-500 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-brand-600 dark:hover:bg-brand-900"
                    >
                      Siguiente →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

    </div>
    </AppLayout>
  )
}
