/** Hash estable del codigo: la misma materia siempre da el mismo fondo */
function semilla(codigo) {
  let h = 2166136261
  for (let i = 0; i < codigo.length; i++) {
    h ^= codigo.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

/**
 * Fondo de la cabecera de la ficha: tres manchas de color colocadas segun
 * el codigo de la materia. Desenfocadas dan ese aire de degradado de malla
 * tipo iOS, y no hacen falta imagenes: nada que descargar, nada que licenciar
 * y funciona igual sin conexion.
 *
 * Recibe el color ya resuelto y no el area: asi sirve igual para Sistemas,
 * que colorea por area, y para las otras siete, que lo hacen por profundidad.
 */
export function fondoMateria(codigo, color) {
  const s = semilla(codigo)

  const manchas = [
    { x: 12 + (s % 30), y: 18 + ((s >> 3) % 30), tam: 58 + ((s >> 5) % 22), op: 0.85 },
    { x: 55 + ((s >> 7) % 35), y: 8 + ((s >> 11) % 40), tam: 46 + ((s >> 13) % 26), op: 0.6 },
    { x: 28 + ((s >> 17) % 50), y: 55 + ((s >> 19) % 35), tam: 52 + ((s >> 23) % 20), op: 0.45 },
  ]

  return manchas
    .map(
      (m) =>
        `radial-gradient(${m.tam}% ${m.tam}% at ${m.x}% ${m.y}%, ` +
        `color-mix(in oklab, ${color} ${Math.round(m.op * 100)}%, transparent) 0%, transparent 70%)`,
    )
    .join(', ')
}
