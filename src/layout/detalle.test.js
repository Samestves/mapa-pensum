import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ELDETALLE_SE_APAGA_ALGUNA_VEZ,
  ZOOM_CON_DETALLE,
  alturaDelNombre,
  hayDetalle,
} from './detalle.js'
import { ZOOM } from './constantes.js'

test('cuando el mapa deja de dibujar el detalle', async (t) => {
  await t.test('el umbral es donde el nombre baja de 5,5 px', () => {
    assert.ok(Math.abs(alturaDelNombre(ZOOM_CON_DETALLE) - 5.5) < 0.001)
  })

  await t.test('justo por encima hay detalle, justo por debajo no', () => {
    assert.equal(hayDetalle(ZOOM_CON_DETALLE), true)
    assert.equal(hayDetalle(ZOOM_CON_DETALLE - 0.001), false)
  })

  await t.test('encajado en un telefono NO hay detalle', () => {
    /* Es el caso que rompia el mapa: el TECNO KI7 encaja el pensum entero a
       escala 0,09 y ahi el nombre mide 1,2 px. */
    assert.equal(hayDetalle(0.09), false)
    assert.ok(alturaDelNombre(0.09) < 1.5)
  })

  await t.test('leyendo una materia SI hay detalle', () => {
    assert.equal(hayDetalle(1), true)
    assert.equal(hayDetalle(0.6), true)
  })

  await t.test('el detalle se apaga alguna vez, o esto no sirve de nada', () => {
    /* Si alguien subiera ZOOM.min por encima del umbral, el detalle no se
       apagaria nunca y el fallo volveria sin que nadie tocase esta regla. */
    assert.ok(
      ELDETALLE_SE_APAGA_ALGUNA_VEZ,
      `el zoom minimo (${ZOOM.min}) esta por encima del umbral (${ZOOM_CON_DETALLE.toFixed(3)})`,
    )
  })

  await t.test('no se apaga en todo el rango util, que seria lo contrario', () => {
    assert.ok(hayDetalle(ZOOM.max), 'al maximo zoom tiene que haber detalle')
  })
})
