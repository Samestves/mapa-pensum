import test from 'node:test'
import assert from 'node:assert/strict'
import { leerCuota } from './_cuota.js'

/* El 429 de Google con la forma que trae de verdad: la cuota que se paso va
   en QuotaFailure y la espera en RetryInfo. */
const de429 = ({ cuota, espera, mensaje = 'You exceeded your current quota' }) =>
  JSON.stringify({
    error: {
      code: 429,
      message: mensaje,
      status: 'RESOURCE_EXHAUSTED',
      details: [
        { '@type': 'type.googleapis.com/google.rpc.Help', links: [] },
        cuota && {
          '@type': 'type.googleapis.com/google.rpc.QuotaFailure',
          violations: [{ quotaId: cuota, quotaValue: '20' }],
        },
        espera && { '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: espera },
      ].filter(Boolean),
    },
  })

test('el limite por minuto dice cuanto esperar', () => {
  const leido = leerCuota(
    de429({ cuota: 'GenerateRequestsPerMinutePerProjectPerModel-FreeTier', espera: '37s' }),
  )
  assert.deepEqual(leido, { porDia: false, espera: 37 })
})

test('los segundos con decimales se redondean hacia arriba', () => {
  const leido = leerCuota(
    de429({ cuota: 'GenerateRequestsPerMinutePerProjectPerModel-FreeTier', espera: '12.2s' }),
  )
  assert.equal(leido.espera, 13, 'volver un instante antes es volver a chocar')
})

test('el limite de tokens por minuto tambien es por minuto', () => {
  const leido = leerCuota(
    de429({ cuota: 'GenerateContentInputTokensPerModelPerMinute-FreeTier', espera: '20s' }),
  )
  assert.equal(leido.porDia, false)
})

test('el limite por dia se distingue, que es el que no se arregla esperando', () => {
  const leido = leerCuota(
    de429({ cuota: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier', espera: '41s' }),
  )
  assert.equal(leido.porDia, true)
})

test('la espera se acota: ni volver a chocar ni tener a nadie esperando de mas', () => {
  const corta = leerCuota(de429({ cuota: 'GenerateRequestsPerMinute', espera: '0.4s' }))
  const larga = leerCuota(de429({ cuota: 'GenerateRequestsPerMinute', espera: '3600s' }))
  assert.equal(corta.espera, 5)
  assert.equal(larga.espera, 60)
})

test('sin detalles, la espera sale del mensaje', () => {
  const leido = leerCuota(
    de429({ mensaje: 'Quota exceeded for metric x, limit: 20. Please retry in 18.71s.' }),
  )
  assert.deepEqual(leido, { porDia: false, espera: 19 })
})

test('sin detalles, el limite por dia tambien se reconoce en el mensaje', () => {
  const leido = leerCuota(
    de429({ mensaje: 'Quota exceeded: GenerateRequestsPerDayPerProjectPerModel-FreeTier' }),
  )
  assert.equal(leido.porDia, true)
})

test('una respuesta que no es JSON se toma por un limite por minuto', () => {
  assert.deepEqual(leerCuota('Too Many Requests'), { porDia: false, espera: 30 })
  assert.deepEqual(leerCuota(''), { porDia: false, espera: 30 })
})
