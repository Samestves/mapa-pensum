/* El lado del navegador de la lectura de horarios: reducir la imagen, leerla
   aqui mismo si se puede y, si no, preguntar. La clave no esta aqui ni puede
   estarlo -Vite sustituye las VITE_* dentro del bundle, o sea a la vista de
   cualquiera-, asi que quien habla con Google es api/leer-horario.js, en el
   servidor. */

/* Lado largo maximo al que se reduce antes de subir.

   No es solo por el peso. Una foto de movil son 4000 px de ancho y el modelo
   no lee mejor por eso: el texto de un horario impreso se resuelve de sobra a
   1600, y lo que se gana es que la subida tarde un segundo y no quince con
   datos moviles, que es donde va a pasar casi siempre. */
const LADO_MAXIMO = 1600
const CALIDAD = 0.85

/* Se sube siempre como JPEG, sea lo que sea que entre. Un PNG de captura de
   pantalla pesa tres o cuatro veces mas que su JPEG y no aporta nada aqui:
   no hay transparencia que conservar y el modelo no ve la diferencia. */
const TIPO_SUBIDA = 'image/jpeg'

const TAMANO_MAXIMO = 12 * 1024 * 1024

/* Lo que el selector de archivos deja elegir. Sin esto, en el telefono se
   abre el explorador entero y hay que ir a buscar la foto entre los PDF.
   Lo piden dos pantallas -la bienvenida y el reintento de la revision- y
   estaba escrito en las dos: dos listas que se separan el dia que alguien
   añada un formato en una sola. */
export const FORMATOS = 'image/png,image/jpeg,image/webp,image/heic,image/heif'

/* Lo que se le ofrece a quien le fallo la lectura. Una salida por fallo: la
   que de verdad lo arregla. Ofrecer "prueba otra foto" ante un servicio lleno
   es mandar a buscar el problema donde no esta. */
export const SALIDA = {
  /* La misma imagen otra vez: el problema no es la foto y se pasa solo */
  REINTENTAR: 'reintentar',
  /* El problema es la foto */
  OTRA_IMAGEN: 'otra-imagen',
  /* No lo arregla el estudiante ni esperar un minuto: queda armarlo a mano */
  A_MANO: 'a-mano',
}

/* Las averias del lector -un modelo jubilado, una clave sin permiso- se dicen
   igual todas. A quien quiere su horario le da lo mismo cual sea, y lo unico
   que tiene que saber es que no es por su foto. Cual fue queda en la consola
   y en el registro del servidor, para quien lo arregla. */
const AVERIA = {
  titulo: 'El lector está fuera de servicio',
  consejo: 'No es por tu imagen. Mientras vuelve, puedes armar el horario a mano.',
  salida: SALIDA.A_MANO,
}

/**
 * Cada fallo, en cristiano: que paso, que hacer y con que salida. La vista
 * los enseña tal cual.
 *
 * `aplazado` marca los que no son un error sino un "todavia no": el lector
 * vuelve solo, mañana o dentro de una hora. Se dibujan con el reloj de arena
 * y no con el aviso.
 */
const FALLOS = {
  /* Cola y cuota son cosas distintas y hay que decirlo: la primera se pasa
     en segundos -el lector atiende unas veinte lecturas por minuto, o Google
     esta lleno un momento- y la segunda mañana. Con el mismo mensaje nadie
     sabe si quedarse mirando la pantalla. */
  cola: {
    titulo: 'Sigue habiendo cola',
    consejo: 'Lo intenté varias veces y no hubo sitio. Tu imagen sigue aquí.',
    salida: SALIDA.REINTENTAR,
  },
  cuota: {
    titulo: 'El lector vuelve mañana',
    consejo: 'Hoy ya se leyeron todos los horarios que permite. Tu horario no se ha tocado.',
    salida: SALIDA.A_MANO,
    aplazado: true,
  },
  muchas: {
    titulo: 'Muchas lecturas seguidas',
    consejo: 'El lector te deja volver dentro de una hora. Mientras, puedes armarlo a mano.',
    salida: SALIDA.A_MANO,
    aplazado: true,
  },
  red: {
    titulo: 'Sin conexión con el lector',
    consejo: 'Revisa tu conexión y vuelve a intentarlo. Tu imagen sigue aquí.',
    salida: SALIDA.REINTENTAR,
  },
  ia: {
    titulo: 'No pude con esta imagen',
    consejo: 'A veces sale a la segunda. Si no, prueba con una captura de pantalla.',
    salida: SALIDA.REINTENTAR,
  },
  vacia: {
    titulo: 'No encontré nada que leer',
    consejo: 'Vuelve a intentarlo, o prueba con una foto más nítida.',
    salida: SALIDA.REINTENTAR,
  },
  json: {
    titulo: 'La lectura llegó a medias',
    consejo: 'Vuelve a intentarlo: suele salir a la segunda.',
    salida: SALIDA.REINTENTAR,
  },

  /* Se leyo bien y no habia clases: casi siempre es la foto */
  'sin-clases': {
    titulo: 'No encontré clases ahí',
    consejo: 'Prueba con una captura de pantalla, o con una foto más recta y con buena luz.',
    salida: SALIDA.OTRA_IMAGEN,
  },
  'sin-imagen': {
    titulo: 'No llegó ninguna imagen',
    consejo: 'Elige la foto o la captura de tu horario.',
    salida: SALIDA.OTRA_IMAGEN,
  },
  'imagen-grande': {
    titulo: 'La imagen pesa demasiado',
    consejo: 'Prueba con una captura de pantalla.',
    salida: SALIDA.OTRA_IMAGEN,
  },
  tipo: {
    titulo: 'Ese formato no se puede leer',
    consejo: 'Usa JPG, PNG o una captura de pantalla.',
    salida: SALIDA.OTRA_IMAGEN,
  },
  'no-es-imagen': {
    titulo: 'Eso no es una imagen',
    consejo: 'Elige la foto o la captura de tu horario.',
    salida: SALIDA.OTRA_IMAGEN,
  },
  pesada: {
    titulo: 'La imagen pesa más de 12 MB',
    consejo: 'Prueba con una captura de pantalla.',
    salida: SALIDA.OTRA_IMAGEN,
  },
  'no-se-abre': {
    titulo: 'No se pudo abrir la imagen',
    consejo: 'Si viene de un iPhone, prueba con una captura de pantalla.',
    salida: SALIDA.OTRA_IMAGEN,
  },

  fuera: {
    titulo: 'Esta página se quedó vieja',
    consejo: 'Recárgala y vuelve a subir la imagen.',
    salida: SALIDA.A_MANO,
  },
  'sin-servidor': {
    titulo: 'El lector no está aquí',
    consejo: 'En desarrollo local hace falta arrancar con "vercel dev".',
    salida: SALIDA.A_MANO,
  },
}

/** Un error con codigo, para que la vista decida sin leer mensajes. */
export class FalloLectura extends Error {
  /**
   * @param {string} codigo
   * @param {object} [extra]
   * @param {string} [extra.tecnico]  lo que dijo el servidor, para quien lo arregla
   * @param {number} [extra.espera]   segundos tras los que merece la pena volver
   */
  constructor(codigo, { tecnico, espera } = {}) {
    const { titulo, consejo, salida, aplazado = false } = FALLOS[codigo] ?? AVERIA
    super(titulo)
    this.codigo = codigo
    this.titulo = titulo
    this.consejo = consejo
    this.salida = salida
    this.aplazado = aplazado
    this.tecnico = tecnico
    this.espera = espera
  }
}

/* Cualquier cosa que reviente, con la forma que la vista espera. Un error que
   no es de la lectura -un fallo nuestro- sale como averia y no con su mensaje
   de programa en la pantalla. */
export const comoFallo = (error) =>
  error instanceof FalloLectura
    ? error
    : new FalloLectura('desconocido', { tecnico: String(error?.message ?? error) })

const leerComo = (blob, metodo) =>
  new Promise((cumplir, fallar) => {
    const lector = new FileReader()
    lector.onload = () => cumplir(lector.result)
    lector.onerror = () => fallar(new FalloLectura('no-se-abre'))
    lector[metodo](blob)
  })

/**
 * Deja una imagen lista para subir: reducida, en JPEG y en base64.
 *
 * Devuelve tambien una URL para enseñarla mientras se revisa el resultado.
 * Esa parte no es adorno: revisar catorce filas de texto sin poder mirar la
 * foto al lado es revisar a ciegas, y entonces nadie revisa nada.
 *
 * Quien la reciba tiene que llamar a `soltar()` cuando termine. Una URL de
 * objeto se queda en memoria hasta que se revoca, y aqui son megas.
 */
export async function prepararImagen(archivo) {
  if (!archivo?.type?.startsWith('image/')) throw new FalloLectura('no-es-imagen')
  if (archivo.size > TAMANO_MAXIMO) throw new FalloLectura('pesada')

  let mapa
  try {
    mapa = await createImageBitmap(archivo)
  } catch {
    /* Casi siempre es un HEIC de iPhone, que Chrome y Firefox no decodifican.
       No hay forma de arreglarlo desde aqui, asi que se dice que hacer. */
    throw new FalloLectura('no-se-abre')
  }

  const escala = Math.min(1, LADO_MAXIMO / Math.max(mapa.width, mapa.height))
  const ancho = Math.round(mapa.width * escala)
  const alto = Math.round(mapa.height * escala)

  const lienzo = document.createElement('canvas')
  lienzo.width = ancho
  lienzo.height = alto
  const pincel = lienzo.getContext('2d')
  /* Fondo blanco antes de dibujar: si entra un PNG con transparencia, en
     JPEG lo transparente se vuelve negro y el texto negro sobre negro
     desaparece. */
  pincel.fillStyle = '#ffffff'
  pincel.fillRect(0, 0, ancho, alto)
  pincel.drawImage(mapa, 0, 0, ancho, alto)
  mapa.close?.()

  const blob = await new Promise((r) => lienzo.toBlob(r, TIPO_SUBIDA, CALIDAD))
  if (!blob) throw new FalloLectura('no-se-abre')

  const enTexto = await leerComo(blob, 'readAsDataURL')
  const vistaPrevia = URL.createObjectURL(blob)

  return {
    base64: String(enTexto).split(',')[1],
    tipo: TIPO_SUBIDA,
    vistaPrevia,
    peso: blob.size,
    ancho,
    alto,
    soltar: () => URL.revokeObjectURL(vistaPrevia),
  }
}

/**
 * Le pide al servidor que lea la imagen.
 *
 * Devuelve filas de texto crudo, no clases: lo que se entiende de esas filas
 * -que materia del pensum es, si la hora existe, si choca con otra- lo decide
 * layout/importarHorario.js aqui en el navegador. Esa separacion es la que
 * permite probar todas las reglas de esta aplicacion sin llamar a nadie.
 */
export async function leerHorarioDeImagen({ base64, tipo, materias, senal }) {
  let respuesta
  try {
    respuesta = await fetch('/api/leer-horario', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ imagen: base64, tipo, materias }),
      signal: senal,
    })
  } catch (e) {
    if (e?.name === 'AbortError') throw e
    throw new FalloLectura('red', { tecnico: String(e?.message ?? e) })
  }

  /* En `npm run dev` no hay funciones: Vite devuelve el index.html para
     cualquier ruta, asi que la respuesta llega con 200 y HTML dentro. Sin
     esta comprobacion el fallo saldria como "respuesta mal formada", que
     manda a buscar el problema al sitio equivocado. */
  const esJSON = respuesta.headers.get('content-type')?.includes('application/json')
  if (!esJSON) throw new FalloLectura('sin-servidor')

  const datos = await respuesta.json().catch(() => null)
  if (!respuesta.ok) {
    /* `espera` solo viene cuando el servidor sabe que el fallo se pasa solo
       -hay cola- y cuanto tarda. Es lo que le permite a
       la pantalla esperar y volver sin que nadie pulse nada. */
    throw new FalloLectura(datos?.error ?? 'desconocido', {
      tecnico: datos?.detalle,
      espera: Number.isFinite(datos?.espera) ? datos.espera : undefined,
    })
  }

  return datos?.clases ?? []
}

/* Lo que se espera al lector del aparato antes de darlo por perdido. La
   primera vez tiene que bajarse varios megas, y en un telefono viejo leer
   cuesta varios segundos; pero pasado este rato es mejor preguntarle al
   servidor que seguir con la pantalla de "leyendo" sin moverse. */
const TOPE_LOCAL_MS = 30000

/* Lo ya leido en el aparato, por archivo. Reintentar vuelve a pasar por aqui
   con la misma imagen, y releerla serian varios segundos para llegar al mismo
   sitio. Solo se guarda lo que salio bien: un fallo -sin red para bajar el
   lector- puede no repetirse a la segunda. */
const YA_LEIDAS = new WeakMap()

/**
 * Lee el horario en el propio aparato, sin servidor, sin cupo y sin que la
 * imagen salga de el.
 *
 * Solo entiende la captura del sistema de la universidad. Devuelve las mismas
 * filas que el servidor y, al lado, sus `dudas`: si no hay ninguna, la
 * lectura vale tal cual; si hay, es un borrador que solo sirve cuando el
 * servidor no contesta.
 *
 * Nunca revienta. Si el lector no carga -sin red, un navegador viejo- o
 * tarda demasiado, devuelve null y se sigue por el servidor como si esto no
 * existiera.
 *
 * @param {object} p
 * @param {Blob} p.archivo  la imagen original, no la preparada para subir
 * @param {{codigo: string}[]} p.materias  el pensum abierto
 * @param {AbortSignal} p.senal
 * @returns {Promise<{clases: object[], dudas: string[]}|null>}
 */
export async function leerHorarioEnElAparato({ archivo, materias, senal }) {
  if (YA_LEIDAS.has(archivo)) return YA_LEIDAS.get(archivo)

  const control = new AbortController()
  const cortar = () => control.abort()
  const reloj = setTimeout(cortar, TOPE_LOCAL_MS)
  senal.addEventListener('abort', cortar, { once: true })

  try {
    /* El lector entero -tesseract y lo suyo- vive en un trozo aparte que solo
       se pide aqui: quien no sube una foto no se lo baja nunca. */
    const { leerEnElAparato } = await import('./lectorLocal.js')
    const lectura = leerEnElAparato(archivo, {
      codigos: new Set(materias.map((m) => m.codigo)),
      senal: control.signal,
    })
    /* Cortar el trabajador a media lectura puede dejar su promesa sin
       resolver: se compite contra la señal para no quedarse esperandola. */
    const cortado = new Promise((_, fallar) =>
      control.signal.addEventListener('abort', () => fallar(new Error('cortado o sin tiempo')), {
        once: true,
      }),
    )
    const leido = await Promise.race([lectura, cortado])
    YA_LEIDAS.set(archivo, leido)
    return leido
  } catch (error) {
    if (!senal.aborted) {
      console.warn(
        `[lector] en el aparato no se pudo · ${error?.message ?? error ?? 'sin detalle'}`,
      )
    }
    return null
  } finally {
    clearTimeout(reloj)
    senal.removeEventListener('abort', cortar)
  }
}

/**
 * Si lo leido en el aparato se puede usar sin preguntarle al servidor: se
 * reconocio la rejilla y cada bloque salio con su codigo, su dia y sus horas.
 */
export const esFiable = (leido) => Boolean(leido?.clases.length) && leido.dudas.length === 0

/**
 * Si lo leido en el aparato, aun con dudas, es mejor que enseñar este fallo
 * del servidor. Casi siempre lo es: la revision marca lo que falta y se
 * arregla en dos toques, y un "vuelve mañana" no se arregla. La excepcion es
 * cuando el servidor SI leyo y no vio clases: ahi el borrador del aparato es
 * ruido de una imagen que no es un horario.
 */
export const valeElBorrador = (leido, fallo) =>
  Boolean(leido?.clases.length) && fallo.codigo !== 'sin-clases'
