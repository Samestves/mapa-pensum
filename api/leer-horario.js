/**
 * Lee un horario de una imagen. Funcion de Vercel, no del navegador.
 *
 * Existe por una sola razon, y conviene que quede escrita: la clave de Google
 * AI Studio NO puede vivir en el front. Vite sustituye las variables VITE_* en
 * el bundle en tiempo de compilacion, asi que una clave ahi es una clave
 * publicada: cualquiera abre las herramientas del navegador, la copia y quema
 * la cuota. Aqui la clave se queda en el servidor y lo unico que cruza la red
 * hacia el estudiante es el JSON con las clases.
 *
 * Lo que hace es poco y a proposito: recibe una imagen y el listado de
 * materias de LA carrera abierta, se lo pasa al modelo, y devuelve filas de
 * texto. No decide nada. Emparejar con el pensum, validar horas y detectar
 * choques ocurre en el navegador -en layout/importarHorario.js, que se prueba
 * sin red-, porque son las reglas de esta aplicacion y no tienen por que
 * depender de que un servicio de terceros este de buenas.
 */

/* Una foto de un horario tarda entre cinco y veinte segundos en leerse. El
   limite por defecto de una funcion son diez, asi que sin esto la mitad de
   las lecturas buenas se cortarian a mitad. */
export const config = { maxDuration: 60 }

/* El modelo se puede cambiar sin tocar codigo: Google renombra y jubila
   modelos mas rapido de lo que se despliega esto, y quedarse clavado en uno
   es garantizarse un 404 dentro de unos meses. Los alias '-latest' siguen al
   vigente de su familia. */
const MODELO = process.env.GOOGLE_AI_MODELO || 'gemini-flash-latest'

/* Base64 infla un tercio. El cuerpo de una funcion de Vercel se corta en 4,5
   MB, asi que aqui se rechaza antes de intentarlo: mejor un mensaje claro que
   un error de plataforma que no dice nada. El cliente ya reduce la imagen
   antes de subirla, esto es la red por si esa reduccion falla. */
const TOPE_BASE64 = 3 * 1024 * 1024

const TIPOS = ['image/jpeg', 'image/png', 'image/webp']

/* Lo que se le pide al modelo que devuelva. Con esquema declarado y
   responseMimeType JSON, la respuesta viene ya en forma en vez de dentro de
   un bloque de markdown que habria que despegar con expresiones regulares. */
const ESQUEMA = {
  type: 'object',
  properties: {
    clases: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          codigo: { type: 'string' },
          nombre: { type: 'string' },
          dia: { type: 'string' },
          inicio: { type: 'string' },
          fin: { type: 'string' },
          seccion: { type: 'string' },
          aula: { type: 'string' },
          profesor: { type: 'string' },
        },
        required: ['nombre', 'dia', 'inicio', 'fin'],
      },
    },
  },
  required: ['clases'],
}

/**
 * Las instrucciones.
 *
 * Dos decisiones que valen mas que el resto del texto:
 *
 * UNA FILA POR SESION. Un horario dice "Matematica I — Lunes y Miercoles,
 * 7:00 a 8:40" en un renglon, pero eso son DOS bloques en la rejilla. Si el
 * modelo devuelve el renglon tal cual, el dia llega como "Lunes y Miercoles"
 * y no se entiende ninguno de los dos.
 *
 * EL LISTADO DE MATERIAS VA EN EL PROMPT. Un horario impreso abrevia -"MAT
 * I", "PROG II"- y emparejar abreviaturas contra sesenta nombres es
 * exactamente lo que un modelo hace bien. Devolviendo el codigo del listado
 * se salta el emparejamiento por parecido, que es la parte donde se cuelan
 * los errores. Y como el codigo se valida despues contra el pensum de verdad,
 * inventarse uno no cuela nada.
 */
const instrucciones = (materias) => `Eres un lector de horarios universitarios.

En la imagen hay el horario de clases de un estudiante. Extrae TODAS las clases.

Reglas:
1. Devuelve UNA FILA POR SESION, no por materia. Si una materia aparece con
   varios dias ("Lunes y Miércoles", "L-M-V"), devuelve una fila por cada día,
   todas con la misma hora salvo que la imagen diga otra cosa.
2. "dia" en español y completo: Lunes, Martes, Miércoles, Jueves o Viernes.
   Si una clase cae en sábado o domingo, inclúyela igual con ese nombre.
3. "inicio" y "fin" en formato HH:MM de 24 horas. Un horario universitario va
   de las 07:00 a las 19:00: si la imagen dice "1:40" sin meridiano, son las
   13:40.
4. "codigo": elige el de la lista de abajo cuya materia sea la misma, aunque
   en la imagen esté abreviada. Fíjate en el número romano final: "I" y "II"
   son materias distintas. Si ninguna encaja con seguridad, deja "" vacío.
5. "nombre": lo que está escrito en la imagen, tal cual, sin corregir.
6. "seccion", "aula" y "profesor" solo si aparecen. Si no, cadena vacía.
7. No inventes clases. Si algo está borroso y no puedes leerlo, omítelo.

Materias de esta carrera (código — nombre):
${materias.map((m) => `${m.codigo} — ${m.nombre}`).join('\n')}`

/* Comprueba que la peticion viene de la propia web. Es un badén, no una
   cerradura: una cabecera se falsifica en una linea de curl. Pero para de
   golpe el uso casual desde otra pagina, que es de donde vendria el gasto si
   alguien encuentra el endpoint. La proteccion de verdad -limite por IP-
   necesita un almacen que este proyecto no tiene. */
function mismaCasa(req) {
  const host = req.headers.host || ''
  if (host.startsWith('localhost') || host.startsWith('127.0.0.1')) return true

  const procedencia = req.headers.origin || req.headers.referer
  if (!procedencia) return false
  try {
    return new URL(procedencia).host === host
  } catch {
    return false
  }
}

const fallo = (res, estado, error, detalle) =>
  res.status(estado).json(detalle ? { error, detalle } : { error })

export default async function handler(req, res) {
  if (req.method !== 'POST') return fallo(res, 405, 'metodo')
  if (!mismaCasa(req)) return fallo(res, 403, 'fuera')

  const clave = process.env.GOOGLE_AI_API_KEY
  if (!clave) return fallo(res, 500, 'sin-clave')

  const { imagen, tipo, materias } = req.body ?? {}

  if (typeof imagen !== 'string' || !imagen) return fallo(res, 400, 'sin-imagen')
  if (imagen.length > TOPE_BASE64) return fallo(res, 413, 'imagen-grande')
  if (!TIPOS.includes(tipo)) return fallo(res, 400, 'tipo')
  if (!Array.isArray(materias) || !materias.length) return fallo(res, 400, 'sin-materias')

  const listado = materias
    .slice(0, 200)
    .map((m) => ({ codigo: String(m.codigo ?? ''), nombre: String(m.nombre ?? '') }))
    .filter((m) => m.codigo && m.nombre)

  let respuesta
  try {
    respuesta = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': clave },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: instrucciones(listado) },
                { inline_data: { mime_type: tipo, data: imagen } },
              ],
            },
          ],
          generationConfig: {
            /* A cero. Esto es una lectura, no una redaccion: la misma foto
               tiene que dar el mismo resultado las dos veces que alguien la
               suba, y aqui la variedad solo puede empeorar. */
            temperature: 0,
            responseMimeType: 'application/json',
            responseSchema: ESQUEMA,
          },
        }),
      },
    )
  } catch (e) {
    return fallo(res, 502, 'red', String(e?.message ?? e))
  }

  if (!respuesta.ok) {
    /* El mensaje de Google se pasa tal cual. Es lo unico que distingue "ese
       modelo ya no existe" de "se acabo la cuota de hoy", y sin el, arreglar
       esto seria adivinar. No lleva la clave: va en una cabecera, no en el
       cuerpo ni en la URL. */
    const texto = await respuesta.text().catch(() => '')
    return fallo(res, 502, 'ia', texto.slice(0, 600))
  }

  const datos = await respuesta.json().catch(() => null)
  const crudo = datos?.candidates?.[0]?.content?.parts?.[0]?.text

  if (!crudo) {
    /* Sin texto casi siempre es un filtro de seguridad o un corte por
       longitud. El motivo viene en finishReason y es lo que hay que ver. */
    return fallo(res, 502, 'vacia', JSON.stringify(datos?.candidates?.[0]?.finishReason ?? datos))
  }

  let leido
  try {
    leido = JSON.parse(crudo)
  } catch {
    return fallo(res, 502, 'json', crudo.slice(0, 300))
  }

  return res.status(200).json({
    clases: Array.isArray(leido?.clases) ? leido.clases.slice(0, 60) : [],
    modelo: MODELO,
  })
}
