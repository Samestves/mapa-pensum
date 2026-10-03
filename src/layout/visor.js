/**
 * El visor de la hoja de Tu ruta: acercarla y moverla dentro de su panel.
 *
 * Una vista es { x, y, escala }: donde cae la esquina de arriba a la
 * izquierda de la hoja dentro del panel, y a que tamaño. Lo de aqui es la
 * aritmetica, sin React ni DOM, para poder probarla. `panel` y `hoja` son
 * { ancho, alto }.
 */

/* Hasta donde se acerca: el triple de su tamaño de papel. A partir de ahi ya
   solo se ven letras sueltas. */
export const ESCALA_MAX = 3

/* Lo que respira la hoja dentro del panel, a cada lado */
export const MARGEN = 32

const acotar = (v, min, max) => Math.min(Math.max(v, min), max)

/**
 * La escala a la que la hoja cabe entera en el panel, que es tambien lo mas
 * que se aleja: mas pequeña que eso solo seria verla peor. Nunca por encima
 * de su tamaño de papel.
 */
export function escalaDeAjuste(panel, hoja) {
  return Math.min(1, (panel.ancho - 2 * MARGEN) / hoja.ancho, (panel.alto - 2 * MARGEN) / hoja.alto)
}

/* En un eje: centrada si cabe, y si no, sin despegarse de los bordes */
function colocar(posicion, panel, tamano) {
  if (tamano + 2 * MARGEN <= panel) return (panel - tamano) / 2
  return acotar(posicion, panel - tamano - MARGEN, MARGEN)
}

/**
 * Deja la vista dentro de lo que tiene sentido: ni mas lejos que el ajuste
 * ni mas cerca que el maximo, y con la hoja a la vista. En el eje en que
 * cabe va centrada; en el que no, se puede recorrer de un borde al otro y
 * no mas alla, que seria quedarse mirando el fondo.
 */
export function acotarVisor(v, panel, hoja) {
  const escala = acotar(v.escala, escalaDeAjuste(panel, hoja), ESCALA_MAX)
  return {
    escala,
    x: colocar(v.x, panel.ancho, hoja.ancho * escala),
    y: colocar(v.y, panel.alto, hoja.alto * escala),
  }
}

/** La hoja entera a la vista, centrada */
export function vistaDeAjuste(panel, hoja) {
  return acotarVisor({ x: 0, y: 0, escala: 0 }, panel, hoja)
}

/**
 * Acercar o alejar por `factor` dejando quieto el punto (px, py) del panel:
 * lo que esta bajo el cursor se queda bajo el cursor.
 */
export function zoomEnPunto(v, factor, px, py, panel, hoja) {
  const escala = acotar(v.escala * factor, escalaDeAjuste(panel, hoja), ESCALA_MAX)
  const k = escala / v.escala
  return acotarVisor({ escala, x: px - (px - v.x) * k, y: py - (py - v.y) * k }, panel, hoja)
}

/** Si la vista es la de ajuste: la hoja entera, sin acercar */
export function estaAjustada(v, panel, hoja) {
  return v.escala <= escalaDeAjuste(panel, hoja) * 1.001
}
