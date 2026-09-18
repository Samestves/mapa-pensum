import { timingSafeEqual } from 'node:crypto'
import { PREFIJO, fechaDe } from './latido.js'

/**
 * El panel: lee lo que latido.js fue sumando y lo devuelve junto.
 *
 * Es la unica puerta a esos datos y es privada. La clave vive en una
 * variable de entorno del proyecto -PANEL_CLAVE-, no en el codigo ni en el
 * repositorio, y se compara en tiempo constante: comparar con === deja medir
 * cuantos caracteres se acerto por lo que tarda en responder.
 *
 * Lee y no escribe nunca. Se pide por secciones -general, una carrera, los
 * aparatos- para que mirar una carrera no vuelva a cargar todo lo demas.
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

const ID = /^[a-zA-Z0-9]{8,32}$/
const SLUG = /^[a-z0-9-]{3,48}$/

/* Upstash devuelve el JSON guardado como texto; uno roto no tumba el panel */
const leerFicha = (texto) => {
  try {
    const ficha = JSON.parse(texto)
    return ficha && typeof ficha === 'object' ? ficha : {}
  } catch {
    return {}
  }
}

/**
 * Lo de toda la web: activos, dias, reloj, vistas, duracion y el ranking de
 * carreras. Es lo que se ve al entrar, y no cambia por mucho que se mire una
 * carrera u otra: cada seccion se pide aparte.
 */
async function general(hoy, cuantos) {
  const dias = ultimosDias(cuantos, hoy)
  const meses = ultimosMeses(6, hoy)
  /* Los activos de una ventana movil salen de UN comando: PFCOUNT acepta
     varias claves y cuenta la union sin repetir a nadie. Es mucho mas util
     que la semana del calendario -el lunes no empieza de cero- y mas exacto
     que sumar dias, que contaria tres veces a quien entra tres dias. */
  const ultimos = (n) => ultimosDias(n, hoy).map((f) => k('u', f))

  const comandos = [
    ...dias.map((f) => ['PFCOUNT', k('u', f)]),
    ['MGET', ...dias.map((f) => k('visitas', f))],
    ['MGET', ...dias.map((f) => k('nuevos', f))],
    ['MGET', ...dias.map((f) => k('pwa', f))],
    ...dias.map((f) => ['HGETALL', k('horas', f)]),
    ['PFCOUNT', ...ultimos(7)],
    ['PFCOUNT', ...ultimos(30)],
    ...meses.map((m) => ['PFCOUNT', k('u', 'm', m)]),
    ['HGETALL', k('carreras', meses.at(-1))],
    ['HGETALL', k('carreras', meses.at(-2))],
    ['HGETALL', k('vistas', meses.at(-1))],
    ['HGETALL', k('aparato', meses.at(-1))],
    ['HGETALL', k('acciones', meses.at(-1))],
    ['HGETALL', k('duracion', meses.at(-1))],
    ['ZRANGE', k('dias'), '0', '0'],
  ]

  const r = await pedir(comandos)
  let i = 0
  const activos = dias.map(() => numero(r[i++]))
  const visitas = r[i++] ?? []
  const nuevos = r[i++] ?? []
  const pwa = r[i++] ?? []
  const horasPorDia = dias.map(() => aObjeto(r[i++]))
  const activos7 = numero(r[i++])
  const activos30 = numero(r[i++])
  const porMes = meses.map((m) => ({ mes: m, activos: numero(r[i++]) }))
  const carrerasMes = aObjeto(r[i++])
  const carrerasAntes = aObjeto(r[i++])
  const vistas = aObjeto(r[i++])
  const aparato = aObjeto(r[i++])
  const acciones = aObjeto(r[i++])
  const duracion = aObjeto(r[i++])
  const desde = r[i++]?.[0] ?? null

  /* Las carreras de las que hay algo, y de cada una sus aperturas y sus
     aparatos distintos en la ventana. Cuales son solo se sabe despues de
     leer los meses, asi que va en una segunda peticion. */
  const slugs = [...new Set([...Object.keys(carrerasMes), ...Object.keys(carrerasAntes)])].filter(
    (s) => SLUG.test(s),
  )
  const carreras = {}
  if (slugs.length) {
    const r2 = await pedir(
      slugs.flatMap((s) => [
        ['MGET', ...dias.map((f) => k('ca', s, f))],
        ['PFCOUNT', ...dias.map((f) => k('cu', s, f))],
      ]),
    )
    slugs.forEach((s, n) => {
      carreras[s] = {
        aperturas: (r2[n * 2] ?? []).reduce((suma, v) => suma + numero(v), 0),
        aparatos: numero(r2[n * 2 + 1]),
        mes: carrerasMes[s] ?? 0,
        mesAnterior: carrerasAntes[s] ?? 0,
      }
    })
  }

  /* El reloj: siete filas -una por dia de la semana- y veinticuatro
     columnas. Se arma aqui y no en el navegador porque es la misma cuenta
     para todos y asi el panel solo pinta. */
  const reloj = Array.from({ length: 7 }, () => new Array(24).fill(0))
  dias.forEach((fecha, n) => {
    const diaSemana = (new Date(`${fecha}T12:00:00Z`).getUTCDay() + 6) % 7
    for (const [hora, veces] of Object.entries(horasPorDia[n])) {
      const h = Number(hora)
      if (h >= 0 && h < 24) reloj[diaSemana][h] += veces
    }
  })

  return {
    hoy,
    desde,
    mes: meses.at(-1),
    mesAnterior: meses.at(-2),
    activos: {
      hoy: activos.at(-1) ?? 0,
      siete: activos7,
      treinta: activos30,
      mes: porMes.at(-1)?.activos ?? 0,
      mesAnterior: porMes.at(-2)?.activos ?? 0,
    },
    dias: dias.map((fecha, n) => ({
      fecha,
      activos: activos[n],
      visitas: numero(visitas[n]),
      nuevos: numero(nuevos[n]),
      pwa: numero(pwa[n]),
    })),
    meses: porMes,
    reloj,
    carreras,
    vistas,
    aparato,
    acciones,
    duracion,
  }
}

/** Una sola carrera: sus dias, sus aparatos, sus marcas y su mapa de calor */
async function carrera(hoy, cuantos, slug) {
  const dias = ultimosDias(cuantos, hoy)
  const [mesAnterior, mes] = ultimosMeses(2, hoy)
  const comandos = [
    ['MGET', ...dias.map((f) => k('ca', slug, f))],
    ...dias.map((f) => ['PFCOUNT', k('cu', slug, f)]),
    ['PFCOUNT', ...ultimosDias(7, hoy).map((f) => k('cu', slug, f))],
    ['PFCOUNT', ...ultimosDias(30, hoy).map((f) => k('cu', slug, f))],
    ['HGET', k('carreras', mes), slug],
    ['HGET', k('carreras', mesAnterior), slug],
    ['HGET', k('cm', mes), slug],
    ['HGET', k('cm', mesAnterior), slug],
    ['ZRANGE', k('calor', slug), '0', '-1', 'REV', 'WITHSCORES'],
  ]
  const r = await pedir(comandos)
  let i = 0
  const aperturas = r[i++] ?? []
  const aparatosPorDia = dias.map(() => numero(r[i++]))
  const siete = numero(r[i++])
  const treinta = numero(r[i++])
  const aperturasMes = numero(r[i++])
  const aperturasAntes = numero(r[i++])
  const marcasMes = numero(r[i++])
  const marcasAntes = numero(r[i++])
  const calor = aObjeto(r[i++])
  // El primer dia con aperturas contadas: antes de eso no se media por carrera
  const desde = dias.find((_, n) => numero(aperturas[n]) > 0) ?? null

  return {
    slug,
    hoy,
    mes,
    mesAnterior,
    desde,
    dias: dias.map((fecha, n) => ({
      fecha,
      aperturas: numero(aperturas[n]),
      aparatos: aparatosPorDia[n],
    })),
    aparatos: { siete, treinta },
    aperturas: { mes: aperturasMes, mesAnterior: aperturasAntes },
    marcas: { mes: marcasMes, mesAnterior: marcasAntes },
    calor,
  }
}

/* Cuantos aparatos se devuelven como mucho. Un HMGET los lee todos de una
   vez -cuenta como un solo comando del plan-, pero la respuesta crece, y el
   panel no necesita mas para repartir por sistema, ciudad o navegador. */
const TOPE_APARATOS = 600

/** Los aparatos vistos en la ventana, con su ficha y sus contadores */
async function aparatos(cuantos, ahora = Date.now()) {
  const desde = ahora - cuantos * 86400000
  const [lista, total, primero] = await pedir([
    [
      'ZRANGE',
      k('ap', 'vistos'),
      '+inf',
      String(desde),
      'BYSCORE',
      'REV',
      'LIMIT',
      '0',
      String(TOPE_APARATOS),
    ],
    ['ZCOUNT', k('ap', 'vistos'), String(desde), '+inf'],
    ['ZRANGE', k('ap', 'vistos'), '0', '0', 'WITHSCORES'],
  ])
  const ids = (lista ?? []).filter((id) => ID.test(id))
  const base = {
    ventana: cuantos,
    total: numero(total),
    desde: numero(primero?.[1]) || null,
    aparatos: [],
  }
  if (!ids.length) return base

  /* Que carreras abrio cada uno: los campos son "<id>|<carrera>", asi que
     hay que saber las carreras. Salen de los meses con datos. */
  const meses = ultimosMeses(3, fechaDe(new Date(ahora)))
  const porMes = await pedir(meses.map((m) => ['HKEYS', k('carreras', m)]))
  const slugs = [...new Set(porMes.flat().filter((s) => typeof s === 'string' && SLUG.test(s)))]
  const campos = ids.flatMap((id) => slugs.map((s) => `${id}|${s}`))

  const [fichas, primeras, visitas, minutos, marcas, carreras] = await pedir([
    ['HMGET', k('ap'), ...ids],
    ['HMGET', k('ap', 'primera'), ...ids],
    ['HMGET', k('ap', 'visitas'), ...ids],
    ['HMGET', k('ap', 'minutos'), ...ids],
    ['HMGET', k('ap', 'marcas'), ...ids],
    campos.length ? ['HMGET', k('ap', 'carreras'), ...campos] : ['ECHO', ''],
  ])

  base.aparatos = ids.map((id, n) => {
    const porCarrera = {}
    slugs.forEach((s, j) => {
      const veces = numero(carreras?.[n * slugs.length + j])
      if (veces) porCarrera[s] = veces
    })
    return {
      id,
      ...leerFicha(fichas?.[n]),
      primera: primeras?.[n] ?? null,
      visitas: numero(visitas?.[n]),
      minutos: numero(minutos?.[n]),
      marcas: numero(marcas?.[n]),
      carreras: porCarrera,
    }
  })
  return base
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'metodo' })
  if (!process.env.PANEL_CLAVE) return res.status(503).json({ error: 'sin-clave' })
  if (!claveCorrecta(req.query?.clave)) return res.status(401).json({ error: 'clave' })
  if (!URL_REDIS || !TOKEN_REDIS) return res.status(503).json({ error: 'sin-almacen' })

  const hoy = fechaDe()
  const cuantos = Math.min(Math.max(Number(req.query?.dias) || 30, 7), 120)
  const seccion = req.query?.seccion ?? 'general'

  try {
    if (seccion === 'carrera') {
      const slug = req.query?.slug
      if (typeof slug !== 'string' || !SLUG.test(slug))
        return res.status(400).json({ error: 'slug' })
      return res.status(200).json(await carrera(hoy, cuantos, slug))
    }
    if (seccion === 'aparatos') return res.status(200).json(await aparatos(cuantos))
    return res.status(200).json(await general(hoy, cuantos))
  } catch (e) {
    return res.status(502).json({ error: 'almacen', detalle: String(e.message ?? e).slice(0, 200) })
  }
}
