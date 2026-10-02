import { Link, useLocation } from 'react-router-dom'

interface BottomNavProps {
  onAddPress: () => void
  disabled?: boolean
}

interface NavItem {
  to: string
  icon: string
  label: string
  exact?: boolean
}

const NAV_ITEMS_LEFT: NavItem[] = [
  { to: '/dashboard', icon: '⊞', label: 'Inicio', exact: true },
  { to: '/graficos', icon: '📊', label: 'Gráficos' },
]

const NAV_ITEMS_RIGHT: NavItem[] = [
  { to: '/informes', icon: '📄', label: 'Informes' },
  { to: '/perfil', icon: '👤', label: 'Yo' },
]

export function BottomNav({ onAddPress, disabled = false }: BottomNavProps) {
  const location = useLocation()

  function isActive(item: NavItem): boolean {
    if (item.exact) return location.pathname === item.to
    return location.pathname.startsWith(item.to)
  }

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed bottom-0 inset-x-0 z-40 border-t border-brand-100 bg-white dark:border-brand-700 dark:bg-brand-800"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-1">
        {/* Items izquierda */}
        {NAV_ITEMS_LEFT.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            aria-label={item.label}
            aria-current={isActive(item) ? 'page' : undefined}
            className={`flex min-w-[56px] flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-xs font-medium transition active:scale-95 ${
              isActive(item)
                ? 'text-gold-500 dark:text-gold-400'
                : 'text-brand-400 hover:text-brand-600 dark:hover:text-brand-200'
            }`}
          >
            <span className="text-xl leading-none" aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}

        {/* Botón central FAB */}
        <button
          type="button"
          onClick={onAddPress}
          disabled={disabled}
          aria-label="Agregar movimiento"
          className="relative -mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-gold-500 text-2xl font-bold text-white shadow-lg transition hover:bg-gold-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2"
        >
          <span aria-hidden="true">+</span>
        </button>

        {/* Items derecha */}
        {NAV_ITEMS_RIGHT.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            aria-label={item.label}
            aria-current={isActive(item) ? 'page' : undefined}
            className={`flex min-w-[56px] flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-xs font-medium transition active:scale-95 ${
              isActive(item)
                ? 'text-gold-500 dark:text-gold-400'
                : 'text-brand-400 hover:text-brand-600 dark:hover:text-brand-200'
            }`}
          >
            <span className="text-xl leading-none" aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
