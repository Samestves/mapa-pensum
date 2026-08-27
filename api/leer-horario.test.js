import test from 'node:test'
import assert from 'node:assert/strict'
import handler from './leer-horario.js'

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
    headers: { host: 'mapa-pensum.vercel.app', origin: 'https://mapa-pensum.vercel.app', ...cabeceras },
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
    const { req, res } = llamar(cuerpoValido(), { cabeceras: { origin: undefined, referer: undefined } })
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
    /* El modulo lee el modelo al cargarse, asi que hay que traerlo de nuevo
       para que vea la variable: es la unica forma de comprobar que se puede
       cambiar sin desplegar codigo, que es justo para lo que existe. */
    const { default: otro } = await import('./leer-horario.js?nuevo=1')
    const visto = conFetch(respuestaDeGoogle('{"clases":[]}'))
    const { req, res } = llamar(cuerpoValido())
    await otro(req, res)

    assert.ok(String(visto.url).includes('modelo-inventado'))
    delete process.env.GOOGLE_AI_MODELO
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
            { codigo: '0081814', nombre: 'MATEMATICAS I', dia: 'Lunes', inicio: '07:00', fin: '08:40' },
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

  await t.test('la red caida se distingue de un fallo del modelo', async () => {
    globalThis.fetch = async () => {
      throw new Error('getaddrinfo ENOTFOUND')
    }
    const { req, res } = llamar(cuerpoValido())
    await handler(req, res)
    assert.equal(res.cuerpo.error, 'red')
  })

  await t.test('un horario absurdamente largo se corta', async () => {
    const muchas = Array.from({ length: 200 }, () => ({ nombre: 'X', dia: 'Lunes', inicio: '07:00', fin: '08:00' }))
    conFetch(respuestaDeGoogle(JSON.stringify({ clases: muchas })))
    const { req, res } = llamar(cuerpoValido())
    await handler(req, res)
    assert.equal(res.cuerpo.clases.length, 60)
  })
})
