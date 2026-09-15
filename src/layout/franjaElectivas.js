import { NODO, FRANJA, MARGEN } from './constantes.js'

/**
 * La franja de electivas: lo que tienen las carreras sin ruta oficial en vez
 * de casillas dentro de los semestres.
 *
 * En Sistemas el pensum dice DONDE va cada electiva -tres sociohumanisticas
 * en el 2, 3 y 4, cinco tecnicas en el 7, 8 y 9-, y el mapa les reserva
 * casilla ahi. De las otras carreras la UDO no publica esa ruta: solo la
 * lista de opciones. Antes se dibujaba la lista entera debajo del mapa, de 16
 * a 49 tarjetas segun la carrera, amontonadas sin orden y pagando cada una su
 * sitio en el SVG aunque nadie fuera a cursar la mayoria.
 *
 * Ahora cada grupo son las electivas que TU pusiste y, al final, una casilla
 * vacia para añadir la siguiente. Nada de semestres inventados: donde
 * la universidad no dice cuando, el mapa tampoco.
 *
 * Por dentro son casillas corrientes, `libre-<grupo>-<n>`, guardadas con el
 * mismo {casilla -> electiva} que las de Sistemas. Asi el selector, la ficha
 * con "Cambiar esta electiva" y el planificador funcionan sin saber que esta
 * casilla no tiene semestre. Lo unico nuevo es donde se dibujan.
 */

const PREFIJO = 'libre-'

export const casillaLibre = (clave, n) => `${PREFIJO}${clave}-${n}`

export const esCasillaLibre = (codigo) => typeof codigo === 'string' && codigo.startsWith(PREFIJO)

/* El numero de la casilla dentro de su grupo. La clave del grupo puede
   llevar guiones (areas-de-grado), asi que se lee desde el final. */
const numeroDe = (codigo) => Number(codigo.slice(codigo.lastIndexOf('-') + 1))

/* Como se llama la casilla vacia. Los dos grupos de siempre en singular, que
   es como los nombra Sistemas; cualquier otro, con su propio titulo. */
const NOMBRE_CASILLA = {
  tecnica: 'Electiva Técnica',
  humanistica: 'Electiva Sociohumanística',
}
/* Los datos traen "Areas de Grado" sin tilde, tal como lo publica la DACE */
export const tituloGrupo = (grupo) => grupo.titulo.replace(/^Areas\b/, 'Áreas')

export const nombreCasilla = (grupo) =>
  NOMBRE_CASILLA[grupo.clave] ?? tituloGrupo(grupo).replace(/^Áreas\b/, 'Área')

/**
 * Todas las casillas libres que PUEDEN existir: una por opcion de cada grupo,
 * que es el maximo de electivas distintas que caben. Es la lista contra la
 * que se depura lo guardado.
 */
export function casillasLibres(grupos) {
  const mapa = new Map()
  for (const g of grupos) {
    for (let n = 1; n <= g.asignaturas.length; n++) mapa.set(casillaLibre(g.clave, n), g.clave)
  }
  return mapa
}

/* La primera casilla sin ocupar de un grupo, o null si ya estan todas */
function primeraLibre(grupo, elegidas) {
  for (let n = 1; n <= grupo.asignaturas.length; n++) {
    if (!elegidas[casillaLibre(grupo.clave, n)]) return casillaLibre(grupo.clave, n)
  }
  return null
}

/**
 * Mete en la franja las electivas que ya tienen marca y no estan puestas.
 *
 * Quien aprobo una electiva antes de que existiera la franja -o la marco
 * desde la lista- la tenia en la zona de abajo. Si la franja solo enseñara lo
 * elegido a mano, esa materia desapareceria del mapa aun estando aprobada.
 * Devuelve el mismo objeto si no hay nada que añadir, para no provocar un
 * render ni una escritura en balde.
 */
export function adoptarMarcadas(elegidas, grupos, marcas) {
  const puestas = new Set(Object.values(elegidas))
  let siguiente = elegidas
  for (const g of grupos) {
    for (const e of g.asignaturas) {
      if (!marcas[e.codigo] || puestas.has(e.codigo)) continue
      const casilla = primeraLibre(g, siguiente)
      if (!casilla) break
      if (siguiente === elegidas) siguiente = { ...elegidas }
      siguiente[casilla] = e.codigo
      puestas.add(e.codigo)
    }
  }
  return siguiente
}

/**
 * Coloca la franja debajo de los semestres.
 *
 * Los grupos van seguidos en la misma fila, alineados con las columnas del
 * mapa, y cada uno con su rotulo encima de su primera casilla: primero las
 * ocupadas, en el orden de su numero, y detras la primera libre. Cuando no
 * caben, siguen en la fila de abajo. Asi, sin nada elegido, la franja entera
 * es una sola fila de tres casillas y no alarga el mapa lo que alargaban tres
 * filas medio vacias.
 *
 * Devuelve las casillas como nodos -con x, y, grupo y nombre, igual que las
 * de un semestre- y el rotulo de cada grupo.
 */
export function calcularFranja(grupos, elegidas, xColumnas, yInicio) {
  const nodos = []
  const filas = []
  const columnas = xColumnas.length
  // Cada fila lleva sitio para un rotulo, por si un grupo empieza en ella
  const altoFila = FRANJA.encabezado + NODO.alto + FRANJA.fila
  const lugar = (p) => ({
    x: xColumnas[p % columnas],
    y: yInicio + Math.floor(p / columnas) * altoFila,
  })
  let posicion = 0

  for (const g of grupos) {
    if (!g.asignaturas.length) continue

    const ocupadas = Object.keys(elegidas)
      .filter((c) => esCasillaLibre(c) && c.startsWith(`${PREFIJO}${g.clave}-`))
      .filter((c) => numeroDe(c) <= g.asignaturas.length)
      .sort((a, b) => numeroDe(a) - numeroDe(b))
    const libre = primeraLibre(g, elegidas)
    const casillas = libre ? [...ocupadas, libre] : ocupadas

    filas.push({
      clave: g.clave,
      titulo: tituloGrupo(g),
      tipo: g.tipo,
      cuota: g.cuota ?? null,
      opciones: g.asignaturas.length,
      elegidas: ocupadas.length,
      ...lugar(posicion),
    })

    casillas.forEach((codigo, i) => {
      const { x, y } = lugar(posicion + i)
      nodos.push({
        codigo,
        nombre: nombreCasilla(g),
        grupo: g.clave,
        esHueco: true,
        prerrequisitos: [],
        x,
        y: y + FRANJA.encabezado,
      })
    })
    posicion += casillas.length
  }

  const filasUsadas = Math.max(1, Math.ceil(posicion / columnas))
  return { nodos, filas, alto: filasUsadas * altoFila - FRANJA.fila + MARGEN.bottom }
}
