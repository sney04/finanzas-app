/**
 * InstallAppBanner — Global
 *
 * Banner flotante visible en TODAS las páginas (Login, Landing, Dashboard, etc.).
 *
 * Comportamiento según dispositivo:
 * - Android Chrome: muestra el banner automáticamente cuando el sistema lo permite.
 * - Chrome escritorio / Edge: muestra el banner cuando el sistema lo permite.
 * - Safari iOS: muestra instrucciones manuales (no soporta beforeinstallprompt).
 * - Firefox / otros: oculto (no soportan instalación PWA).
 *
 * El usuario puede cerrarlo con la ✕ (se recuerda en sessionStorage).
 */
import { useEffect, useState } from 'react'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isInStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches
}

export function InstallAppBanner() {
  const { canInstall, isInstalled, install } = useInstallPrompt()
  const [installing, setInstalling] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [showIosHint, setShowIosHint] = useState(false)

  useEffect(() => {
    // Verificar si ya fue cerrado en esta sesión
    if (sessionStorage.getItem('pwa-banner-dismissed') === '1') {
      setDismissed(true)
      return
    }
    // Mostrar hint en iOS si no está instalada
    if (isIOS() && !isInStandaloneMode()) {
      setShowIosHint(true)
    }
  }, [])

  function handleDismiss() {
    sessionStorage.setItem('pwa-banner-dismissed', '1')
    setDismissed(true)
    setShowIosHint(false)
  }

  async function handleInstall() {
    setInstalling(true)
    await install()
    setInstalling(false)
  }

  // Ya instalada o cerrado por el usuario → no mostrar
  if (dismissed || isInstalled) return null

  // Android / escritorio Chrome con prompt disponible → banner de instalación
  if (canInstall) {
    return (
      <div
        role="region"
        aria-label="Instalar aplicación"
        className="fixed bottom-4 left-4 right-4 z-50 flex items-center gap-3 rounded-2xl border border-brand-200 bg-white px-4 py-3 shadow-lg dark:border-brand-700 dark:bg-brand-800"
      >
        <img
          src="/icon-192.png"
          alt="FINANSAS04"
          className="h-11 w-11 flex-shrink-0 rounded-xl"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-brand-900 dark:text-white">
            Instala FINANSAS04
          </p>
          <p className="truncate text-xs text-brand-400">
            Accede desde tu pantalla de inicio, sin navegador
          </p>
        </div>
        <button
          type="button"
          onClick={handleInstall}
          disabled={installing}
          className="flex-shrink-0 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
        >
          {installing ? '...' : 'Instalar'}
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Cerrar"
          className="flex-shrink-0 rounded-lg p-1 text-brand-400 hover:text-brand-700 dark:hover:text-white"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    )
  }

  // iOS Safari → instrucciones manuales
  if (showIosHint) {
    return (
      <div
        role="region"
        aria-label="Instalar aplicación en iPhone"
        className="fixed bottom-4 left-4 right-4 z-50 rounded-2xl border border-brand-200 bg-white px-4 py-3 shadow-lg dark:border-brand-700 dark:bg-brand-800"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <img src="/icon-192.png" alt="FINANSAS04" className="h-10 w-10 rounded-xl" />
            <div>
              <p className="text-sm font-semibold text-brand-900 dark:text-white">
                Instala FINANSAS04
              </p>
              <p className="text-xs text-brand-400">
                Toca <span className="font-bold">⬆ Compartir</span> → <span className="font-bold">"Añadir a inicio"</span>
              </p>
            </div>
          </div>
          <button type="button" onClick={handleDismiss} aria-label="Cerrar" className="rounded-lg p-1 text-brand-400 hover:text-brand-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    )
  }

  return null
}
