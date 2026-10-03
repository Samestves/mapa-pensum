import { CAJA, NODOS, ROSA, TRANSFORMA } from './logoTrazos'

/* Lo basico para dibujar a mano en un canvas lo que la app dibuja en SVG y
   CSS: colores, letra, texto partido en lineas, iconos de Lucide y la rosa
   del logotipo. Lo usa la imagen del horario (exportarHorario). */

const FUENTE = `'Inter Variable', -apple-system, BlinkMacSystemFont, system-ui, sans-serif`

export const css = ({ r, g, b }, alfa = 1) =>
  `rgb(${Math.round(r)} ${Math.round(g)} ${Math.round(b)} / ${alfa})`

/**
 * Resuelve colores CSS -hexadecimales, var(--lo-que-sea), color-mix- a canal
 * RGB, tal como son en el tema CLARO, sea cual sea el que tiene la app. Se
 * apoya en el navegador en vez de parsear: las variables cambian con el tema
 * y un elemento de usar y tirar dentro de [data-tema=claro] las resuelve.
 */
export function resolverColores(valores) {
  const caja = document.createElement('div')
  caja.dataset.tema = 'claro'
  caja.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none'
  document.body.appendChild(caja)
  const resueltos = valores.map((valor) => {
    const d = document.createElement('div')
    d.style.color = valor
    caja.appendChild(d)
    const n = getComputedStyle(d)
      .color.match(/[\d.]+/g)
      ?.map(Number) ?? [128, 128, 128]
    return { r: n[0], g: n[1], b: n[2] }
  })
  caja.remove()
  return resueltos
}

/**
 * Espera a la letra en los pesos que se van a usar. El canvas no la pide por
 * su cuenta: si un peso o las tildes -que van en otro subconjunto del
 * archivo- no se habian usado aun en pantalla, saldrian en la de sistema.
 */
export async function cargarLetra(pesos) {
  const muestra = 'Horario ÁÉÍÓÚáéíóúÑñ 0123456789'
  await Promise.all(pesos.map((p) => document.fonts.load(`${p} 16px 'Inter Variable'`, muestra)))
}

/** Pone letra, tamaño y espaciado. El espaciado solo donde el canvas lo sabe hacer. */
export function letra(ctx, peso, tam, espaciado = 0) {
  ctx.font = `${peso} ${tam}px ${FUENTE}`
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${espaciado}px`
}

/** Parte un texto en como mucho `max` lineas de `ancho`; la ultima con puntos suspensivos si no cabe. */
export function partirEnLineas(ctx, texto, ancho, max) {
  const cabe = (t) => ctx.measureText(t).width <= ancho
  const lineas = []
  let resto = texto.split(' ')
  while (resto.length && lineas.length < max) {
    let linea = resto[0]
    let i = 1
    while (i < resto.length && cabe(`${linea} ${resto[i]}`)) linea += ` ${resto[i++]}`
    resto = resto.slice(i)
    lineas.push(linea)
  }
  const ultima = lineas.length - 1
  if (resto.length || !cabe(lineas[ultima])) {
    let corta = resto.length ? `${lineas[ultima]} ${resto.join(' ')}` : lineas[ultima]
    while (corta.length > 1 && !cabe(`${corta}…`)) corta = corta.slice(0, -1).trimEnd()
    lineas[ultima] = `${corta}…`
  }
  return lineas
}

/** Un rectangulo redondeado como trazado, para rellenarlo o recortar con el. */
export function redondeado(ctx, x, y, ancho, alto, radio) {
  ctx.beginPath()
  ctx.roundRect(x, y, ancho, alto, radio)
}

/**
 * Un icono de Lucide, de su lista de nodos (la misma que trae lucide-react),
 * en una caja de `tam` px con la esquina en (x, y). Trazo de 2 sobre 24, como
 * en pantalla.
 */
export function dibujarIcono(ctx, nodos, x, y, tam, color) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(tam / 24, tam / 24)
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const [tipo, a] of nodos) {
    if (tipo === 'path') {
      ctx.stroke(new Path2D(a.d))
      continue
    }
    ctx.beginPath()
    if (tipo === 'circle') ctx.arc(+a.cx, +a.cy, +a.r, 0, Math.PI * 2)
    if (tipo === 'rect') ctx.roundRect(+a.x, +a.y, +a.width, +a.height, +(a.rx ?? 0))
    ctx.stroke()
  }
  ctx.restore()
}

/* El calco del logotipo trae su propio sistema de coordenadas (ver
   logoTrazos): la caja cuadrada y, dentro, el transform de potrace. */
const [CAJA_X, CAJA_Y, CAJA_LADO] = CAJA.split(' ').map(Number)
const [TRASLADO_Y, ESCALA_X, ESCALA_Y] = TRANSFORMA.match(/-?[\d.]+/g)
  .map(Number)
  .slice(1)

/** La rosa del logotipo, de un solo color, en un cuadrado de `tam` px. */
export function dibujarLogo(ctx, x, y, tam, color) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(tam / CAJA_LADO, tam / CAJA_LADO)
  ctx.translate(-CAJA_X, -CAJA_Y + TRASLADO_Y)
  ctx.scale(ESCALA_X, ESCALA_Y)
  ctx.fillStyle = color
  for (const d of [...ROSA, ...NODOS]) ctx.fill(new Path2D(d))
  ctx.restore()
}
