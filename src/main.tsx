import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// ── Registro del Service Worker (PWA) ────────────────────────────────────────
// Solo en producción y en navegadores que lo soporten.
// En desarrollo el SW no se registra para evitar problemas de caché.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.info('[SW] Registrado:', registration.scope)

        // Detectar cuando hay una nueva versión disponible
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (!newWorker) return

          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              // Nueva versión disponible — se puede mostrar un toast al usuario
              console.info('[SW] Nueva versión disponible. Recarga para actualizar.')
            }
          })
        })
      })
      .catch((error) => {
        console.warn('[SW] Error al registrar:', error)
      })
  })
}
