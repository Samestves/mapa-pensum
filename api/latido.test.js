import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { comandosDe, fechaDe, semanaDe, validarLatido } from './latido.js'

describe('las fechas', () => {
  test('el dia se corta a la medianoche de Monagas, no a la del servidor', () => {
    // 03:30 UTC del dia 16 son las 23:30 del 15 en Venezuela (UTC-4)
    assert.equal(fechaDe(new Date('2026-09-16T03:30:00Z')), '2026-09-15')
    assert.equal(fechaDe(new Date('2026-09-16T05:30:00Z')), '2026-09-16')
  })

  test('la semana es la ISO: empieza en lunes y la del 1 de enero puede ser del año anterior', () => {
    assert.equal(semanaDe('2026-09-14'), '2026-W38')
    assert.equal(semanaDe('2026-09-20'), '2026-W38', 'el domingo cierra la misma semana')
    assert.equal(semanaDe('2026-09-21'), '2026-W39')
    assert.equal(semanaDe('2027-01-01'), '2026-W53')
  })
})

describe('lo que se acepta', () => {
  test('sin un identificador con forma de identificador, no hay latido', () => {
    assert.equal(validarLatido({ tipo: 'inicio' }), null)
    assert.equal(validarLatido({ tipo: 'inicio', id: 'corto' }), null)
    assert.equal(validarLatido({ tipo: 'inicio', id: 'a'.repeat(64) }), null)
    assert.equal(validarLatido(null), null)
  })

  test('un tipo que no conocemos se descarta', () => {
    assert.equal(validarLatido({ tipo: 'otra-cosa', id: 'abcdefgh1234' }), null)
  })

  test('del inicio solo salen banderas, y por defecto en falso', () => {
    assert.deepEqual(validarLatido({ tipo: 'inicio', id: 'abcdefgh1234', pwa: 'si' }), {
      tipo: 'inicio',
      id: 'abcdefgh1234',
      nuevo: false,
      pwa: false,
    })
  })

  test('el cierre filtra lo que no tiene forma valida y recorta a los topes', () => {
    const latido = validarLatido({
      tipo: 'cierre',
      id: 'abcdefgh1234',
      carreras: ['ingenieria-de-sistemas', 'NO VALE', 1],
      vistas: ['mapa', 'inventada'],
      materias: Array.from({ length: 20 }, (_, i) => `ingenieria-de-sistemas/008181${i}`),
    })
    assert.deepEqual(latido.carreras, ['ingenieria-de-sistemas'])
    assert.deepEqual(latido.vistas, ['mapa'])
    assert.equal(latido.materias.length, 12, 'doce materias como mucho por visita')
  })

  test('un cierre sin nada que contar no se guarda', () => {
    assert.equal(validarLatido({ tipo: 'cierre', id: 'abcdefgh1234', carreras: [], materias: [] }), null)
  })
})

describe('los comandos', () => {
  const inicio = { tipo: 'inicio', id: 'abcdefgh1234', nuevo: true, pwa: true }

  test('el inicio cuenta al visitante en el dia, la semana y el mes', () => {
    const comandos = comandosDe(inicio, '2026-09-15')
    assert.deepEqual(
      comandos.filter((c) => c[0] === 'PFADD').map((c) => c[1]),
      ['mp:u:2026-09-15', 'mp:u:s:2026-W38', 'mp:u:m:2026-09'],
    )
    assert.ok(comandos.every((c) => c.at(-1) === 'abcdefgh1234' || c[0] !== 'PFADD'))
  })

  test('nuevos y pwa solo se cuentan cuando toca', () => {
    const claves = (l) => comandosDe(l, '2026-09-15').map((c) => c[1])
    assert.ok(claves(inicio).includes('mp:nuevos:2026-09-15'))
    assert.ok(claves(inicio).includes('mp:pwa:2026-09-15'))
    const repetido = { ...inicio, nuevo: false, pwa: false }
    assert.ok(!claves(repetido).some((k) => k.startsWith('mp:nuevos') || k.startsWith('mp:pwa')))
  })

  test('el cierre suma por mes, y el calor por carrera con el codigo suelto', () => {
    const comandos = comandosDe(
      {
        tipo: 'cierre',
        id: 'abcdefgh1234',
        carreras: ['ingenieria-de-sistemas'],
        vistas: ['lista'],
        materias: ['ingenieria-de-sistemas/0081814'],
      },
      '2026-09-15',
    )
    assert.deepEqual(comandos, [
      ['HINCRBY', 'mp:carreras:2026-09', 'ingenieria-de-sistemas', '1'],
      ['HINCRBY', 'mp:vistas:2026-09', 'lista', '1'],
      ['ZINCRBY', 'mp:calor:ingenieria-de-sistemas', '1', '0081814'],
    ])
  })
})
