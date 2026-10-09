import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import handler, { ultimosDias, ultimosMeses } from './panel.js'

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
