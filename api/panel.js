import { timingSafeEqual } from 'node:crypto'
import { PREFIJO, fechaDe, semanaDe } from './latido.js'

/**
 * El panel: lee lo que latido.js fue sumando y lo devuelve junto.
 *
 * Es la unica puerta a esos datos y es privada. La clave vive en una
 * variable de entorno del proyecto -PANEL_CLAVE-, no en el codigo ni en el
 * repositorio, y se compara en tiempo constante: comparar con === deja medir
 * cuantos caracteres se acerto por lo que tarda en responder.
 *
 * Lee y no escribe nunca. Y lo que devuelve son numeros sumados: no hay
 * forma de sacar de aqui a una persona, porque no se guardo ninguna.
 */

const URL_REDIS = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
const TOKEN_REDIS = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN

const k = (...partes) => [PREFIJO, ...partes].join(':')

/** Compara sin filtrar por tiempo. Distinta longitud es distinto, y ya. */
function claveCorrecta(recibida) {
  const buena = process.env.PANEL_CLAVE
  if (!buena || typeof recibida !== 'string' || recibida.length !== buena.length) return false
  return timingSafeEqual(Buffer.from(recibida), Buffer.from(buena))
}

/** Los ultimos n dias en fechas de Monagas, del mas viejo al de hoy */
export function ultimosDias(n, hoy) {
  const [a, m, d] = hoy.split('-').map(Number)
  const fechas = []
  for (let i = n - 1; i >= 0; i--) {
    const dia = new Date(Date.UTC(a, m - 1, d - i))
    fechas.push(dia.toISOString().slice(0, 10))
  }
  return fechas
}

/** Los ultimos n meses, del mas viejo al actual */
export function ultimosMeses(n, hoy) {
  const [a, m] = hoy.split('-').map(Number)
  const meses = []
  for (let i = n - 1; i >= 0; i--) {
    const mes = new Date(Date.UTC(a, m - 1 - i, 1))
    meses.push(mes.toISOString().slice(0, 7))
  }
  return meses
}

async function pedir(comandos) {
  const respuesta = await fetch(`${URL_REDIS}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN_REDIS}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(comandos),
  })
  if (!respuesta.ok) throw new Error(`Redis respondio ${respuesta.status}`)
  const datos = await respuesta.json()
  return datos.map((d) => d.result)
}

const numero = (v) => Number(v ?? 0) || 0

/* Upstash devuelve los hashes como lista plana: clave, valor, clave, valor */
const aObjeto = (plano) => {
  const mapa = {}
  for (let i = 0; i < (plano?.length ?? 0); i += 2) mapa[plano[i]] = numero(plano[i + 1])
  return mapa
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'metodo' })
  if (!process.env.PANEL_CLAVE) return res.status(503).json({ error: 'sin-clave' })
  if (!claveCorrecta(req.query?.clave)) return res.status(401).json({ error: 'clave' })
  if (!URL_REDIS || !TOKEN_REDIS) return res.status(503).json({ error: 'sin-almacen' })

  const hoy = fechaDe()
  const cuantos = Math.min(Math.max(Number(req.query?.dias) || 30, 7), 120)
  const dias = ultimosDias(cuantos, hoy)
  const meses = ultimosMeses(6, hoy)
  const semanas = [...new Set(ultimosDias(56, hoy).map(semanaDe))].slice(-8)
  const calor = typeof req.query?.calor === 'string' ? req.query.calor : null

  const comandos = [
    ...dias.map((f) => ['PFCOUNT', k('u', f)]),
    ['MGET', ...dias.map((f) => k('visitas', f))],
    ['MGET', ...dias.map((f) => k('nuevos', f))],
    ['MGET', ...dias.map((f) => k('pwa', f))],
    ...semanas.map((s) => ['PFCOUNT', k('u', 's', s)]),
    ...meses.map((m) => ['PFCOUNT', k('u', 'm', m)]),
    ['HGETALL', k('carreras', meses.at(-1))],
    ['HGETALL', k('vistas', meses.at(-1))],
    ['ZRANGE', k('dias'), '0', '0'],
  ]
  if (calor) comandos.push(['ZRANGE', k('calor', calor), '0', '-1', 'REV', 'WITHSCORES'])

  try {
    const r = await pedir(comandos)
    let i = 0
    const activos = dias.map(() => numero(r[i++]))
    const visitas = r[i++] ?? []
    const nuevos = r[i++] ?? []
    const pwa = r[i++] ?? []
    const porSemana = semanas.map((s) => ({ semana: s, activos: numero(r[i++]) }))
    const porMes = meses.map((m) => ({ mes: m, activos: numero(r[i++]) }))
    const carreras = aObjeto(r[i++])
    const vistas = aObjeto(r[i++])
    const desde = r[i++]?.[0] ?? null
    const calorMaterias = calor ? aObjeto(r[i++]) : null

    return res.status(200).json({
      hoy,
      desde,
      mes: meses.at(-1),
      dias: dias.map((fecha, n) => ({
        fecha,
        activos: activos[n],
        visitas: numero(visitas[n]),
        nuevos: numero(nuevos[n]),
        pwa: numero(pwa[n]),
      })),
      semanas: porSemana,
      meses: porMes,
      carreras,
      vistas,
      calor: calorMaterias,
    })
  } catch (e) {
    return res.status(502).json({ error: 'almacen', detalle: String(e.message ?? e).slice(0, 200) })
  }
}
