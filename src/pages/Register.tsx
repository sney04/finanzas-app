import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import { AuthLayout } from '@/components/AuthLayout'
import { obtenerCodigoError, traducirErrorFirebase } from '@/utils/firebaseErrors'

interface Errores {
  nombre?: string
  email?: string
  password?: string
  confirmPassword?: string
}

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errores, setErrores] = useState<Errores>({})
  const [cargando, setCargando] = useState(false)

  function validar(): boolean {
    const nuevosErrores: Errores = {}

    const nombreTrimmed = nombre.trim()
    if (!nombreTrimmed) {
      nuevosErrores.nombre = 'El nombre es obligatorio.'
    } else if (nombreTrimmed.length < 2) {
      nuevosErrores.nombre = 'El nombre debe tener al menos 2 caracteres.'
    } else if (nombreTrimmed.length > 100) {
      nuevosErrores.nombre = 'El nombre no puede superar los 100 caracteres.'
    }

    if (!email.trim()) {
      nuevosErrores.email = 'El correo es obligatorio.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nuevosErrores.email = 'Ingresa un correo válido.'
    }

    if (!password) {
      nuevosErrores.password = 'La contraseña es obligatoria.'
    } else if (password.length < 6) {
      nuevosErrores.password = 'Debe tener al menos 6 caracteres.'
    }

    if (confirmPassword !== password) {
      nuevosErrores.confirmPassword = 'Las contraseñas no coinciden.'
    }

    setErrores(nuevosErrores)
    return Object.keys(nuevosErrores).length === 0
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validar()) return

    setCargando(true)
    try {
      await register(nombre.trim(), email, password)
      toast.success('¡Cuenta creada con éxito!')
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
      titulo="Crea tu cuenta"
      subtitulo="Empieza a controlar tus finanzas personales hoy mismo."
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <label htmlFor="nombre" className="mb-1 block text-sm font-medium text-brand-700 dark:text-brand-100">
            Nombre visible
          </label>
          <input
            id="nombre"
            type="text"
            className="input-field"
            placeholder="¿Cómo quieres que te llamemos?"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            disabled={cargando}
            maxLength={100}
            autoComplete="name"
          />
          {errores.nombre && <p className="field-error">{errores.nombre}</p>}
        </div>

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
          <p className="mt-1 text-xs text-brand-400">Solo se usa para iniciar sesión y recuperar tu contraseña.</p>
          {errores.email && <p className="field-error">{errores.email}</p>}
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-brand-700 dark:text-brand-100">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            className="input-field"
            placeholder="Mínimo 6 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={cargando}
            autoComplete="new-password"
          />
          {errores.password && <p className="field-error">{errores.password}</p>}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-brand-700 dark:text-brand-100">
            Confirmar contraseña
          </label>
          <input
            id="confirmPassword"
            type="password"
            className="input-field"
            placeholder="Repite tu contraseña"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={cargando}
            autoComplete="new-password"
          />
          {errores.confirmPassword && <p className="field-error">{errores.confirmPassword}</p>}
        </div>

        <button type="submit" className="btn-primary" disabled={cargando}>
          {cargando ? 'Creando cuenta...' : 'Crear cuenta'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-brand-400">
        ¿Ya tienes cuenta?{' '}
        <Link to="/login" className="font-semibold text-brand-500 hover:underline dark:text-gold-400">
          Inicia sesión
        </Link>
      </p>
    </AuthLayout>
  )
}
