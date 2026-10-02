import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import { AuthLayout } from '@/components/AuthLayout'
import { obtenerCodigoError, traducirErrorFirebase, traducirErrorGoogle } from '@/utils/firebaseErrors'

interface Errores {
  email?: string
  password?: string
}

export default function Login() {
  const { login, loginWithGoogle } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errores, setErrores] = useState<Errores>({})
  const [cargando, setCargando] = useState(false)
  const [cargandoGoogle, setCargandoGoogle] = useState(false)
  const bloqueado = cargando || cargandoGoogle

  async function handleGoogleLogin() {
    setCargandoGoogle(true)
    try {
      await loginWithGoogle()
      toast.success('¡Bienvenido!')
      navigate('/dashboard')
    } catch (error) {
      toast.error(traducirErrorGoogle(obtenerCodigoError(error)))
    } finally {
      setCargandoGoogle(false)
    }
  }

  function validar(): boolean {
    const nuevosErrores: Errores = {}

    if (!email.trim()) {
      nuevosErrores.email = 'El correo es obligatorio.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nuevosErrores.email = 'Ingresa un correo válido.'
    }

    if (!password) {
      nuevosErrores.password = 'La contraseña es obligatoria.'
    }

    setErrores(nuevosErrores)
    return Object.keys(nuevosErrores).length === 0
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validar()) return

    setCargando(true)
    try {
      await login(email, password)
      toast.success('¡Bienvenido de nuevo!')
      navigate('/dashboard')
    } catch (error) {
      const codigo = obtenerCodigoError(error)
      toast.error(traducirErrorFirebase(codigo))
    } finally {
      setCargando(false)
    }
  }

  return (
    <AuthLayout
      titulo="Inicia sesión"
      subtitulo="Ingresa tus datos para continuar con tu control financiero."
    >
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
            disabled={bloqueado}
            autoComplete="email"
          />
          {errores.email && <p className="field-error">{errores.email}</p>}
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-brand-700 dark:text-brand-100">
              Contraseña
            </label>
            <Link to="/recuperar-password" className="text-xs font-medium text-brand-500 hover:underline dark:text-gold-400">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            className="input-field"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={bloqueado}
            autoComplete="current-password"
          />
          {errores.password && <p className="field-error">{errores.password}</p>}
        </div>

        <button type="submit" className="btn-primary" disabled={bloqueado}>
          {cargando ? 'Ingresando...' : 'Iniciar sesión'}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-brand-400" aria-hidden="true">
        <span className="h-px flex-1 bg-brand-100 dark:bg-brand-700" />
        <span>o</span>
        <span className="h-px flex-1 bg-brand-100 dark:bg-brand-700" />
      </div>

      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={bloqueado}
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-brand-200 bg-white px-4 py-2.5 text-sm font-semibold text-brand-800 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-brand-600 dark:bg-brand-700 dark:text-white dark:hover:bg-brand-600"
      >
        <span aria-hidden="true" className="text-base font-bold">G</span>
        {cargandoGoogle ? 'Conectando con Google...' : 'Continuar con Google'}
      </button>

      <p className="mt-6 text-center text-sm text-brand-400">
        ¿No tienes cuenta?{' '}
        <Link to="/registro" className="font-semibold text-brand-500 hover:underline dark:text-gold-400">
          Regístrate
        </Link>
      </p>
    </AuthLayout>
  )
}
