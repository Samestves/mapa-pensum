import test from 'node:test'
import assert from 'node:assert/strict'
import {
  MOTIVO,
  comandosDeEntrada,
  comandosDePausa,
  comandosDeSalida,
  descansoPor,
  esperaDe,
  leerEntrada,
} from './_turno.js'

const MODELOS = ['nuevo', 'viejo']

test('a la entrada se pregunta por cada modelo y por el origen', () => {
  assert.deepEqual(comandosDeEntrada(MODELOS, 'abc'), [
    ['GET', 'mp:lector:pausa:nuevo'],
    ['TTL', 'mp:lector:pausa:nuevo'],
    ['GET', 'mp:lector:pausa:viejo'],
    ['TTL', 'mp:lector:pausa:viejo'],
    ['GET', 'mp:lector:de:abc'],
  ])
})

test('sin origen no se pregunta por el', () => {
  assert.equal(comandosDeEntrada(MODELOS, null).length, 4)
})

test('un almacen vacio no pausa a nadie', () => {
  // GET de una llave que no existe da null; su TTL, -2
  const { pausas, lecturas } = leerEntrada(MODELOS, 'abc', [null, -2, null, -2, null])
  assert.equal(pausas.size, 0)
  assert.equal(lecturas, 0)
})

test('se lee quien descansa, por que y cuanto le queda', () => {
  const { pausas, lecturas } = leerEntrada(MODELOS, 'abc', ['minuto', 23, 'dia', 1800, '7'])
  assert.deepEqual(pausas.get('nuevo'), { motivo: MOTIVO.MINUTO, espera: 23 })
  assert.deepEqual(pausas.get('viejo'), { motivo: MOTIVO.DIA, espera: 1800 })
  assert.equal(lecturas, 7)
})

test('la pausa por minuto dura lo que dijo Google', () => {
  assert.deepEqual(comandosDePausa('nuevo', descansoPor(MOTIVO.MINUTO, 23), '2026-10-04'), [
    ['SET', 'mp:lector:pausa:nuevo', 'minuto', 'EX', '23'],
    ['HINCRBY', 'mp:lector:dia:2026-10-04', 'minuto:nuevo', '1'],
  ])
})

test('la del dia dura una hora y la del saturado diez segundos, diga lo que diga nadie', () => {
  const [delDia] = comandosDePausa('viejo', descansoPor(MOTIVO.DIA, 23), '2026-10-04')
  const [delSaturado] = comandosDePausa('viejo', descansoPor(MOTIVO.SATURADO), '2026-10-04')
  assert.deepEqual(delDia, ['SET', 'mp:lector:pausa:viejo', 'dia', 'EX', '3600'])
  assert.deepEqual(delSaturado, ['SET', 'mp:lector:pausa:viejo', 'saturado', 'EX', '10'])
})

test('hay cola mientras a alguno le falte poco, y se espera al que antes vuelve', () => {
  const pausas = new Map([
    ['nuevo', { motivo: MOTIVO.MINUTO, espera: 40 }],
    ['viejo', { motivo: MOTIVO.SATURADO, espera: 12 }],
  ])
  assert.equal(esperaDe(pausas), 13, 'lo que le queda al primero, y un segundo de margen')
})

test('uno agotado por hoy y otro lleno un minuto sigue siendo cola', () => {
  const pausas = new Map([
    ['nuevo', { motivo: MOTIVO.DIA, espera: 1800 }],
    ['viejo', { motivo: MOTIVO.MINUTO, espera: 12 }],
  ])
  assert.equal(esperaDe(pausas), 13)
})

test('si todos agotaron el dia no hay nada que esperar', () => {
  const pausas = new Map([
    ['nuevo', { motivo: MOTIVO.DIA, espera: 1800 }],
    ['viejo', { motivo: MOTIVO.DIA, espera: 900 }],
  ])
  assert.equal(esperaDe(pausas), null)
})

test('a la salida se apunta como acabo y quien contesto', () => {
  const comandos = comandosDeSalida({
    origen: 'abc',
    resultado: 'ok',
    modelo: 'viejo',
    llamadas: 2,
    fecha: '2026-10-04',
  })
  assert.deepEqual(comandos, [
    ['SET', 'mp:lector:de:abc', '0', 'EX', '3600', 'NX'],
    ['INCR', 'mp:lector:de:abc'],
    ['HINCRBY', 'mp:lector:dia:2026-10-04', 'ok', '1'],
    ['HINCRBY', 'mp:lector:dia:2026-10-04', 'llamadas', '2'],
    ['HINCRBY', 'mp:lector:dia:2026-10-04', 'con:viejo', '1'],
  ])
})

test('quien espera en la cola no gasta de su tope: no llego a Google', () => {
  const comandos = comandosDeSalida({
    origen: 'abc',
    resultado: 'cola',
    llamadas: 0,
    fecha: '2026-10-04',
  })
  assert.deepEqual(comandos, [['HINCRBY', 'mp:lector:dia:2026-10-04', 'cola', '1']])
})
