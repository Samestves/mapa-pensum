import { ESPACIADO, MARGEN, NODO } from './constantes.js'
import { SITUACION } from './situacion.js'

/**
 * Donde abre la camara del mapa, y como se acuerda de donde la dejaste.
 *
 * En el telefono el mapa abria encajado entero: la carrera completa a una
 * escala de 0,1, tarjetas del tamaño de una uña y nada legible. Lo primero
 * que habia que hacer siempre era buscar donde estabas y acercarte. Ahora
 * abre ahi, a una escala que se lee.
 */

/**
 * El semestre donde estas: el primero que tiene algo que puedes inscribir o
 * que estas cursando. Sin nada marcado es el primero, porque lo del primer
 * semestre no pide nada y ya esta disponible. Si lo tienes todo aprobado,
 * el ultimo.
 */
export function semestreFrente(nodos, situaciones) {
  const reales = nodos.filter((n) => !n.esHueco)
  if (!reales.length) return null
  const activos = reales.filter((n) => {
    const s = situaciones.get(n.codigo)
    return s === SITUACION.INSCRIBIBLE || s === SITUACION.CURSANDO
  })
  if (activos.length) return Math.min(...activos.map((n) => n.semestre))
  const pendientes = reales.filter((n) => situaciones.get(n.codigo) !== SITUACION.HECHA)
  if (pendientes.length) return Math.min(...pendientes.map((n) => n.semestre))
  return Math.max(...reales.map((n) => n.semestre))
}

/* La escala a la que se lee el mapa en un telefono: tu semestre entero y
   algo mas de media columna del siguiente, que es donde llegan sus cables.
   Tope de 0,8: por encima el nombre de la tarjeta ya es mas grande que el
   texto de la propia pantalla. */
export function escalaDeLectura(ancho) {
  return Math.min(0.8, (ancho - 24) / (NODO.ancho * 1.55 + ESPACIADO.columna))
}

/** La vista que pone una columna a la izquierda, con su cabecera arriba */
export function vistaDeColumna(columna, medida) {
  const escala = escalaDeLectura(medida.ancho)
  return { escala, x: 16 - columna.x * escala, y: 12 - MARGEN.top * escala }
}

/* ---- Donde la dejaste --------------------------------------------------

   En la sesion del navegador y no para siempre: volver del horario o
   recargar la pagina tiene que dejarte donde estabas, pero abrir la app
   otro dia tiene que llevarte a tu semestre de ahora, no al de la semana
   pasada. Se descarta si la pantalla cambio de ancho -girar el telefono-,
   porque la misma vista en otra pantalla ya no enseña lo mismo; el alto
   se tolera, que cambia solo con plegar la barra. */
const claveDe = (slug) => `mapa-pensum:camara:${slug}`

export function leerCamara(slug, medida, almacen = globalThis.sessionStorage) {
  try {
    const v = JSON.parse(almacen?.getItem(claveDe(slug)) ?? 'null')
    if (!v || !Number.isFinite(v.escala) || !Number.isFinite(v.x) || !Number.isFinite(v.y)) {
      return null
    }
    if (Math.abs(v.ancho - medida.ancho) > 2 || Math.abs(v.alto - medida.alto) > 160) return null
    return { x: v.x, y: v.y, escala: v.escala }
  } catch {
    return null
  }
}

export function guardarCamara(slug, vista, medida, almacen = globalThis.sessionStorage) {
  try {
    almacen?.setItem(
      claveDe(slug),
      JSON.stringify({ ...vista, ancho: medida.ancho, alto: medida.alto }),
    )
  } catch {
    // Sin almacen -modo privado estricto- simplemente no se recuerda
  }
}
