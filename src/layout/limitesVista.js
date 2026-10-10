import { ZOOM } from './constantes.js'

/* Cuanto se deja pasar del borde del contenido. Un poco de aire evita que
   llegar al final se sienta como chocar contra una pared. */
export const MARGEN_PAN = 96

/* En el telefono la ficha tapa la parte de abajo del mapa. Para que una
   materia de la ultima fila pueda subir a la vista por encima de ella, el
   mapa se deja subir mas alla de su borde inferior: hasta que ese borde
   quede cerca de la mitad de la pantalla. En escritorio la ficha va al lado
   y no hace falta. */
export const HOLGURA_TELEFONO = 0.62
export const ANCHO_TELEFONO = 768

/* La inercia al soltar un arrastre: la velocidad que hace falta para que
   siga solo, y cuanto tarda en perder dos tercios de ella. 325 ms es la
   friccion de los desplazamientos de iOS: largo y suave al final. */
export const LANZAMIENTO_MIN = 0.25
export const FRICCION_MS = 325
/* Y la velocidad, en px por ms, a la que el lanzamiento se da por parado:
   algo mas de un pixel por cuadro. */
const VELOCIDAD_PARADO = 0.02

export const acotar = (v, min, max) => Math.min(Math.max(v, min), max)

/**
 * Deja la vista dentro de los limites: el mapa no se puede perder.
 *
 * Sin esto se podia arrastrar indefinidamente en cualquier direccion y
 * acabar mirando una cuadricula vacia, sin nada en pantalla que dijera hacia
 * donde estaba el mapa ni cuanto habia que volver.
 *
 * No es una cuestion de rendimiento, aunque lo parezca: el contenido es un
 * <g> con un transform, siempre los mismos elementos, y el navegador descarta
 * lo que cae fuera del viewport. Medido, desplazarse a cincuenta mil pixeles
 * sale MAS barato que tener el mapa a la vista -21 ms contra 35 por sesenta
 * desplazamientos- porque no hay nada que rasterizar. Esto se arregla porque
 * se puede uno perder, no porque cueste.
 *
 * El rango se calcula igual que el de una barra de desplazamiento: el borde
 * de arriba del contenido no puede bajar mas de un margen por debajo del
 * borde de la ventana, y el de abajo no puede subir mas de un margen por
 * encima del suyo.
 *
 * Cuando el contenido es MAS PEQUEÑO que la ventana -mapa alejado- esos dos
 * limites se cruzan, y ahi el intervalo se lee al reves: en vez de dejar
 * recorrer el contenido, acota por donde puede moverse dentro de la ventana.
 * Por eso se ordenan en vez de asumir cual es cual; asumirlo daba un rango
 * vacio y clavaba el mapa en un punto.
 */
export function acotarVista(v, medida, anchoContenido, altoContenido) {
  if (!medida.ancho || !medida.alto) return v

  const rango = (ventana, contenido, extra = 0) => {
    const tope = MARGEN_PAN
    const suelo = ventana - contenido - MARGEN_PAN - extra
    return suelo <= tope ? [suelo, tope] : [tope, suelo]
  }

  const extraAbajo = medida.ancho < ANCHO_TELEFONO ? medida.alto * HOLGURA_TELEFONO : 0
  const [minX, maxX] = rango(medida.ancho, anchoContenido * v.escala)
  const [minY, maxY] = rango(medida.alto, altoContenido * v.escala, extraAbajo)
  return { ...v, x: acotar(v.x, minX, maxX), y: acotar(v.y, minY, maxY) }
}

/** Donde queda la vista al aplicar un factor de zoom dejando fijo un punto */
export function conZoom(v, factor, puntoX, puntoY) {
  const escala = acotar(v.escala * factor, ZOOM.min, ZOOM.max)
  const k = escala / v.escala
  return { escala, x: puntoX - (puntoX - v.x) * k, y: puntoY - (puntoY - v.y) * k }
}

/**
 * Con que velocidad suelta el dedo un arrastre, en px por ms, o null si no
 * lo estaba lanzando: pocas muestras, el dedo parado antes de soltar o menos
 * velocidad de la que hace falta para que siga solo.
 *
 * `muestras` son los ultimos puntos {x, y, t} del arrastre, del mas viejo al
 * mas nuevo, y `ahora` el reloj en el mismo ms. La velocidad se mide sobre
 * los ultimos 80 ms: antes se arrastraba otra cosa.
 */
export function velocidadDeLanzamiento(muestras, ahora) {
  if (muestras.length < 2) return null
  const ultimo = muestras[muestras.length - 1]
  // Si el dedo se quedo quieto antes de soltar, no lo estaba lanzando
  if (ahora - ultimo.t > 60) return null
  const primero = muestras.find((p) => ultimo.t - p.t <= 80) ?? muestras[0]
  const dt = ultimo.t - primero.t
  if (dt <= 0) return null
  const vx = (ultimo.x - primero.x) / dt
  const vy = (ultimo.y - primero.y) / dt
  return Math.hypot(vx, vy) < LANZAMIENTO_MIN ? null : { vx, vy }
}

/** Lo que se queda de la velocidad tras `ms` de friccion */
export const frenado = (ms) => Math.exp(-ms / FRICCION_MS)

/**
 * El lanzamiento entero, sabido en el momento de soltar: por donde pasa la
 * vista en cada instante, donde acaba y cuanto tarda.
 *
 * La friccion es una exponencial, asi que no hace falta ir cuadro a cuadro
 * restando velocidad para saber donde estara el mapa: a los `t` ms ha
 * avanzado velocidad x friccion x (1 - frenado(t)). Saberlo de antemano es lo
 * que deja pintar una sola vez lo que el viaje va a necesitar y darle el
 * recorrido hecho a la GPU (ver lanzar en useVistaGrafo).
 *
 * Al llegar a un borde ese eje se para y el otro sigue. Dura hasta que el
 * mapa va tan despacio que se da por parado, o hasta que los dos ejes han
 * llegado a su borde, lo que pase antes: un mapa clavado en la esquina no
 * tiene que seguir "moviendose" un segundo.
 *
 * Devuelve { desde, destino, duracion, en(t) }, con `t` en ms desde que se
 * solto.
 */
export function trayectoriaDeLanzamiento(desde, velocidad, medida, anchoContenido, altoContenido) {
  const { vx, vy } = velocidad
  const libre = (t) => {
    const avance = FRICCION_MS * (1 - frenado(t))
    return { ...desde, x: desde.x + vx * avance, y: desde.y + vy * avance }
  }
  const en = (t) => acotarVista(libre(t), medida, anchoContenido, altoContenido)

  const hastaParar = FRICCION_MS * Math.log(Math.hypot(vx, vy) / VELOCIDAD_PARADO)
  const destino = en(hastaParar)
  const sinBorde = libre(hastaParar)
  /* Cuando llega cada eje a donde se queda: al final si nada lo para, y si lo
     para un borde, cuando lo toca (la misma formula, despejando el tiempo). */
  const llegada = (v, recorrido, recorridoLibre) => {
    if (!v || !recorrido) return 0
    if (recorrido === recorridoLibre) return hastaParar
    const hecho = recorrido / (v * FRICCION_MS)
    return hecho > 0 && hecho < 1 ? -FRICCION_MS * Math.log(1 - hecho) : hastaParar
  }
  const duracion = Math.min(
    hastaParar,
    Math.max(
      llegada(vx, destino.x - desde.x, sinBorde.x - desde.x),
      llegada(vy, destino.y - desde.y, sinBorde.y - desde.y),
    ),
  )
  return { desde, destino, duracion, en }
}
