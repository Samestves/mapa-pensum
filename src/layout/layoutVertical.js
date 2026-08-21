import { NODO, TEXTO, ANCHO_TEXTO } from './constantes'
import { construirRelaciones } from './relaciones'

/**
 * El mapa para el telefono: una columna, los semestres uno debajo de otro y
 * los cables por un canal a la izquierda.
 *
 * No es el mapa de escritorio girado noventa grados, aunque de eso venga la
 * idea. En una pantalla de 375 px cabe UNA tarjeta por fila, asi que rotar de
 * verdad -semestres hacia abajo, materias hacia los lados- obligaria a
 * desplazarse en horizontal dentro de cada semestre para leerlo, que es peor
 * que lo que habia.
 *
 * Lo que queda es una columna. Y una columna de materias es, en apariencia,
 * la vista de lista que ya existe: lo que la separa son los CABLES. Ver que
 * Matematicas II sale de Matematicas I es lo unico que un mapa hace y una
 * lista no, asi que el canal de la izquierda no es decoracion sino la razon
 * entera de que esta vista exista.
 *
 * El ruteo tampoco se hereda. El de escritorio busca pasillos libres entre
 * las tarjetas de los semestres que el cable atraviesa, y aqui ese problema
 * no existe: todas las tarjetas estan en la misma columna, asi que un cable
 * solo tiene que salir por la izquierda, bajar por un carril y volver a
 * entrar. Adaptar el otro habria sido arrastrar una complicacion que aqui no
 * paga nada.
 */

/* Canal de la izquierda por donde bajan los cables. Cabe cinco carriles de
   9 px, que es lo que se midio que hace falta en el peor semestre de las
   nueve carreras; con menos, dos cables que se solapan comparten carril y se
   dibujan encima. */
export const GOTERA = 56
const CARRIL = 9
const CARRILES = Math.floor((GOTERA - 14) / CARRIL)

const BANDA = 42 // alto de la cabecera de cada semestre
const HUECO_FILA = 14
const HUECO_SEMESTRE = 26
const MARGEN_SUP = 16
const MARGEN_INF = 40
const MARGEN_DER = 16

const FACTOR_CARACTER = 0.53

function partirEnLineas(texto, fontSize, maxLineas) {
  const cabe = (t) => t.length * fontSize * FACTOR_CARACTER <= ANCHO_TEXTO
  const lineas = []
  let actual = ''
  for (const palabra of texto.split(' ')) {
    const t = actual ? `${actual} ${palabra}` : palabra
    if (cabe(t) || !actual) actual = t
    else {
      lineas.push(actual)
      actual = palabra
    }
  }
  if (actual) lineas.push(actual)
  if (lineas.length <= maxLineas) return lineas
  const cortadas = lineas.slice(0, maxLineas)
  let ultima = cortadas[maxLineas - 1]
  while (ultima.length > 1 && !cabe(`${ultima}…`)) ultima = ultima.slice(0, -1)
  cortadas[maxLineas - 1] = `${ultima}…`
  return cortadas
}

/**
 * Reparte los cables en carriles para que dos que se solapan en vertical no
 * se dibujen uno encima del otro.
 *
 * Es el mismo problema que colocar reuniones en salas: se ordenan por donde
 * empiezan y cada uno entra en el primer carril cuyo ultimo cable ya termino.
 * Los cables largos -de un semestre al septimo- acaban en los carriles de
 * fuera y los cortos pegados a las tarjetas, que ademas es lo que se quiere
 * mirar: un salto entre semestres seguidos se sigue con la vista sin
 * despegarse de la columna.
 */
function repartirCarriles(tramos) {
  const finDeCarril = []
  for (const t of [...tramos].sort((a, b) => a.desde - b.desde || b.hasta - a.hasta)) {
    let carril = finDeCarril.findIndex((fin) => fin <= t.desde)
    if (carril === -1) {
      carril = finDeCarril.length
      finDeCarril.push(0)
    }
    finDeCarril[carril] = t.hasta
    // Si hay mas cables solapados que carriles se reparten en circulo. Es
    // peor que un carril propio, pero mejor que salirse del canal.
    t.carril = carril % CARRILES
  }
  return tramos
}

export function calcularLayoutVertical(asignaturas, grupos = [], electivasEnCasillas = false) {
  const semestres = [...new Set(asignaturas.map((a) => a.semestre))].sort((a, b) => a - b)

  const nodos = []
  const bandas = []
  let y = MARGEN_SUP

  for (const semestre of semestres) {
    const delSemestre = asignaturas.filter((a) => a.semestre === semestre)
    const yBanda = y
    y += BANDA

    for (const asignatura of delSemestre) {
      nodos.push({
        ...asignatura,
        x: GOTERA,
        y,
        lineasNombre: partirEnLineas(asignatura.nombre, TEXTO.nombre, TEXTO.maxLineas),
      })
      y += NODO.alto + HUECO_FILA
    }

    y -= HUECO_FILA
    bandas.push({
      semestre,
      y: yBanda,
      alto: y - yBanda,
      cantidad: delSemestre.length,
      uc: delSemestre.reduce((s, a) => s + (a.uc ?? 0), 0),
    })
    y += HUECO_SEMESTRE
  }

  const porCodigoNodo = new Map(nodos.map((n) => [n.codigo, n]))

  /* Los cables. Solo entre materias que estan las dos dibujadas: una electiva
     todavia sin colocar no tiene sitio en la columna, asi que su prelacion no
     se puede dibujar sin inventarle un punto de partida. */
  const tramos = []
  for (const nodo of nodos) {
    for (const pre of nodo.prerrequisitos ?? []) {
      const origen = porCodigoNodo.get(pre)
      if (!origen || origen.y >= nodo.y) continue
      tramos.push({
        id: `${pre}->${nodo.codigo}`,
        origen: pre,
        destino: nodo.codigo,
        area: origen.area,
        desde: origen.y + NODO.alto / 2,
        hasta: nodo.y + NODO.alto / 2,
      })
    }
  }
  repartirCarriles(tramos)

  const aristas = tramos.map((t) => {
    const xCarril = GOTERA - 14 - t.carril * CARRIL
    const r = 10 // radio de las dos curvas
    /* Sale por la izquierda de la tarjeta de origen, baja por su carril y
       vuelve a entrar por la izquierda del destino. Las esquinas se redondean
       con curvas cuadraticas: un angulo recto se lee como un diagrama de
       cableado y una curva como un recorrido. */
    return {
      ...t,
      x2: GOTERA,
      y2: t.hasta,
      d:
        `M ${GOTERA} ${t.desde} ` +
        `L ${xCarril + r} ${t.desde} ` +
        `Q ${xCarril} ${t.desde} ${xCarril} ${t.desde + r} ` +
        `L ${xCarril} ${t.hasta - r} ` +
        `Q ${xCarril} ${t.hasta} ${xCarril + r} ${t.hasta} ` +
        `L ${GOTERA} ${t.hasta}`,
    }
  })

  const catalogo = electivasEnCasillas
    ? grupos.flatMap((g) =>
        g.asignaturas.map((a) => ({
          ...a,
          grupo: g.clave,
          lineasNombre: partirEnLineas(a.nombre, TEXTO.nombre, TEXTO.maxLineas),
        })),
      )
    : []

  const todos = [...nodos, ...catalogo]

  return {
    nodos,
    bandas,
    aristas,
    catalogo,
    relaciones: construirRelaciones(todos),
    porCodigo: new Map(todos.map((n) => [n.codigo, n])),
    ancho: GOTERA + NODO.ancho + MARGEN_DER,
    alto: y - HUECO_SEMESTRE + MARGEN_INF,
  }
}
