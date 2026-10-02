/**
 * Traduce los cÃ³digos de error de Firebase Authentication a mensajes
 * claros y comprensibles en espaÃ±ol para mostrar al usuario.
 */
export function traducirErrorFirebase(codigo: string): string {
  const errores: Record<string, string> = {
    'auth/email-already-in-use': 'Ya existe una cuenta registrada con este correo.',
    'auth/invalid-email': 'El correo electrÃ³nico no es vÃ¡lido.',
    'auth/weak-password': 'La contraseÃ±a debe tener al menos 6 caracteres.',
    'auth/user-not-found': 'No existe una cuenta con este correo.',
    'auth/wrong-password': 'La contraseÃ±a es incorrecta.',
    'auth/invalid-credential': 'El correo o la contraseÃ±a son incorrectos.',
    'auth/too-many-requests': 'Demasiados intentos fallidos. Intenta de nuevo mÃ¡s tarde.',
    'auth/network-request-failed': 'Error de conexiÃ³n. Verifica tu internet.',
    'auth/user-disabled': 'Esta cuenta ha sido deshabilitada.',
    'auth/missing-password': 'Debes ingresar una contraseÃ±a.',
    'auth/operation-not-allowed': 'Esta operaciÃ³n no estÃ¡ disponible ahora.',
    'auth/requires-recent-login': 'Vuelve a iniciar sesiÃ³n e intÃ©ntalo de nuevo.',
    'permission-denied': 'No tienes permiso para realizar esta operaciÃ³n.',
    'failed-precondition': 'No se puede completar la operaciÃ³n en este momento.',
    unavailable: 'El servicio no estÃ¡ disponible. Intenta nuevamente.',
    'deadline-exceeded': 'La operaciÃ³n tardÃ³ demasiado. Intenta nuevamente.',
  }

  return errores[codigo] || 'OcurriÃ³ un error inesperado. Intenta nuevamente.'
}

export function traducirErrorRecuperacion(codigo: string): string {
  const errores: Record<string, string> = {
    'auth/invalid-email': 'Ingresa un correo vÃ¡lido.',
    'auth/too-many-requests': 'Demasiados intentos. Intenta nuevamente mÃ¡s tarde.',
    'auth/network-request-failed': 'Error de conexiÃ³n. Verifica tu internet.',
  }

  return errores[codigo] || 'No pudimos procesar la solicitud. Intenta nuevamente.'
}

export function traducirErrorGoogle(codigo: string): string {
  const errores: Record<string, string> = {
    'auth/popup-closed-by-user': 'Cerraste la ventana de Google antes de terminar el inicio de sesiÃ³n.',
    'auth/popup-blocked': 'El navegador bloqueÃ³ la ventana de Google. Permite las ventanas emergentes e intÃ©ntalo de nuevo.',
    'auth/cancelled-popup-request': 'Ya hay una ventana de inicio de sesiÃ³n abierta. Completa esa solicitud e intÃ©ntalo de nuevo.',
    'auth/account-exists-with-different-credential': 'Esta cuenta de Google ya está vinculada a otra cuenta de FINANSAS04. Inicia sesión con esa cuenta para gestionar tus métodos de acceso.',
    'auth/operation-not-allowed': 'El inicio de sesiÃ³n con Google no estÃ¡ habilitado para este proyecto de Firebase.',
    'auth/unauthorized-domain': 'Este dominio no estÃ¡ autorizado para iniciar sesiÃ³n con Google en Firebase.',
    'auth/network-request-failed': 'Error de conexiÃ³n. Verifica tu internet e intÃ©ntalo de nuevo.',
  }

  return errores[codigo] || 'No se pudo iniciar sesiÃ³n con Google. IntÃ©ntalo nuevamente.'
}

/**
 * Extrae el cÃ³digo de error de un error de Firebase (formato: "auth/xxx").
 */
export function obtenerCodigoError(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    return String((error as { code: unknown }).code)
  }
  return 'unknown'
}

export function traducirErrorVinculacionGoogle(codigo: string): string {
  const errores: Record<string, string> = {
    'auth/provider-already-linked': 'Google ya esta vinculado a esta cuenta.',
    'auth/credential-already-in-use': 'Esta cuenta de Google ya esta vinculada a otra cuenta de FINANSAS04. Inicia sesion con esa cuenta para gestionar tus metodos de acceso.',
    'auth/account-exists-with-different-credential': 'Esta cuenta de Google ya esta vinculada a otra cuenta de FINANSAS04. Inicia sesion con esa cuenta para gestionar tus metodos de acceso.',
    'auth/popup-closed-by-user': 'Cerraste la ventana de Google antes de terminar la vinculacion.',
    'auth/popup-blocked': 'El navegador bloqueo la ventana de Google. Permite las ventanas emergentes e intentalo de nuevo.',
    'auth/cancelled-popup-request': 'Ya hay una ventana de autenticacion abierta. Completa esa solicitud e intentalo de nuevo.',
    'auth/network-request-failed': 'Error de conexion. Verifica tu internet e intentalo de nuevo.',
    'auth/requires-recent-login': 'Por seguridad, cierra sesion e inicia sesion de nuevo antes de vincular Google.',
    'auth/no-current-user': 'Inicia sesion para vincular Google a tu cuenta.',
  }

  return errores[codigo] || 'No se pudo vincular Google. Intentalo nuevamente.'
}

