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

export const TAMANO_MAXIMO = 12 * 1024 * 1024

/* Lo que el selector de archivos deja elegir. Sin esto, en el telefono se
   abre el explorador entero y hay que ir a buscar la foto entre los PDF.
   Lo piden dos pantallas -la bienvenida y el reintento de la revision- y
   estaba escrito en las dos: dos listas que se separan el dia que alguien
   añada un formato en una sola. */
export const FORMATOS = 'image/png,image/jpeg,image/webp,image/heic,image/heif'

/** Los mensajes de cada fallo, en cristiano. La vista los enseña tal cual. */
export const EXPLICACION = {
  'sin-clave': 'Falta configurar la clave del lector en el servidor.',
  fuera: 'Esta petición no viene de la web. Recarga la página.',
  'sin-imagen': 'No llegó ninguna imagen.',
  'imagen-grande': 'La imagen pesa demasiado. Prueba con una captura de pantalla.',
  tipo: 'Ese formato de imagen no se puede leer. Usa JPG, PNG o una captura.',
  'sin-materias': 'No se pudo leer el pensum de esta carrera.',
  red: 'No se pudo conectar con el lector. Revisa tu conexión.',
  ia: 'El lector no pudo procesar la imagen. Inténtalo de nuevo en un minuto.',
  /* Saturado y cuota son cosas distintas y hay que decirlo: una se arregla
     insistiendo en un minuto y la otra esperando a mañana. Con el mismo
     mensaje, nadie sabe si volver a intentarlo. */
  saturado:
    'El lector de Google está saturado ahora mismo. No es tu cuota: le pasa a todo el mundo a la vez y suele durar poco.',
  cuota: 'Se agotó la cuota del lector por ahora. Vuelve a intentarlo más tarde.',
  /* Estos tres no los arregla el estudiante y no hay que fingir que sí: un
     modelo jubilado no va a existir dentro de un minuto por mucho que
     insista. Debajo sale el mensaje de Google, que es lo que hace falta para
     saber qué modelo poner. */
  modelo: 'El lector está mal configurado: el modelo que usa ya no está disponible.',
  permiso: 'La clave del lector no tiene permiso para ese modelo.',
  peticion: 'La petición al lector no era válida.',
  vacia: 'El lector no devolvió nada. Prueba con una foto más nítida.',
  json: 'La respuesta del lector vino mal formada.',
  metodo: 'Petición inválida.',
  'no-es-imagen': 'Eso no es una imagen.',
  pesada: 'Esa imagen pesa más de 12 MB. Prueba con una captura de pantalla.',
  'no-se-abre':
    'No se pudo abrir esa imagen. Si viene de un iPhone, prueba con una captura de pantalla.',
  'sin-servidor':
    'El lector no está disponible aquí. En desarrollo local hace falta arrancar con "vercel dev".',
  desconocido: 'Algo falló al leer la imagen.',
}

/** Un error con codigo, para que la vista decida sin leer mensajes. */
class FalloLectura extends Error {
  constructor(codigo, detalle) {
    super(EXPLICACION[codigo] ?? EXPLICACION.desconocido)
    this.codigo = codigo
    this.detalle = detalle
  }
}

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

  const url = await leerComo(blob, 'readAsDataURL')

  return {
    base64: String(url).split(',')[1],
    tipo: TIPO_SUBIDA,
    vistaPrevia: URL.createObjectURL(blob),
    peso: blob.size,
    ancho,
    alto,
    soltar: () => URL.revokeObjectURL(url),
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
    throw new FalloLectura('red', String(e?.message ?? e))
  }

  /* En `npm run dev` no hay funciones: Vite devuelve el index.html para
     cualquier ruta, asi que la respuesta llega con 200 y HTML dentro. Sin
     esta comprobacion el fallo saldria como "respuesta mal formada", que
     manda a buscar el problema al sitio equivocado. */
  const esJSON = respuesta.headers.get('content-type')?.includes('application/json')
  if (!esJSON) throw new FalloLectura('sin-servidor')

  const datos = await respuesta.json().catch(() => null)
  if (!respuesta.ok) throw new FalloLectura(datos?.error ?? 'desconocido', datos?.detalle)

  return datos?.clases ?? []
}

/* Fallos que mejoran solos con el tiempo. Para estos la accion que sirve es
   volver a intentarlo con LA MISMA imagen; para el resto, cambiarla. Ofrecer
   siempre "prueba otra foto" ante un servicio lleno es mandar a buscar el
   problema donde no esta. */
export const SE_REINTENTA = new Set(['saturado', 'red', 'ia', 'vacia'])

export { FalloLectura }
