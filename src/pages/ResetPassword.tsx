import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import { AuthLayout } from '@/components/AuthLayout'
import { obtenerCodigoError, traducirErrorRecuperacion } from '@/utils/firebaseErrors'

export default function ResetPassword() {
  const { resetPassword } = useAuth()

  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Ingresa un correo válido.')
      return
    }
    setError('')

    setCargando(true)
    try {
      await resetPassword(email)
      setEnviado(true)
      toast.success('Correo de recuperación enviado.')
    } catch (error) {
      const codigo = obtenerCodigoError(error)
      const mensaje = traducirErrorRecuperacion(codigo)
      setError(mensaje)
      toast.error(mensaje)
    } finally {
      setCargando(false)
    }
  }

  return (
    <AuthLayout
      titulo="Recuperar contraseña"
      subtitulo="Te enviaremos un enlace a tu correo para restablecerla."
    >
      {enviado ? (
        <div className="rounded-lg border border-brand-100 bg-brand-50 p-4 text-sm text-brand-700 dark:border-brand-700 dark:bg-brand-800 dark:text-brand-100">
          Revisa tu bandeja de entrada en <strong>{email}</strong> y sigue las
          instrucciones para restablecer tu contraseña.
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-brand-700 dark:text-brand-100">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              className="input-field"
              placeholder="tucorreo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={cargando}
              autoComplete="email"
            />
            {error && <p className="field-error">{error}</p>}
          </div>

          <button type="submit" className="btn-primary" disabled={cargando}>
            {cargando ? 'Enviando...' : 'Enviar enlace de recuperación'}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-brand-400">
        <Link to="/login" className="font-semibold text-brand-500 hover:underline dark:text-gold-400">
          Volver a inicio de sesión
        </Link>
      </p>
    </AuthLayout>
  )
}
