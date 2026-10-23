import { test, describe, afterEach, mock } from 'node:test'
import assert from 'node:assert/strict'
import { pedir } from './_almacen.js'
import { probarEscritura } from './panel.js'

/* Un Upstash de mentira: cada comando contesta lo que diga `responder`, que
   devuelve { result } o { error } como el de verdad */
function almacen(responder) {
  process.env.KV_REST_API_URL = 'https://almacen.falso'
  process.env.KV_REST_API_TOKEN = 'falso'
  return mock.method(globalThis, 'fetch', async (_url, { body }) => ({
    ok: true,
    json: async () => JSON.parse(body).map(responder),
  }))
}

/* Lo que contesta Upstash a una escritura con el token de solo lectura */
const SOLO_LECTURA = 'NOPERM this user has no permissions to run the command'

afterEach(() => {
  mock.restoreAll()
  delete process.env.KV_REST_API_URL
  delete process.env.KV_REST_API_TOKEN
})

describe('pedir', () => {
  test('devuelve el resultado de cada comando', async () => {
    almacen(([orden]) => ({ result: orden === 'GET' ? '7' : 'OK' }))
    assert.deepEqual(
      await pedir([
        ['GET', 'a'],
        ['SET', 'b', '1'],
      ]),
      ['7', 'OK'],
    )
  })

  test('si Redis rechaza un comando lanza con su motivo, no deja un hueco', async () => {
    almacen(([orden]) => (orden === 'GET' ? { result: '7' } : { error: SOLO_LECTURA }))
    await assert.rejects(
      pedir([
        ['GET', 'a'],
        ['INCR', 'b'],
        ['SET', 'c', '1'],
      ]),
      {
        message: `Redis rechazo un comando: ${SOLO_LECTURA}`,
      },
    )
  })
})

describe('la prueba de escritura del panel', () => {
  test('con el token normal escribe', async () => {
    almacen(() => ({ result: 'OK' }))
    assert.deepEqual(await probarEscritura(), { escribe: true })
  })

  test('con el de solo lectura dice que no escribe y lo que contesto Redis', async () => {
    almacen(() => ({ error: SOLO_LECTURA }))
    assert.deepEqual(await probarEscritura(), {
      escribe: false,
      error: `Redis rechazo un comando: ${SOLO_LECTURA}`,
    })
  })
})
