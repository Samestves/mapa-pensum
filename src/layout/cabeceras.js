import { NODO } from './constantes.js'
import { SITUACION } from './situacion.js'

/* Ancho estimado de una cifra en Plex Mono, para colocar lo que va a su
   lado: en una letra de maquina cada caracter mide 0,6 de su cuerpo. Es la
   misma idea que el reparto de nombres en tarjetas: medir en el DOM ataria
   la posicion al momento de montar. */
const anchoTexto = (texto, tamano) => texto.length * tamano * 0.6

/**
 * Lo que dice la cabecera de cada semestre, de una pasada: sus UC, cuantas
 * materias hay de cada situacion y, de ahi, el porcentaje, el largo de cada
 * tramo del riel y donde va cada estado. Lo usan las formas y el texto de
 * la cabecera (ver RotulosGrafo).
 *
 * Las UC suman las electivas que hayas COLOCADO. La casilla cuenta como una
 * materia del semestre, porque vas a cursar algo ahi; vacia aporta cero UC,
 * que es lo honesto: todavia no lo has decidido.
 */
export function cabecerasDe(columnas, nodos, enCasilla, situaciones) {
  const porSemestre = new Map()
  for (const nodo of nodos) {
    if (!porSemestre.has(nodo.semestre)) {
      porSemestre.set(nodo.semestre, { uc: 0, cuenta: {}, total: 0, pendientes: 0 })
    }
    const datos = porSemestre.get(nodo.semestre)
    const materia = nodo.esHueco ? enCasilla(nodo.codigo) : nodo
    const situacion = materia ? situaciones.get(materia.codigo) : SITUACION.LEJANA
    datos.cuenta[situacion] = (datos.cuenta[situacion] ?? 0) + 1
    datos.total += 1
    if (materia) {
      datos.uc += materia.uc ?? 0
      if (situacion !== SITUACION.HECHA) datos.pendientes += 1
    }
  }

  return columnas.map(({ x, semestre }) => {
    const { uc = 0, cuenta = {}, total = 0, pendientes = 0 } = porSemestre.get(semestre) ?? {}
    const hechas = cuenta[SITUACION.HECHA] ?? 0
    const cursando = cuenta[SITUACION.CURSANDO] ?? 0
    const der = x + NODO.ancho

    /* Estados de derecha a izquierda contra el borde. Solo los que tienen
       alguna materia: un "◉ 0" seria ruido. */
    const estados = []
    let hasta = der
    for (const situacion of [SITUACION.INSCRIBIBLE, SITUACION.CURSANDO]) {
      const n = cuenta[situacion] ?? 0
      if (!n) continue
      const inicio = hasta - anchoTexto(String(n), 11) - 16
      estados.push({ situacion, n, x: inicio })
      hasta = inicio - 12
    }

    return {
      semestre,
      x,
      uc,
      total,
      hechas,
      completo: total > 0 && hechas === total,
      // Las materias que aprobar el semestre marcaria: sin las casillas vacias
      pendientes,
      porcentaje: total ? Math.round((hechas / total) * 100) : 0,
      anchoHechas: total ? (NODO.ancho * hechas) / total : 0,
      anchoCursando: total ? (NODO.ancho * cursando) / total : 0,
      estados,
    }
  })
}
