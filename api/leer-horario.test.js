import test, { mock } from 'node:test'
import assert from 'node:assert/strict'
import handler from './leer-horario.js'
import { TOPE_POR_HORA } from './_turno.js'

/* Las averias se escriben en el registro, que es donde se van a buscar en
   produccion. Aqui se provocan a proposito y solo ensuciarian la salida. */
mock.method(console, 'warn', () => {})

/* Pruebas de la funcion sin clave y sin red: se le pone un fetch de mentira y
   se mira QUE le pide a Google y que hace con lo que vuelve.

   No comprueban que Gemini lea bien un horario -eso no se puede probar aqui-
   sino lo unico que si depende de nosotros: que la peticion salga con la
   forma correcta y que cada fallo se traduzca a un codigo que la pantalla
   sepa enseñar. Es donde estan los errores que solo se verian en produccion. */

const MATERIAS = [
  { codigo: '0081814', nombre: 'Matemáticas I' },
  { codigo: '0051324', nombre: 'Física I' },
]

const IMAGEN = Buffer.from('no soy una imagen de verdad').toString('base64')

/** Un req/res de mentira con la parte de Vercel que esta funcion usa. */
function llamar(cuerpo, { metodo = 'POST', cabeceras = {} } = {}) {
  const req = {
    method: metodo,
    headers: {
      host: 'mapa-pensum.vercel.app',
      origin: 'https://mapa-pensum.vercel.app',
      ...cabeceras,
    },
    body: cuerpo,
  }
  const res = {
    codigo: null,
    cuerpo: null,
    status(c) {
      this.codigo = c
      return this
    },
    json(d) {
      this.cuerpo = d
      return this
    },
  }
  return { req, res }
}

const cuerpoValido = () => ({ imagen: IMAGEN, tipo: 'image/jpeg', materias: MATERIAS })

/** Sustituye fetch y devuelve lo que se le pidio. */
function conFetch(respuesta) {
  const visto = {}
  globalThis.fetch = async (url, opciones) => {
    visto.url = url
    visto.opciones = opciones
    visto.cuerpo = JSON.parse(opciones.body)
    return respuesta()
  }
  return visto
}

const respuestaDeGoogle = (texto) => () => ({
  ok: true,
  json: async () => ({ candidates: [{ content: { parts: [{ text: texto }] } }] }),
})

test('las puertas de entrada', async (t) => {
  const antes = globalThis.fetch
  t.after(() => (globalThis.fetch = antes))
  process.env.GOOGLE_AI_API_KEY = 'clave-de-mentira'

  await t.test('solo POST', async () => {
    const { req, res } = llamar(cuerpoValido(), { metodo: 'GET' })
    await handler(req, res)
    assert.equal(res.codigo, 405)
    assert.equal(res.cuerpo.error, 'metodo')
  })

  await t.test('sin procedencia no se atiende', async () => {
    const { req, res } = llamar(cuerpoValido(), {
      cabeceras: { origin: undefined, referer: undefined },
    })
    await handler(req, res)
    assert.equal(res.codigo, 403)
  })

  await t.test('desde otra web tampoco', async () => {
    const { req, res } = llamar(cuerpoValido(), { cabeceras: { origin: 'https://otra-cosa.com' } })
    await handler(req, res)
    assert.equal(res.codigo, 403)
  })

  await t.test('en local si, que si no no se puede desarrollar', async () => {
    conFetch(respuestaDeGoogle('{"clases":[]}'))
    const { req, res } = llamar(cuerpoValido(), {
      cabeceras: { host: 'localhost:3000', origin: undefined, referer: undefined },
    })
    await handler(req, res)
    assert.equal(res.codigo, 200)
  })

  await t.test('sin clave configurada se dice, no se falla en silencio', async () => {
    delete process.env.GOOGLE_AI_API_KEY
    const { req, res } = llamar(cuerpoValido())
    await handler(req, res)
    assert.equal(res.codigo, 500)
    assert.equal(res.cuerpo.error, 'sin-clave')
    process.env.GOOGLE_AI_API_KEY = 'clave-de-mentira'
  })
})

test('lo que entra se comprueba', async (t) => {
  process.env.GOOGLE_AI_API_KEY = 'clave-de-mentira'

  await t.test('sin imagen', async () => {
    const { req, res } = llamar({ ...cuerpoValido(), imagen: '' })
    await handler(req, res)
    assert.equal(res.cuerpo.error, 'sin-imagen')
  })

  await t.test('una imagen que no cabe en el cuerpo de una funcion', async () => {
    const { req, res } = llamar({ ...cuerpoValido(), imagen: 'x'.repeat(4 * 1024 * 1024) })
    await handler(req, res)
    assert.equal(res.codigo, 413)
    assert.equal(res.cuerpo.error, 'imagen-grande')
  })

  await t.test('un tipo que el modelo no acepta', async () => {
    const { req, res } = llamar({ ...cuerpoValido(), tipo: 'application/pdf' })
    await handler(req, res)
    assert.equal(res.cuerpo.error, 'tipo')
  })

  await t.test('sin pensum no hay contra que emparejar', async () => {
    const { req, res } = llamar({ ...cuerpoValido(), materias: [] })
    await handler(req, res)
    assert.equal(res.cuerpo.error, 'sin-materias')
  })
})

test('la peticion que se le manda a Google', async (t) => {
  const antes = globalThis.fetch
  t.after(() => (globalThis.fetch = antes))
  process.env.GOOGLE_AI_API_KEY = 'clave-de-mentira'

  await t.test('lleva la clave en cabecera y NUNCA en la URL', async () => {
    const visto = conFetch(respuestaDeGoogle('{"clases":[]}'))
    const { req, res } = llamar(cuerpoValido())
    await handler(req, res)

    assert.equal(visto.opciones.headers['x-goog-api-key'], 'clave-de-mentira')
    assert.ok(
      !String(visto.url).includes('clave-de-mentira'),
      'una clave en la URL acaba en los registros de medio internet',
    )
    assert.ok(!visto.opciones.body.includes('clave-de-mentira'))
  })

  await t.test('la imagen va como inline_data con su tipo', async () => {
    const visto = conFetch(respuestaDeGoogle('{"clases":[]}'))
    const { req, res } = llamar(cuerpoValido())
    await handler(req, res)

    const partes = visto.cuerpo.contents[0].parts
    assert.equal(partes[1].inline_data.mime_type, 'image/jpeg')
    assert.equal(partes[1].inline_data.data, IMAGEN)
  })

  await t.test('el pensum viaja dentro de las instrucciones', async () => {
    const visto = conFetch(respuestaDeGoogle('{"clases":[]}'))
    const { req, res } = llamar(cuerpoValido())
    await handler(req, res)

    const texto = visto.cuerpo.contents[0].parts[0].text
    assert.ok(texto.includes('0081814 — Matemáticas I'))
    assert.ok(texto.includes('0051324 — Física I'))
  })

  await t.test('pide JSON con esquema y sin creatividad', async () => {
    const visto = conFetch(respuestaDeGoogle('{"clases":[]}'))
    const { req, res } = llamar(cuerpoValido())
    await handler(req, res)

    const cfg = visto.cuerpo.generationConfig
    assert.equal(cfg.temperature, 0, 'la misma foto tiene que dar el mismo resultado')
    assert.equal(cfg.responseMimeType, 'application/json')
    assert.equal(cfg.responseSchema.properties.clases.type, 'array')
  })

  await t.test('el modelo sale de la variable de entorno', async () => {
    process.env.GOOGLE_AI_MODELO = 'modelo-inventado'
    const visto = conFetch(respuestaDeGoogle('{"clases":[]}'))
    const { req, res } = llamar(cuerpoValido())
    // Sin reimportar el modulo: la lista se lee en cada llamada
    await handler(req, res)

    assert.ok(String(visto.url).includes('modelo-inventado'))
    delete process.env.GOOGLE_AI_MODELO
  })
})

test('cuando Google esta lleno', async (t) => {
  const antes = globalThis.fetch
  t.after(() => (globalThis.fetch = antes))
  process.env.GOOGLE_AI_API_KEY = 'clave-de-mentira'

  /* Un fetch que falla las primeras `fallos` veces y despues contesta bien.
     Devuelve la cuenta de llamadas y las URL, que es lo que se quiere mirar. */
  function tras(fallos, estado = 503) {
    const visto = { llamadas: 0, urls: [] }
    globalThis.fetch = async (url) => {
      visto.llamadas++
      visto.urls.push(String(url))
      if (visto.llamadas <= fallos) {
        return { ok: false, status: estado, text: async () => 'high demand' }
      }
      return {
        ok: true,
        json: async () => ({ candidates: [{ content: { parts: [{ text: '{"clases":[]}' }] } }] }),
      }
    }
    return visto
  }

  const modelosDe = (urls) => urls.map((u) => u.split('/models/')[1].split(':')[0])

  await t.test('un 503 suelto no se lleva por delante la lectura', async () => {
    const visto = tras(1)
    const { req, res } = llamar(cuerpoValido())
    await handler(req, res)

    assert.equal(res.codigo, 200, 'el segundo intento tenia que salvarla')
    assert.equal(visto.llamadas, 2)
    assert.equal(res.cuerpo.intentos, 2)
  })

  await t.test('ante un tropiezo se pasa al otro modelo, no se insiste en el mismo', async () => {
    const visto = tras(1)
    const { req, res } = llamar(cuerpoValido())
    await handler(req, res)

    const [primero, segundo] = modelosDe(visto.urls)
    assert.notEqual(primero, segundo, 'cada modelo gasta de su propio cupo')
    assert.equal(res.cuerpo.modelo, segundo)
  })

  await t.test('por defecto hay mas de un modelo al que caer', async () => {
    tras(99, 404)
    const { req, res } = llamar(cuerpoValido())
    await handler(req, res)
    const probados = res.cuerpo.detalle.split(' · ')[1].split(', ')
    assert.ok(probados.length >= 2, `solo habia ${probados.join(' y ')}`)
    assert.ok(
      probados.every((m) => !m.includes('latest')),
      'nombres fijados: con un alias no se sabe contra que se hablo',
    )
  })

  await t.test('si los dos tropiezan no se insiste: hay cola y se dice cuanto', async () => {
    const visto = tras(99)
    const { req, res } = llamar(cuerpoValido())
    await handler(req, res)

    /* Eran tres intentos por modelo, seguidos: seis peticiones por lectura
       contra un cupo de veinte por minuto. */
    assert.equal(visto.llamadas, 2, 'una por modelo y ninguna repetida')
    assert.equal(res.codigo, 429)
    assert.equal(res.cuerpo.error, 'cola')
    assert.ok(res.cuerpo.espera > 0, 'la pantalla espera sola y vuelve')
  })

  await t.test('si no se llega a Google, tambien se espera y se vuelve', async () => {
    globalThis.fetch = async () => {
      throw new Error('getaddrinfo ENOTFOUND')
    }
    const { req, res } = llamar(cuerpoValido())
    await handler(req, res)
    assert.equal(res.cuerpo.error, 'cola')
  })

  await t.test('a cada modelo se le da un plazo: uno atascado no se come la lectura', async () => {
    const visto = conFetch(respuestaDeGoogle('{"clases":[]}'))
    const { req, res } = llamar(cuerpoValido())
    await handler(req, res)
    assert.ok(visto.opciones.signal instanceof AbortSignal)
  })

  /* El 429 de verdad: la cuota que se paso va en QuotaFailure y lo que hay
     que esperar en RetryInfo. */
  const sinCupo = (cuota, espera) =>
    JSON.stringify({
      error: {
        code: 429,
        details: [
          {
            '@type': 'type.googleapis.com/google.rpc.QuotaFailure',
            violations: [{ quotaId: cuota }],
          },
          { '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: espera },
        ],
      },
    })
  const POR_MINUTO = 'GenerateRequestsPerMinutePerProjectPerModel-FreeTier'
  const POR_DIA = 'GenerateRequestsPerDayPerProjectPerModel-FreeTier'

  function siempre429(cuotaDe) {
    const visto = { llamadas: 0, urls: [] }
    globalThis.fetch = async (url) => {
      visto.llamadas++
      visto.urls.push(String(url))
      return { ok: false, status: 429, text: async () => cuotaDe(visto.llamadas) }
    }
    return visto
  }

  await t.test('un 429 NO se reintenta: el limite es por minuto, no por segundo', async () => {
    const visto = siempre429(() => sinCupo(POR_MINUTO, '22s'))
    const { req, res } = llamar(cuerpoValido())
    await handler(req, res)

    /* Eran tres intentos por modelo: seis peticiones mas contra un cupo de
       veinte por minuto que ya estaba pasado. */
    assert.equal(visto.llamadas, 2, 'una por modelo y ninguna repetida')
  })

  await t.test('el limite por minuto es una cola: se dice cuanto falta', async () => {
    siempre429((n) => sinCupo(POR_MINUTO, n === 1 ? '40s' : '22s'))
    const { req, res } = llamar(cuerpoValido())
    await handler(req, res)

    assert.equal(res.codigo, 429)
    assert.equal(res.cuerpo.error, 'cola')
    assert.equal(res.cuerpo.espera, 23, 'lo del que antes vuelve, y un segundo de margen')
  })

  await t.test('el limite del dia NO es una cola: no hay nada que esperar', async () => {
    siempre429(() => sinCupo(POR_DIA, '22s'))
    const { req, res } = llamar(cuerpoValido())
    await handler(req, res)

    /* Una se arregla sola en segundos y la otra mañana; con el mismo mensaje
       nadie sabe si quedarse mirando la pantalla. */
    assert.equal(res.cuerpo.error, 'cuota')
    assert.equal(res.cuerpo.espera, undefined)
  })

  await t.test('uno agotado por hoy y el otro lleno un minuto sigue siendo cola', async () => {
    siempre429((n) => sinCupo(n === 1 ? POR_DIA : POR_MINUTO, '18s'))
    const { req, res } = llamar(cuerpoValido())
    await handler(req, res)

    assert.equal(res.cuerpo.error, 'cola')
    assert.equal(res.cuerpo.espera, 19)
  })

  await t.test('un modelo que no existe no se reintenta: no mejora esperando', async () => {
    const visto = tras(99, 404)
    const { req, res } = llamar(cuerpoValido())
    await handler(req, res)

    assert.equal(visto.llamadas, 2, 'una por modelo y ninguna repetida')
    /* Y NO sale como 'saturado'. Ese mensaje dice "prueba en un minuto", que
       es un consejo falso: un modelo jubilado no vuelve. */
    assert.equal(res.cuerpo.error, 'modelo')
  })

  await t.test('el detalle dice QUE modelos se probaron', async () => {
    process.env.GOOGLE_AI_MODELO = 'uno-que-no-existe,otro-tampoco'
    tras(99, 404)
    const { req, res } = llamar(cuerpoValido())
    await handler(req, res)

    // Sin esto, "no existe" no dice cual, que es lo unico que hace falta saber
    assert.ok(res.cuerpo.detalle.includes('uno-que-no-existe'))
    assert.ok(res.cuerpo.detalle.includes('otro-tampoco'))
    delete process.env.GOOGLE_AI_MODELO
  })

  await t.test('una clave sin permiso para ese modelo se distingue', async () => {
    tras(99, 403)
    const { req, res } = llamar(cuerpoValido())
    await handler(req, res)
    assert.equal(res.cuerpo.error, 'permiso')
  })
})

test('lo que vuelve', async (t) => {
  const antes = globalThis.fetch
  t.after(() => (globalThis.fetch = antes))
  process.env.GOOGLE_AI_API_KEY = 'clave-de-mentira'

  await t.test('una lectura buena sale como clases', async () => {
    conFetch(
      respuestaDeGoogle(
        JSON.stringify({
          clases: [
            {
              codigo: '0081814',
              nombre: 'MATEMATICAS I',
              dia: 'Lunes',
              inicio: '07:00',
              fin: '08:40',
            },
          ],
        }),
      ),
    )
    const { req, res } = llamar(cuerpoValido())
    await handler(req, res)

    assert.equal(res.codigo, 200)
    assert.equal(res.cuerpo.clases.length, 1)
    assert.equal(res.cuerpo.clases[0].nombre, 'MATEMATICAS I')
  })

  await t.test('el mensaje de Google se pasa tal cual', async () => {
    globalThis.fetch = async () => ({
      ok: false,
      text: async () => '{"error":{"message":"models/lo-que-sea is not found"}}',
    })
    const { req, res } = llamar(cuerpoValido())
    await handler(req, res)

    assert.equal(res.cuerpo.error, 'ia')
    assert.ok(
      res.cuerpo.detalle.includes('is not found'),
      'sin el mensaje, distinguir "ese modelo ya no existe" de "se acabo la cuota" seria adivinar',
    )
  })

  await t.test('una respuesta sin texto trae el motivo', async () => {
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({ candidates: [{ finishReason: 'SAFETY' }] }),
    })
    const { req, res } = llamar(cuerpoValido())
    await handler(req, res)

    assert.equal(res.cuerpo.error, 'vacia')
    assert.ok(res.cuerpo.detalle.includes('SAFETY'))
  })

  await t.test('un JSON roto no revienta la funcion', async () => {
    conFetch(respuestaDeGoogle('{"clases": [esto no es json'))
    const { req, res } = llamar(cuerpoValido())
    await handler(req, res)
    assert.equal(res.cuerpo.error, 'json')
  })

  await t.test('un horario absurdamente largo se corta', async () => {
    const muchas = Array.from({ length: 200 }, () => ({
      nombre: 'X',
      dia: 'Lunes',
      inicio: '07:00',
      fin: '08:00',
    }))
    conFetch(respuestaDeGoogle(JSON.stringify({ clases: muchas })))
    const { req, res } = llamar(cuerpoValido())
    await handler(req, res)
    assert.equal(res.cuerpo.clases.length, 60)
  })
})

test('lo que el lector recuerda entre una peticion y la siguiente', async (t) => {
  const antes = globalThis.fetch
  const ALMACEN = 'https://almacen.test'
  process.env.GOOGLE_AI_API_KEY = 'clave-de-mentira'
  process.env.GOOGLE_AI_MODELO = 'nuevo,viejo'
  process.env.KV_REST_API_URL = ALMACEN
  process.env.KV_REST_API_TOKEN = 'ficha-de-mentira'
  t.after(() => {
    globalThis.fetch = antes
    delete process.env.GOOGLE_AI_MODELO
    delete process.env.KV_REST_API_URL
    delete process.env.KV_REST_API_TOKEN
  })

  /* Un Redis de mentira con los cinco comandos que usa el turno. Las
     caducidades se miran contra el reloj de verdad: ninguna prueba dura lo
     bastante para que venza una. */
  function almacen() {
    const llaves = new Map()
    const cuentas = new Map()
    const ordenes = {
      GET: (llave) => llaves.get(llave)?.valor ?? null,
      TTL: (llave) => llaves.get(llave)?.segundos ?? -2,
      SET: (llave, valor, ...opciones) => {
        if (opciones.includes('NX') && llaves.has(llave)) return null
        llaves.set(llave, { valor, segundos: Number(opciones[opciones.indexOf('EX') + 1]) })
        return 'OK'
      },
      INCR: (llave) => {
        const entrada = llaves.get(llave) ?? { valor: '0', segundos: -1 }
        entrada.valor = String(Number(entrada.valor) + 1)
        llaves.set(llave, entrada)
        return Number(entrada.valor)
      },
      HINCRBY: (llave, campo, n) => {
        const cuenta = cuentas.get(llave) ?? {}
        cuenta[campo] = (cuenta[campo] ?? 0) + Number(n)
        cuentas.set(llave, cuenta)
        return cuenta[campo]
      },
    }
    const responder = async (opciones) => ({
      ok: true,
      json: async () =>
        JSON.parse(opciones.body).map(([orden, ...resto]) => ({
          result: ordenes[orden](...resto),
        })),
    })
    const delDia = () => [...cuentas.values()][0] ?? {}
    return { llaves, responder, delDia }
  }

  /* Google segun el modelo: cada uno contesta lo que diga `guion`. Las
     peticiones al almacen se desvian al Redis de mentira. */
  function montar(guion) {
    const redis = almacen()
    const visto = { modelos: [] }
    globalThis.fetch = async (url, opciones) => {
      if (String(url).startsWith(ALMACEN)) return redis.responder(opciones)
      const modelo = String(url).split('/models/')[1].split(':')[0]
      visto.modelos.push(modelo)
      return guion[modelo]()
    }
    return { redis, visto }
  }

  const lee = () => ({
    ok: true,
    json: async () => ({ candidates: [{ content: { parts: [{ text: '{"clases":[]}' }] } }] }),
  })
  const lleno = (cuota, espera) => () => ({
    ok: false,
    status: 429,
    text: async () =>
      JSON.stringify({
        error: {
          details: [{ violations: [{ quotaId: cuota }] }, { retryDelay: espera }],
        },
      }),
  })
  const PASO_EL_MINUTO = lleno('GenerateRequestsPerMinutePerProjectPerModel-FreeTier', '30s')
  const PASO_EL_DIA = lleno('GenerateRequestsPerDayPerProjectPerModel-FreeTier', '30s')

  const pedir = async (cabeceras = { 'x-forwarded-for': '190.0.0.1' }) => {
    const { req, res } = llamar(cuerpoValido(), { cabeceras })
    await handler(req, res)
    return res
  }

  await t.test('al modelo que se paso el cupo no se le vuelve a preguntar', async () => {
    const { visto } = montar({ nuevo: PASO_EL_MINUTO, viejo: lee })

    await pedir()
    assert.deepEqual(visto.modelos, ['nuevo', 'viejo'], 'la primera choca y cae al otro')

    visto.modelos.length = 0
    const res = await pedir()
    /* Sin memoria, cada peticion iba primero al lleno, se llevaba su 429 y
       sumaba una mas a la cuenta que ya estaba pasada. */
    assert.deepEqual(visto.modelos, ['viejo'], 'la segunda va directa al que tiene sitio')
    assert.equal(res.codigo, 200)
  })

  await t.test('un modelo saturado tambien descansa, unos segundos', async () => {
    const lleno = async () => ({ ok: false, status: 503, text: async () => 'high demand' })
    const { visto, redis } = montar({ nuevo: lleno, viejo: lee })

    await pedir()
    visto.modelos.length = 0
    await pedir()

    assert.deepEqual(visto.modelos, ['viejo'], 'quien llega detras no tropieza en el mismo sitio')
    assert.equal(redis.llaves.get('mp:lector:pausa:nuevo').segundos, 10)
  })

  await t.test('si todos descansan no se llama a Google: se dice cuanto falta', async () => {
    const { visto } = montar({ nuevo: PASO_EL_MINUTO, viejo: PASO_EL_MINUTO })

    await pedir()
    visto.modelos.length = 0
    const res = await pedir()

    assert.deepEqual(visto.modelos, [], 'ni una peticion: seria cupo tirado')
    assert.equal(res.codigo, 429)
    assert.equal(res.cuerpo.error, 'cola')
    assert.equal(res.cuerpo.espera, 31)
  })

  await t.test('con el dia agotado en todos, se dice sin llamar a nadie', async () => {
    const { visto } = montar({ nuevo: PASO_EL_DIA, viejo: PASO_EL_DIA })

    await pedir()
    visto.modelos.length = 0
    const res = await pedir()

    assert.deepEqual(visto.modelos, [])
    assert.equal(res.cuerpo.error, 'cuota')
  })

  await t.test('un origen tiene un tope de lecturas por hora', async () => {
    const { visto } = montar({ nuevo: lee, viejo: lee })

    for (let i = 0; i < TOPE_POR_HORA; i++) await pedir()
    assert.equal(visto.modelos.length, TOPE_POR_HORA)

    const res = await pedir()
    assert.equal(res.cuerpo.error, 'muchas')
    assert.equal(visto.modelos.length, TOPE_POR_HORA, 'la que pasa del tope no llega a Google')

    const otro = await pedir({ 'x-forwarded-for': '190.0.0.2' })
    assert.equal(otro.codigo, 200, 'el tope es de cada origen, no de todos')
  })

  await t.test('esperar en la cola no gasta del tope', async () => {
    const { redis } = montar({ nuevo: PASO_EL_MINUTO, viejo: PASO_EL_MINUTO })

    await pedir()
    for (let i = 0; i < TOPE_POR_HORA + 5; i++) await pedir()

    const res = await pedir()
    assert.equal(res.cuerpo.error, 'cola', 'sigue en la cola, no expulsado por insistir')
    const deOrigen = [...redis.llaves.keys()].filter((llave) => llave.includes(':de:'))
    assert.equal(redis.llaves.get(deOrigen[0]).valor, '1', 'solo conto la que llego a Google')
  })

  await t.test('la IP no se guarda: se guarda una huella', async () => {
    const { redis } = montar({ nuevo: lee, viejo: lee })
    await pedir()

    const llaves = [...redis.llaves.keys()].join(' ')
    assert.ok(!llaves.includes('190.0.0.1'))
    assert.match(llaves, /mp:lector:de:[0-9a-f]{16}/)
  })

  await t.test('se cuenta como acabo cada lectura y quien la contesto', async () => {
    const { redis } = montar({ nuevo: PASO_EL_MINUTO, viejo: lee })
    await pedir()
    await pedir()

    assert.deepEqual(redis.delDia(), {
      'minuto:nuevo': 1,
      ok: 2,
      llamadas: 3,
      'con:viejo': 2,
    })
  })

  await t.test('si el almacen se cae, se lee igual', async () => {
    globalThis.fetch = async (url) => {
      if (String(url).startsWith(ALMACEN)) throw new Error('ECONNRESET')
      return lee()
    }
    const res = await pedir()
    assert.equal(res.codigo, 200)
  })
})
