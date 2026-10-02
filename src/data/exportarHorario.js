import { DIAS, DIAS_CORTOS, tramoCorto } from '../layout/horario'
import { colorClase, coloresDelHorario } from '../theme/areas'
import { codigoVisible } from './codigoVisible'
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

   Es una pieza para enseñar, no una captura. Tres bloques, de lo que se ve
   de lejos a lo que se lee de cerca:
   - la portada, oscura y con el color de la carrera: el logo de la UDO, "Mi
     horario", de quien es y tres cifras -materias, UC, horas a la semana-;
   - la semana, en columnas por dia y cada clase de su color;
   - las materias, una tarjeta por cada una con todo lo que hace falta para
     inscribirla: codigo, UC, cuando, aula, seccion y profesor.

   Siempre en claro, sea cual sea el tema de la app: se imprime y se manda
   por WhatsApp, y las dos cosas asumen papel blanco. Solo la portada va
   oscura, que es lo que la hace llamativa en una lista de fotos. */

const ESCALA = 2 // nitida en pantallas densas: sale de 2160 px de ancho
const ANCHO = 1080
const MARGEN = 40
const RELLENO = 28
const HUECO = 20
const ALTO_PORTADA = 316
const ANCHO_HORAS = 50
const ALTO_DIAS = 44
const ALTO_HORA = 80
const ALTO_PIE = 58

const BLANCO = { r: 255, g: 255, b: 255 }
const FONDO = { r: 242, g: 244, b: 247 }
const NOCHE = { r: 10, g: 16, b: 29 }
const TINTA = { r: 14, g: 20, b: 33 }
const SUAVE = { r: 82, g: 94, b: 114 }
const TENUE = { r: 140, g: 151, b: 168 }
const COLUMNA = { r: 246, g: 247, b: 250 }
const LINEA = { r: 230, g: 233, b: 239 }

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
  capas: [
    [
      'path',
      {
        d: 'M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z',
      },
    ],
    ['path', { d: 'M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12' }],
    ['path', { d: 'M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17' }],
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

const plural = (n, una, varias) => `${n} ${n === 1 ? una : varias}`
const unicos = (valores) => [...new Set(valores.filter(Boolean))]

/**
 * Que franja del dia sale en la semana: de la hora en punto de la primera
 * clase a la de despues de la ultima, y como poco cuatro horas. Las catorce
 * siempre dejaban el horario pequeño entre filas vacias.
 */
function franjaUtil(sesiones) {
  const desde = Math.floor(Math.min(...sesiones.map((s) => s.inicio)) / 60) * 60
  const hasta = Math.ceil(Math.max(...sesiones.map((s) => s.fin)) / 60) * 60
  return { desde, horas: Math.max(4, (hasta - desde) / 60) }
}

/**
 * Cuando se ve una materia, en lineas: las clases a la misma hora se juntan
 * -"Lun · Mié  8 – 10 AM"-, que es como se dice un horario en voz alta.
 */
function cuandoSeVe(sesiones) {
  const porTramo = new Map()
  for (const s of sesiones) {
    const tramo = tramoCorto(s.inicio, s.fin)
    porTramo.set(tramo, [...(porTramo.get(tramo) ?? []), DIAS_CORTOS[s.dia]])
  }
  return [...porTramo].map(([tramo, dias]) => `${dias.join(' · ')}   ${tramo}`)
}

/**
 * Todo lo que se va a dibujar, ya decidido y medido: colores resueltos,
 * materias agrupadas y sus textos partidos en lineas. Separarlo del dibujo
 * deja saber el alto de la imagen antes de crearla.
 */
function prepararCartel({ carrera, sesiones, porCodigo, nombre }, ctx) {
  const deLaSemana = sesiones
    .filter((s) => s.dia < DIAS.length)
    .sort((a, b) => a.dia - b.dia || a.inicio - b.inicio)
  const indices = coloresDelHorario(deLaSemana)
  const [acento, ...colores] = resolverColores([
    carrera.color?.oscuro ?? '#46c8f5',
    ...deLaSemana.map((s) => colorClase(s, indices)),
  ])
  const clases = deLaSemana.map((s, i) => ({
    ...s,
    rgb: colores[i],
    nombre: porCodigo.get(s.codigo)?.nombre ?? s.codigo,
  }))

  const porMateria = new Map()
  for (const c of clases) {
    if (!porMateria.has(c.codigo)) porMateria.set(c.codigo, [])
    porMateria.get(c.codigo).push(c)
  }

  const anchoTarjeta = (ANCHO - MARGEN * 2 - 16) / 2
  const interior = anchoTarjeta - 44
  const materias = [...porMateria].map(([codigo, suyas]) => {
    const asignatura = porCodigo.get(codigo)
    letra(ctx, 700, 18, -0.2)
    const titulo = partirEnLineas(ctx, asignatura?.nombre ?? codigo, interior, 2)
    letra(ctx, 500, 13.5)
    const recorte = (t) => partirEnLineas(ctx, t, interior - 24, 1)[0]
    const aulas = unicos(suyas.map((s) => s.aula)).join(' / ')
    const secciones = unicos(suyas.map((s) => s.seccion)).join(', ')
    const lugar = [aulas, secciones && `Sección ${secciones}`].filter(Boolean).join('  ·  ')
    const profesor = unicos(suyas.map((s) => s.profesor)).join(', ')
    return {
      codigo: codigoVisible(asignatura) || codigo,
      uc: asignatura?.uc,
      color: suyas[0].rgb,
      titulo,
      datos: [
        ...cuandoSeVe(suyas).map((t) => ({ icono: ICONO.reloj, texto: recorte(t) })),
        lugar && { icono: ICONO.lugar, texto: recorte(lugar) },
        profesor && { icono: ICONO.persona, texto: recorte(profesor) },
      ].filter(Boolean),
    }
  })

  const minutos = clases.reduce((suma, c) => suma + c.fin - c.inicio, 0)
  const uc = materias.reduce((suma, m) => suma + (m.uc ?? 0), 0)

  return {
    carrera,
    nombre,
    acento,
    clases,
    materias,
    anchoTarjeta,
    ...franjaUtil(clases),
    cifras: [
      { icono: ICONO.libro, texto: plural(materias.length, 'materia', 'materias') },
      { icono: ICONO.capas, texto: `${uc} UC` },
      { icono: ICONO.reloj, texto: `${enHoras(minutos)} a la semana` },
    ],
  }
}

/* Alto de la tarjeta de una materia: cabecera, titulo y una linea por dato */
const altoMateria = (m) => 22 + 18 + 10 + m.titulo.length * 23 + 14 + m.datos.length * 24 + 16

function filasDeMaterias(materias) {
  const filas = []
  for (let i = 0; i < materias.length; i += 2) {
    const par = materias.slice(i, i + 2)
    filas.push({ par, alto: Math.max(...par.map(altoMateria)) })
  }
  return filas
}

/** Una tarjeta blanca con una sombra larga y suave, como las de iOS */
function tarjeta(ctx, x, y, ancho, alto, radio) {
  ctx.save()
  ctx.shadowColor = 'rgb(16 24 40 / 0.07)'
  ctx.shadowBlur = 28 * ESCALA
  ctx.shadowOffsetY = 8 * ESCALA
  redondeado(ctx, x, y, ancho, alto, radio)
  ctx.fillStyle = css(BLANCO)
  ctx.fill()
  ctx.restore()
}

function dibujarPortada(ctx, c, y) {
  const x = MARGEN
  const ancho = ANCHO - MARGEN * 2
  const alto = ALTO_PORTADA

  ctx.save()
  redondeado(ctx, x, y, ancho, alto, 36)
  ctx.clip()
  const fondo = ctx.createLinearGradient(x, y, x + ancho, y + alto)
  fondo.addColorStop(0, css(NOCHE))
  fondo.addColorStop(1, css(mezclar(NOCHE, c.acento, 0.42)))
  ctx.fillStyle = fondo
  ctx.fillRect(x, y, ancho, alto)
  // Un resplandor del color de la carrera en la esquina, como luz de fondo
  const brillo = ctx.createRadialGradient(x + ancho * 0.88, y, 0, x + ancho * 0.88, y, ancho * 0.62)
  brillo.addColorStop(0, css(c.acento, 0.5))
  brillo.addColorStop(1, css(c.acento, 0))
  ctx.fillStyle = brillo
  ctx.fillRect(x, y, ancho, alto)
  // La rosa en grande, de marca de agua, saliendose por la derecha
  dibujarLogo(ctx, x + ancho - 300, y + 36, 400, css(BLANCO, 0.06))
  ctx.restore()

  const izq = x + RELLENO + 4
  dibujarLogo(ctx, izq, y + RELLENO + 2, 46, css(BLANCO))
  ctx.fillStyle = css(BLANCO)
  letra(ctx, 700, 15.5, 0.1)
  ctx.fillText('Universidad de Oriente', izq + 60, y + RELLENO + 21)
  ctx.fillStyle = css(BLANCO, 0.62)
  letra(ctx, 500, 13.5, 0.1)
  ctx.fillText(c.carrera.nucleo ?? 'Núcleo de Monagas', izq + 60, y + RELLENO + 41)

  ctx.fillStyle = css(BLANCO)
  letra(ctx, 800, 66, -2)
  ctx.fillText('Mi horario', izq - 3, y + 172)
  ctx.fillStyle = css(BLANCO, 0.78)
  letra(ctx, 500, 21, -0.2)
  ctx.fillText([c.nombre, c.carrera.nombre].filter(Boolean).join('  ·  '), izq, y + 210)

  // Las tres cifras, en pastillas de cristal
  let cx = izq
  const cy = y + alto - RELLENO - 44
  letra(ctx, 600, 15, 0)
  for (const { icono, texto } of c.cifras) {
    const ancho = 16 + 18 + 9 + ctx.measureText(texto).width + 18
    redondeado(ctx, cx, cy, ancho, 44, 22)
    ctx.fillStyle = css(BLANCO, 0.12)
    ctx.fill()
    ctx.strokeStyle = css(BLANCO, 0.14)
    ctx.lineWidth = 1
    ctx.stroke()
    dibujarIcono(ctx, icono, cx + 16, cy + 13, 18, css(BLANCO, 0.9))
    ctx.fillStyle = css(BLANCO)
    ctx.fillText(texto, cx + 16 + 18 + 9, cy + 27.5)
    cx += ancho + 10
  }
}

/** La semana. Devuelve su alto. */
function dibujarSemana(ctx, c, y) {
  const x = MARGEN
  const ancho = ANCHO - MARGEN * 2
  const alto = RELLENO + ALTO_DIAS + c.horas * ALTO_HORA + RELLENO
  tarjeta(ctx, x, y, ancho, alto, 32)

  const izq = x + RELLENO + ANCHO_HORAS
  const anchoDia = (ancho - RELLENO * 2 - ANCHO_HORAS) / DIAS.length
  const cima = y + RELLENO + ALTO_DIAS
  const altoDia = c.horas * ALTO_HORA
  const pxPorMinuto = ALTO_HORA / 60

  ctx.textAlign = 'center'
  ctx.fillStyle = css(TENUE)
  letra(ctx, 700, 12.5, 1.6)
  DIAS_CORTOS.forEach((d, i) => {
    ctx.fillText(d.toUpperCase(), izq + anchoDia * i + anchoDia / 2, y + RELLENO + 22)
  })
  ctx.textAlign = 'left'

  // Cada dia, una columna gris con sus esquinas; las horas, lineas finas
  for (let i = 0; i < DIAS.length; i++) {
    redondeado(ctx, izq + anchoDia * i + 3, cima, anchoDia - 6, altoDia, 18)
    ctx.fillStyle = css(COLUMNA)
    ctx.fill()
  }
  ctx.strokeStyle = css(LINEA)
  ctx.lineWidth = 1
  for (let h = 1; h < c.horas; h++) {
    const ly = Math.round(cima + h * ALTO_HORA) + 0.5
    for (let i = 0; i < DIAS.length; i++) {
      ctx.beginPath()
      ctx.moveTo(izq + anchoDia * i + 3, ly)
      ctx.lineTo(izq + anchoDia * (i + 1) - 3, ly)
      ctx.stroke()
    }
  }
  ctx.fillStyle = css(TENUE)
  letra(ctx, 600, 11.5, 0.2)
  for (let h = 0; h < c.horas; h++) {
    ctx.fillText(horaCorta(c.desde + h * 60), x + RELLENO, cima + h * ALTO_HORA + 15)
  }

  for (const s of c.clases) {
    const bx = izq + anchoDia * s.dia + 7
    const by = cima + (s.inicio - c.desde) * pxPorMinuto + 4
    const bw = anchoDia - 14
    const bh = (s.fin - s.inicio) * pxPorMinuto - 8
    const tono = mezclar(s.rgb, TINTA, 0.28)

    ctx.save()
    redondeado(ctx, bx, by, bw, bh, 14)
    ctx.fillStyle = css(mezclar(BLANCO, s.rgb, 0.17))
    ctx.fill()
    ctx.clip()
    ctx.fillStyle = css(s.rgb)
    ctx.fillRect(bx, by, 4, bh)

    const tx = bx + 14
    const interior = bw - 22
    ctx.fillStyle = css(tono)
    letra(ctx, 700, 11.5, 0.2)
    ctx.fillText(tramoCorto(s.inicio, s.fin), tx, by + 21)

    const conAula = s.aula && bh >= 100
    const caben = Math.max(1, Math.floor((bh - 32 - (conAula ? 24 : 6)) / 17))
    ctx.fillStyle = css(TINTA)
    letra(ctx, 650, 13.5, -0.1)
    partirEnLineas(ctx, s.nombre, interior, caben).forEach((l, i) => {
      ctx.fillText(l, tx, by + 41 + i * 17)
    })

    if (conAula) {
      dibujarIcono(ctx, ICONO.lugar, tx, by + bh - 23, 12, css(SUAVE))
      ctx.fillStyle = css(SUAVE)
      letra(ctx, 500, 11.5)
      ctx.fillText(partirEnLineas(ctx, s.aula, interior - 18, 1)[0], tx + 17, by + bh - 13)
    }
    ctx.restore()
  }
  return alto
}

/** Las tarjetas de las materias, de dos en dos. Devuelve su alto. */
function dibujarMaterias(ctx, c, y) {
  const x = MARGEN
  ctx.fillStyle = css(TINTA)
  letra(ctx, 800, 24, -0.6)
  ctx.fillText('Materias', x + 4, y + 26)

  let fy = y + 46
  for (const { par, alto } of filasDeMaterias(c.materias)) {
    par.forEach((m, i) => {
      const mx = x + i * (c.anchoTarjeta + 16)
      tarjeta(ctx, mx, fy, c.anchoTarjeta, alto, 24)
      const izq = mx + 22
      let my = fy + 22

      // Cabecera: el color de la materia, su codigo y sus UC
      redondeado(ctx, izq, my + 3, 12, 12, 4)
      ctx.fillStyle = css(m.color)
      ctx.fill()
      ctx.fillStyle = css(TENUE)
      letra(ctx, 600, 12.5, 0.8)
      ctx.fillText(m.codigo, izq + 20, my + 14)
      if (m.uc != null) {
        letra(ctx, 700, 12, 0.3)
        const texto = `${m.uc} UC`
        const w = ctx.measureText(texto).width + 20
        redondeado(ctx, mx + c.anchoTarjeta - 22 - w, my - 3, w, 24, 12)
        ctx.fillStyle = css(mezclar(BLANCO, m.color, 0.15))
        ctx.fill()
        ctx.fillStyle = css(mezclar(m.color, TINTA, 0.3))
        ctx.fillText(texto, mx + c.anchoTarjeta - 22 - w + 10, my + 13)
      }
      my += 18 + 10

      ctx.fillStyle = css(TINTA)
      letra(ctx, 700, 18, -0.2)
      for (const l of m.titulo) {
        my += 23
        ctx.fillText(l, izq, my - 5)
      }
      my += 14

      letra(ctx, 500, 13.5)
      for (const { icono, texto } of m.datos) {
        dibujarIcono(ctx, icono, izq, my + 3, 15, css(TENUE))
        ctx.fillStyle = css(SUAVE)
        ctx.fillText(texto, izq + 24, my + 15)
        my += 24
      }
    })
    fy += alto + 16
  }
  return fy - 16 - y
}

function dibujarPie(ctx, y) {
  ctx.textAlign = 'center'
  const centro = ANCHO / 2
  letra(ctx, 600, 13.5, 0)
  const texto = 'Hecho con Mapa de Pensum  ·  mapa-pensum.vercel.app'
  const w = ctx.measureText(texto).width
  dibujarLogo(ctx, centro - w / 2 - 26, y + 14, 18, css(SUAVE))
  ctx.fillStyle = css(SUAVE)
  ctx.fillText(texto, centro + 13, y + 28)
  ctx.fillStyle = css(TENUE)
  letra(ctx, 500, 12, 0)
  ctx.fillText('Confirma horas, sección y aula con tu coordinación antes de inscribir.', centro, y + 50)
  ctx.textAlign = 'left'
}

/** Dibuja el cartel y devuelve el PNG como Blob */
async function dibujarHorario(datos) {
  await cargarLetra([500, 600, 650, 700, 800])
  const c = prepararCartel(datos, document.createElement('canvas').getContext('2d'))

  const altoSemana = RELLENO * 2 + ALTO_DIAS + c.horas * ALTO_HORA
  const altoMaterias =
    46 + filasDeMaterias(c.materias).reduce((suma, f) => suma + f.alto + 16, 0) - 16
  const alto =
    MARGEN + ALTO_PORTADA + HUECO + altoSemana + HUECO * 2 + altoMaterias + HUECO + ALTO_PIE + MARGEN

  const lienzo = document.createElement('canvas')
  lienzo.width = ANCHO * ESCALA
  lienzo.height = alto * ESCALA
  const ctx = lienzo.getContext('2d')
  ctx.scale(ESCALA, ESCALA)
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = css(FONDO)
  ctx.fillRect(0, 0, ANCHO, alto)

  let y = MARGEN
  dibujarPortada(ctx, c, y)
  y += ALTO_PORTADA + HUECO
  y += dibujarSemana(ctx, c, y) + HUECO * 2
  y += dibujarMaterias(ctx, c, y) + HUECO
  dibujarPie(ctx, y)

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
