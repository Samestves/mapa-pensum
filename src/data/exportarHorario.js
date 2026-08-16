import { ABRE, CIERRA, DIAS, enDoceHoras } from '../layout/horario'
import { colorClase } from '../theme/areas'

/* El PNG se dibuja a mano en un canvas, sin libreria.
   La alternativa era html2canvas: doscientos kilobytes para reproducir mal un
   layout que aqui ya esta descrito en minutos y columnas. Dibujarlo ademas
   deja decidir que sale en la imagen, que no es lo mismo que sale en
   pantalla: aqui no hay hover, ni vista previa, ni desplazamiento. */

const ESCALA = 2 // para que no se vea borroso en pantallas densas
const MARGEN = 34
const ANCHO_HORAS = 74
const ANCHO_COL = 210
const ALTO_HORA = 96
const ALTO_TITULO = 76
const ALTO_DIAS = 44
const PIE = 32

const FUENTE = `'Manrope Variable', -apple-system, BlinkMacSystemFont, system-ui, sans-serif`

/**
 * Resuelve cualquier color CSS -incluido var(--lo-que-sea)- a canal RGB.
 *
 * Se apoya en el navegador en vez de parsear: los colores del proyecto son
 * variables que cambian con el tema, y algunas llegan como color-mix. Un
 * elemento de usar y tirar dentro de la raiz los resuelve todos.
 */
function aRGB(valor) {
  const d = document.createElement('div')
  d.style.cssText = `position:absolute;visibility:hidden;pointer-events:none;color:${valor}`
  document.documentElement.appendChild(d)
  const leido = getComputedStyle(d).color
  d.remove()
  const n = leido.match(/[\d.]+/g)?.map(Number) ?? [128, 128, 128]
  return { r: n[0], g: n[1], b: n[2] }
}

const css = (c) => `rgb(${Math.round(c.r)} ${Math.round(c.g)} ${Math.round(c.b)})`
const mezclar = (a, b, t) => ({
  r: a.r + (b.r - a.r) * t,
  g: a.g + (b.g - a.g) * t,
  b: a.b + (b.b - a.b) * t,
})

/** Corta el texto con puntos suspensivos si no cabe en el ancho dado */
function recortar(ctx, texto, ancho) {
  if (ctx.measureText(texto).width <= ancho) return texto
  let corto = texto
  while (corto.length > 1 && ctx.measureText(`${corto}…`).width > ancho) {
    corto = corto.slice(0, -1)
  }
  return `${corto}…`
}

/** Parte el nombre en como mucho dos lineas que quepan a lo ancho */
function enDosLineas(ctx, texto, ancho) {
  if (ctx.measureText(texto).width <= ancho) return [texto]
  const palabras = texto.split(' ')
  let primera = ''
  let i = 0
  while (i < palabras.length) {
    const prueba = primera ? `${primera} ${palabras[i]}` : palabras[i]
    if (ctx.measureText(prueba).width > ancho) break
    primera = prueba
    i++
  }
  if (!primera) return [recortar(ctx, texto, ancho)]
  return [primera, recortar(ctx, palabras.slice(i).join(' '), ancho)]
}

/**
 * Que franja del dia sale en la imagen.
 *
 * No las catorce horas siempre: solo las que tienen algo, con una hora de
 * respiro a cada lado. Una imagen con seis filas vacias arriba y cuatro abajo
 * es una imagen en la que el horario sale pequeño para nada.
 */
function franjaUtil(sesiones) {
  if (!sesiones.length) return { desde: ABRE, hasta: ABRE + 8 * 60 }
  const primera = Math.min(...sesiones.map((s) => s.inicio))
  const ultima = Math.max(...sesiones.map((s) => s.fin))
  return {
    desde: Math.max(ABRE, Math.floor(primera / 60) * 60 - 60),
    hasta: Math.min(CIERRA, Math.ceil(ultima / 60) * 60 + 60),
  }
}

/** Dibuja el horario y devuelve el PNG como Blob */
export async function dibujarHorario({ carrera, sesiones, porCodigo, nombre }) {
  await document.fonts.ready

  const { desde, hasta } = franjaUtil(sesiones)
  const horas = Math.max(1, Math.round((hasta - desde) / 60))
  const pxPorMinuto = ALTO_HORA / 60

  const ancho = MARGEN * 2 + ANCHO_HORAS + ANCHO_COL * DIAS.length
  const alto = MARGEN * 2 + ALTO_TITULO + ALTO_DIAS + horas * ALTO_HORA + PIE

  const lienzo = document.createElement('canvas')
  lienzo.width = ancho * ESCALA
  lienzo.height = alto * ESCALA
  const ctx = lienzo.getContext('2d')
  ctx.scale(ESCALA, ESCALA)

  /* La imagen va siempre en claro, sea cual sea el tema de la aplicacion: se
     comparte por WhatsApp y se imprime, y las dos cosas asumen fondo blanco.
     Un horario en tema oscuro impreso es una plancha de tinta. */
  const fondo = { r: 255, g: 255, b: 255 }
  const tinta = { r: 12, g: 23, b: 37 }
  const suave = { r: 90, g: 105, b: 125 }
  const tenue = { r: 148, g: 161, b: 178 }
  const linea = { r: 226, g: 232, b: 240 }

  ctx.fillStyle = css(fondo)
  ctx.fillRect(0, 0, ancho, alto)

  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = css(tinta)
  ctx.font = `800 26px ${FUENTE}`
  ctx.fillText('Mi horario', MARGEN, MARGEN + 26)

  ctx.fillStyle = css(suave)
  ctx.font = `600 14px ${FUENTE}`
  ctx.fillText([nombre, carrera.nombre].filter(Boolean).join(' · '), MARGEN, MARGEN + 50)

  const cima = MARGEN + ALTO_TITULO
  const izquierda = MARGEN + ANCHO_HORAS

  ctx.font = `700 13px ${FUENTE}`
  ctx.textAlign = 'center'
  ctx.fillStyle = css(suave)
  DIAS.forEach((d, i) => {
    ctx.fillText(d.toUpperCase(), izquierda + ANCHO_COL * i + ANCHO_COL / 2, cima + 27)
  })
  ctx.textAlign = 'left'

  const rejilla = cima + ALTO_DIAS
  const fondoRejilla = rejilla + horas * ALTO_HORA

  ctx.strokeStyle = css(linea)
  ctx.lineWidth = 1
  ctx.font = `600 12px ${FUENTE}`
  for (let h = 0; h <= horas; h++) {
    const y = Math.round(rejilla + h * ALTO_HORA) + 0.5
    ctx.beginPath()
    ctx.moveTo(MARGEN, y)
    ctx.lineTo(ancho - MARGEN, y)
    ctx.stroke()
    if (h < horas) {
      ctx.fillStyle = css(tenue)
      ctx.fillText(enDoceHoras(desde + h * 60), MARGEN, y + 17)
    }
  }

  for (let i = 0; i <= DIAS.length; i++) {
    const x = Math.round(izquierda + i * ANCHO_COL) + 0.5
    ctx.beginPath()
    ctx.moveTo(x, rejilla)
    ctx.lineTo(x, fondoRejilla)
    ctx.stroke()
  }

  for (const s of sesiones) {
    if (s.dia >= DIAS.length) continue
    const asignatura = porCodigo.get(s.codigo)
    const color = aRGB(colorClase(s, asignatura))

    const x = izquierda + s.dia * ANCHO_COL + 5
    const y = rejilla + (s.inicio - desde) * pxPorMinuto + 3
    const w = ANCHO_COL - 10
    const h = (s.fin - s.inicio) * pxPorMinuto - 6
    const interior = w - 24

    ctx.beginPath()
    ctx.roundRect(x, y, w, h, 13)
    ctx.fillStyle = css(mezclar(fondo, color, 0.12))
    ctx.fill()
    ctx.strokeStyle = css(mezclar(fondo, color, 0.3))
    ctx.stroke()

    ctx.save()
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, 13)
    ctx.clip()

    let cursor = y + 23
    ctx.fillStyle = css(mezclar(tinta, color, 0.55))
    ctx.font = `800 15px ${FUENTE}`
    const titulo = asignatura?.nombre ?? s.codigo
    const lineas = h >= 82 ? enDosLineas(ctx, titulo, interior) : [recortar(ctx, titulo, interior)]
    for (const l of lineas) {
      ctx.fillText(l, x + 12, cursor)
      cursor += 19
    }

    ctx.fillStyle = css(suave)
    ctx.font = `600 13px ${FUENTE}`
    ctx.fillText(`${enDoceHoras(s.inicio)} – ${enDoceHoras(s.fin)}`, x + 12, cursor + 2)
    cursor += 21

    const pie = [s.aula, s.seccion && `Sec. ${s.seccion}`].filter(Boolean).join('  ·  ')
    if (pie && h >= 94) {
      ctx.fillStyle = css(tenue)
      ctx.font = `600 12px ${FUENTE}`
      ctx.fillText(recortar(ctx, pie, interior), x + 12, cursor)
      cursor += 18
    }
    if (s.profesor && h >= 132) {
      ctx.fillStyle = css(tenue)
      ctx.font = `500 12px ${FUENTE}`
      ctx.fillText(recortar(ctx, s.profesor, interior), x + 12, cursor)
    }

    ctx.restore()
  }

  ctx.fillStyle = css(tenue)
  ctx.font = `500 11px ${FUENTE}`
  ctx.fillText(
    'Hecho con Mapa de Pensum · mapa-pensum.vercel.app · Confirma horas, sección y aula con tu sección.',
    MARGEN,
    alto - MARGEN + 6,
  )

  return new Promise((resolver) => lienzo.toBlob(resolver, 'image/png'))
}

/** Baja el horario como PNG */
export async function descargarHorario(datos) {
  const blob = await dibujarHorario(datos)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `horario-${datos.carrera.slug}.png`
  a.click()
  URL.revokeObjectURL(url)
}
