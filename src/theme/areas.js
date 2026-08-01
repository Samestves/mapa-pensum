// Etiquetas y color de acento por area. El color apunta a la variable CSS,
// asi que cambia solo al alternar tema claro/oscuro.
export const AREAS = {
  generales: { etiqueta: 'Generales', color: 'var(--area-generales)' },
  'ciencias-basicas': { etiqueta: 'Ciencias básicas', color: 'var(--area-ciencias-basicas)' },
  estadistica: { etiqueta: 'Estadística', color: 'var(--area-estadistica)' },
  computacion: { etiqueta: 'Computación', color: 'var(--area-computacion)' },
  electronica: { etiqueta: 'Electrónica', color: 'var(--area-electronica)' },
  sistemas: { etiqueta: 'Sistemas', color: 'var(--area-sistemas)' },
  gestion: { etiqueta: 'Gestión', color: 'var(--area-gestion)' },
  tesis: { etiqueta: 'Trabajo de grado', color: 'var(--area-tesis)' },
}

export const colorArea = (area) => AREAS[area]?.color ?? 'var(--tinta-tenue)'
export const etiquetaArea = (area) => AREAS[area]?.etiqueta ?? area
