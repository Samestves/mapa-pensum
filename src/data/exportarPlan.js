import { etiquetaSemestre } from '../layout/planificador.js'
import { colorArea } from '../theme/areas.js'
import { avanceDe, cuantoLlevas } from './avance.js'
import { textoCarga } from './cargaPlan.js'
import {
  ALTO_FIRMA,
  CLARO,
  baldosa,
  cargarLetra,
  css,
  dibujarFirma,
  dibujarIcono,
  letra,
  partirEnLineas,
  redondeado,
  resolverColores,
} from './lienzo.js'

const MESES_CORTOS = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
]

/** "Octubre de 2030" */
export const MES = (fecha) => {
  const texto = fecha?.toLocaleDateString('es-VE', { month: 'long', year: 'numeric' })
  return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : ''
}

/** "Oct 2030": la fecha de grado cuando va en grande y tiene que caber */
export const mesCorto = (fecha) => `${MESES_CORTOS[fecha.getMonth()]} ${fecha.getFullYear()}`

/* La imagen de la ruta: la que se manda por WhatsApp o se sube a un estado.

   No es la hoja del PDF en pequeño. La hoja es para tacharla semestre a
   semestre; la imagen es para contarlo, y quien la recibe pregunta dos
   cosas: cuando te graduas y que vas a ver ahora. Asi que arriba va la
   fecha en grande y cuanto llevas, y debajo el camino: del proximo
   semestre, cada materia con su nombre; del resto, una fila por semestre
   con sus materias mientras quepan.

   A lo ancho de un telefono, 400 puntos a 2,7 = 1080 pixeles, que es lo que
   mide un estado de WhatsApp. Crece con la ruta como mucho hasta la forma de
   una captura de pantalla, 1080 x 2400: una ruta mas larga recoge sus
   semestres antes que estirarse, porque una imagen mas alta ya no se ve
   entera en ningun sitio. Y en claro, como la del horario (ver CLARO). */

const ESCALA = 2.7
const ANCHO = 400
const MARGEN = 24
const ALTO_MINIMO = 500 // 4:5, lo mas apaisado que se ve bien en un chat
export const ALTO_MAXIMO = 888 // 9:20, una captura de pantalla

const LADO_BALDOSA = 44
const IZQ_TITULO = MARGEN + LADO_BALDOSA + 12
const ALTO_HEROE = 114
const ALTO_AVANCE = 30

/* La tarjeta del camino, por dentro */
const RELLENO = 18
const X_INTERIOR = MARGEN + RELLENO
const ANCHO_INTERIOR = ANCHO - 2 * X_INTERIOR
const X_VIA = X_INTERIOR + 11 // por donde baja la linea que une los semestres
const X_TEXTO = X_INTERIOR + 34
const DERECHA = ANCHO - X_INTERIOR
const ALTO_MATERIA = 20
const INTERLINEA_MATERIA = 17 // si el nombre no cabe en una linea, sigue en otra
const ALTO_CELDA = 26
const ALTO_GRADO = 40

/* Como se dibuja el resto de la ruta, del mas holgado al mas recogido (ver
   disponerRuta). Primero una fila por semestre con sus nombres, cada vez
   mas juntas: asi caben los diez semestres de un nuevo ingreso con la carga
   normal. Con una carga minima, que son decenas de semestres, ya no caben
   filas: los semestres se reparten en una rejilla, sin nombres. */
const FORMATOS = [
  { filas: 30 },
  { filas: 25 },
  { filas: 22 },
  { columnas: 2 },
  { columnas: 3 },
  { columnas: 4 },
  { columnas: 6 },
]

/* El birrete de Lucide, el mismo de la app */
const BIRRETE = [
  [
    'path',
    {
      d: 'M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z',
    },
  ],
  ['path', { d: 'M22 10v6' }],
  ['path', { d: 'M6 12.5V16a6 3 0 0 0 12 0v-3.5' }],
]

/** Donde va cada cosa con un formato dado, de arriba abajo. */
function disponer([proximo, ...resto], formato, { lineasCabecera = 1, lineasProximo = [] }) {
  let y = MARGEN
  y += Math.max(LADO_BALDOSA, 42 + 14 * (lineasCabecera - 1)) + 28
  const heroe = y
  y += ALTO_HEROE + 22
  const avance = y
  y += ALTO_AVANCE + 20

  const tarjeta = { y }
  y += RELLENO
  const cabezaProximo = y + 11
  y += 30
  const materias = proximo.materias.map((_, i) => {
    const centro = y + ALTO_MATERIA / 2
    y += ALTO_MATERIA + INTERLINEA_MATERIA * ((lineasProximo[i] ?? 1) - 1)
    return centro
  })
  y += 6

  let filas
  const { columnas } = formato
  if (columnas) {
    const ancho = ANCHO_INTERIOR / columnas
    y += 4
    filas = resto.map((semestre, i) => ({
      semestre,
      x: X_INTERIOR + (i % columnas) * ancho,
      y: y + ALTO_CELDA * (Math.floor(i / columnas) + 0.5),
      ancho,
    }))
    y += ALTO_CELDA * Math.ceil(resto.length / columnas) + 4
  } else {
    filas = resto.map((semestre, i) => ({
      semestre,
      x: X_INTERIOR,
      y: y + formato.filas * (i + 0.5),
      ancho: ANCHO_INTERIOR,
    }))
    y += formato.filas * resto.length
  }

  const meta = y + ALTO_GRADO / 2
  y += ALTO_GRADO + RELLENO - 6
  tarjeta.alto = y - tarjeta.y

  // La firma va siempre abajo del todo: si sobra sitio, sobra antes de ella
  const alto = Math.max(ALTO_MINIMO, y + 26 + ALTO_FIRMA + MARGEN)
  const firma = alto - MARGEN - ALTO_FIRMA
  return { formato, alto, heroe, avance, tarjeta, cabezaProximo, materias, filas, meta, firma }
}

/* Cuanto se puede reducir el dibujo entero para no perder los nombres de los
   semestres. Un 10 % no se nota; los nombres que se pierden, si. */
export const ENCOGER_MINIMO = 0.9

/**
 * Como se reparte la ruta en la imagen, en este orden:
 *
 *   1. Las filas con nombres mas holgadas que quepan en el alto maximo.
 *   2. Si no cabe ninguna por poco, las mas juntas, encogiendo el dibujo
 *      hasta un 10 %: mejor una letra un pelo mas pequeña que sin nombres.
 *   3. La primera rejilla que quepa.
 *   4. Y si ni eso, la rejilla mas recogida, encogida lo que haga falta.
 *
 * `encoger` dice cuanto se reduce el dibujo para que la imagen no pase del
 * alto maximo: sale con mas margen a los lados, nunca mas alta.
 *
 * `medidas` dice cuantas lineas ocupan los textos que pueden partirse -de
 * quien es la ruta y cada materia del proximo semestre-, que solo se saben
 * midiendo con la letra. Necesita al menos un semestre por delante: con el
 * pensum terminado no hay ruta que compartir.
 */
export function disponerRuta(semestres, medidas = {}) {
  const pruebas = FORMATOS.map((f) => disponer(semestres, f, medidas))
  const cabe = (d, encoger = 1) => d.alto * encoger <= ALTO_MAXIMO
  const filas = pruebas.filter((d) => d.formato.filas)
  const rejillas = pruebas.filter((d) => d.formato.columnas)
  const masJuntas = filas.at(-1)
  const elegida =
    filas.find((d) => cabe(d)) ??
    (cabe(masJuntas, ENCOGER_MINIMO) ? masJuntas : null) ??
    rejillas.find((d) => cabe(d)) ??
    rejillas.at(-1)
  return { ...elegida, encoger: Math.min(1, ALTO_MAXIMO / elegida.alto) }
}

/** Un punto del color de su area por materia, en fila desde x */
function puntos(ctx, materias, x, y, radio, paso, color) {
  materias.forEach((a, i) => {
    ctx.fillStyle = css(color.get(a.codigo))
    ctx.beginPath()
    ctx.arc(x + radio + i * paso, y, radio, 0, Math.PI * 2)
    ctx.fill()
  })
}

/** El numero de un semestre en su circulo, sobre la linea del camino */
function hito(ctx, x, y, radio, numero, lleno) {
  ctx.beginPath()
  ctx.arc(x, y, radio, 0, Math.PI * 2)
  ctx.fillStyle = lleno ? CLARO.tinta : CLARO.papel
  ctx.fill()
  if (!lleno) {
    ctx.strokeStyle = CLARO.marco
    ctx.lineWidth = 1.5
    ctx.stroke()
  }
  ctx.fillStyle = lleno ? CLARO.papel : CLARO.suave
  letra(ctx, 650, radio * 1.05)
  ctx.textAlign = 'center'
  ctx.fillText(String(numero), x, y + radio * 0.38)
  ctx.textAlign = 'left'
}

function dibujarCabecera(ctx, lineas) {
  baldosa(ctx, MARGEN, MARGEN, LADO_BALDOSA, true)
  ctx.fillStyle = CLARO.tinta
  letra(ctx, 700, 20, -0.6)
  ctx.fillText('Mi ruta al grado', IZQ_TITULO, MARGEN + 19)
  ctx.fillStyle = CLARO.suave
  letra(ctx, 450, 11.5)
  lineas.forEach((linea, i) => ctx.fillText(linea, IZQ_TITULO, MARGEN + 37 + i * 14))
}

/** Lo que se pregunta primero: cuando. */
function dibujarHeroe(ctx, y, { grado, semestres, carga }) {
  ctx.textAlign = 'center'
  ctx.fillStyle = CLARO.suave
  letra(ctx, 500, 13.5)
  ctx.fillText('Me gradúo hacia', ANCHO / 2, y + 13)
  ctx.fillStyle = CLARO.tinta
  letra(ctx, 250, 68, -3)
  ctx.fillText(mesCorto(grado), ANCHO / 2, y + 83)
  ctx.fillStyle = CLARO.tenue
  letra(ctx, 450, 12.5)
  ctx.fillText(
    `${semestres} ${semestres === 1 ? 'semestre' : 'semestres'} · ${textoCarga(carga)} por semestre`,
    ANCHO / 2,
    y + 108,
  )
  ctx.textAlign = 'left'
}

/** Y despues: cuanto llevas. */
function dibujarAvance(ctx, y, progreso, verde) {
  const avance = avanceDe(progreso)
  const ancho = ANCHO - 2 * MARGEN
  redondeado(ctx, MARGEN, y, ancho, 6, 3)
  ctx.fillStyle = CLARO.linea
  ctx.fill()
  if (avance > 0) {
    redondeado(ctx, MARGEN, y, Math.max(6, (ancho * avance) / 100), 6, 3)
    ctx.fillStyle = css(verde)
    ctx.fill()
  }

  ctx.fillStyle = CLARO.tinta
  letra(ctx, 600, 12.5)
  ctx.fillText(avance > 0 ? `Llevo ${Math.round(avance)} %` : 'Recién empiezo', MARGEN, y + 26)
  ctx.fillStyle = CLARO.tenue
  letra(ctx, 450, 12)
  ctx.textAlign = 'right'
  ctx.fillText(cuantoLlevas(progreso), ANCHO - MARGEN, y + 26)
  ctx.textAlign = 'left'
}

/* Una materia del proximo semestre, en dos lineas como mucho: son los
   nombres que mas se leen, y cortarlos a media palabra es perderlos. */
const nombreEnLineas = (ctx, nombre) => partirEnLineas(ctx, nombre, DERECHA - X_TEXTO - 14, 2)

/** El camino: el proximo semestre entero, el resto en filas y el grado al final. */
function dibujarCamino(ctx, d, { proximo, grado, verde, color, conAreas }) {
  const { tarjeta, formato } = d
  // La sombra se mide en pixeles del archivo: va por la densidad del dibujo
  const densidad = ctx.getTransform().a
  ctx.save()
  ctx.shadowColor = 'rgb(16 24 40 / 0.06)'
  ctx.shadowBlur = 24 * densidad
  ctx.shadowOffsetY = 6 * densidad
  redondeado(ctx, MARGEN, tarjeta.y, ANCHO - 2 * MARGEN, tarjeta.alto, 20)
  ctx.fillStyle = CLARO.papel
  ctx.fill()
  ctx.restore()
  redondeado(ctx, MARGEN + 0.5, tarjeta.y + 0.5, ANCHO - 2 * MARGEN - 1, tarjeta.alto - 1, 20)
  ctx.strokeStyle = CLARO.marco
  ctx.lineWidth = 1
  ctx.stroke()

  /* La via que une los semestres hasta el grado. En la rejilla solo baja
     por el proximo semestre: ahi los demas van en columnas y una linea recta
     no los uniria. */
  ctx.strokeStyle = CLARO.linea
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(X_VIA, d.cabezaProximo)
  ctx.lineTo(X_VIA, formato.columnas ? d.materias.at(-1) : d.meta)
  ctx.stroke()

  // El proximo semestre, con sus materias por nombre
  hito(ctx, X_VIA, d.cabezaProximo, 11, 1, true)
  ctx.fillStyle = CLARO.tinta
  letra(ctx, 650, 14.5, -0.1)
  ctx.fillText(etiquetaSemestre(1), X_TEXTO, d.cabezaProximo + 5)
  ctx.fillStyle = CLARO.tenue
  letra(ctx, 450, 11.5)
  ctx.textAlign = 'right'
  const n = proximo.materias.length
  ctx.fillText(
    `${n} ${n === 1 ? 'materia' : 'materias'} · ${proximo.uc} UC`,
    DERECHA,
    d.cabezaProximo + 4.5,
  )
  ctx.textAlign = 'left'

  proximo.materias.forEach((a, i) => {
    const y = d.materias[i]
    ctx.fillStyle = css(color.get(a.codigo))
    ctx.beginPath()
    ctx.arc(X_TEXTO + 3, y, 3, 0, Math.PI * 2)
    ctx.fill()
    // Las casillas sin cuota son un hueco a elegir, no una materia: van en gris
    ctx.fillStyle = a.uc == null ? CLARO.suave : CLARO.tinta
    letra(ctx, 450, 13.5)
    nombreEnLineas(ctx, a.nombre).forEach((linea, k) => {
      ctx.fillText(linea, X_TEXTO + 14, y + 4.7 + k * INTERLINEA_MATERIA)
    })
  })

  /* El resto: cada semestre en su fila, o en su celda si van en rejilla. En
     las filas, un punto por materia con el color de su area y despues los
     nombres, que empiezan todos a la misma altura -tras los puntos del
     semestre que mas materias tiene- para que se lean en columna. En las
     carreras sin areas los puntos serian todos grises y no dirian nada: ahi
     las filas van solo con nombres, que ademas caben mas. */
  const masPuntos = Math.max(0, ...d.filas.map((f) => f.semestre.materias.length))
  const xNombres = conAreas ? X_TEXTO + masPuntos * 8 + 8 : X_TEXTO
  const holgada = formato.filas >= 30
  for (const { semestre, x, y, ancho } of d.filas) {
    if (formato.columnas) {
      hito(ctx, x + 9, y, 9, semestre.numero, false)
      const caben = Math.floor((ancho - 30) / 7)
      puntos(ctx, semestre.materias.slice(0, caben), x + 24, y, 2.5, 7, color)
      continue
    }
    hito(ctx, X_VIA, y, holgada ? 10 : 9, semestre.numero, false)
    if (conAreas) puntos(ctx, semestre.materias, X_TEXTO, y, 2.75, 8, color)
    ctx.fillStyle = CLARO.suave
    letra(ctx, 450, holgada ? 12.5 : 12)
    const texto = semestre.materias.map((a) => a.nombre).join(', ')
    ctx.fillText(partirEnLineas(ctx, texto, DERECHA - xNombres, 1)[0], xNombres, y + 4.3)
  }

  // Y la meta
  ctx.beginPath()
  ctx.arc(X_VIA, d.meta, 12, 0, Math.PI * 2)
  ctx.fillStyle = css(verde, 0.12)
  ctx.fill()
  dibujarIcono(ctx, BIRRETE, X_VIA - 7.5, d.meta - 7.5, 15, css(verde))
  ctx.fillStyle = css(verde)
  letra(ctx, 650, 14.5, -0.1)
  ctx.fillText(`Grado hacia ${MES(grado).toLowerCase()}`, X_TEXTO, d.meta + 5)
}

async function dibujarRuta({ carrera, nombre, progreso, plan, carga, grado }) {
  await cargarLetra([250, 450, 500, 600, 650, 700])
  const todas = plan.semestres.flatMap((s) => s.materias)
  const [verde, ...colores] = resolverColores([
    'var(--estado-aprobada)',
    ...todas.map((a) => colorArea(a.area)),
  ])
  const color = new Map(todas.map((a, i) => [a.codigo, colores[i]]))

  const lienzo = document.createElement('canvas')
  const ctx = lienzo.getContext('2d')
  /* De quien es, en dos lineas como mucho: hay carreras de nombre muy largo.
     Cada separador va pegado a lo que tiene delante, y "UDO Monagas" no se
     parte: asi una linea nunca empieza por un punto ni deja el nucleo a
     medias. */
  letra(ctx, 450, 11.5)
  const lineas = partirEnLineas(
    ctx,
    [nombre.trim(), carrera.nombre, 'UDO\u00a0Monagas'].filter(Boolean).join('\u00a0· '),
    ANCHO - MARGEN - IZQ_TITULO,
    2,
  )
  letra(ctx, 450, 13.5)
  const d = disponerRuta(plan.semestres, {
    lineasCabecera: lineas.length,
    lineasProximo: plan.semestres[0].materias.map((a) => nombreEnLineas(ctx, a.nombre).length),
  })

  /* Cambiar el tamaño del lienzo lo deja en blanco, escala incluida. Si hay
     que encoger, el dibujo se centra a lo ancho y el fondo llega igual a
     los bordes. */
  const { encoger } = d
  lienzo.width = Math.round(ANCHO * ESCALA)
  lienzo.height = Math.round(d.alto * encoger * ESCALA)
  ctx.fillStyle = CLARO.fondo
  ctx.fillRect(0, 0, lienzo.width, lienzo.height)
  ctx.scale(ESCALA * encoger, ESCALA * encoger)
  ctx.translate((ANCHO / encoger - ANCHO) / 2, 0)
  ctx.textBaseline = 'alphabetic'

  dibujarCabecera(ctx, lineas)
  dibujarHeroe(ctx, d.heroe, { grado, semestres: plan.semestres.length, carga })
  dibujarAvance(ctx, d.avance, progreso, verde)
  dibujarCamino(ctx, d, {
    proximo: plan.semestres[0],
    grado,
    verde,
    color,
    conAreas: carrera.tieneAreas,
  })
  dibujarFirma(
    ctx,
    ANCHO / 2,
    d.firma + 4,
    'Fecha estimada: seis meses por semestre.',
    ANCHO - 2 * MARGEN,
  )

  return new Promise((resolver) => lienzo.toBlob(resolver, 'image/png'))
}

/* La ultima imagen hecha, por plan: compartir dos veces seguidas no la
   vuelve a dibujar. Mover la carga o marcar una materia rehace el plan, y
   con el la imagen. */
const hechas = new WeakMap()

/** La imagen de la ruta como archivo PNG, lista para compartir o bajar */
export function imagenDeLaRuta(datos) {
  const previa = hechas.get(datos.plan)
  if (previa?.nombre === datos.nombre) return previa.archivo

  const archivo = dibujarRuta(datos).then(
    (blob) => new File([blob], `ruta-${datos.carrera.slug}.png`, { type: 'image/png' }),
  )
  hechas.set(datos.plan, { nombre: datos.nombre, archivo })
  return archivo
}

/** Lo que acompaña a la imagen al compartirla: lo que diria uno al mandarla */
export const mensajeDeLaRuta = (grado) => ({
  titulo: 'Mi ruta al grado',
  texto: `Me gradúo hacia ${MES(grado).toLowerCase()} 🎓 Arma tu ruta en https://mapa-pensum.vercel.app`,
})
