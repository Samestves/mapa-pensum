/**
 * Las cuentas del banco: varias pasadas reducidas a una, y lo medido contra
 * su tope.
 */

const mediana = (valores) => {
  const ordenados = [...valores].sort((a, b) => a - b)
  return ordenados[Math.floor(ordenados.length / 2)]
}

/**
 * La mediana de cada medida entre varias pasadas.
 *
 * Una sola pasada no sirve para decidir nada: entre dos seguidas hay un
 * 20-30 % de diferencia, y un antivirus despertandose mete un cuadro largo
 * donde no lo hay. La mediana de tres se queda con la del medio y tira la
 * rara, que es justo lo que se quiere; la media la arrastraria.
 */
export function medianaDe(pasadas) {
  return Object.fromEntries(
    Object.keys(pasadas[0]).map((medida) => [medida, mediana(pasadas.map((p) => p[medida]))]),
  )
}

/* Un cuadro de mas de 33 ms se ha comido al menos uno de pantalla: es lo que
   se siente como tiron. */
const CUADRO_PERDIDO = 33.5

/** De lo que duro cada cuadro: cuantos fueron, el percentil 95 y los perdidos. */
export function resumenDeCuadros(duraciones) {
  const ordenadas = [...duraciones].sort((a, b) => a - b)
  return {
    cuadros: duraciones.length,
    p95: ordenadas[Math.floor(ordenadas.length * 0.95)] ?? 0,
    perdidos: duraciones.filter((d) => d > CUADRO_PERDIDO).length,
  }
}

/** Lo que se pasa de su tope, ya escrito para enseñarlo: "objetos 2900 > 2880". */
export function excesos(resultado, presupuesto) {
  return Object.entries(presupuesto)
    .filter(([medida, tope]) => resultado[medida] > tope)
    .map(([medida, tope]) => `${medida} ${Math.round(resultado[medida])} > ${tope}`)
}

/** La celda de la tabla: una marca si todo cabe, o lo que se pasa. */
export const veredicto = (pasados) => (pasados.length ? `✗ ${pasados.join(', ')}` : '✓')

/** Cada medida redondeada, para la tabla. */
export const redondear = (resultado) =>
  Object.fromEntries(Object.entries(resultado).map(([medida, v]) => [medida, Math.round(v)]))
