import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { ICONOS_USADOS, iconoDe } from '../../scripts/iconosMaterias.js'

const CRUDO = new URL('../../datos/crudo/', import.meta.url)
const { iconos } = JSON.parse(
  readFileSync(new URL('../../datos/iconos.json', import.meta.url), 'utf8'),
)

/* Todas las materias de los nueve pensums tal como llegan de la DACE, con
   las electivas: en cualquier parte del crudo, un objeto con codigo y
   asignatura es una materia, salvo las casillas de electiva */
function materiasDelCrudo() {
  const nombres = new Set()
  const recorrer = (x) => {
    if (Array.isArray(x)) return x.forEach(recorrer)
    if (!x || typeof x !== 'object') return
    if (typeof x.asignatura === 'string' && x.codigo && x.placeholder !== true) {
      nombres.add(x.asignatura)
    }
    Object.values(x).forEach(recorrer)
  }
  for (const archivo of readdirSync(CRUDO)) {
    recorrer(JSON.parse(readFileSync(new URL(archivo, CRUDO), 'utf8')))
  }
  return [...nombres]
}

describe('el icono de cada materia', () => {
  test('ninguna materia de los nueve pensums se queda sin icono', () => {
    const materias = materiasDelCrudo()
    assert.ok(materias.length > 400)
    assert.deepEqual(
      materias.filter((nombre) => !iconoDe(nombre)),
      [],
    )
  })

  test('todos los iconos que pueden salir tienen sus trazos', () => {
    assert.deepEqual(
      ICONOS_USADOS.filter((nombre) => !iconos[nombre]),
      [],
    )
  })

  test('lo concreto gana a lo general, y una palabra dentro de otra no cuenta', () => {
    assert.equal(iconoDe('Laboratorio de Química Orgánica'), 'hexagon')
    assert.equal(iconoDe('Producción de Bovinos de Leche'), 'leche')
    assert.equal(iconoDe('Nutricion y Alimentacion No Rumiantes'), 'cerdo')
    assert.equal(iconoDe('Fisioclimatología'), 'thermometer')
    assert.equal(iconoDe('Hidrogeología'), 'drop')
    // "Genética" lleva "ética" dentro, y "Empresas" lleva "presas"
    assert.equal(iconoDe('Genética'), 'dna')
    assert.equal(iconoDe('Administración de Empresas'), 'buildings')
  })

  test('las mismas materias escritas de otra forma dan el mismo icono', () => {
    assert.equal(iconoDe('Etica'), iconoDe('Ética'))
    assert.equal(iconoDe('Ingles Instrumental I'), iconoDe('Inglés Instrumental I'))
    assert.equal(iconoDe('Matemática I'), iconoDe('Matemáticas I'))
  })
})
