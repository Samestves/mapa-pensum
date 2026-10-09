import test from 'node:test'
import assert from 'node:assert/strict'
import { CLAVE_HORARIO, claveHorario, horariosGuardados } from './horarioGuardado.js'

const CLASE = { id: 'MAT-1-420', codigo: 'MAT-1', dia: 0, inicio: 420, fin: 515 }

/* Un almacen de mentira con la forma de localStorage: solo lo que lee horariosGuardados */
const almacenDe = (datos) => {
  const claves = Object.keys(datos)
  return {
    get length() {
      return claves.length
    },
    key: (i) => claves[i] ?? null,
    getItem: (clave) => (clave in datos ? datos[clave] : null),
  }
}

test('la clave del horario no cambia de formato', () => {
  assert.equal(CLAVE_HORARIO, 'mapa-pensum:horario')
  assert.equal(claveHorario('ingenieria'), 'mapa-pensum:horario:ingenieria')
})

test('cuenta las clases de cada carrera con horario', async (t) => {
  await t.test('varias carreras validas, con su numero de clases', () => {
    const almacen = almacenDe({
      'mapa-pensum:horario:ingenieria': JSON.stringify([CLASE, CLASE, CLASE]),
      'mapa-pensum:horario:sistemas': JSON.stringify([CLASE]),
    })
    assert.deepEqual(horariosGuardados(almacen), { ingenieria: 3, sistemas: 1 })
  })

  await t.test('una clave corrupta se ignora y no tumba a las demas', () => {
    const almacen = almacenDe({
      'mapa-pensum:horario:mecanica': '{no es json',
      'mapa-pensum:horario:ingenieria': JSON.stringify([CLASE]),
    })
    assert.deepEqual(horariosGuardados(almacen), { ingenieria: 1 })
  })

  await t.test('una carrera vacia o que no es una lista no cuenta', () => {
    const almacen = almacenDe({
      'mapa-pensum:horario:vacia': '[]',
      'mapa-pensum:horario:objeto': '{"codigo":"MAT-1"}',
      'mapa-pensum:horario:nula': 'null',
      'mapa-pensum:horario:ingenieria': JSON.stringify([CLASE]),
    })
    assert.deepEqual(horariosGuardados(almacen), { ingenieria: 1 })
  })

  await t.test('las claves ajenas no cuentan, aunque se parezcan', () => {
    const almacen = almacenDe({
      'mapa-pensum:anonimo': 'a1b2c3',
      'mapa-pensum:horarios:ingenieria': JSON.stringify([CLASE]),
      'mapa-pensum:horario': JSON.stringify([CLASE]),
      'mapa-pensum:horario:': JSON.stringify([CLASE]),
      'otra-app:horario:ingenieria': JSON.stringify([CLASE]),
    })
    assert.deepEqual(horariosGuardados(almacen), {})
  })

  await t.test('como mucho cuatro carreras', () => {
    const datos = {}
    for (const slug of ['a', 'b', 'c', 'd', 'e', 'f']) {
      datos[claveHorario(slug)] = JSON.stringify([CLASE])
    }
    assert.equal(Object.keys(horariosGuardados(almacenDe(datos))).length, 4)
  })
})

test('sin almacenamiento no hay nada que contar', async (t) => {
  await t.test('un almacen que lanza al leer devuelve vacio', () => {
    const bloqueado = {
      get length() {
        throw new Error('SecurityError')
      },
    }
    assert.deepEqual(horariosGuardados(bloqueado), {})
  })

  await t.test('una clave que no se puede leer deja su carrera fuera, sin lanzar', () => {
    const almacen = almacenDe({
      'mapa-pensum:horario:ingenieria': JSON.stringify([CLASE]),
    })
    const conFallo = {
      get length() {
        return almacen.length
      },
      key: (i) => almacen.key(i),
      getItem: () => {
        throw new Error('SecurityError')
      },
    }
    assert.deepEqual(horariosGuardados(conFallo), {})
  })
})
