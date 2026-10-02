import { useAuth } from '@/hooks/useAuth'
import { useDarkMode } from '@/hooks/useDarkMode'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'
import { AppLayout } from '@/components/AppLayout'
import toast from 'react-hot-toast'
import { useEffect, useState } from 'react'
import { obtenerCodigoError, traducirErrorVinculacionGoogle } from '@/utils/firebaseErrors'

export default function Perfil() {
  const { user, logout, updateNombre, linkGoogle } = useAuth()
  const [isDark, toggleDark] = useDarkMode()
  const { canInstall, isInstalled, install } = useInstallPrompt()
  const [installing, setInstalling] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(user?.nombre || '')
  const [isSaving, setIsSaving] = useState(false)
  const [photoFailed, setPhotoFailed] = useState(false)
  const [linkingGoogle, setLinkingGoogle] = useState(false)
  const googleLinked = user?.providerData.some((provider) => provider.providerId === 'google.com') ?? false
  const passwordLinked = user?.providerData.some((provider) => provider.providerId === 'password') ?? false

  useEffect(() => {
    setPhotoFailed(false)
  }, [user?.fotoUrl])

  async function handleSaveName() {
    if (!editName.trim()) {
      toast.error('El nombre no puede estar vacío.')
      return
    }

    if (editName.trim() === user?.nombre) {
      setIsEditing(false)
      return
    }

    try {
      setIsSaving(true)
      await updateNombre(editName.trim())
      setIsEditing(false)
      toast.success('Nombre actualizado correctamente.')
    } catch (error) {
      console.error('Error actualizando nombre:', error)
      toast.error('No se pudo actualizar el nombre.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleLogout() {
    try {
      await logout()
      toast.success('Sesión cerrada correctamente.')
    } catch (error) {
      console.error('Error cerrando sesión:', error)
      toast.error('No se pudo cerrar la sesión.')
    }
  }

  async function handleLinkGoogle() {
    if (linkingGoogle || googleLinked) return

    setLinkingGoogle(true)
    try {
      await linkGoogle()
      toast.success('Google se vinculó a esta cuenta.')
    } catch (error) {
      toast.error(traducirErrorVinculacionGoogle(obtenerCodigoError(error)))
    } finally {
      setLinkingGoogle(false)
    }
  }

  return (
    <AppLayout>
    <div className="min-h-screen bg-surface-light dark:bg-surface-dark pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-brand-100 bg-white dark:border-brand-700 dark:bg-brand-800">
        <div className="mx-auto max-w-lg px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-display font-bold text-brand-900 dark:text-white">
              Perfil
            </h1>
            <button
              onClick={() => toggleDark()}
              className="rounded-lg p-2 hover:bg-brand-100 dark:hover:bg-brand-700"
              aria-label="Alternar modo oscuro"
            >
              {isDark ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-lg px-4 py-6">
        {/* User Info Card */}
        <div className="rounded-lg border border-brand-100 bg-white p-6 dark:border-brand-700 dark:bg-brand-800">
          <div className="flex items-center gap-4">
            {user?.fotoUrl && !photoFailed ? (
              <img
                src={user.fotoUrl}
                alt={`Foto de ${user.nombre}`}
                onError={() => setPhotoFailed(true)}
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gold-500 text-2xl font-bold text-white">
                {user?.nombre?.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <p className="text-xs text-brand-400 dark:text-brand-500">Nombre</p>
              {isEditing ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="input-field flex-1"
                    placeholder="Nombre"
                    disabled={isSaving}
                  />
                </div>
              ) : (
                <p className="text-lg font-semibold text-brand-900 dark:text-white">
                  {user?.nombre}
                </p>
              )}
            </div>
          </div>

          {isEditing && (
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleSaveName}
                disabled={isSaving}
                className="btn-primary flex-1 disabled:opacity-60"
              >
                {isSaving ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                onClick={() => {
                  setIsEditing(false)
                  setEditName(user?.nombre || '')
                }}
                disabled={isSaving}
                className="flex-1 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm font-semibold text-brand-900 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-brand-700 dark:bg-brand-700 dark:text-white dark:hover:bg-brand-600"
              >
                Cancelar
              </button>
            </div>
          )}

          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="mt-4 w-full rounded-lg bg-brand-100 px-4 py-2.5 text-sm font-semibold text-brand-900 transition hover:bg-brand-200 dark:bg-brand-700 dark:text-white dark:hover:bg-brand-600"
            >
              Editar nombre
            </button>
          )}
        </div>

        {/* User Details */}
        <div className="mt-4 rounded-lg border border-brand-100 bg-white p-4 dark:border-brand-700 dark:bg-brand-800">
          <div className="space-y-3">
            <div>
              <p className="text-xs text-brand-400 dark:text-brand-500">Email</p>
              <p className="text-sm font-medium text-brand-900 dark:text-white">
                {user?.email ?? 'No configurado'}
              </p>
            </div>
            <div>
              <p className="text-xs text-brand-400 dark:text-brand-500">UID</p>
              <p className="break-all text-xs font-mono text-brand-500 dark:text-brand-400">
                {user?.uid}
              </p>
            </div>
          </div>
        </div>

        {/* Sign-in methods */}
        <section
          className="mt-4 rounded-lg border border-brand-100 bg-white p-4 dark:border-brand-700 dark:bg-brand-800"
          aria-labelledby="signin-methods-title"
        >
          <h2 id="signin-methods-title" className="mb-3 text-sm font-semibold text-brand-900 dark:text-white">
            Métodos de acceso
          </h2>
          <ul className="space-y-3 text-sm text-brand-800 dark:text-brand-100">
            <li className="flex items-center justify-between gap-3">
              <span>Correo y contraseña</span>
              <span>{passwordLinked ? '✅ Vinculado' : '○ No vinculado'}</span>
            </li>
            <li className="flex items-center justify-between gap-3">
              <span>Google</span>
              <span>{googleLinked ? '✅ Vinculado' : '○ No vinculado'}</span>
            </li>
          </ul>

          {googleLinked ? (
            <p className="mt-4 rounded-lg bg-green-50 px-4 py-2.5 text-center text-sm font-semibold text-green-800 dark:bg-green-900/30 dark:text-green-200">
              ✅ Google vinculado
            </p>
          ) : (
            <button
              type="button"
              onClick={handleLinkGoogle}
              disabled={linkingGoogle}
              className="mt-4 w-full rounded-lg border border-brand-200 bg-white px-4 py-2.5 text-sm font-semibold text-brand-800 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-brand-600 dark:bg-brand-700 dark:text-white dark:hover:bg-brand-600"
            >
              {linkingGoogle ? 'Vinculando Google...' : 'Vincular Google'}
            </button>
          )}
        </section>

        {/* Settings Section */}
        <div className="mt-4 rounded-lg border border-brand-100 bg-white p-4 dark:border-brand-700 dark:bg-brand-800">
          <p className="mb-3 text-xs font-semibold uppercase text-brand-600 dark:text-brand-400">
            Configuración
          </p>
          <button
            onClick={() => toggleDark()}
            className="w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium text-brand-900 hover:bg-brand-50 dark:text-white dark:hover:bg-brand-700"
          >
            {isDark ? '☀️ Activar modo claro' : '🌙 Activar modo oscuro'}
          </button>
        </div>

        {/* Instalar app — siempre visible */}
        <section
          className="mt-4 rounded-lg border border-brand-100 bg-white p-4 dark:border-brand-700 dark:bg-brand-800"
          aria-labelledby="install-section-title"
        >
          <p
            id="install-section-title"
            className="mb-3 text-xs font-semibold uppercase text-brand-600 dark:text-brand-400"
          >
            Instalar aplicación
          </p>

          {/* Ya instalada como PWA */}
          {isInstalled && (
            <p className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-2.5 text-sm font-semibold text-green-800 dark:bg-green-900/30 dark:text-green-200">
              <span aria-hidden="true">✅</span>
              <span>Aplicación instalada en tu dispositivo</span>
            </p>
          )}

          {/* Botón de instalación nativa (Android / Chrome escritorio / Edge) */}
          {!isInstalled && canInstall && (
            <button
              type="button"
              onClick={async () => {
                setInstalling(true)
                await install()
                setInstalling(false)
              }}
              disabled={installing}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
            >
              <span aria-hidden="true">📲</span>
              {installing ? 'Instalando...' : 'Instalar en mi dispositivo'}
            </button>
          )}

          {/* Instrucciones manuales cuando el prompt no está disponible */}
          {!isInstalled && !canInstall && (
            <div className="space-y-3">
              <p className="text-sm text-brand-600 dark:text-brand-300">
                Instala FINANSAS04 en tu dispositivo para acceder sin el navegador.
              </p>

              {/* Chrome / Edge escritorio */}
              <div className="rounded-lg bg-brand-50 p-3 dark:bg-brand-700/40">
                <p className="mb-1 text-xs font-semibold text-brand-700 dark:text-brand-200">
                  🖥️ Chrome / Edge escritorio
                </p>
                <p className="text-xs text-brand-500 dark:text-brand-400">
                  Busca el ícono <span className="font-bold">⊕</span> en la barra de direcciones del navegador y haz clic en él.
                </p>
              </div>

              {/* Android Chrome */}
              <div className="rounded-lg bg-brand-50 p-3 dark:bg-brand-700/40">
                <p className="mb-1 text-xs font-semibold text-brand-700 dark:text-brand-200">
                  🤖 Android (Chrome)
                </p>
                <p className="text-xs text-brand-500 dark:text-brand-400">
                  Toca los <span className="font-bold">⋮ tres puntos</span> del menú → <span className="font-bold">"Añadir a pantalla de inicio"</span>.
                </p>
              </div>

              {/* iPhone / iPad */}
              <div className="rounded-lg bg-brand-50 p-3 dark:bg-brand-700/40">
                <p className="mb-1 text-xs font-semibold text-brand-700 dark:text-brand-200">
                  🍎 iPhone / iPad (Safari)
                </p>
                <p className="text-xs text-brand-500 dark:text-brand-400">
                  Toca <span className="font-bold">⬆ Compartir</span> → <span className="font-bold">"Añadir a pantalla de inicio"</span>.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="mt-6 w-full rounded-lg bg-red-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-600"
        >
          Cerrar sesión
        </button>
      </main>

    </div>
    </AppLayout>
  )
}
