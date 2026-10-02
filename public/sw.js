/**
 * FINANSAS04 — Service Worker
 *
 * Estrategia:
 * - Assets estáticos (JS, CSS, íconos): Cache First  → respuesta instantánea
 * - Navegación (HTML): Network First → siempre la versión más reciente
 * - Llamadas a Firebase/Firestore: Network Only → no cachear datos financieros
 *
 * El Service Worker se actualiza automáticamente cuando el hash del bundle cambia
 * (Vite incluye el hash en el nombre del archivo: index-ABC123.js).
 */

const CACHE_NAME = 'finansas04-v1'

// Assets que se precargan al instalar el SW
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
]

// URLs que NUNCA se cachean (Firebase, APIs externas)
const NETWORK_ONLY_PATTERNS = [
  'firestore.googleapis.com',
  'firebase.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'googleapis.com',
  'firebaseio.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
]

function isNetworkOnly(url) {
  return NETWORK_ONLY_PATTERNS.some((pattern) => url.includes(pattern))
}

function isStaticAsset(url) {
  return (
    url.includes('/assets/') ||
    url.endsWith('.js') ||
    url.endsWith('.css') ||
    url.endsWith('.png') ||
    url.endsWith('.jpg') ||
    url.endsWith('.svg') ||
    url.endsWith('.ico') ||
    url.endsWith('.woff2') ||
    url.endsWith('.woff')
  )
}

// ── Instalación: precachear assets críticos ───────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  )
})

// ── Activación: limpiar caches antiguas ──────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  )
})

// ── Fetch: estrategia por tipo de recurso ─────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = request.url

  // Solo interceptar peticiones GET
  if (request.method !== 'GET') return

  // Firebase y APIs externas → siempre red (nunca cache)
  if (isNetworkOnly(url)) return

  // Assets estáticos → Cache First (con fallback a red)
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone()
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
            }
            return response
          })
      )
    )
    return
  }

  // Navegación (HTML / SPA routes) → Network First con fallback a cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        })
        .catch(() => caches.match('/index.html'))
    )
    return
  }
})
