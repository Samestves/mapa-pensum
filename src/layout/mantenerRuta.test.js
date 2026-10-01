import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ESPERA_MS,
  FIJA_MS,
  HOLGURA_PRECISA_PX,
  HOLGURA_TACTIL_PX,
  esToque,
  holguraDe,
  mantenerRuta,
} from './mantenerRuta.js'

const apoya = (extra = {}) => ({
  tipo: 'apoya',
  dedo: 1,
  x: 100,
  y: 100,
  t: 0,
  codigo: '0081824',
  dedos: 1,
  ...extra,
})

/* Pasa una lista de eventos por el reducer, desde nada */
const tras = (...eventos) => eventos.reduce(mantenerRuta, null)

test('mantener una tarjeta para fijar su ruta', async (t) => {
  await t.test('apoyar el dedo en una tarjeta empieza a cargar', () => {
    const e = tras(apoya())
    assert.equal(e.fase, 'cargando')
    assert.equal(e.codigo, '0081824')
  })

  await t.test('apoyar fuera de una tarjeta no carga nada', () => {
    assert.equal(tras(apoya({ codigo: null })), null)
  })

  await t.test('soltar antes de tiempo era un toque: no queda nada', () => {
    assert.equal(tras(apoya(), { tipo: 'suelta', dedo: 1 }), null)
  })

  await t.test('el temblor del dedo no cancela la carga', () => {
    const casi = HOLGURA_TACTIL_PX - 0.5
    const e = tras(apoya(), { tipo: 'mueve', dedo: 1, x: 100 + casi, y: 100 })
    assert.equal(e?.fase, 'cargando')
  })

  await t.test('moverse mas que la holgura era un arrastre', () => {
    const e = tras(apoya(), { tipo: 'mueve', dedo: 1, x: 106, y: 106 })
    assert.equal(e, null, '8,5 px en diagonal ya es arrastrar')
  })

  await t.test('un segundo dedo es un pellizco y suelta la carga', () => {
    assert.equal(tras(apoya(), apoya({ dedo: 2, dedos: 2 })), null)
  })

  await t.test('lo que haga otro dedo no toca la carga del primero', () => {
    const e = tras(apoya(), { tipo: 'mueve', dedo: 2, x: 400, y: 400 }, { tipo: 'suelta', dedo: 2 })
    assert.equal(e?.fase, 'cargando')
  })

  await t.test('al cumplir el tiempo la ruta queda fijada', () => {
    const e = tras(apoya(), { tipo: 'cumple' })
    assert.equal(e.fase, 'hecha')
    assert.equal(e.codigo, '0081824')
  })

  await t.test('una vez fijada, soltar y mover ya no la deshacen', () => {
    const e = tras(apoya(), { tipo: 'cumple' }, { tipo: 'mueve', dedo: 1, x: 300, y: 300 }, {
      tipo: 'suelta',
      dedo: 1,
    })
    assert.equal(e.fase, 'hecha')
  })

  await t.test('cumplir sin estar cargando no inventa una ruta', () => {
    assert.equal(tras({ tipo: 'cumple' }), null)
    assert.equal(tras(apoya(), { tipo: 'suelta', dedo: 1 }, { tipo: 'cumple' }), null)
  })

  await t.test('el contorno se apaga solo despues de cumplir', () => {
    assert.equal(tras(apoya(), { tipo: 'cumple' }, { tipo: 'apaga' }), null)
    assert.equal(tras(apoya(), { tipo: 'apaga' })?.fase, 'cargando')
  })

  await t.test('mantener otra tarjeta mientras la anterior se apaga empieza de nuevo', () => {
    const e = tras(apoya(), { tipo: 'cumple' }, apoya({ codigo: '0082814', t: 900 }))
    assert.equal(e.fase, 'cargando')
    assert.equal(e.codigo, '0082814')
  })

  await t.test('un evento que no cambia nada devuelve el mismo objeto', () => {
    /* Es lo que evita un repintado por cada movimiento del dedo */
    const e = tras(apoya())
    assert.equal(mantenerRuta(e, { tipo: 'mueve', dedo: 1, x: 101, y: 101 }), e)
  })

  await t.test('soltar antes de que asome el contorno es un toque', () => {
    assert.equal(esToque(tras(apoya()), ESPERA_MS - 1), true)
  })

  await t.test('soltar con el contorno a medias no es un toque: no abre la ficha', () => {
    assert.equal(esToque(tras(apoya()), ESPERA_MS), false)
    assert.equal(esToque(tras(apoya()), FIJA_MS - 10), false)
  })

  await t.test('sin pulsacion en curso, soltar es lo de siempre', () => {
    /* Un toque en el vacio, o un dedo que ya arrastraba */
    assert.equal(esToque(null, 1000), true)
  })

  await t.test('la holgura es de dedo solo para el dedo', () => {
    assert.equal(holguraDe('touch'), HOLGURA_TACTIL_PX)
    assert.equal(holguraDe('mouse'), HOLGURA_PRECISA_PX)
    assert.equal(holguraDe('pen'), HOLGURA_PRECISA_PX)
  })

  await t.test('fijar es rapido: medio segundo, como mantener en cualquier telefono', () => {
    assert.ok(FIJA_MS >= 400 && FIJA_MS <= 600, `${FIJA_MS} ms`)
  })
})
