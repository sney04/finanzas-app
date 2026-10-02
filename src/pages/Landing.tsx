import { Link } from 'react-router-dom'
import { useDarkMode } from '@/hooks/useDarkMode'

const features = [
  {
    icon: '📊',
    title: 'Ingresos y gastos',
    description: 'Registra y consulta tus movimientos financieros desde cualquier dispositivo.',
  },
  {
    icon: '💰',
    title: 'Meta de ahorro',
    description: 'Define una meta mensual y observa tu progreso en tiempo real.',
  },
  {
    icon: '🏷️',
    title: 'Categorías personalizadas',
    description: 'Organiza tus movimientos según tus propias categorías.',
  },
  {
    icon: '🔐',
    title: 'Tu información',
    description: 'Cada cuenta mantiene sus datos separados y protegidos.',
  },
]

export default function Landing() {
  const [isDark, toggleDark] = useDarkMode()
  return (
    <main className="min-h-screen overflow-x-hidden bg-surface-light text-brand-900 dark:bg-surface-dark dark:text-white">
      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="relative isolate">
        <div className="absolute inset-x-0 top-0 -z-10 h-[480px] bg-brand-900 sm:h-[520px]" />
        <div className="absolute -right-24 top-16 -z-10 h-64 w-64 rounded-full bg-gold-500/20 blur-3xl sm:h-72 sm:w-72" />
        <div className="absolute -left-32 top-72 -z-10 h-72 w-72 rounded-full bg-brand-500/40 blur-3xl sm:h-80 sm:w-80" />

        <div className="mx-auto max-w-6xl px-4 pb-16 pt-5 sm:px-8 sm:pb-20 lg:pb-28">
          {/* Nav */}
          <nav className="flex items-center justify-between">
            <Link
              to="/"
              className="font-display text-xl font-bold tracking-tight text-white"
              aria-label="FINANZAS04 — Inicio"
            >
              FINANZAS<span className="text-gold-400">04</span>
            </Link>
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Toggle dark mode */}
              <button
                type="button"
                onClick={toggleDark}
                aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                title={isDark ? 'Modo claro' : 'Modo oscuro'}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/30 text-base transition hover:border-white hover:bg-white/10"
              >
                {isDark ? '☀️' : '🌙'}
              </button>

              <Link
                to="/login"
                className="text-sm font-semibold text-white/80 transition hover:text-white"
              >
                Iniciar sesión
              </Link>
              <Link
                to="/registro"
                className="rounded-lg bg-gold-500 px-4 py-2 text-sm font-bold text-brand-900 transition hover:bg-gold-400"
              >
                Crear cuenta
              </Link>
            </div>
          </nav>

          {/* Hero content */}
          <div className="grid items-center gap-10 pt-16 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:pt-28">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold-400 sm:text-sm">
                Control financiero personal
              </p>
              <h1 className="mt-4 font-display text-3xl font-bold leading-tight text-white sm:mt-5 sm:text-5xl lg:text-6xl">
                Controla tus finanzas de forma sencilla.
              </h1>
              <p className="mt-5 max-w-xl text-sm leading-7 text-brand-100 sm:text-base sm:leading-8">
                Registra tus ingresos y gastos, organiza tus categorías y controla
                tus objetivos de ahorro desde un solo lugar.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:mt-8">
                <Link
                  to="/registro"
                  className="rounded-xl bg-gold-500 px-6 py-3 text-center text-sm font-bold text-brand-900 transition hover:bg-gold-400 active:scale-95"
                >
                  Crear cuenta gratis
                </Link>
                <Link
                  to="/login"
                  className="rounded-xl border border-white/30 px-6 py-3 text-center text-sm font-bold text-white transition hover:border-white hover:bg-white/10 active:scale-95"
                >
                  Ya tengo cuenta
                </Link>
              </div>
            </div>

            {/* Mockup card */}
            <div className="relative mx-auto w-full max-w-sm lg:max-w-md">
              <div className="rounded-3xl border border-white/15 bg-white/10 p-3 shadow-2xl backdrop-blur-sm sm:p-4">
                <div className="rounded-2xl bg-white p-4 text-brand-900 sm:p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-400">
                        Resumen mensual
                      </p>
                      <p className="mt-1.5 font-display text-2xl font-bold sm:text-3xl">
                        $2.450.000
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      +12,4%
                    </span>
                  </div>
                  <div className="mt-6 grid grid-cols-2 gap-2 sm:mt-8 sm:gap-3">
                    <div className="rounded-xl bg-emerald-50 p-3">
                      <div className="flex items-center gap-1 text-xs text-brand-400">
                        <span aria-hidden="true">↑</span> Ingresos
                      </div>
                      <p className="mt-1 font-bold text-emerald-700">$3.200.000</p>
                    </div>
                    <div className="rounded-xl bg-red-50 p-3">
                      <div className="flex items-center gap-1 text-xs text-brand-400">
                        <span aria-hidden="true">↓</span> Gastos
                      </div>
                      <p className="mt-1 font-bold text-red-600">$750.000</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-brand-100 pt-3 text-sm sm:mt-5 sm:pt-4">
                    <span className="text-brand-400">Meta de ahorro</span>
                    <span className="font-bold text-brand-700">68%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-brand-100">
                    <div className="h-full w-[68%] rounded-full bg-brand-500" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-8 sm:py-20 lg:py-24">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-500 sm:text-sm">
            Todo más claro
          </p>
          <h2 className="mt-3 font-display text-2xl font-bold sm:text-3xl lg:text-4xl">
            Una vista simple para tomar mejores decisiones.
          </h2>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 sm:mt-12 lg:grid-cols-4">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-2xl border border-brand-100 bg-white p-5 shadow-soft transition hover:shadow-md dark:border-brand-700 dark:bg-brand-800"
            >
              <span className="text-2xl" aria-hidden="true">{feature.icon}</span>
              <h3 className="mt-4 font-display text-base font-bold sm:mt-5 sm:text-lg">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-brand-400">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-8 sm:pb-20 lg:pb-24">
        <div className="rounded-3xl bg-brand-500 px-6 py-10 text-center text-white sm:px-12 sm:py-12">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">
            Empieza a organizar tus finanzas
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-brand-100">
            Crea tu cuenta y comienza a tener una visión más clara de tus movimientos.
          </p>
          <Link
            to="/registro"
            className="mt-6 inline-block rounded-xl bg-white px-6 py-3 text-sm font-bold text-brand-700 transition hover:bg-brand-50 active:scale-95"
          >
            Crear mi cuenta gratis
          </Link>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-brand-100 px-4 py-5 dark:border-brand-700 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-1.5 text-sm text-brand-400 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-display font-bold text-brand-700 dark:text-white">
            FINANZAS<span className="text-gold-500">04</span>
          </span>
          <span>Control financiero personal</span>
        </div>
      </footer>
    </main>
  )
}
