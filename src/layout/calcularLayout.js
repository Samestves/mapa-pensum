import { NODO, ANCHO_TEXTO, ESPACIADO, MARGEN, ALTO_ENCABEZADO, TEXTO } from './constantes'
import { generarAristas } from './aristas'
import { construirRelaciones } from './relaciones'

// Ancho medio de un caracter como fraccion del font-size. Es una estimacion a
// proposito: medir en el DOM haria que el layout dependiera de cuando se monta
// el componente. Asi el resultado es identico en cada recarga.
const FACTOR_CARACTER = 0.53

function anchoAproximado(texto, fontSize) {
  return texto.length * fontSize * FACTOR_CARACTER
}

/**
 * Parte un nombre en lineas que quepan dentro del nodo.
 * Si no cabe en maxLineas, recorta la ultima y le pone puntos suspensivos.
 */
export function partirEnLineas(texto, anchoDisponible, fontSize, maxLineas) {
  const lineas = []
  let actual = ''

  for (const palabra of texto.split(' ')) {
    const tentativa = actual ? `${actual} ${palabra}` : palabra
    // El "|| !actual" evita un bucle raro si una sola palabra ya no cabe
    if (anchoAproximado(tentativa, fontSize) <= anchoDisponible || !actual) {
      actual = tentativa
    } else {
      lineas.push(actual)
      actual = palabra
    }
  }
  if (actual) lineas.push(actual)

  if (lineas.length <= maxLineas) return lineas

  const recortadas = lineas.slice(0, maxLineas)
  let ultima = recortadas[maxLineas - 1]
  while (ultima.length > 1 && anchoAproximado(`${ultima}…`, fontSize) > anchoDisponible) {
    ultima = ultima.slice(0, -1)
  }
  recortadas[maxLineas - 1] = `${ultima}…`
  return recortadas
}

/**
 * Calcula la posicion de cada asignatura: X segun el semestre (columna),
 * Y segun su indice dentro del semestre (fila). Funcion pura: mismas
 * asignaturas, mismas coordenadas.
 *
 * Devuelve tambien el tamano del lienzo, que el <svg> necesita para su viewBox.
 */
export function calcularLayout(asignaturas) {
  const semestres = [...new Set(asignaturas.map((a) => a.semestre))].sort((a, b) => a - b)

  const nodos = []
  const columnas = []
  let maxFilas = 0

  semestres.forEach((semestre, indiceColumna) => {
    // Se respeta el orden del JSON dentro de cada semestre: es estable y ya viene agrupado
    const delSemestre = asignaturas.filter((a) => a.semestre === semestre)
    const x = MARGEN.left + indiceColumna * (NODO.ancho + ESPACIADO.columna)

    columnas.push({
      semestre,
      x,
      cantidad: delSemestre.length,
      uc: delSemestre.reduce((s, a) => s + a.uc, 0),
    })

    delSemestre.forEach((asignatura, fila) => {
      nodos.push({
        ...asignatura,
        x,
        y: MARGEN.top + ALTO_ENCABEZADO + fila * (NODO.alto + ESPACIADO.fila),
        lineasNombre: partirEnLineas(
          asignatura.nombre,
          ANCHO_TEXTO,
          TEXTO.nombre,
          TEXTO.maxLineas,
        ),
      })
    })

    maxFilas = Math.max(maxFilas, delSemestre.length)
  })

  const columnasN = Math.max(semestres.length, 1)
  const filasN = Math.max(maxFilas, 1)

  return {
    nodos,
    columnas,
    aristas: generarAristas(nodos),
    relaciones: construirRelaciones(nodos),
    porCodigo: new Map(nodos.map((n) => [n.codigo, n])),
    maxFilas,
    ancho:
      MARGEN.left + columnasN * NODO.ancho + (columnasN - 1) * ESPACIADO.columna + MARGEN.right,
    alto:
      MARGEN.top +
      ALTO_ENCABEZADO +
      filasN * NODO.alto +
      (filasN - 1) * ESPACIADO.fila +
      MARGEN.bottom,
  }
}
