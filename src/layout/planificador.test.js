import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { ESTADO } from '../data/estados.js'
import {
  HORAS_POR_UC,
  etiquetaSemestre,
  horasDe,
  mesEstimadoGrado,
  planificar,
  ucSugeridas,
} from './planificador.js'

/* El planificador es la funcion mas facil de romper en silencio del proyecto:
   devuelve un plan con buena pinta pase lo que pase. Si el orden de
   prioridad se estropea, el plan sigue saliendo -solo que peor-, y no hay
   forma de notarlo mirandolo. Por eso lo que se prueba aqui es sobre todo el
   ORDEN y las reglas de corte, no que "devuelva algo". */

const materia = (codigo, semestre, uc, prerrequisitos = []) => ({
  codigo,
  nombre: codigo,
  semestre,
  uc,
  prerrequisitos,
})

/** Un plan sin nada aprobado y sin pesos, para no repetirlo en cada prueba */
const planDe = (asignaturas, { marcas = {}, estados = {}, pesos = new Map(), tope = 12, grupos = [] } = {}) =>
  planificar(asignaturas, marcas, estados, pesos, tope, grupos)

describe('traduccion entre horas y creditos', () => {
  test('las horas se convierten a UC y de vuelta', () => {
    assert.equal(horasDe(10), 10 * HORAS_POR_UC)
    assert.equal(ucSugeridas(HORAS_POR_UC * 15), 15)
  })

  test('la sugerencia se queda dentro de limites razonables', () => {
    // Ni un plan de una materia ni uno de cuarenta: los extremos se acotan
    assert.equal(ucSugeridas(0), 4)
    assert.equal(ucSugeridas(100000), 30)
  })
})

describe('como se nombra cada paso del plan', () => {
  test('el primero se llama por su nombre y el resto por distancia', () => {
    /* El 1 del plan NO es el semestre 1 del pensum: es el primero que te
       queda por delante. Llamarlo "Semestre 1" a alguien que va por quinto
       se lee como que hay que repetir desde el principio. */
    assert.equal(etiquetaSemestre(1), 'Próximo semestre')
    assert.equal(etiquetaSemestre(3), 'En 3 semestres')
  })
})

describe('mes estimado de grado', () => {
  test('cuenta dos semestres por año', () => {
    const desde = new Date('2026-01-15T00:00:00')
    assert.equal(mesEstimadoGrado(2, desde).getFullYear(), 2027)
    assert.equal(mesEstimadoGrado(2, desde).getMonth(), 0)
  })

  test('sin semestres por delante no hay fecha que dar', () => {
    assert.equal(mesEstimadoGrado(0), null)
  })
})

describe('el plan respeta las prelaciones', () => {
  test('una materia nunca aparece antes que su prerrequisito', () => {
    const pensum = [
      materia('A', 1, 4),
      materia('B', 2, 4, ['A']),
      materia('C', 3, 4, ['B']),
    ]
    const { semestres } = planDe(pensum, { tope: 4 })
    const cuando = {}
    semestres.forEach((s, i) => s.materias.forEach((m) => (cuando[m.codigo] = i)))
    assert.ok(cuando.A < cuando.B, 'B sale antes que A')
    assert.ok(cuando.B < cuando.C, 'C sale antes que B')
  })

  test('lo ya aprobado no se vuelve a planificar y desbloquea lo suyo', () => {
    const pensum = [materia('A', 1, 4), materia('B', 2, 4, ['A'])]
    const { semestres, materiasRestantes } = planDe(pensum, {
      marcas: { A: ESTADO.APROBADA },
    })
    assert.equal(materiasRestantes, 1)
    assert.deepEqual(
      semestres[0].materias.map((m) => m.codigo),
      ['B'],
    )
  })

  test('lo que nunca se puede inscribir queda sin ubicar en vez de colarse', () => {
    // Un prerrequisito que no existe en el pensum: no se puede aprobar nunca
    const pensum = [materia('A', 1, 4, ['FANTASMA'])]
    const { semestres, sinUbicar } = planDe(pensum)
    assert.equal(semestres.length, 0)
    assert.deepEqual(
      sinUbicar.map((m) => m.codigo),
      ['A'],
    )
  })
})

describe('el orden dentro de un semestre', () => {
  test('lo que ya estas cursando entra primero', () => {
    const pensum = [materia('A', 1, 4), materia('B', 1, 4)]
    const { semestres } = planDe(pensum, {
      estados: { B: ESTADO.CURSANDO },
      // A pesa mas, pero B ya esta empezada y eso manda
      pesos: new Map([['A', 50]]),
      tope: 4,
    })
    assert.equal(semestres[0].materias[0].codigo, 'B')
  })

  test('a igualdad, primero lo que mas desbloquea', () => {
    /* La razon de ser del planificador: dejar para el final una materia de
       la que cuelga media carrera es lo que alarga el pensum. */
    const pensum = [materia('A', 1, 4), materia('B', 1, 4)]
    const { semestres } = planDe(pensum, { pesos: new Map([['B', 9]]), tope: 4 })
    assert.equal(semestres[0].materias[0].codigo, 'B')
  })
})

describe('el tope de creditos por semestre', () => {
  test('no se pasa del tope cuando puede evitarlo', () => {
    const pensum = [materia('A', 1, 4), materia('B', 1, 4), materia('C', 1, 4)]
    const { semestres } = planDe(pensum, { tope: 8 })
    assert.ok(semestres[0].uc <= 8)
    assert.equal(semestres[0].materias.length, 2)
  })

  test('una materia mas cara que el tope entra igual, o el plan se atasca', () => {
    /* Sin esta excepcion, una materia de 6 UC con un tope de 4 no entraria
       jamas: el bucle daria vueltas sin colocarla y el plan se quedaria
       corto para siempre. Mas vale un semestre cargado que un plan
       imposible. */
    const pensum = [materia('GORDA', 1, 6)]
    const { semestres, sinUbicar } = planDe(pensum, { tope: 4 })
    assert.equal(sinUbicar.length, 0)
    assert.equal(semestres[0].materias[0].codigo, 'GORDA')
    assert.equal(semestres[0].uc, 6)
  })
})

describe('las electivas', () => {
  const grupo = (cuota) => ({
    clave: 'tecnicas',
    cuota,
    asignaturas: [materia('E1', null, 3), materia('E2', null, 3), materia('E3', null, 3)],
  })

  test('solo se planifican las que hacen falta para cubrir la cuota', () => {
    // Meter las 39 electivas de Sistemas daria un plan absurdo de 20 semestres
    const { semestres } = planDe([], { grupos: [grupo(6)] })
    const electivas = semestres.flatMap((s) => s.materias).filter((m) => m.esElectiva)
    assert.equal(electivas.length, 2, 'deberian bastar dos de 3 UC para cubrir 6')
  })

  test('un grupo sin cuota no aporta nada al plan', () => {
    /* Pasa en las carreras sin creditos oficiales. Inventar un numero seria
       peor que omitir el grupo. */
    const { semestres } = planDe([], { grupos: [grupo(null)] })
    assert.equal(semestres.length, 0)
  })

  test('las electivas ya aprobadas descuentan de la cuota', () => {
    const { semestres } = planDe([], {
      grupos: [grupo(6)],
      marcas: { E1: ESTADO.APROBADA },
    })
    const electivas = semestres.flatMap((s) => s.materias).filter((m) => m.esElectiva)
    assert.equal(electivas.length, 1, 'ya habia 3 UC cubiertas, falta una sola')
  })

  test('a igualdad de peso, las obligatorias van antes que las electivas', () => {
    // Las electivas son de relleno: no marcan el camino hacia el grado
    const { semestres } = planDe([materia('OBL', 1, 3)], { grupos: [grupo(3)], tope: 6 })
    assert.equal(semestres[0].materias[0].esElectiva, undefined)
    assert.equal(semestres[0].materias[0].codigo, 'OBL')
  })
})

describe('el plan siempre cierra', () => {
  test('un ciclo de prerrequisitos no cuelga el hilo', () => {
    /* El validador de datos ya garantiza que no hay ciclos, pero esta
       funcion no depende de eso: si algun dia entrara uno, tiene que
       devolver un plan corto, no dejar de responder. */
    const pensum = [materia('A', 1, 4, ['B']), materia('B', 1, 4, ['A'])]
    const { semestres, sinUbicar } = planDe(pensum)
    assert.equal(semestres.length, 0)
    assert.equal(sinUbicar.length, 2)
  })

  test('las cuentas de lo que falta cuadran con el pensum', () => {
    const pensum = [materia('A', 1, 4), materia('B', 2, 5, ['A'])]
    const plan = planDe(pensum, { marcas: {} })
    assert.equal(plan.materiasRestantes, 2)
    assert.equal(plan.ucRestantes, 9)
    const colocadas = plan.semestres.flatMap((s) => s.materias).length
    assert.equal(colocadas + plan.sinUbicar.length, plan.materiasRestantes)
  })
})
