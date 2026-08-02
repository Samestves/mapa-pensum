import {
  NODO,
  ANCHO_TEXTO,
  ESPACIADO,
  MARGEN,
  ALTO_ENCABEZADO,
  TEXTO,
  ELECTIVAS,
} from './constantes'
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
/**
 * Coloca las electivas en una zona propia debajo de los 10 semestres,
 * reutilizando las mismas columnas: 10 por fila, en dos grupos.
 * No tienen semestre asignado, asi que su unico orden posible es el catalogo.
 */
function colocarElectivas(electivas, xColumnas, yInicio) {
  const grupos = []
  const nodos = []
  let y = yInicio

  for (const [tipo, titulo] of [
    ['tecnica', 'ELECTIVAS TÉCNICAS'],
    ['humanistica', 'ELECTIVAS HUMANÍSTICAS'],
  ]) {
    const items = electivas.filter((e) => e.tipo === tipo)
    if (!items.length) continue

    const yTitulo = y
    y += ELECTIVAS.encabezado

    items.forEach((electiva, i) => {
      const fila = Math.floor(i / xColumnas.length)
      const columna = i % xColumnas.length
      nodos.push({
        ...electiva,
        esElectiva: true,
        x: xColumnas[columna],
        y: y + fila * (ELECTIVAS.alto + ELECTIVAS.fila),
        lineasNombre: partirEnLineas(electiva.nombre, ANCHO_TEXTO, TEXTO.meta + 1.5, 2),
      })
    })

    const filas = Math.ceil(items.length / xColumnas.length)
    y += filas * (ELECTIVAS.alto + ELECTIVAS.fila) - ELECTIVAS.fila

    grupos.push({ tipo, titulo, yTitulo, yFin: y, cantidad: items.length })
    y += ELECTIVAS.separacionGrupo
  }

  return { nodos, grupos, alto: y - yInicio }
}

export function calcularLayout(asignaturas, electivas = []) {
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

  // Fondo del ultimo nodo del mapa principal
  const finSemestres =
    MARGEN.top + ALTO_ENCABEZADO + filasN * NODO.alto + (filasN - 1) * ESPACIADO.fila

  const zona = colocarElectivas(
    electivas,
    columnas.map((c) => c.x),
    finSemestres + ELECTIVAS.corredor,
  )

  const todos = [...nodos, ...zona.nodos]

  return {
    nodos,
    columnas,
    electivas: zona.nodos,
    gruposElectivas: zona.grupos,
    finSemestres,
    // Las electivas son un mapa aparte: cero cables entre las dos zonas.
    // Un cable que baje desde la malla se leeria como "esta electiva es
    // parte del semestre X", y no lo es.
    aristas: generarAristas(nodos),
    // Las relaciones si las incluyen: al señalar una electiva se ilumina lo
    // que pide en el mapa de arriba, sin dibujar cable.
    relaciones: construirRelaciones(todos),
    porCodigo: new Map(todos.map((n) => [n.codigo, n])),
    maxFilas,
    ancho:
      MARGEN.left + columnasN * NODO.ancho + (columnasN - 1) * ESPACIADO.columna + MARGEN.right,
    alto: finSemestres + (zona.nodos.length ? ELECTIVAS.corredor + zona.alto : 0) + MARGEN.bottom,
  }
}
