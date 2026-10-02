import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface EvolutionDataPoint {
  label: string
  Ingresos: number
  Gastos: number
}

interface FinancialChartsProps {
  /** Top categorías del mes: [nombre, total] ordenadas por monto descendente */
  topCategories: [string, number][]
  /** Total ingresos del mes */
  ingresosMes: number
  /** Total gastos del mes */
  gastosMes: number
  /** Formateador de moneda (reutiliza el de Dashboard) */
  formatCurrency: (value: number) => string
  /** Indica si está en dark mode para ajustar colores */
  isDark: boolean
  /** Datos para la evolución temporal (opcional) */
  evolutionData?: EvolutionDataPoint[]
}

// ─── Paleta de colores para la dona ───────────────────────────────────────────
// Colores accesibles, distinguibles en daltonismo (no solo rojo/verde)
const DONA_COLORS = [
  '#0b3d3a', // brand-500 (verde azulado)
  '#d9a441', // gold-500
  '#3f8a82', // brand-400
  '#e6bb6a', // gold-400
  '#6fa9a3', // brand-300
  '#b88630', // gold-600
  '#a3c8c4', // brand-200
  '#082a28', // brand-700
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Abrevia un número grande para los ejes: 1.500.000 → 1,5M */
export function abbreviateNumber(value: number): string {
  if (!Number.isFinite(value) || isNaN(value)) return '0'
  const abs = Math.abs(value)
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${(value / 1_000).toFixed(0)}k`
  return String(value)
}

/** Trunca etiquetas largas de categoría para que quepan en la leyenda */
function truncateLabel(label: string, max = 14): string {
  return label.length > max ? `${label.slice(0, max)}…` : label
}

// ─── Tooltip personalizado para la dona ──────────────────────────────────────

interface DonaTooltipProps {
  active?: boolean
  payload?: Array<{ name: string; value: number; payload: { total: number } }>
  formatCurrency: (v: number) => string
  total: number
}

function DonaTooltip({ active, payload, formatCurrency, total }: DonaTooltipProps) {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0]
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className="rounded-xl border border-brand-100 bg-white px-3 py-2 shadow-soft text-xs dark:border-brand-700 dark:bg-brand-800">
      <p className="font-semibold text-brand-700 dark:text-white">{name}</p>
      <p className="text-brand-500 dark:text-brand-200">{formatCurrency(value)}</p>
      <p className="text-brand-400">{pct}% del total</p>
    </div>
  )
}

// ─── Tooltip personalizado para la barra ─────────────────────────────────────

interface BarTooltipProps {
  active?: boolean
  payload?: Array<{ name: string; value: number; fill: string }>
  formatCurrency: (v: number) => string
}

function BarTooltip({ active, payload, formatCurrency }: BarTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-brand-100 bg-white px-3 py-2 shadow-soft text-xs dark:border-brand-700 dark:bg-brand-800">
      {payload.map((entry) => (
        <p key={entry.name} className="font-semibold" style={{ color: entry.fill }}>
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  )
}

// ─── Tooltip personalizado para la evolución temporal ──────────────────────

interface EvolutionTooltipProps {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
  formatCurrency: (v: number) => string
}

function EvolutionTooltip({ active, payload, label, formatCurrency }: EvolutionTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-brand-100 bg-white px-3 py-2 shadow-soft text-xs dark:border-brand-700 dark:bg-brand-800">
      <p className="mb-1 font-bold text-brand-800 dark:text-white">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="font-medium" style={{ color: entry.color }}>
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  )
}

// ─── Estado vacío ─────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
      <span className="text-3xl" aria-hidden="true">📈</span>
      <p className="text-sm font-medium text-brand-500 dark:text-brand-300">Sin datos suficientes</p>
      <p className="text-xs text-brand-400">{message}</p>
    </div>
  )
}

// ─── Componente de Evolución Temporal ────────────────────────────────────────

export function EvolutionChart({
  data,
  formatCurrency,
  isDark,
  title = 'Evolución temporal',
}: {
  data: EvolutionDataPoint[]
  formatCurrency: (v: number) => string
  isDark: boolean
  title?: string
}) {
  const axisColor = isDark ? '#6fa9a3' : '#3f8a82'
  const gridColor = isDark ? '#082a28' : '#cfe3e1'

  const hasData = data.some((d) => d.Ingresos > 0 || d.Gastos > 0)

  return (
    <section aria-label={title}>
      <h3 className="mb-3 text-sm font-semibold text-brand-700 dark:text-white">
        {title}
      </h3>

      {!hasData ? (
        <EmptyState message="No hay datos suficientes para graficar la evolución temporal en este período." />
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
            <defs>
              <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={0.6} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: axisColor }}
              axisLine={{ stroke: gridColor }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={abbreviateNumber}
              tick={{ fontSize: 10, fill: axisColor }}
              axisLine={false}
              tickLine={false}
              width={38}
            />
            <Tooltip content={<EvolutionTooltip formatCurrency={formatCurrency} />} />
            <Legend
              iconType="circle"
              iconSize={8}
              formatter={(value) => (
                <span className="text-xs text-brand-500 dark:text-brand-300">{value}</span>
              )}
            />
            <Area
              type="monotone"
              dataKey="Ingresos"
              stroke="#10b981"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorIngresos)"
            />
            <Area
              type="monotone"
              dataKey="Gastos"
              stroke="#ef4444"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorGastos)"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </section>
  )
}

// ─── Componente principal ────────────────────────────────────────────────────

export function FinancialCharts({
  topCategories,
  ingresosMes,
  gastosMes,
  formatCurrency,
  isDark,
  evolutionData,
}: FinancialChartsProps) {
  // Colores adaptativos al modo oscuro
  const axisColor = isDark ? '#6fa9a3' : '#3f8a82'   // brand-300 / brand-400
  const gridColor = isDark ? '#082a28' : '#cfe3e1'    // brand-700 / brand-100

  // ── Datos para la dona: solo categorías con gasto > 0 ─────────────────────
  const donaData = topCategories
    .filter(([, total]) => total > 0)
    .map(([name, total]) => ({ name, total }))

  const donaTotal = donaData.reduce((s, d) => s + d.total, 0)

  // ── Datos para la barra comparativa ───────────────────────────────────────
  const barData = [
    { concepto: 'Este mes', Ingresos: ingresosMes, Gastos: gastosMes },
  ]
  const hasBarData = ingresosMes > 0 || gastosMes > 0

  return (
    <div className="space-y-6">

      {/* ── Gráfica 1: Dona — Gastos por categoría ───────────────────────── */}
      <section aria-label="Distribución de gastos por categoría">
        <h3 className="mb-3 text-sm font-semibold text-brand-700 dark:text-white">
          Gastos por categoría
        </h3>

        {donaData.length === 0 ? (
          <EmptyState message="No hay gastos registrados en el período para mostrar la distribución." />
        ) : (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={donaData}
                  dataKey="total"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="52%"
                  outerRadius="75%"
                  paddingAngle={donaData.length > 1 ? 2 : 0}
                  aria-label="Gráfica de dona con distribución de gastos por categoría"
                >
                  {donaData.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={DONA_COLORS[index % DONA_COLORS.length]}
                      stroke="transparent"
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={
                    <DonaTooltip
                      formatCurrency={formatCurrency}
                      total={donaTotal}
                    />
                  }
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => (
                    <span
                      className="text-xs text-brand-500 dark:text-brand-300"
                      title={value}
                    >
                      {truncateLabel(value)}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Tabla accesible de respaldo */}
            <table className="sr-only">
              <caption>Distribución de gastos por categoría</caption>
              <thead>
                <tr><th>Categoría</th><th>Monto</th><th>Porcentaje</th></tr>
              </thead>
              <tbody>
                {donaData.map(({ name, total }) => (
                  <tr key={name}>
                    <td>{name}</td>
                    <td>{formatCurrency(total)}</td>
                    <td>{donaTotal > 0 ? Math.round((total / donaTotal) * 100) : 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>

      {/* ── Gráfica 2: Barra — Ingresos vs Gastos del mes ───────────────── */}
      <section aria-label="Comparación ingresos y gastos del mes">
        <h3 className="mb-3 text-sm font-semibold text-brand-700 dark:text-white">
          Ingresos vs Gastos
        </h3>

        {!hasBarData ? (
          <EmptyState message="Registra ingresos y gastos para ver la comparación mensual." />
        ) : (
          <>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={barData}
                margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
                aria-label="Gráfica de barras comparando ingresos y gastos del mes"
              >
                <XAxis
                  dataKey="concepto"
                  tick={{ fontSize: 11, fill: axisColor }}
                  axisLine={{ stroke: gridColor }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={abbreviateNumber}
                  tick={{ fontSize: 10, fill: axisColor }}
                  axisLine={false}
                  tickLine={false}
                  width={38}
                />
                <Tooltip
                  content={<BarTooltip formatCurrency={formatCurrency} />}
                  cursor={{ fill: isDark ? 'rgba(11,61,58,0.3)' : 'rgba(11,61,58,0.06)' }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => (
                    <span className="text-xs text-brand-500 dark:text-brand-300">{value}</span>
                  )}
                />
                <Bar
                  dataKey="Ingresos"
                  fill="#10b981"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={52}
                  aria-label={`Ingresos: ${formatCurrency(ingresosMes)}`}
                />
                <Bar
                  dataKey="Gastos"
                  fill="#ef4444"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={52}
                  aria-label={`Gastos: ${formatCurrency(gastosMes)}`}
                />
              </BarChart>
            </ResponsiveContainer>

            {/* Tabla accesible de respaldo */}
            <table className="sr-only">
              <caption>Comparación ingresos y gastos del mes actual</caption>
              <thead>
                <tr><th>Concepto</th><th>Monto</th></tr>
              </thead>
              <tbody>
                <tr><td>Ingresos</td><td>{formatCurrency(ingresosMes)}</td></tr>
                <tr><td>Gastos</td><td>{formatCurrency(gastosMes)}</td></tr>
                <tr><td>Balance</td><td>{formatCurrency(ingresosMes - gastosMes)}</td></tr>
              </tbody>
            </table>
          </>
        )}
      </section>

      {/* ── Gráfica 3 (Opcional): Evolución temporal integrada ──────────── */}
      {evolutionData && evolutionData.length > 0 && (
        <EvolutionChart
          data={evolutionData}
          formatCurrency={formatCurrency}
          isDark={isDark}
        />
      )}
    </div>
  )
}

