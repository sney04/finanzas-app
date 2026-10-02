import { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface AuthLayoutProps {
  titulo: string
  subtitulo: string
  children: ReactNode
}

export function AuthLayout({ titulo, subtitulo, children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-brand-900 lg:flex-row">
      {/* ── Panel de marca ─────────────────────────────────────────────────
          Visible solo en pantallas lg+. En móvil se reemplaza por un
          encabezado compacto en la parte superior del formulario.
      ──────────────────────────────────────────────────────────────────── */}
      <div className="relative hidden flex-col justify-between bg-brand-500 p-10 text-white lg:flex lg:w-1/2 xl:p-12">
        <Link
          to="/"
          className="font-display text-lg font-semibold tracking-tight"
          aria-label="FINANZAS04 — Inicio"
        >
          FINANZAS<span className="text-gold-400">04</span>
        </Link>

        <div>
          <p className="font-display text-4xl font-bold leading-tight text-white xl:text-5xl">
            El control de tus finanzas, en un solo lugar.
          </p>
          <p className="mt-4 max-w-sm text-sm leading-7 text-brand-100">
            Registra tus ingresos y gastos, define metas de ahorro y organiza
            tus categorías — todo desde cualquier dispositivo.
          </p>
        </div>

        <p className="text-xs text-brand-200">
          Control financiero personal · Pesos colombianos (COP)
        </p>

        {/* Decoración */}
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-gold-500/10"
          aria-hidden="true"
        />
      </div>

      {/* ── Panel del formulario ───────────────────────────────────────────── */}
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-brand-900 px-4 py-8 lg:min-h-0 lg:w-1/2 lg:bg-surface-light lg:px-8 lg:py-10 lg:dark:bg-surface-dark">
        {/* Logo compacto solo en móvil/tablet */}
        <Link
          to="/"
          className="mb-6 font-display text-xl font-bold tracking-tight text-white lg:hidden"
          aria-label="FINANZAS04 — Inicio"
        >
          FINANZAS<span className="text-gold-400">04</span>
        </Link>

        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white p-6 shadow-2xl sm:p-8 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
          <h1 className="font-display text-2xl font-bold text-brand-900 dark:text-white lg:text-brand-900 lg:dark:text-white">
            {titulo}
          </h1>
          <p className="mt-1 text-sm text-brand-400">{subtitulo}</p>

          <div className="mt-7">{children}</div>
        </div>
      </div>
    </div>
  )
}
