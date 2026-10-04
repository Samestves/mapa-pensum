/* El lado del navegador de la lectura de horarios: reducir la imagen, leerla
   aqui mismo si se puede y, si no, preguntarle a la IA. La clave no esta aqui
   ni puede estarlo -Vite sustituye las VITE_* dentro del bundle, o sea a la
   vista de cualquiera-, asi que quien habla con Google es api/leer-horario.js,
   en el servidor. */

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

/* Las averias de la IA -un modelo jubilado, una clave sin permiso- se dicen
   igual todas. A quien quiere su horario le da lo mismo cual sea, y lo unico
   que tiene que saber es que no es por su foto. Cual fue queda en la consola
   y en el registro del servidor, para quien lo arregla. */
const AVERIA = {
  titulo: 'La IA está fuera de servicio',
  consejo: 'No es por tu imagen. Mientras vuelve, puedes armar el horario a mano.',
  salida: SALIDA.A_MANO,
}

/**
 * Cada fallo, en cristiano: que paso, que hacer y con que salida. La vista
 * los enseña tal cual.
 *
 * `aplazado` marca los que no son un error sino un "todavia no": la IA
 * vuelve sola, mañana o dentro de una hora. Se dibujan con el reloj de arena
 * y no con el aviso.
 */
const FALLOS = {
  /* Cola y cuota son cosas distintas y hay que decirlo: la primera se pasa
     en segundos -la IA atiende unas veinte lecturas por minuto, o Google
     esta lleno un momento- y la segunda mañana. Con el mismo mensaje nadie
     sabe si quedarse mirando la pantalla. */
  cola: {
    titulo: 'Sigue habiendo cola',
    consejo: 'Lo intenté varias veces y la IA no tuvo sitio. Tu imagen sigue aquí.',
    salida: SALIDA.REINTENTAR,
  },
  cuota: {
    titulo: 'La IA vuelve mañana',
    consejo: 'Hoy ya leyó todos los horarios que permite. Tu horario no se ha tocado.',
    salida: SALIDA.A_MANO,
    aplazado: true,
  },
  muchas: {
    titulo: 'Muchas lecturas seguidas',
    consejo: 'La IA te deja volver dentro de una hora. Mientras, puedes armarlo a mano.',
    salida: SALIDA.A_MANO,
    aplazado: true,
  },
  red: {
    titulo: 'Sin conexión',
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
    titulo: 'La IA no está aquí',
    consejo: 'En desarrollo local hace falta arrancar con "vercel dev".',
    salida: SALIDA.A_MANO,
  },

  /* Los del lector del aparato. Solo se ven si la IA tampoco pudo, y por eso
     no hablan de ella: lo que dicen es lo que el estudiante puede arreglar. */
  'ocr-red': {
    titulo: 'No se pudo bajar el lector',
    consejo: 'La primera vez hace falta conexión; después lee sin internet. Tu imagen sigue aquí.',
    salida: SALIDA.REINTENTAR,
  },
  'ocr-lento': {
    titulo: 'La lectura se hizo muy larga',
    consejo: 'Cierra otras aplicaciones y vuelve a intentarlo: la segunda vez va más rápido.',
    salida: SALIDA.REINTENTAR,
  },
  'ocr-fallo': {
    titulo: 'Este navegador no pudo leerla',
    consejo: 'Prueba desde Chrome actualizado, o arma el horario a mano.',
    salida: SALIDA.A_MANO,
  },
  /* El lector del aparato leyo, pero no lo que esperaba */
  formato: {
    titulo: 'No reconocí tu horario',
    consejo:
      'Sin la IA solo leo la captura del sistema de la UDO: la tabla con los días a la izquierda y las horas arriba.',
    salida: SALIDA.OTRA_IMAGEN,
  },
  'sin-codigos': {
    titulo: 'No pude leer los códigos',
    consejo:
      'Encontré la tabla, pero no los códigos de las materias. Prueba con una captura más nítida y sin recortar.',
    salida: SALIDA.OTRA_IMAGEN,
  },
}

/** Un error con codigo, para que la vista decida sin leer mensajes. */
export class FalloLectura extends Error {
  /**
   * @param {string} codigo
   * @param {object} [extra]
   * @param {string} [extra.tecnico]  lo que dijo el servidor, para quien lo arregla
   * @param {number} [extra.espera]   segundos tras los que merece la pena volver
   * @param {string} [extra.nota]     una linea aparte sobre la IA, cuando el
   *   fallo es del aparato pero la IA tampoco estaba (ver falloDeLosDos)
   */
  constructor(codigo, { tecnico, espera, nota } = {}) {
    const { titulo, consejo, salida, aplazado = false } = FALLOS[codigo] ?? AVERIA
    super(titulo)
    this.codigo = codigo
    this.titulo = titulo
    this.consejo = consejo
    this.salida = salida
    this.aplazado = aplazado
    this.tecnico = tecnico
    this.espera = espera
    this.nota = nota
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

/* ---- En el aparato -------------------------------------------------------- */

/* Lo ya leido en el aparato, por archivo. Reintentar vuelve a pasar por aqui
   con la misma imagen, y releerla serian varios segundos para llegar al mismo
   sitio. Solo se guarda lo que se leyo: un fallo -sin red para bajar el
   lector- puede no repetirse a la segunda. */
const YA_LEIDAS = new WeakMap()

/* Tesseract cuenta su avance decenas de veces por segundo, y cada aviso
   repinta la hoja. Pasa siempre el primero de cada paso y, dentro de un paso,
   unos pocos por segundo: un telefono modesto tiene mejores cosas que hacer
   mientras lee que repintar una barra. */
const RITMO_MS = 150

function aRitmo(alAvance) {
  let paso = null
  let cuando = 0
  return (avance) => {
    const ahora = performance.now()
    if (avance.paso === paso && ahora - cuando < RITMO_MS) return
    paso = avance.paso
    cuando = ahora
    alAvance(avance)
  }
}

/**
 * Empieza a bajar el lector del aparato antes de que haga falta.
 *
 * Se llama al tocar "Subir una foto": mientras se busca la captura en la
 * galeria, que son unos segundos, el lector ya va llegando. Con el ahorro de
 * datos activado no se adelanta nada; se bajara al leer, si hace falta.
 */
export function precalentarLector() {
  if (navigator.connection?.saveData) return
  import('./lectorLocal.js').then((lector) => lector.precargar()).catch(() => {})
}

/**
 * Lee el horario en el propio aparato: sin servidor, sin cupo y sin que la
 * imagen salga de el.
 *
 * Solo entiende la captura del sistema de la universidad. Devuelve las mismas
 * filas que la IA y, al lado, sus `dudas` (ver valorDe).
 *
 * Revienta con un FalloLectura 'ocr-*' si no puede, y con un AbortError si se
 * corta con `senal`. Por donde va lo cuenta con `alAvance` (ver
 * leerEnElAparato en lectorLocal.js).
 *
 * @param {object} p
 * @param {Blob} p.archivo  la imagen original, no la preparada para subir
 * @param {{codigo: string}[]} p.materias  el pensum abierto
 * @param {AbortSignal} p.senal
 * @param {(avance: object) => void} [p.alAvance]
 * @returns {Promise<{clases: object[], dudas: string[]}>}
 */
export async function leerHorarioEnElAparato({ archivo, materias, senal, alAvance = () => {} }) {
  if (YA_LEIDAS.has(archivo)) return YA_LEIDAS.get(archivo)

  /* El lector entero -tesseract y lo suyo- vive en un trozo aparte que solo
     se pide aqui y al ir a subir una foto: quien no sube ninguna no se lo
     baja nunca. */
  let lector
  try {
    lector = await import('./lectorLocal.js')
  } catch (error) {
    throw new FalloLectura('ocr-red', { tecnico: String(error?.message ?? error) })
  }

  try {
    const leido = await lector.leerEnElAparato(archivo, {
      codigos: new Set(materias.map((m) => m.codigo)),
      senal,
      alAvance: aRitmo(alAvance),
    })
    YA_LEIDAS.set(archivo, leido)
    return leido
  } catch (error) {
    if (error?.name === 'AbortError' || error instanceof FalloLectura) throw error
    throw new FalloLectura('ocr-fallo', { tecnico: String(error?.message ?? error) })
  }
}

/** Lo que vale una lectura del aparato (ver valorDe) */
export const VALOR = {
  /* Se reconocio la rejilla y cada bloque salio con su codigo, su dia y sus
     horas: se revisa tal cual, y la IA no añadiria nada */
  LISTO: 'listo',
  /* Hay clases, pero tambien dudas: es un borrador. Se le pregunta a la IA
     una vez y, si no puede, se revisa el borrador, que la revision marca lo
     que falta y se arregla en dos toques. */
  BORRADOR: 'borrador',
  /* No hay nada que revisar: o no se pudo leer, o no es la captura del
     sistema. Solo queda la IA. */
  NADA: 'nada',
}

/** @param {{clases: object[], dudas: string[]}} [leido] */
export function valorDe(leido) {
  if (!leido?.clases.length) return VALOR.NADA
  return leido.dudas.length ? VALOR.BORRADOR : VALOR.LISTO
}

/* Lo que se dice de la IA cuando el fallo que se enseña es el del aparato */
const NOTA_DE_LA_IA = {
  cuota: 'La IA ya leyó hoy todos los horarios que permite.',
  muchas: 'La IA te deja volver dentro de una hora.',
}
const LA_IA_NO_ESTA = 'La IA no está disponible ahora.'

/**
 * El fallo que se enseña cuando no pudieron ni el aparato ni la IA.
 *
 * Si lo de la IA se arregla ahora mismo -reintentando, con otra imagen-, o si
 * leyo y no vio clases, manda la IA: eso es lo que hay que hacer. Pero si la
 * IA no esta -se acabo el cupo del dia, una averia-, decir solo eso no le
 * sirve a nadie: lo que el estudiante puede arreglar es lo que le paso al
 * aparato, y lo de la IA va en una nota aparte.
 *
 * @param {{leido?: {dudas: string[]}, fallo?: FalloLectura}} local
 *   lo que salio del aparato: lo leido, sin clases, o por que no leyo
 * @param {FalloLectura} ia
 */
export function falloDeLosDos(local, ia) {
  if (ia.salida !== SALIDA.A_MANO) return ia
  const codigo =
    local.fallo?.codigo ?? (local.leido?.dudas.includes('sin-clases') ? 'sin-codigos' : 'formato')
  return new FalloLectura(codigo, {
    tecnico: local.fallo?.tecnico,
    nota: NOTA_DE_LA_IA[ia.codigo] ?? LA_IA_NO_ESTA,
  })
}
