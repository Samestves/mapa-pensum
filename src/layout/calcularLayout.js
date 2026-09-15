import { NODO, ANCHO_TEXTO, ESPACIADO, MARGEN, ALTO_ENCABEZADO, TEXTO } from './constantes'
import { generarAristas } from './aristas'
import { construirRelaciones } from './relaciones'

// Ancho medio de un caracter como fraccion del font-size. Es una estimacion a
// proposito: medir en el DOM haria que el layout dependiera de cuando se monta
// el componente. Asi el resultado es identico en cada recarga.
//
// Depende de la fuente, y hay que revisarlo cada vez que se cambia. Era 0,53,
// calibrado para Manrope y Geist. Con Inter, medido en SVG sobre los 736
// nombres de las nueve carreras en seminegrita: a 0,53 dos lineas se salian
// de la tarjeta -"Recuperación de Áreas Degradadas" media 190 px donde caben
// 188-; a 0,55 no se sale ninguna y la peor mide 181.
const FACTOR_CARACTER = 0.55

function anchoAproximado(texto, fontSize) {
  return texto.length * fontSize * FACTOR_CARACTER
}

/**
 * Parte un nombre en lineas que quepan dentro del nodo.
 * Si no cabe en maxLineas, recorta la ultima y le pone puntos suspensivos.
 */
function partirEnLineas(texto, anchoDisponible, fontSize, maxLineas) {
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
export function calcularLayout(asignaturas, grupos = []) {
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
      uc: delSemestre.reduce((s, a) => s + (a.uc ?? 0), 0),
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

  /* Las electivas ya no se dibujan como catalogo debajo del mapa. Donde el
     pensum les reserva casilla dentro de los semestres van ahi; lo que no
     cubra una ruta completa va a la franja de electivas, que se calcula
     aparte porque depende de lo que eligio cada estudiante (ver
     franjaElectivas.js).

     Pero siguen existiendo como catalogo: hay que poder elegirlas, y una vez
     puestas se dibujan a tamaño de tarjeta normal, asi que se les parte el
     nombre con la medida grande. */
  const catalogo = grupos.flatMap((g) =>
    g.asignaturas.map((a) => ({
      ...a,
      grupo: g.clave,
      esElectiva: true,
      lineasNombre: partirEnLineas(a.nombre, ANCHO_TEXTO, TEXTO.nombre, TEXTO.maxLineas),
    })),
  )

  /* Los grupos, para la lista. Son N y no dos: el numero y el nombre los
     pone el pensum, y Agronomica trae ademas las Areas de Grado. */
  const gruposElectivas = grupos
    .filter((g) => g.asignaturas.length)
    .map((g) => ({
      clave: g.clave,
      titulo: g.titulo.toUpperCase(),
      tipo: g.tipo,
      cuota: g.cuota ?? null,
      cantidad: g.asignaturas.length,
    }))

  /* El catalogo entra en `todos` aunque no se dibuje. porCodigo es de donde
     sale la materia al pulsar una casilla y al abrir su ficha, y relaciones
     necesita las electivas para que señalar una ilumine lo que pide. */
  const todos = [...nodos, ...catalogo]

  return {
    nodos,
    columnas,
    electivas: catalogo,
    gruposElectivas,
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
    // Sin la franja de electivas, que añade su propio alto donde la hay
    alto: finSemestres + MARGEN.bottom,
  }
}
