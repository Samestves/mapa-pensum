import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { TODAS, buscarCarreras, carreraPropia, tipoDe } from './portada.js'

const CARRERAS = [
  { slug: 'sistemas', nombre: 'Ingeniería de Sistemas' },
  { slug: 'petroleo', nombre: 'Ingeniería de Petróleo' },
  { slug: 'contaduria', nombre: 'Licenciatura en Contaduría Pública' },
  { slug: 'rrhh', nombre: 'Gerencia de Recursos Humanos' },
]
const slugs = (lista) => lista.map((c) => c.slug)

describe('los grupos de la portada', () => {
  test('el tipo sale del principio del nombre oficial', () => {
    assert.equal(tipoDe(CARRERAS[0]), 'Ingeniería')
    assert.equal(tipoDe(CARRERAS[2]), 'Licenciatura')
    assert.equal(tipoDe(CARRERAS[3]), 'Gerencia')
    assert.equal(tipoDe({ nombre: 'Medicina' }), null)
  })

  test('filtrar por tipo deja solo las de ese grupo', () => {
    assert.deepEqual(slugs(buscarCarreras(CARRERAS, '', 'Ingeniería')), ['sistemas', 'petroleo'])
    assert.deepEqual(slugs(buscarCarreras(CARRERAS, '', TODAS)), slugs(CARRERAS))
  })
})

describe('el buscador', () => {
  test('no distingue tildes ni mayusculas', () => {
    assert.deepEqual(slugs(buscarCarreras(CARRERAS, 'PETROLEO')), ['petroleo'])
    assert.deepEqual(slugs(buscarCarreras(CARRERAS, 'contaduría')), ['contaduria'])
  })

  test('cada palabra tiene que estar, en cualquier orden', () => {
    assert.deepEqual(slugs(buscarCarreras(CARRERAS, 'sistemas ing')), ['sistemas'])
    assert.deepEqual(slugs(buscarCarreras(CARRERAS, 'ing humanos')), [])
  })

  test('busca dentro del tipo elegido', () => {
    assert.deepEqual(slugs(buscarCarreras(CARRERAS, 'de', 'Gerencia')), ['rrhh'])
  })
})

describe('la carrera de quien vuelve', () => {
  const conMarcas = (slug) => slug === 'contaduria'

  test('manda la ultima abierta', () => {
    assert.equal(carreraPropia(CARRERAS, 'petroleo', conMarcas), 'petroleo')
  })

  test('sin ultima, la primera con materias marcadas', () => {
    assert.equal(carreraPropia(CARRERAS, null, conMarcas), 'contaduria')
  })

  test('una ultima que ya no existe no cuenta', () => {
    assert.equal(
      carreraPropia(CARRERAS, 'medicina', () => false),
      null,
    )
  })
})
