import { NODO, ESPACIADO } from './constantes'

// Separacion de los puntos de control respecto al borde del nodo
const TENSION = 0.45
const TENSION_MINIMA = 44

// Fraccion de la altura del nodo que se usa para repartir los puertos.
// 0.46 = el 46% central, asi los cables no salen por las esquinas.
const ZONA_PUERTOS = 0.46

/**
 * Reparte n puertos a lo alto del borde de un nodo.
 * Con uno solo sale por el centro; con varios se abren en abanico.
 */
function puerto(indice, total) {
  if (total <= 1) return NODO.alto / 2
  const util = NODO.alto * ZONA_PUERTOS
  return (NODO.alto - util) / 2 + (util * indice) / (total - 1)
}

/**
 * Pasillos horizontales libres de cada columna: el centro del hueco que
 * queda entre dos tarjetas, mas el de debajo de la ultima. Por ahi cruzan
 * los cables que tienen que atravesar un semestre intermedio.
 */
function pasillosPorSemestre(nodos) {
  const columnas = new Map()
  for (const n of nodos) {
    if (!columnas.has(n.semestre)) columnas.set(n.semestre, [])
    columnas.get(n.semestre).push(n)
  }

  const pasillos = new Map()
  for (const [semestre, lista] of columnas) {
    const ys = lista.map((n) => n.y).sort((a, b) => a - b)
    const centros = []
    for (let i = 0; i < ys.length - 1; i++) {
      centros.push((ys[i] + NODO.alto + ys[i + 1]) / 2)
    }
    centros.push(ys.at(-1) + NODO.alto + ESPACIADO.fila / 2)
    pasillos.set(semestre, { x: lista[0].x, centros, usados: new Set() })
  }
  return pasillos
}

/** Elige el pasillo libre mas cercano a la altura ideal del cable */
function elegirPasillo(pasillo, yDeseada) {
  const orden = pasillo.centros
    .map((y, i) => ({ y, i }))
    .sort((a, b) => Math.abs(a.y - yDeseada) - Math.abs(b.y - yDeseada))

  const libre = orden.find((c) => !pasillo.usados.has(c.i)) ?? orden[0]
  pasillo.usados.add(libre.i)
  return libre.y
}

/**
 * Une los puntos con curvas suaves. Entre columnas la curva vive en el
 * hueco vacio; dentro de una columna intermedia el cable va recto por el
 * pasillo que hay entre dos tarjetas. Nunca toca un nodo.
 */
function trazar(x1, y1, x2, y2, tramos) {
  let d = `M ${x1} ${y1}`
  let cx = x1
  let cy = y1

  for (const tramo of tramos) {
    const k = Math.max((tramo.xEntrada - cx) * TENSION, 26)
    d += ` C ${cx + k} ${cy}, ${tramo.xEntrada - k} ${tramo.y}, ${tramo.xEntrada} ${tramo.y}`
    d += ` L ${tramo.xSalida} ${tramo.y}`
    cx = tramo.xSalida
    cy = tramo.y
  }

  const k = Math.max((x2 - cx) * TENSION, TENSION_MINIMA)
  return `${d} C ${cx + k} ${cy}, ${x2 - k} ${y2}, ${x2} ${y2}`
}

/**
 * Una arista por cada par (prerrequisito → asignatura), ya ruteada.
 * Los nodos deben venir con x/y calculados por calcularLayout.
 */
export function generarAristas(nodos) {
  const porCodigo = new Map(nodos.map((n) => [n.codigo, n]))
  const pasillos = pasillosPorSemestre(nodos)

  // Puertos: se agrupan los cables que salen de un nodo y los que entran, y
  // se ordenan por la altura del otro extremo. Ordenarlos evita que dos
  // cables del mismo nodo se crucen nada mas salir.
  const salidas = new Map()
  const entradas = new Map()

  for (const destino of nodos) {
    for (const codigoPre of destino.prerrequisitos ?? []) {
      if (!porCodigo.has(codigoPre)) continue
      if (!salidas.has(codigoPre)) salidas.set(codigoPre, [])
      if (!entradas.has(destino.codigo)) entradas.set(destino.codigo, [])
      salidas.get(codigoPre).push(destino.codigo)
      entradas.get(destino.codigo).push(codigoPre)
    }
  }

  const porAltura = (a, b) => porCodigo.get(a).y - porCodigo.get(b).y
  for (const lista of salidas.values()) lista.sort(porAltura)
  for (const lista of entradas.values()) lista.sort(porAltura)

  const aristas = []

  for (const destino of nodos) {
    for (const codigoPre of destino.prerrequisitos ?? []) {
      const origen = porCodigo.get(codigoPre)
      // El validador ya garantiza que existe; si no, se ignora en silencio
      if (!origen) continue

      const listaSalida = salidas.get(codigoPre)
      const listaEntrada = entradas.get(destino.codigo)

      const x1 = origen.x + NODO.ancho
      const y1 = origen.y + puerto(listaSalida.indexOf(destino.codigo), listaSalida.length)
      const x2 = destino.x
      const y2 = destino.y + puerto(listaEntrada.indexOf(codigoPre), listaEntrada.length)

      // Un tramo por cada semestre que hay que atravesar por el medio
      const tramos = []
      for (let s = origen.semestre + 1; s < destino.semestre; s++) {
        const pasillo = pasillos.get(s)
        if (!pasillo) continue
        tramos.push({
          xEntrada: pasillo.x,
          xSalida: pasillo.x + NODO.ancho,
          y: elegirPasillo(pasillo, (y1 + y2) / 2),
        })
      }

      aristas.push({
        id: `${origen.codigo}->${destino.codigo}`,
        origen: origen.codigo,
        destino: destino.codigo,
        // El color lo pone el area del prerrequisito: asi se puede seguir
        // de un vistazo de donde viene cada rama del pensum.
        area: origen.area,
        // Sin areas clasificadas el color sale de la profundidad del origen,
        // asi la cadena se sigue igual de bien en las otras siete carreras
        profundidad: origen.profundidad,
        cruzaColumnas: tramos.length > 0,
        d: trazar(x1, y1, x2, y2, tramos),
        x1,
        y1,
        x2,
        y2,
      })
    }
  }

  return aristas
}
