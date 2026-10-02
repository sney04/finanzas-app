/**
 * Mapa de iconos emoji por nombre de categoría.
 * Normalizado a minúsculas para matching insensible a mayúsculas.
 * Si no hay match, se usa el icono genérico según tipo (income/expense).
 */
const CATEGORY_ICON_MAP: Record<string, string> = {
  // Alimentación
  'alimentación': '🛒',
  'alimentacion': '🛒',
  'comida': '🍽️',
  'restaurante': '🍽️',
  'verdura': '🥦',
  'verduras': '🥦',
  'mercado': '🛒',
  'supermercado': '🛒',
  'arepas': '🌽',
  'd1': '🛒',
  'ara': '🛒',
  'éxito': '🛒',
  'exito': '🛒',

  // Bebés y hogar
  'pañales': '🍼',
  'panales': '🍼',
  'bebé': '🍼',
  'bebe': '🍼',

  // Hogar
  'vivienda': '🏠',
  'arriendo': '🏠',
  'arriendo/hipoteca': '🏠',
  'servicios': '💡',
  'gas': '🔥',
  'agua': '💧',
  'internet': '📶',
  'teléfono': '📱',
  'telefono': '📱',

  // Electrodomésticos
  'nevera': '❄️',
  'cuota nevera': '❄️',
  'electrodomésticos': '🔌',
  'electrodomesticos': '🔌',
  'lavadora': '🌀',

  // Transporte
  'transporte': '🚌',
  'gasolina': '⛽',
  'taxi': '🚕',
  'uber': '🚕',
  'bus': '🚌',
  'metro': '🚇',
  'parqueadero': '🅿️',
  'peaje': '🛣️',

  // Mascotas
  'mascota': '🐾',
  'mascotas': '🐾',
  'veterinario': '🐾',
  'presa y purina': '🐾',
  'purina': '🐾',

  // Entretenimiento
  'entretenimiento': '🎬',
  'cine': '🎬',
  'streaming': '📺',
  'netflix': '📺',
  'spotify': '🎵',
  'música': '🎵',
  'musica': '🎵',
  'juegos': '🎮',

  // Educación
  'educación': '📚',
  'educacion': '📚',
  'colegio': '🏫',
  'universidad': '🎓',
  'curso': '📖',
  'libros': '📚',

  // Salud
  'salud': '🏥',
  'médico': '🩺',
  'medico': '🩺',
  'farmacia': '💊',
  'medicamentos': '💊',
  'gimnasio': '🏋️',

  // Ingresos
  'salario': '💼',
  'sueldo': '💼',
  'nómina': '💼',
  'nomina': '💼',
  'pago salario': '💼',
  'freelance': '💻',
  'trabajo': '💼',

  // Ahorro e inversión
  'ahorro': '🏦',
  'inversión': '📈',
  'inversion': '📈',
  'banco': '🏦',

  // Ropa
  'ropa': '👕',
  'calzado': '👟',
  'zapatos': '👟',

  // Otros
  'otros': '📦',
  'deuda': '💳',
  'tarjeta': '💳',
  'regalo': '🎁',
  'viaje': '✈️',
  'hotel': '🏨',
}

/**
 * Devuelve el emoji correspondiente a una categoría.
 * @param category  Nombre de la categoría (ej: "Alimentación")
 * @param type      Tipo de transacción para el fallback ('income' | 'expense' | 'transfer')
 */
export function getCategoryIcon(category: string, type: 'income' | 'expense' | 'transfer'): string {
  const key = category.trim().toLocaleLowerCase()

  // Coincidencia exacta
  if (CATEGORY_ICON_MAP[key]) return CATEGORY_ICON_MAP[key]

  // Coincidencia parcial (el nombre de categoría contiene una clave)
  for (const [mapKey, icon] of Object.entries(CATEGORY_ICON_MAP)) {
    if (key.includes(mapKey) || mapKey.includes(key)) return icon
  }

  // Fallback por tipo
  if (type === 'income') return '💰'
  if (type === 'transfer') return '🔄'
  return '💸'
}
