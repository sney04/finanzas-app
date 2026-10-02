import { useEffect, useState } from 'react'

/**
 * Hook que captura el evento `beforeinstallprompt` del navegador
 * y expone un método para mostrar el diálogo de instalación de la PWA.
 *
 * - `canInstall`: true cuando el navegador soporta la instalación y
 *   la app aún no está instalada.
 * - `isInstalled`: true cuando la app está corriendo en modo standalone
 *   (ya instalada como PWA).
 * - `install()`: muestra el diálogo nativo de instalación del sistema operativo.
 * - `dismiss()`: descarta el prompt sin instalarlo (por ejemplo, si el usuario
 *   cierra un banner personalizado).
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function useInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Detectar si ya está instalada como PWA (modo standalone)
    const mq = window.matchMedia('(display-mode: standalone)')
    setIsInstalled(mq.matches)

    const handleChange = (e: MediaQueryListEvent) => setIsInstalled(e.matches)
    mq.addEventListener('change', handleChange)

    // Capturar el evento antes de que el navegador lo muestre automáticamente
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setPromptEvent(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    // Si el usuario instala la app, limpiar el prompt
    const handleInstalled = () => {
      setPromptEvent(null)
      setIsInstalled(true)
    }
    window.addEventListener('appinstalled', handleInstalled)

    return () => {
      mq.removeEventListener('change', handleChange)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  async function install(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    if (!promptEvent) return 'unavailable'

    await promptEvent.prompt()
    const { outcome } = await promptEvent.userChoice
    setPromptEvent(null)
    return outcome
  }

  function dismiss() {
    setPromptEvent(null)
  }

  return {
    /** true si el navegador tiene un prompt de instalación disponible */
    canInstall: promptEvent !== null && !isInstalled,
    /** true si la app ya está instalada como PWA */
    isInstalled,
    /** Muestra el diálogo nativo de instalación */
    install,
    /** Descarta el prompt sin instalar */
    dismiss,
  }
}
