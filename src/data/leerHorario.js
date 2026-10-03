/* El lado del navegador de la lectura de horarios: reducir la imagen y
   preguntar. La clave no esta aqui ni puede estarlo -Vite sustituye las
   VITE_* dentro del bundle, o sea a la vista de cualquiera-, asi que quien
   habla con Google es api/leer-horario.js, en el servidor. */

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
   que tiene que saber es que no es por su foto. El detalle de cual fue queda
   en la consola y en el registro del servidor, para quien lo arregla. */
const AVERIA = {
  mensaje: 'El lector está fuera de servicio. No es por tu imagen.',
  salida: SALIDA.A_MANO,
}

/** Cada fallo, en cristiano y con su salida. La vista los enseña tal cual. */
const FALLOS = {
  /* Cola y cuota son cosas distintas y hay que decirlo: la primera se pasa
     en segundos -el lector atiende unas veinte lecturas por minuto, o Google
     esta lleno un momento- y la segunda mañana. Con el mismo mensaje nadie
     sabe si quedarse mirando la pantalla. */
  cola: { mensaje: 'Hay mucha gente leyendo su horario ahora mismo.', salida: SALIDA.REINTENTAR },
  cuota: {
    mensaje: 'Hoy ya se leyeron todos los horarios que el lector permite. Mañana vuelve.',
    salida: SALIDA.A_MANO,
  },
  muchas: {
    mensaje: 'Has leído muchas imágenes seguidas. El lector te deja volver en una hora.',
    salida: SALIDA.A_MANO,
  },
  red: {
    mensaje: 'No se pudo conectar con el lector. Revisa tu conexión.',
    salida: SALIDA.REINTENTAR,
  },
  ia: { mensaje: 'El lector no pudo con esta imagen.', salida: SALIDA.REINTENTAR },
  vacia: {
    mensaje: 'El lector no encontró nada que leer. Prueba con una foto más nítida.',
    salida: SALIDA.REINTENTAR,
  },
  json: { mensaje: 'La lectura llegó a medias.', salida: SALIDA.REINTENTAR },

  'sin-imagen': { mensaje: 'No llegó ninguna imagen.', salida: SALIDA.OTRA_IMAGEN },
  'imagen-grande': {
    mensaje: 'La imagen pesa demasiado. Prueba con una captura de pantalla.',
    salida: SALIDA.OTRA_IMAGEN,
  },
  tipo: {
    mensaje: 'Ese formato de imagen no se puede leer. Usa JPG, PNG o una captura.',
    salida: SALIDA.OTRA_IMAGEN,
  },
  'no-es-imagen': { mensaje: 'Eso no es una imagen.', salida: SALIDA.OTRA_IMAGEN },
  pesada: {
    mensaje: 'Esa imagen pesa más de 12 MB. Prueba con una captura de pantalla.',
    salida: SALIDA.OTRA_IMAGEN,
  },
  'no-se-abre': {
    mensaje:
      'No se pudo abrir esa imagen. Si viene de un iPhone, prueba con una captura de pantalla.',
    salida: SALIDA.OTRA_IMAGEN,
  },

  fuera: {
    mensaje: 'Algo se quedó viejo en esta página. Recárgala y vuelve a subir la imagen.',
    salida: SALIDA.A_MANO,
  },
  'sin-servidor': {
    mensaje:
      'El lector no está disponible aquí. En desarrollo local hace falta arrancar con "vercel dev".',
    salida: SALIDA.A_MANO,
  },
  desconocido: AVERIA,
}

/** Un error con codigo, para que la vista decida sin leer mensajes. */
class FalloLectura extends Error {
  /**
   * @param {string} codigo
   * @param {object} [extra]
   * @param {string} [extra.detalle]  lo que dijo el servidor, para quien lo arregla
   * @param {number} [extra.espera]   segundos tras los que merece la pena volver
   */
  constructor(codigo, { detalle, espera } = {}) {
    const { mensaje, salida } = FALLOS[codigo] ?? AVERIA
    super(mensaje)
    this.codigo = codigo
    this.salida = salida
    this.detalle = detalle
    this.espera = espera
  }
}

/* Cualquier cosa que reviente, con la forma que la vista espera. Un error que
   no es de la lectura -un fallo nuestro- sale como averia y no con su mensaje
   de programa en la pantalla. */
export const comoFallo = (error) =>
  error instanceof FalloLectura
    ? error
    : new FalloLectura('desconocido', { detalle: String(error?.message ?? error) })

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
    throw new FalloLectura('red', { detalle: String(e?.message ?? e) })
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
      detalle: datos?.detalle,
      espera: Number.isFinite(datos?.espera) ? datos.espera : undefined,
    })
  }

  return datos?.clases ?? []
}
