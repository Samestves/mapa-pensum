import { test, describe, afterEach, mock } from 'node:test'
import assert from 'node:assert/strict'
import handler, { ultimosDias, ultimosMeses } from './panel.js'
import { PREFIJO, fechaDe } from './latido.js'

/* Un res de mentira: guarda lo que le mandan en vez de escribir en la red */
function respuesta() {
  const r = { codigo: null, cuerpo: null }
  r.status = (c) => {
    r.codigo = c
    return r
  }
  r.json = (v) => {
    r.cuerpo = v
    return r
  }
  r.end = () => r
  return r
}

describe('los rangos de fechas', () => {
  test('los dias cruzan el cambio de mes hacia atras', () => {
    assert.deepEqual(ultimosDias(3, '2026-03-01'), ['2026-02-27', '2026-02-28', '2026-03-01'])
  })

  test('y el año, contando bien los bisiestos', () => {
    assert.deepEqual(ultimosDias(2, '2024-03-01'), ['2024-02-29', '2024-03-01'])
    assert.deepEqual(ultimosDias(2, '2026-01-01'), ['2025-12-31', '2026-01-01'])
  })

  test('los meses acaban en el actual', () => {
    assert.deepEqual(ultimosMeses(3, '2026-01-15'), ['2025-11', '2025-12', '2026-01'])
  })
})

/* En Vercel el build lleva puestas las variables del almacen, y con ellas la
   prueba que pasa la puerta leia el Redis de produccion en cada despliegue.
   Aqui lo que se prueba es la puerta: sin almacen contesta que no lo hay, que
   tampoco es un 401. */
for (const variable of [
  'KV_REST_API_URL',
  'KV_REST_API_TOKEN',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
]) {
  delete process.env[variable]
}

/* La peticion como la manda el panel: la clave en Authorization, no en la URL */
const pedido = (clave, query = {}) => ({
  method: 'GET',
  query,
  headers: clave === undefined ? {} : { authorization: `Bearer ${clave}` },
})

describe('la puerta del panel', () => {
  test('sin clave configurada no se puede entrar ni acertando', async () => {
    delete process.env.PANEL_CLAVE
    const res = respuesta()
    await handler(pedido('loquesea'), res)
    assert.equal(res.codigo, 503)
    assert.equal(res.cuerpo.error, 'sin-clave')
  })

  test('con la clave equivocada, 401', async () => {
    process.env.PANEL_CLAVE = 'la-buena-de-verdad'
    for (const intento of ['otra', 'la-buena-de-verda', 'LA-BUENA-DE-VERDAD', undefined]) {
      const res = respuesta()
      await handler(pedido(intento), res)
      assert.equal(res.codigo, 401, `deberia rechazar «${intento}»`)
    }
  })

  test('con la clave buena pasa la puerta, y ahi ya depende del almacen', async () => {
    process.env.PANEL_CLAVE = 'la-buena-de-verdad'
    const res = respuesta()
    await handler(pedido('la-buena-de-verdad'), res)
    assert.notEqual(res.codigo, 401)
  })

  test('?clave= en la URL ya no autoriza, aunque sea la buena', async () => {
    process.env.PANEL_CLAVE = 'la-buena-de-verdad'
    const res = respuesta()
    await handler({ method: 'GET', query: { clave: 'la-buena-de-verdad' }, headers: {} }, res)
    assert.equal(res.codigo, 401)
  })

  test('la clave tiene que ir como Bearer; otro esquema no vale', async () => {
    process.env.PANEL_CLAVE = 'la-buena-de-verdad'
    const cabeceras = [
      'Basic la-buena-de-verdad',
      'Bearer',
      'la-buena-de-verdad',
      'Bearer  la-buena-de-verdad-y-mas',
    ]
    for (const authorization of cabeceras) {
      const res = respuesta()
      await handler({ method: 'GET', query: {}, headers: { authorization } }, res)
      assert.equal(res.codigo, 401, `deberia rechazar «${authorization}»`)
    }
  })

  test('una clave con tildes de la misma longitud en caracteres no rompe la comparacion', async () => {
    process.env.PANEL_CLAVE = 'la-buena-de-verdad'
    const res = respuesta()
    await handler(pedido('la-buena-de-verdád'), res)
    assert.equal(res.codigo, 401)
  })

  test('solo se lee: cualquier otro metodo se rechaza', async () => {
    const res = respuesta()
    await handler({ method: 'POST', query: {} }, res)
    assert.equal(res.codigo, 405)
  })
})

const k = (...partes) => [PREFIJO, ...partes].join(':')

/* Un almacen de mentira: contesta a los comandos de horarios con `datos` y al
   resto con null, que es lo que da una clave vacia. Cuenta las peticiones. */
function almacenCon(datos = {}) {
  process.env.KV_REST_API_URL = 'https://almacen.falso'
  process.env.KV_REST_API_TOKEN = 'falso'
  return mock.method(globalThis, 'fetch', async (_url, { body }) => {
    const resultados = JSON.parse(body).map(([, clave, ...campos]) => {
      if (clave === k('horario', 'hechos')) return datos.hechos ?? 0
      if (clave === k('horario', 'creados')) return campos.map((f) => datos.creados?.[f] ?? null)
      if (clave === k('horario', 'origen')) return campos.map((f) => datos.origen?.[f] ?? null)
      return null
    })
    return { ok: true, json: async () => resultados.map((result) => ({ result })) }
  })
}

describe('los horarios en el panel', () => {
  afterEach(() => {
    mock.restoreAll()
    delete process.env.KV_REST_API_URL
    delete process.env.KV_REST_API_TOKEN
  })

  test('con datos, cuenta los horarios, los creados de los dias y su origen', async () => {
    process.env.PANEL_CLAVE = 'la-buena-de-verdad'
    const [ayer, hoy] = ultimosDias(2, fechaDe()).slice(-2)
    const almacen = almacenCon({
      hechos: 42,
      creados: { [ayer]: 5, [hoy]: 3 },
      origen: { foto: '7', mano: '35' },
    })
    const res = respuesta()
    await handler(pedido('la-buena-de-verdad'), res)

    assert.equal(res.codigo, 200)
    assert.equal(almacen.mock.callCount(), 1, 'los horarios van en la tanda de siempre')
    const { horarios, dias } = res.cuerpo
    assert.equal(horarios.hechos, 42)
    assert.equal(horarios.creados, 8)
    assert.equal(horarios.porDia.at(-2), 5)
    assert.equal(horarios.porDia.at(-1), 3)
    assert.equal(horarios.foto, 7)
    assert.equal(horarios.mano, 35)
    assert.equal(horarios.porDia.length, dias.length)
  })

  test('sin datos, todo son ceros', async () => {
    process.env.PANEL_CLAVE = 'la-buena-de-verdad'
    almacenCon()
    const res = respuesta()
    await handler(pedido('la-buena-de-verdad'), res)

    assert.equal(res.codigo, 200)
    assert.deepEqual(res.cuerpo.horarios, {
      hechos: 0,
      creados: 0,
      porDia: new Array(30).fill(0),
      foto: 0,
      mano: 0,
    })
  })

  test('porDia tiene un numero por cada dia que devuelve el panel', async () => {
    process.env.PANEL_CLAVE = 'la-buena-de-verdad'
    almacenCon({ creados: { [fechaDe()]: 2 } })
    const res = respuesta()
    await handler(pedido('la-buena-de-verdad', { dias: '14' }), res)

    assert.equal(res.codigo, 200)
    assert.equal(res.cuerpo.dias.length, 14)
    assert.equal(res.cuerpo.horarios.porDia.length, 14)
  })
})
