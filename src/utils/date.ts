function pad(value: number): string {
  return String(value).padStart(2, '0')
}

export function toLocalDateString(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function getYearMonth(date: Date = new Date()): string {
  return toLocalDateString(date).slice(0, 7)
}

export function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)

  return date.getFullYear() === year
    && date.getMonth() === month - 1
    && date.getDate() === day
}

export function formatDateForDisplay(value: string): string {
  const [year, month, day] = value.split('-').map(Number)

  if (!year || !month || !day) {
    return value
  }

  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(year, month - 1, day))
}

/**
 * Formatea una fecha YYYY-MM-DD como encabezado de día para la lista agrupada.
 * Ejemplo: "2026-09-03" → { day: "3 sept", weekday: "Jueves" }
 * Usa componentes numéricos directos para evitar ambigüedad de timezone.
 */
export function formatDayHeader(value: string): { day: string; weekday: string } {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return { day: value, weekday: '' }

  const date = new Date(year, month - 1, day)

  const dayStr = new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
  }).format(date)

  const weekday = new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
  }).format(date)

  return {
    day: dayStr,
    weekday: weekday.charAt(0).toUpperCase() + weekday.slice(1),
  }
}
