import { useEffect, useState } from 'react'

const STORAGE_KEY = 'finanzas04-dark-mode'

function getInitialMode(): boolean {
  // 1. Preferencia guardada por el usuario
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored !== null) return stored === 'true'

  // 2. Preferencia del sistema operativo
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function applyMode(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark)
}

/**
 * Hook que gestiona el dark mode de la aplicación.
 * - Persiste la preferencia en localStorage.
 * - Respeta prefers-color-scheme si no hay preferencia guardada.
 * - Aplica/quita la clase `dark` en <html> de forma sincrónica.
 */
export function useDarkMode(): [boolean, () => void] {
  const [isDark, setIsDark] = useState<boolean>(() => {
    const initial = getInitialMode()
    // Aplicar inmediatamente para evitar flash de tema incorrecto
    applyMode(initial)
    return initial
  })

  useEffect(() => {
    applyMode(isDark)
    localStorage.setItem(STORAGE_KEY, String(isDark))
  }, [isDark])

  function toggle() {
    setIsDark((prev) => !prev)
  }

  return [isDark, toggle]
}
