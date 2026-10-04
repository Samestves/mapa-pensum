import test from 'node:test'
import assert from 'node:assert/strict'
import { FalloLectura, SALIDA, VALOR, falloDeLosDos, valorDe } from './leerHorario.js'

const CLASE = { codigo: '0001234', dia: 'Lunes', inicio: '07:00', fin: '08:35' }

test('lo que vale una lectura del aparato', async (t) => {
  await t.test('sin dudas se revisa tal cual', () => {
    assert.equal(valorDe({ clases: [CLASE], dudas: [] }), VALOR.LISTO)
  })

  await t.test('con clases y dudas es un borrador', () => {
    assert.equal(valorDe({ clases: [CLASE], dudas: ['sin-dia'] }), VALOR.BORRADOR)
  })

  await t.test('sin clases, o sin lectura, no hay nada', () => {
    assert.equal(valorDe({ clases: [], dudas: ['sin-rejilla'] }), VALOR.NADA)
    assert.equal(valorDe(undefined), VALOR.NADA)
  })
})

test('cuando no pudieron ni el aparato ni la IA', async (t) => {
  const noEsLaCaptura = { leido: { clases: [], dudas: ['sin-rejilla'] } }

  await t.test('si lo de la IA se arregla ahora, manda la IA', () => {
    for (const codigo of ['red', 'cola', 'ia', 'sin-clases', 'no-se-abre']) {
      const ia = new FalloLectura(codigo)
      assert.equal(falloDeLosDos(noEsLaCaptura, ia), ia, codigo)
    }
  })

  await t.test('sin IA por hoy, se dice lo del aparato y la IA va en la nota', () => {
    const fallo = falloDeLosDos(noEsLaCaptura, new FalloLectura('cuota'))
    assert.equal(fallo.codigo, 'formato')
    assert.equal(fallo.salida, SALIDA.OTRA_IMAGEN)
    assert.match(fallo.nota, /hoy/)
  })

  await t.test('la tabla sin codigos no es lo mismo que otra cosa', () => {
    const sinCodigos = { leido: { clases: [], dudas: ['sin-clases'] } }
    assert.equal(falloDeLosDos(sinCodigos, new FalloLectura('muchas')).codigo, 'sin-codigos')
  })

  await t.test('si el aparato no pudo leer, se dice por que, con su salida', () => {
    const sinRed = { fallo: new FalloLectura('ocr-red', { tecnico: 'Failed to fetch' }) }
    const fallo = falloDeLosDos(sinRed, new FalloLectura('modelo'))
    assert.equal(fallo.codigo, 'ocr-red')
    assert.equal(fallo.salida, SALIDA.REINTENTAR)
    assert.equal(fallo.tecnico, 'Failed to fetch')
    assert.equal(fallo.nota, 'La IA no está disponible ahora.')
  })
})
