import { DIAS, tramoCorto } from '../layout/horario'
import { colorClase, coloresDelHorario } from '../theme/areas'
import {
  cargarLetra,
  css,
  dibujarIcono,
  dibujarLogo,
  letra,
  mezclar,
  partirEnLineas,
  redondeado,
  resolverColores,
} from './lienzo'

/* La imagen del horario: la que se guarda en la galeria y se manda por
   WhatsApp. Se dibuja a mano en un canvas, sin libreria: html2canvas eran
   doscientos kilobytes para reproducir mal un layout que aqui ya esta
   descrito en minutos y columnas, y dibujarlo deja decidir que sale, que no
   es lo que hay en pantalla -ni hover, ni desplazamiento, ni botones-.

   La semana es la imagen. En horizontal, como una semana de calendario: la
   columna de las horas y los cinco dias, con lineas finas, y encima solo lo
   que dice de quien es -el logo, "Mi horario", el nombre y la carrera- y
   dos cifras. Nada mas compite con las clases.

   A triple densidad: sale de casi cuatro mil pixeles de ancho, y se puede
   ampliar en el telefono hasta leer el aula de cualquier clase.

   Siempre en claro, sea cual sea el tema de la app: se imprime y se manda
   por WhatsApp, y las dos cosas asumen papel blanco. */

const ESCALA = 3
const MARGEN = 52
const ANCHO_HORAS = 70
const ANCHO_COL = 226
const ALTO_HORA = 84
const ALTO_TITULO = 100
const ALTO_DIAS = 46
const ALTO_PIE = 56

const ANCHO = MARGEN * 2 + ANCHO_HORAS + ANCHO_COL * DIAS.length

const PAPEL = { r: 255, g: 255, b: 255 }
const TINTA = { r: 16, g: 22, b: 34 }
const SUAVE = { r: 86, g: 98, b: 118 }
const TENUE = { r: 148, g: 158, b: 174 }
const LINEA = { r: 226, g: 230, b: 237 }

/* Los iconos, con los nodos de Lucide tal cual: los mismos que la app. */
const ICONO = {
  libro: [
    ['path', { d: 'M12 5v16' }],
    [
      'path',
      {
        d: 'M20.001 19A2 2 0 0022 17V5a2 2 0 00-1.999-2L16 3.002A5 5 0 0012 5a5 5 0 00-4-2H4a2 2 0 00-2 2v12a2 2 0 001.999 2H8a5 5 0 014 2 5 5 0 014-2z',
      },
    ],
  ],
  reloj: [
    ['circle', { cx: 12, cy: 12, r: 10 }],
    ['path', { d: 'M12 6v6h4' }],
  ],
  lugar: [
    [
      'path',
      {
        d: 'M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0',
      },
    ],
    ['circle', { cx: 12, cy: 10, r: 3 }],
  ],
  persona: [
    ['circle', { cx: 12, cy: 8, r: 5 }],
    ['path', { d: 'M20 21a8 8 0 0 0-16 0' }],
  ],
}

/* "7 AM", "12 PM": en la columna de las horas los ":00" no dicen nada */
const horaCorta = (min) => {
  const h = Math.floor(min / 60)
  return `${((h + 11) % 12) + 1} ${h < 12 ? 'AM' : 'PM'}`
}

/** "13 h", "13,5 h" */
const enHoras = (minutos) => {
  const h = minutos / 60
  return `${Number.isInteger(h) ? h : h.toFixed(1).replace('.', ',')} h`
}

/**
 * Que franja del dia sale en la imagen: de la hora en punto de la primera
 * clase a la de despues de la ultima. Las doce horas siempre dejaban el
 * horario pequeño entre filas vacias, y la imagen alta en vez de apaisada.
 */
function franjaUtil(sesiones) {
  const desde = Math.floor(Math.min(...sesiones.map((s) => s.inicio)) / 60) * 60
  const hasta = Math.ceil(Math.max(...sesiones.map((s) => s.fin)) / 60) * 60
  return { desde, horas: Math.max(3, (hasta - desde) / 60) }
}

/** Una pieza de icono y texto, en linea. Devuelve hasta donde llego. */
function conIcono(ctx, icono, texto, x, y, tam, color) {
  dibujarIcono(ctx, icono, x, y - tam + 1, tam, color)
  ctx.fillStyle = color
  ctx.fillText(texto, x + tam + 7, y)
  return x + tam + 7 + ctx.measureText(texto).width
}

function dibujarCabecera(ctx, { carrera, nombre, clases }) {
  dibujarLogo(ctx, MARGEN, MARGEN + 4, 44, css(TINTA))

  const izq = MARGEN + 60
  ctx.fillStyle = css(TINTA)
  letra(ctx, 700, 30, -0.9)
  ctx.fillText('Mi horario', izq, MARGEN + 30)
  ctx.fillStyle = css(SUAVE)
  letra(ctx, 450, 15, 0)
  ctx.fillText([nombre, carrera.nombre].filter(Boolean).join('  ·  '), izq, MARGEN + 54)

  // A la derecha, dos cifras con su icono: cuantas materias y cuantas horas
  const materias = new Set(clases.map((c) => c.codigo)).size
  const minutos = clases.reduce((suma, c) => suma + c.fin - c.inicio, 0)
  const piezas = [
    { icono: ICONO.libro, texto: `${materias} ${materias === 1 ? 'materia' : 'materias'}` },
    { icono: ICONO.reloj, texto: `${enHoras(minutos)} a la semana` },
  ]
  letra(ctx, 500, 14, 0)
  const anchoDe = (p) => 15 + 7 + ctx.measureText(p.texto).width
  const total = piezas.reduce((s, p) => s + anchoDe(p), 0) + 26 * (piezas.length - 1)
  let x = ANCHO - MARGEN - total
  for (const p of piezas) x = conIcono(ctx, p.icono, p.texto, x, MARGEN + 42, 15, css(SUAVE)) + 26
}

function dibujarSemana(ctx, { clases, desde, horas }) {
  const cima = MARGEN + ALTO_TITULO
  const izq = MARGEN + ANCHO_HORAS
  const rejilla = cima + ALTO_DIAS
  const fondo = rejilla + horas * ALTO_HORA
  const derecha = ANCHO - MARGEN
  const pxPorMinuto = ALTO_HORA / 60

  ctx.fillStyle = css(TENUE)
  letra(ctx, 600, 12, 2.2)
  ctx.textAlign = 'center'
  DIAS.forEach((d, i) => {
    ctx.fillText(d.toUpperCase(), izq + ANCHO_COL * i + ANCHO_COL / 2, cima + 26)
  })
  ctx.textAlign = 'left'

  /* Las lineas, finas como un pelo: medio pixel del dibujo, que a triple
     densidad es pixel y medio de la imagen. Las de las horas cruzan tambien
     la columna de las horas, que se lee pegada a su linea. */
  ctx.strokeStyle = css(LINEA)
  ctx.lineWidth = 0.6
  for (let h = 0; h <= horas; h++) {
    const y = rejilla + h * ALTO_HORA
    ctx.beginPath()
    ctx.moveTo(MARGEN, y)
    ctx.lineTo(derecha, y)
    ctx.stroke()
  }
  for (let i = 0; i <= DIAS.length; i++) {
    const x = izq + i * ANCHO_COL
    ctx.beginPath()
    ctx.moveTo(x, rejilla)
    ctx.lineTo(x, fondo)
    ctx.stroke()
  }

  ctx.fillStyle = css(TENUE)
  letra(ctx, 500, 12, 0.3)
  for (let h = 0; h < horas; h++) {
    ctx.fillText(horaCorta(desde + h * 60), MARGEN, rejilla + h * ALTO_HORA + 18)
  }

  for (const s of clases) {
    const x = izq + s.dia * ANCHO_COL + 5
    const y = rejilla + (s.inicio - desde) * pxPorMinuto + 4
    const w = ANCHO_COL - 10
    const h = (s.fin - s.inicio) * pxPorMinuto - 8
    const interior = w - 30

    ctx.save()
    redondeado(ctx, x, y, w, h, 12)
    ctx.fillStyle = css(mezclar(PAPEL, s.rgb, 0.11))
    ctx.fill()
    ctx.strokeStyle = css(s.rgb, 0.22)
    ctx.lineWidth = 0.6
    ctx.stroke()
    ctx.clip()
    // El filo de color a la izquierda: de que materia es, de un vistazo
    ctx.fillStyle = css(s.rgb)
    ctx.fillRect(x, y, 3, h)

    const tx = x + 16
    ctx.fillStyle = css(mezclar(s.rgb, TINTA, 0.3))
    letra(ctx, 600, 12, 0.2)
    ctx.fillText(tramoCorto(s.inicio, s.fin), tx, y + 23)

    // Abajo lo que quepa, de lo mas a lo menos necesario: aula y profesor
    const pie = [
      s.aula && { icono: ICONO.lugar, texto: [s.aula, s.seccion && `Sec. ${s.seccion}`].filter(Boolean).join(' · ') },
      s.profesor && { icono: ICONO.persona, texto: s.profesor },
    ].filter(Boolean)
    const sitio = Math.max(0, Math.floor((h - 72) / 20))
    const abajo = pie.slice(0, Math.min(pie.length, sitio))

    ctx.fillStyle = css(TINTA)
    letra(ctx, 600, 15, -0.2)
    const caben = Math.max(1, Math.floor((h - 38 - abajo.length * 20 - 10) / 19))
    partirEnLineas(ctx, s.nombre, interior, Math.min(3, caben)).forEach((l, i) => {
      ctx.fillText(l, tx, y + 45 + i * 19)
    })

    letra(ctx, 500, 11.5, 0)
    abajo.forEach(({ icono, texto }, i) => {
      const ly = y + h - 14 - (abajo.length - 1 - i) * 20
      conIcono(ctx, icono, partirEnLineas(ctx, texto, interior - 20, 1)[0], tx, ly, 12, css(SUAVE))
    })
    ctx.restore()
  }
  return fondo
}

function dibujarPie(ctx, y) {
  letra(ctx, 500, 12, 0)
  dibujarLogo(ctx, MARGEN, y - 12, 15, css(TENUE))
  ctx.fillStyle = css(TENUE)
  ctx.fillText('Hecho con Mapa de Pensum  ·  mapa-pensum.vercel.app', MARGEN + 22, y)
  ctx.textAlign = 'right'
  ctx.fillText('Confirma horas, sección y aula con tu coordinación.', ANCHO - MARGEN, y)
  ctx.textAlign = 'left'
}

/** Dibuja el horario y devuelve el PNG como Blob */
async function dibujarHorario({ carrera, sesiones, porCodigo, nombre }) {
  await cargarLetra([450, 500, 600, 700])
  const deLaSemana = sesiones.filter((s) => s.dia < DIAS.length)
  const indices = coloresDelHorario(deLaSemana)
  const colores = resolverColores(deLaSemana.map((s) => colorClase(s, indices)))
  const clases = deLaSemana.map((s, i) => ({
    ...s,
    rgb: colores[i],
    nombre: porCodigo.get(s.codigo)?.nombre ?? s.codigo,
  }))
  const { desde, horas } = franjaUtil(clases)

  const alto = MARGEN + ALTO_TITULO + ALTO_DIAS + horas * ALTO_HORA + ALTO_PIE + MARGEN
  const lienzo = document.createElement('canvas')
  lienzo.width = ANCHO * ESCALA
  lienzo.height = alto * ESCALA
  const ctx = lienzo.getContext('2d')
  ctx.scale(ESCALA, ESCALA)
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = css(PAPEL)
  ctx.fillRect(0, 0, ANCHO, alto)

  dibujarCabecera(ctx, { carrera, nombre, clases })
  const fondo = dibujarSemana(ctx, { clases, desde, horas })
  dibujarPie(ctx, fondo + ALTO_PIE - 14)

  return new Promise((resolver) => lienzo.toBlob(resolver, 'image/png'))
}

/* Lo que acompaña a la imagen al compartirla: lo que diria uno al mandarla */
const MENSAJE = 'Mira, te comparto mi horario 📅 Arma el tuyo en https://mapa-pensum.vercel.app'

/**
 * Saca el horario como PNG. Devuelve como acabo: 'guardado' o 'cancelado'.
 *
 * En el telefono abre la hoja de compartir del sistema y no una descarga. Una
 * descarga ahi acaba en una carpeta que nadie abre, y en la app instalada
 * algunos navegadores ni la hacen; desde la hoja se guarda en la galeria o se
 * manda por WhatsApp de un toque, que es lo que se hace con un horario. En el
 * ordenador, descarga normal: alli la hoja de compartir es una rareza.
 */
export async function descargarHorario(datos) {
  const blob = await dibujarHorario(datos)
  const nombre = `horario-${datos.carrera.slug}.png`
  const archivo = new File([blob], nombre, { type: 'image/png' })

  const tactil = window.matchMedia('(pointer: coarse)').matches
  if (tactil && navigator.canShare?.({ files: [archivo] })) {
    try {
      await navigator.share({ files: [archivo], title: 'Mi horario', text: MENSAJE })
      return 'guardado'
    } catch (e) {
      // Cerrar la hoja sin elegir nada no es un error
      if (e.name === 'AbortError') return 'cancelado'
      // Cualquier otro fallo de la hoja: se baja como en el ordenador
    }
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  a.click()
  /* Se suelta despues y no en el acto: Safari y Firefox leen el enlace un
     instante mas tarde, y soltado antes la descarga sale vacia o no sale. */
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return 'guardado'
}
