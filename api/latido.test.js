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
      movil: false,
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

  test('las marcas y los minutos se acotan a algo creible', () => {
    const latido = validarLatido({
      tipo: 'cierre',
      id: 'abcdefgh1234',
      vistas: ['mapa'],
      marcas: 9999,
      minutos: -3,
    })
    assert.equal(latido.marcas, 200, 'el tope de marcas por visita')
    assert.equal(latido.minutos, 0, 'una duracion negativa no existe')
  })

  test('un cierre sin nada que contar no se guarda', () => {
    assert.equal(
      validarLatido({ tipo: 'cierre', id: 'abcdefgh1234', carreras: [], materias: [] }),
      null,
    )
  })
})

describe('los comandos', () => {
  const inicio = { tipo: 'inicio', id: 'abcdefgh1234', nuevo: true, pwa: true, movil: true }

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

  test('el inicio guarda la hora y el aparato', () => {
    const comandos = comandosDe(inicio, '2026-09-15', 21)
    assert.ok(
      comandos.some((c) => c[0] === 'HINCRBY' && c[1] === 'mp:horas:2026-09-15' && c[2] === '21'),
    )
    assert.ok(
      comandos.some((c) => c[1] === 'mp:aparato:2026-09' && c[2] === 'movil'),
      'desde un telefono cuenta como movil',
    )
    assert.ok(
      comandosDe({ ...inicio, movil: false }, '2026-09-15', 9).some((c) => c[2] === 'escritorio'),
    )
  })

  test('los minutos caen en su tramo y las marcas se suman', () => {
    const tramos = (minutos) =>
      comandosDe(
        {
          tipo: 'cierre',
          id: 'abcdefgh1234',
          carreras: [],
          vistas: ['mapa'],
          materias: [],
          marcas: 3,
          minutos,
        },
        '2026-09-15',
      ).filter((c) => c[1] === 'mp:duracion:2026-09')
    assert.equal(tramos(0)[0][2], '0-1')
    assert.equal(tramos(2)[0][2], '1-3')
    assert.equal(tramos(7)[0][2], '3-10')
    assert.equal(tramos(45)[0][2], '10+')

    const conMarcas = comandosDe(
      {
        tipo: 'cierre',
        id: 'abcdefgh1234',
        carreras: [],
        vistas: [],
        materias: [],
        marcas: 3,
        minutos: 1,
      },
      '2026-09-15',
    )
    assert.ok(
      conMarcas.some((c) => c[1] === 'mp:acciones:2026-09' && c[2] === 'marcas' && c[3] === '3'),
    )
  })

  test('el cierre suma por mes y por dia, el calor por carrera y la ficha del aparato', () => {
    const comandos = comandosDe(
      {
        tipo: 'cierre',
        id: 'abcdefgh1234',
        carreras: ['ingenieria-de-sistemas'],
        vistas: ['lista'],
        materias: ['ingenieria-de-sistemas/0081814'],
        marcas: 0,
        minutos: 4,
      },
      '2026-09-15',
    )
    assert.deepEqual(comandos, [
      ['HINCRBY', 'mp:carreras:2026-09', 'ingenieria-de-sistemas', '1'],
      ['INCR', 'mp:ca:ingenieria-de-sistemas:2026-09-15'],
      ['PFADD', 'mp:cu:ingenieria-de-sistemas:2026-09-15', 'abcdefgh1234'],
      ['HINCRBY', 'mp:vistas:2026-09', 'lista', '1'],
      ['ZINCRBY', 'mp:calor:ingenieria-de-sistemas', '1', '0081814'],
      ['HINCRBY', 'mp:duracion:2026-09', '3-10', '1'],
      ['HINCRBY', 'mp:ap:carreras', 'abcdefgh1234|ingenieria-de-sistemas', '1'],
      ['HINCRBY', 'mp:ap:minutos', 'abcdefgh1234', '4'],
    ])
  })

  test('las marcas por carrera se suman a su carrera y al total', () => {
    const latido = validarLatido({
      tipo: 'cierre',
      id: 'abcdefgh1234',
      carreras: ['ingenieria-de-sistemas'],
      marcas: { 'ingenieria-de-sistemas': 5, 'NO VALE': 3 },
    })
    assert.equal(latido.marcas, 5)
    assert.deepEqual(latido.marcasPor, { 'ingenieria-de-sistemas': 5 })
    const comandos = comandosDe({ ...latido, minutos: 0 }, '2026-09-15')
    assert.ok(
      comandos.some(
        (c) => c[1] === 'mp:cm:2026-09' && c[2] === 'ingenieria-de-sistemas' && c[3] === '5',
      ),
    )
    assert.ok(comandos.some((c) => c[1] === 'mp:ap:marcas' && c[3] === '5'))
  })
})

describe('la ficha de cada aparato', () => {
  const aparato = { tipo: 'telefono', so: 'Android', modelo: 'Galaxy A54', pais: 'VE' }
  const inicio = {
    tipo: 'inicio',
    id: 'abcdefgh1234',
    nuevo: false,
    pwa: true,
    movil: true,
    aparato,
  }
  const ahora = Date.parse('2026-09-15T22:00:00Z')

  test('el inicio guarda la ficha, la primera vez, las visitas y el orden por ultima visita', () => {
    const comandos = comandosDe(inicio, '2026-09-15', 18, ahora)
    const ficha = comandos.find((c) => c[0] === 'HSET' && c[1] === 'mp:ap')
    assert.equal(ficha[2], 'abcdefgh1234')
    assert.deepEqual(JSON.parse(ficha[3]), {
      ...aparato,
      pwa: true,
      ultima: '2026-09-15T22:00:00.000Z',
    })
    assert.deepEqual(
      comandos.find((c) => c[0] === 'HSETNX'),
      ['HSETNX', 'mp:ap:primera', 'abcdefgh1234', '~2026-09-15T22:00:00.000Z'],
      'ya tenia identificador: viene de antes, no es nuevo',
    )
    const deVerdad = comandosDe({ ...inicio, nuevo: true }, '2026-09-15', 18, ahora)
    assert.equal(deVerdad.find((c) => c[0] === 'HSETNX')[3], '2026-09-15T22:00:00.000Z')
    assert.deepEqual(
      comandos.find((c) => c[1] === 'mp:ap:vistos'),
      ['ZADD', 'mp:ap:vistos', String(ahora), 'abcdefgh1234'],
    )
  })

  test('un aparato del dueño actualiza su ficha y no entra en ningun total', () => {
    const suyo = validarLatido({ tipo: 'inicio', id: 'abcdefgh1234', yo: true })
    assert.equal(suyo.yo, true)
    const comandos = comandosDe({ ...suyo, aparato }, '2026-09-15', 18, ahora)
    assert.ok(
      comandos.every((c) => c[1].startsWith('mp:ap')),
      'solo claves de la ficha',
    )
    assert.equal(JSON.parse(comandos.find((c) => c[0] === 'HSET')[3]).yo, true)

    const cierre = comandosDe(
      {
        tipo: 'cierre',
        id: 'abcdefgh1234',
        yo: true,
        carreras: ['ingenieria-de-sistemas'],
        vistas: ['mapa'],
        materias: ['ingenieria-de-sistemas/0081814'],
        marcas: 2,
        minutos: 3,
      },
      '2026-09-15',
    )
    assert.ok(
      cierre.every((c) => c[1].startsWith('mp:ap')),
      'ni calor, ni carreras, ni duracion',
    )
  })

  test('la ficha que manda el navegador pasa solo si es un objeto', () => {
    assert.equal(
      validarLatido({ tipo: 'inicio', id: 'abcdefgh1234', ficha: 'texto' }).ficha,
      undefined,
    )
    assert.deepEqual(
      validarLatido({ tipo: 'inicio', id: 'abcdefgh1234', ficha: { zona: 'America/Caracas' } })
        .ficha,
      {
        zona: 'America/Caracas',
      },
    )
  })
})
