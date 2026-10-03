import { DIAS, tramoCorto } from '../layout/horario'
import { colorClase, coloresDelHorario } from '../theme/areas'
import {
  cargarLetra,
  css,
  dibujarIcono,
  dibujarLogo,
  letra,
  partirEnLineas,
  redondeado,
  resolverColores,
} from './lienzo'

/* La imagen del horario: la que se guarda en la galeria y se manda por
   WhatsApp. Se dibuja a mano en un canvas, sin libreria: html2canvas eran
   doscientos kilobytes para reproducir mal un layout que aqui ya esta
   descrito en minutos y columnas, y dibujarlo deja decidir que sale, que no
   es lo que hay en pantalla -ni hover, ni desplazamiento, ni botones-.

   La semana es la imagen. En horizontal, como una semana de calendario:
   arriba el logo en su baldosa, "Mi horario", de quien es y dos cifras; en
   medio la rejilla, en una tarjeta blanca con sus lineas bien marcadas y cada
   clase como una tarjeta blanca con el filo de su color; abajo, la firma.

   A triple densidad: sale de unos cuatro mil pixeles de ancho, y se puede
   ampliar en el telefono hasta leer el aula de cualquier clase. Siempre en
   claro, sea cual sea el tema de la app: se imprime y se manda por WhatsApp,
   y las dos cosas asumen papel blanco. */

const ESCALA = 3
const MARGEN = 56
const ANCHO_HORAS = 64
const ANCHO_COL = 232
const ALTO_HORA = 96
const ALTO_TITULO = 108
const ALTO_DIAS = 50
const ALTO_PIE = 104
const ANCHO = MARGEN * 2 + ANCHO_HORAS + ANCHO_COL * DIAS.length

const FONDO = '#f6f7f9'
const PAPEL = '#ffffff'
const TINTA = '#0f1522'
const SUAVE = '#566074'
const TENUE = '#8f98a8'
const LINEA = '#dfe3ea'
const MARCO = '#d6dbe3'
const FILO = '#e3e6ec'

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

/** El logo de la UDO en blanco sobre una baldosa oscura, como un icono de app */
function baldosa(ctx, x, y, lado, sombra = false) {
  ctx.save()
  redondeado(ctx, x, y, lado, lado, lado * 0.28)
  const brillo = ctx.createLinearGradient(x, y, x + lado, y + lado)
  brillo.addColorStop(0, '#1c2740')
  brillo.addColorStop(1, '#0b101b')
  ctx.fillStyle = brillo
  if (sombra) {
    ctx.shadowColor = 'rgb(15 21 34 / 0.25)'
    ctx.shadowBlur = 16 * ESCALA
    ctx.shadowOffsetY = 6 * ESCALA
  }
  ctx.fill()
  ctx.restore()
  dibujarLogo(ctx, x + lado / 6, y + lado / 7.5, lado * (2 / 3), PAPEL)
}

/** Una pastilla blanca con borde fino, como las de la app */
function pastilla(ctx, x, y, ancho, alto) {
  redondeado(ctx, x, y, ancho, alto, alto / 2)
  ctx.fillStyle = PAPEL
  ctx.fill()
  ctx.strokeStyle = FILO
  ctx.lineWidth = 1
  ctx.stroke()
}

function dibujarCabecera(ctx, { carrera, nombre, clases }) {
  baldosa(ctx, MARGEN, MARGEN - 2, 60, true)

  const izq = MARGEN + 78
  ctx.fillStyle = TINTA
  letra(ctx, 700, 38, -1.4)
  ctx.fillText('Mi horario', izq, MARGEN + 30)
  ctx.fillStyle = SUAVE
  letra(ctx, 450, 15.5)
  ctx.fillText(
    [nombre, carrera.nombre, 'UDO Monagas'].filter(Boolean).join('  ·  '),
    izq + 1,
    MARGEN + 54,
  )

  // A la derecha, dos cifras en pastillas: cuantas materias y cuantas horas
  const materias = new Set(clases.map((c) => c.codigo)).size
  const minutos = clases.reduce((suma, c) => suma + c.fin - c.inicio, 0)
  const cifras = [
    { icono: ICONO.reloj, texto: `${enHoras(minutos)} a la semana` },
    { icono: ICONO.libro, texto: `${materias} ${materias === 1 ? 'materia' : 'materias'}` },
  ]
  letra(ctx, 550, 14)
  let x = ANCHO - MARGEN
  for (const { icono, texto } of cifras) {
    const ancho = 15 + 16 + 8 + ctx.measureText(texto).width + 15
    x -= ancho
    pastilla(ctx, x, MARGEN + 8, ancho, 36)
    dibujarIcono(ctx, icono, x + 15, MARGEN + 18, 16, SUAVE)
    ctx.fillStyle = TINTA
    ctx.fillText(texto, x + 15 + 16 + 8, MARGEN + 31)
    x -= 10
  }
}

/** La semana. Devuelve donde acaba. */
function dibujarSemana(ctx, { clases, desde, horas }) {
  const cima = MARGEN + ALTO_TITULO
  const izq = MARGEN + ANCHO_HORAS
  const der = ANCHO - MARGEN
  const rejilla = cima + ALTO_DIAS
  const fondo = rejilla + horas * ALTO_HORA
  const pxPorMinuto = ALTO_HORA / 60

  // La tarjeta de la rejilla: blanca, con sombra suave y un borde visible
  ctx.save()
  ctx.shadowColor = 'rgb(16 24 40 / 0.05)'
  ctx.shadowBlur = 30 * ESCALA
  ctx.shadowOffsetY = 8 * ESCALA
  redondeado(ctx, izq, cima, der - izq, fondo - cima, 18)
  ctx.fillStyle = PAPEL
  ctx.fill()
  ctx.restore()
  redondeado(ctx, izq + 0.5, cima + 0.5, der - izq - 1, fondo - cima - 1, 18)
  ctx.strokeStyle = MARCO
  ctx.lineWidth = 1
  ctx.stroke()

  ctx.fillStyle = SUAVE
  letra(ctx, 650, 12, 2.2)
  ctx.textAlign = 'center'
  DIAS.forEach((d, i) => ctx.fillText(d.toUpperCase(), izq + ANCHO_COL * (i + 0.5), cima + 33))
  ctx.textAlign = 'left'

  // Las lineas por dentro: la de bajo los dias, una por hora y una por dia
  ctx.strokeStyle = LINEA
  ctx.lineWidth = 1
  for (let h = 0; h < horas; h++) {
    const y = rejilla + h * ALTO_HORA
    ctx.beginPath()
    ctx.moveTo(izq, y)
    ctx.lineTo(der, y)
    ctx.stroke()
  }
  for (let i = 1; i < DIAS.length; i++) {
    const x = izq + i * ANCHO_COL
    ctx.beginPath()
    ctx.moveTo(x, cima)
    ctx.lineTo(x, fondo)
    ctx.stroke()
  }

  ctx.fillStyle = TENUE
  letra(ctx, 500, 12, 0.2)
  ctx.textAlign = 'right'
  for (let h = 0; h < horas; h++) {
    ctx.fillText(horaCorta(desde + h * 60), izq - 14, rejilla + h * ALTO_HORA + 5)
  }
  ctx.textAlign = 'left'

  for (const s of clases) dibujarClase(ctx, s, izq, rejilla, desde, pxPorMinuto)
  return fondo
}

/** Una clase: tarjeta blanca con el filo de su color y un punto junto a la hora */
function dibujarClase(ctx, s, izq, rejilla, desde, pxPorMinuto) {
  const x = izq + s.dia * ANCHO_COL + 6
  const y = rejilla + (s.inicio - desde) * pxPorMinuto + 3
  const ancho = ANCHO_COL - 12
  const alto = (s.fin - s.inicio) * pxPorMinuto - 6
  const tx = x + 16
  const interior = ancho - 32

  ctx.save()
  redondeado(ctx, x, y, ancho, alto, 12)
  ctx.fillStyle = PAPEL
  ctx.fill()
  ctx.strokeStyle = css(s.rgb, 0.45)
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.clip()

  ctx.fillStyle = css(s.rgb)
  ctx.beginPath()
  ctx.arc(x + 18, y + 19, 4, 0, Math.PI * 2)
  ctx.fill()
  letra(ctx, 600, 12.5, 0.1)
  ctx.fillText(tramoCorto(s.inicio, s.fin), tx + 12, y + 24)

  // Abajo lo que quepa, de lo mas a lo menos necesario: aula y profesor
  const pie = [
    s.aula && {
      icono: ICONO.lugar,
      texto: [s.aula, s.seccion && `Sec. ${s.seccion}`].filter(Boolean).join(' · '),
    },
    s.profesor && { icono: ICONO.persona, texto: s.profesor },
  ]
    .filter(Boolean)
    .slice(0, Math.max(0, Math.floor((alto - 76) / 21)))

  ctx.fillStyle = TINTA
  letra(ctx, 600, 16, -0.3)
  const caben = Math.max(1, Math.min(3, Math.floor((alto - 40 - pie.length * 21 - 8) / 20)))
  partirEnLineas(ctx, s.nombre, interior, caben).forEach((linea, i) => {
    ctx.fillText(linea, tx, y + 48 + i * 20)
  })

  letra(ctx, 500, 12)
  pie.forEach(({ icono, texto }, i) => {
    const ly = y + alto - 14 - (pie.length - 1 - i) * 21
    dibujarIcono(ctx, icono, tx, ly - 11, 12.5, SUAVE)
    ctx.fillStyle = SUAVE
    ctx.fillText(partirEnLineas(ctx, texto, interior - 19, 1)[0], tx + 19, ly)
  })
  ctx.restore()
}

/** La firma: una pastilla centrada con la baldosa en pequeño, y el aviso debajo */
function dibujarPie(ctx, y) {
  const partes = [
    { texto: 'Hecho con ', peso: 450, espaciado: 0, color: SUAVE },
    { texto: 'Mapa de Pensum', peso: 700, espaciado: -0.1, color: TINTA },
    { texto: '   mapa-pensum.vercel.app', peso: 450, espaciado: 0, color: TENUE },
  ]
  const anchos = partes.map((p) => {
    letra(ctx, p.peso, 13.5, p.espaciado)
    return ctx.measureText(p.texto).width
  })
  const ancho = 7 + 26 + 10 + anchos.reduce((a, b) => a + b, 0) + 18
  const x = ANCHO / 2 - ancho / 2
  pastilla(ctx, x, y - 4, ancho, 38)
  baldosa(ctx, x + 7, y + 2, 26)

  let tx = x + 7 + 26 + 10
  partes.forEach((p, i) => {
    letra(ctx, p.peso, 13.5, p.espaciado)
    ctx.fillStyle = p.color
    ctx.fillText(p.texto, tx, y + 20)
    tx += anchos[i]
  })

  ctx.fillStyle = TENUE
  letra(ctx, 450, 12)
  ctx.textAlign = 'center'
  ctx.fillText('Confirma horas, sección y aula con tu coordinación.', ANCHO / 2, y + 56)
  ctx.textAlign = 'left'
}

/** Dibuja el horario y devuelve el PNG como Blob */
async function dibujarHorario({ carrera, sesiones, porCodigo, nombre }) {
  await cargarLetra([450, 500, 550, 600, 650, 700])
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
  ctx.fillStyle = FONDO
  ctx.fillRect(0, 0, ANCHO, alto)

  dibujarCabecera(ctx, { carrera, nombre, clases })
  dibujarSemana(ctx, { clases, desde, horas })
  dibujarPie(ctx, alto - MARGEN - 22 - 34)

  return new Promise((resolver) => lienzo.toBlob(resolver, 'image/png'))
}

/* La ultima imagen hecha, por horario: volver a descargar sin haber cambiado
   nada no la vuelve a dibujar. Cambiar una clase cambia el array de
   sesiones, y con el la imagen. */
const hechas = new WeakMap()

/** La imagen del horario como archivo PNG, lista para bajar o compartir */
export function imagenDelHorario(datos) {
  const clave = `${datos.carrera.slug}|${datos.nombre}`
  const previa = hechas.get(datos.sesiones)
  if (previa?.clave === clave) return previa.archivo

  const archivo = dibujarHorario(datos).then(
    (blob) => new File([blob], `horario-${datos.carrera.slug}.png`, { type: 'image/png' }),
  )
  hechas.set(datos.sesiones, { clave, archivo })
  return archivo
}

/** Baja el archivo, en el ordenador y en el telefono */
export function descargarArchivo(archivo) {
  const url = URL.createObjectURL(archivo)
  const a = document.createElement('a')
  a.href = url
  a.download = archivo.name
  a.click()
  /* Se suelta despues y no en el acto: Safari y Firefox leen el enlace un
     instante mas tarde, y soltado antes la descarga sale vacia o no sale. */
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/* Lo que acompaña a la imagen al compartirla: lo que diria uno al mandarla */
const MENSAJE = 'Mira, te comparto mi horario 📅 Arma el tuyo en https://mapa-pensum.vercel.app'

/**
 * Si este aparato sabe compartir imagenes con la hoja del sistema. Solo en
 * los tactiles: en el ordenador la hoja de compartir es una rareza y basta
 * con descargar.
 */
export const puedeCompartir = () =>
  window.matchMedia('(pointer: coarse)').matches &&
  Boolean(navigator.canShare?.({ files: [new File([''], 'x.png', { type: 'image/png' })] }))

/**
 * Abre la hoja de compartir con la imagen. Nunca falla: cerrar la hoja sin
 * elegir nada, o un navegador que la niega, no son errores de nadie -quien
 * la abre ya tiene el archivo descargado-.
 */
export async function compartirArchivo(archivo) {
  try {
    await navigator.share({ files: [archivo], title: 'Mi horario', text: MENSAJE })
  } catch {
    // Cerrada o negada: no hay nada que hacer
  }
}
