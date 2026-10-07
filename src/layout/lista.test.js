import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ESTADO } from '../data/estados.js'
import { ALTO, altoDeFilas, altoDeGrupo, altoDeSemestre, reserva } from './alturaLista.js'
import { FILTROS, bloqueada, cuentasPorFiltro } from './filtrosLista.js'
import {
  estadoDeSemestre,
  seccionesDeGrupos,
  semestreActual,
  semestresDeLista,
} from './semestresLista.js'
import { SITUACION } from './situacion.js'

const { APROBADA, CURSANDO, DISPONIBLE, BLOQUEADA } = ESTADO

test('cada filtro deja pasar solo lo suyo', () => {
  const todas = Object.values(SITUACION)
  const entran = (id) => todas.filter(FILTROS.find((f) => f.id === id).entra)
  assert.deepEqual(entran('todo'), todas)
  assert.deepEqual(entran('disponibles'), [SITUACION.INSCRIBIBLE])
  assert.deepEqual(entran('cursando'), [SITUACION.CURSANDO])
  assert.deepEqual(entran('aprobadas'), [SITUACION.HECHA])
  assert.deepEqual(entran('pendientes'), [SITUACION.PROXIMA, SITUACION.LEJANA])
})

test('las cuentas por filtro suman cada situacion donde entra', () => {
  const situaciones = [
    SITUACION.HECHA,
    SITUACION.HECHA,
    SITUACION.CURSANDO,
    SITUACION.INSCRIBIBLE,
    SITUACION.PROXIMA,
    SITUACION.LEJANA,
  ]
  assert.deepEqual(cuentasPorFiltro(situaciones), {
    todo: 6,
    disponibles: 1,
    cursando: 1,
    pendientes: 2,
    aprobadas: 2,
  })
})

test('bloqueada es lo que aun no se puede inscribir, hoy o mas adelante', () => {
  assert.equal(bloqueada(SITUACION.PROXIMA), true)
  assert.equal(bloqueada(SITUACION.LEJANA), true)
  assert.equal(bloqueada(SITUACION.INSCRIBIBLE), false)
  assert.equal(bloqueada(SITUACION.HECHA), false)
})

test('una seccion sin filas reserva solo su cabecera', () => {
  assert.equal(altoDeFilas(0), 0)
  assert.equal(altoDeSemestre({ plegado: false, filas: 0 }), ALTO.cabecera)
})

test('las filas suman su alto y el borde de la caja una sola vez', () => {
  assert.equal(altoDeFilas(1), ALTO.fila + ALTO.caja)
  assert.equal(altoDeFilas(10), 10 * ALTO.fila + ALTO.caja)
})

test('un semestre plegado reserva su cabecera y nada mas', () => {
  assert.equal(altoDeSemestre({ plegado: true, filas: 12 }), ALTO.cabecera)
  assert.equal(altoDeSemestre({ plegado: false, filas: 12 }), ALTO.cabecera + altoDeFilas(12))
})

test('un grupo suma su riel solo si tiene meta', () => {
  assert.equal(altoDeGrupo({ conRiel: false, filas: 2 }), ALTO.cabeceraGrupo + altoDeFilas(2))
  assert.equal(
    altoDeGrupo({ conRiel: true, filas: 2 }),
    ALTO.cabeceraGrupo + ALTO.riel + altoDeFilas(2),
  )
})

test('la reserva se redondea al pixel', () => {
  assert.deepEqual(reserva(351.4), { containIntrinsicSize: 'auto 351px' })
})

/* Dos semestres: el 1 con dos materias y un hueco, el 2 con una */
const columnas = [{ semestre: 1 }, { semestre: 2 }]
const nodos = [
  { codigo: 'a', semestre: 1, prerrequisitos: [] },
  { codigo: 'b', semestre: 1, prerrequisitos: [] },
  { codigo: 'h', semestre: 1, esHueco: true },
  { codigo: 'c', semestre: 2, prerrequisitos: ['a', 'b'] },
]

test('los semestres separan materias y huecos y cuentan lo suyo', () => {
  const estados = { a: APROBADA, b: CURSANDO, c: BLOQUEADA }
  const [uno, dos] = semestresDeLista(columnas, nodos, estados, new Map())
  assert.deepEqual(
    uno.materias.map((m) => m.codigo),
    ['a', 'b'],
  )
  assert.deepEqual(
    uno.huecos.map((m) => m.codigo),
    ['h'],
  )
  assert.equal(uno.total, 2)
  assert.equal(uno.hechas, 1)
  assert.equal(uno.cursando, 1)
  assert.deepEqual(dos.situaciones, [SITUACION.PROXIMA])
})

test('si la casilla del semestre cuenta, manda su cuenta y no la de las obligatorias', () => {
  const estados = { a: APROBADA, b: APROBADA }
  const casillas = new Map([[1, { total: 3, hechas: 2, cursando: 0 }]])
  const [uno] = semestresDeLista(columnas, nodos, estados, casillas)
  assert.equal(uno.total, 3)
  assert.equal(uno.hechas, 2)
  assert.equal(estadoDeSemestre(uno, 1), 'actual')
})

test('el semestre actual es el primero sin completar', () => {
  const estados = { a: APROBADA, b: APROBADA, c: DISPONIBLE }
  const semestres = semestresDeLista(columnas, nodos, estados, new Map())
  assert.equal(semestreActual(semestres), 2)
  const todos = semestresDeLista(columnas, nodos, { ...estados, c: APROBADA }, new Map())
  assert.equal(semestreActual(todos), undefined)
})

test('el punto de un semestre dice como va', () => {
  const s = (hechas, cursando, total = 3) => ({ numero: 4, hechas, cursando, total })
  assert.equal(estadoDeSemestre(s(3, 0), 9), 'completo')
  assert.equal(estadoDeSemestre(s(0, 0), 4), 'actual')
  assert.equal(estadoDeSemestre(s(1, 0), 9), 'empezado')
  assert.equal(estadoDeSemestre(s(0, 2), 9), 'empezado')
  assert.equal(estadoDeSemestre(s(0, 0), 9), 'pendiente')
  assert.equal(estadoDeSemestre(s(0, 0, 0), 9), 'pendiente')
})

test('un grupo de electivas separa las opciones de las que ya son tuyas', () => {
  const grupos = [{ clave: 'tecnica', cantidad: 3 }]
  const electivas = [
    { codigo: 'e1', grupo: 'tecnica' },
    { codigo: 'e2', grupo: 'tecnica' },
    { codigo: 'e3', grupo: 'otro' },
  ]
  const avance = { tecnica: { uc: 3, meta: 15 } }
  const [g] = seccionesDeGrupos(grupos, electivas, avance, { e1: APROBADA, e2: DISPONIBLE })
  assert.deepEqual(
    g.items.map((e) => e.codigo),
    ['e1', 'e2'],
  )
  assert.deepEqual(
    g.marcadas.map((e) => e.codigo),
    ['e1'],
  )
  assert.deepEqual(g.avance, { uc: 3, meta: 15 })
})
