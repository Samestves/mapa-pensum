import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { ESTADO } from '../data/estados.js'
import {
  HORAS_POR_UC,
  VENTANA_NIVEL,
  etiquetaSemestre,
  horasDe,
  mesEstimadoGrado,
  planificar,
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

/* Una materia ya aprobada que no estorba: sin ella cualquier pensum de prueba
   seria un nuevo ingreso, que tiene su propia regla para el primer semestre. */
const YA = materia('YA', 1, 1)
const conAlgoHecho = { YA: ESTADO.APROBADA }

const planDe = (
  asignaturas,
  { marcas = conAlgoHecho, carga = { unidad: 'uc', valor: 12 }, grupos = [], elegidas = {} } = {},
) => planificar({ asignaturas: [YA, ...asignaturas], grupos, marcas, elegidas, carga })

const codigos = (semestre) => semestre.materias.map((m) => m.codigo)
const semestreDe = (plan, codigo) =>
  plan.semestres.findIndex((s) => s.materias.some((m) => m.codigo === codigo)) + 1

describe('traduccion entre horas y creditos', () => {
  test('las UC se traducen a horas de dedicacion', () => {
    assert.equal(horasDe(10), 10 * HORAS_POR_UC)
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
    const plan = planDe(
      [materia('A', 1, 4), materia('B', 2, 4, ['A']), materia('C', 3, 4, ['B'])],
      { carga: { unidad: 'uc', valor: 4 } },
    )
    assert.ok(semestreDe(plan, 'A') < semestreDe(plan, 'B'), 'B sale antes que A')
    assert.ok(semestreDe(plan, 'B') < semestreDe(plan, 'C'), 'C sale antes que B')
  })

  test('lo ya aprobado no se vuelve a planificar y desbloquea lo suyo', () => {
    const plan = planDe([materia('A', 1, 4), materia('B', 2, 4, ['A'])], {
      marcas: { A: ESTADO.APROBADA },
    })
    assert.equal(plan.materiasRestantes, 2, 'YA y B')
    assert.ok(codigos(plan.semestres[0]).includes('B'))
  })

  test('lo que nunca se puede inscribir queda sin ubicar en vez de colarse', () => {
    // Un prerrequisito que no existe en el pensum: no se puede aprobar nunca
    const plan = planDe([materia('A', 1, 4, ['FANTASMA'])])
    assert.equal(plan.semestres.length, 0)
    assert.deepEqual(
      plan.sinUbicar.map((m) => m.codigo),
      ['A'],
    )
  })
})

describe('lo que estas cursando', () => {
  test('cuenta como hecho: no se vuelve a proponer y ya desbloquea lo suyo', () => {
    /* Antes la materia en curso salia otra vez como "Proximo semestre", y el
       plan entero -y la fecha de grado- se corria un semestre. */
    const plan = planDe([materia('A', 1, 4), materia('B', 2, 4, ['A'])], {
      marcas: { ...conAlgoHecho, A: ESTADO.CURSANDO },
    })
    assert.deepEqual(codigos(plan.semestres[0]), ['B'])
    assert.equal(semestreDe(plan, 'A'), 0)
  })
})

describe('nuevo ingreso', () => {
  test('el primer semestre es el bloque entero de primero, aunque pase del tope', () => {
    /* La UDO inscribe a un nuevo ingreso en todo primero. El plan antes metia
       cosas de segundo y cuarto y dejaba la Extraacademica para despues. */
    const pensum = [
      materia('EXTRA', 1, 1),
      materia('MATE1', 1, 4),
      materia('QUIM', 1, 4),
      materia('LOGICA', 2, 2),
      materia('ECO', 4, 2),
    ]
    const plan = planificar({ asignaturas: pensum, carga: { unidad: 'uc', valor: 6 } })
    assert.equal(plan.nuevoIngreso, true)
    assert.deepEqual(codigos(plan.semestres[0]).sort(), ['EXTRA', 'MATE1', 'QUIM'])
  })

  test('con cualquier cosa marcada ya no es nuevo ingreso', () => {
    const plan = planDe([materia('A', 1, 4), materia('B', 1, 4)], {
      carga: { unidad: 'uc', valor: 4 },
    })
    assert.equal(plan.nuevoIngreso, false)
    assert.equal(plan.semestres[0].materias.length, 1)
  })
})

describe('la regla de nivel', () => {
  test('no adelanta nada a mas de dos semestres de lo mas atrasado', () => {
    // LEJOS no tiene prelaciones, pero es de quinto y queda algo de primero
    const plan = planDe([materia('ATRASADA', 1, 2), materia('LEJOS', 5, 2)], {
      carga: { unidad: 'uc', valor: 20 },
    })
    assert.deepEqual(codigos(plan.semestres[0]), ['ATRASADA'])
    assert.deepEqual(codigos(plan.semestres[1]), ['LEJOS'])
    assert.equal(VENTANA_NIVEL, 2)
  })

  test('lo que frena el nivel sube de prioridad aunque no abra nada', () => {
    /* FRENO es de primero y no desbloquea nada, pero mientras este pendiente
       la cadena de cuarto (R → S → T) no puede empezar. Su urgencia es la de
       esa cadena, no la de "no abre nada". */
    const plan = planDe(
      [
        materia('FRENO', 1, 3),
        materia('P', 2, 3),
        materia('Q', 3, 3, ['P']),
        materia('R', 4, 3),
        materia('S', 5, 3, ['R']),
        materia('T', 6, 3, ['S']),
      ],
      { carga: { unidad: 'materias', valor: 1 } },
    )
    const freno = plan.semestres[0].materias[0]
    assert.equal(freno.codigo, 'FRENO')
    assert.equal(freno.frenaDesde, 1 + VENTANA_NIVEL + 1)
  })
})

describe('la prioridad', () => {
  /* El caso que reporto un estudiante: si solo puedes con una materia,
     Matematicas III va antes que Fisica II. Fisica II desbloquea MAS
     materias, pero en una cadena corta; de Matematicas III cuelga la cadena
     mas larga hasta el grado, y atrasarla es lo que alarga la carrera. */
  const pensum = [
    materia('MATE3', 3, 4),
    materia('MATE4', 4, 4, ['MATE3']),
    materia('METODOS', 5, 3, ['MATE4']),
    materia('SIMULA', 5, 3, ['METODOS']),
    materia('FIS2', 3, 4),
    materia('LAB1', 4, 1, ['FIS2']),
    materia('LAB2', 4, 1, ['FIS2']),
    materia('ELEC', 4, 3, ['FIS2']),
    materia('CIRC', 4, 3, ['FIS2']),
    materia('ONDAS', 4, 3, ['FIS2']),
  ]

  test('primero la cadena mas larga, no lo que mas materias abre', () => {
    const plan = planDe(pensum, { carga: { unidad: 'materias', valor: 1 } })
    assert.deepEqual(codigos(plan.semestres[0]), ['MATE3'])
  })

  test('es clave lo que esta en la cadena mas larga de lo que queda', () => {
    const plan = planDe(pensum, { carga: { unidad: 'materias', valor: 2 } })
    const [mate3, fis2] = plan.semestres[0].materias
    assert.equal(mate3.codigo, 'MATE3')
    assert.equal(mate3.clave, true)
    assert.equal(fis2.codigo, 'FIS2')
    assert.equal(fis2.clave, false)
    assert.equal(fis2.desbloquea, 5)
  })
})

describe('la carga por semestre', () => {
  test('por UC no se pasa del tope cuando puede evitarlo', () => {
    const plan = planDe([materia('A', 1, 4), materia('B', 1, 4), materia('C', 1, 4)], {
      carga: { unidad: 'uc', valor: 8 },
    })
    assert.ok(plan.semestres[0].uc <= 8)
  })

  test('por materias cuenta materias, no UC', () => {
    const plan = planDe([materia('A', 1, 1), materia('B', 1, 1), materia('C', 1, 6)], {
      carga: { unidad: 'materias', valor: 2 },
    })
    assert.ok(plan.semestres.every((s) => s.materias.length <= 2))
  })

  test('una materia mas cara que el tope entra igual, o el plan se atasca', () => {
    /* Sin esta excepcion, una materia de 6 UC con un tope de 4 no entraria
       jamas: el bucle daria vueltas sin colocarla y el plan se quedaria
       corto para siempre. Mas vale un semestre cargado que un plan
       imposible. */
    const plan = planificar({
      asignaturas: [YA, materia('GORDA', 1, 6)],
      marcas: conAlgoHecho,
      carga: { unidad: 'uc', valor: 4 },
    })
    assert.equal(plan.sinUbicar.length, 0)
    assert.deepEqual(codigos(plan.semestres[0]), ['GORDA'])
    assert.equal(plan.semestres[0].uc, 6)
  })
})

describe('las electivas', () => {
  const grupo = (cuota) => ({
    clave: 'tecnicas',
    cuota,
    asignaturas: [materia('E1', null, 3), materia('E2', null, 3), materia('E3', null, 3)],
  })
  const electivasDe = (plan) => plan.semestres.flatMap((s) => s.materias).filter((m) => m.esElectiva)

  test('solo se planifican las que hacen falta para cubrir la cuota', () => {
    // Meter las 39 electivas de Sistemas daria un plan absurdo de 20 semestres
    assert.equal(electivasDe(planDe([], { grupos: [grupo(6)] })).length, 2)
  })

  test('las aprobadas y las que estas cursando descuentan de la cuota', () => {
    const plan = planDe([], {
      grupos: [grupo(6)],
      marcas: { ...conAlgoHecho, E1: ESTADO.CURSANDO },
    })
    assert.equal(electivasDe(plan).length, 1, 'ya habia 3 UC cubiertas, falta una sola')
  })

  test('un grupo sin cuota no aporta nada al plan', () => {
    /* Pasa en las carreras sin creditos oficiales. Inventar un numero seria
       peor que omitir el grupo. */
    assert.equal(electivasDe(planDe([], { grupos: [grupo(null)] })).length, 0)
  })

  test('sin cuota, las que el estudiante puso en su mapa si entran al plan', () => {
    // La franja de electivas: no sabemos cuantas pide, pero esa ya la eligio
    const plan = planDe([], {
      grupos: [grupo(null)],
      elegidas: { 'libre-tecnicas-1': 'E2', 'libre-tecnicas-2': 'E3' },
      marcas: { ...conAlgoHecho, E3: ESTADO.APROBADA },
    })
    assert.deepEqual(
      electivasDe(plan).map((m) => m.codigo),
      ['E2'],
      'la aprobada ya no se planifica',
    )
  })

  test('cada electiva se ancla al semestre de su casilla', () => {
    /* La humanistica de segundo es de segundo: con su semestre, la regla de
       nivel la deja entrar pronto en vez de acabar toda junta al final. */
    const casilla = { ...materia('casilla-h-1', 2, null), esHueco: true, grupo: 'tecnicas' }
    const plan = planDe([casilla], { grupos: [grupo(3)] })
    assert.equal(electivasDe(plan)[0].semestre, 2)
  })

  test('a igualdad, las obligatorias van antes que las electivas', () => {
    const plan = planDe([materia('OBL', 1, 3)], {
      grupos: [grupo(3)],
      carga: { unidad: 'uc', valor: 6 },
    })
    assert.equal(plan.semestres[0].materias[0].codigo, 'OBL')
  })
})

describe('casillas de electiva', () => {
  const casilla = (codigo, grupo, semestre = 1) => ({
    codigo,
    nombre: 'Electiva',
    semestre,
    uc: null,
    esHueco: true,
    grupo,
    prerrequisitos: [],
  })
  const grupo = (clave, cuota, asignaturas) => ({ clave, cuota, asignaturas })
  const planificadas = (plan) =>
    plan.semestres.flatMap((s) => s.materias.map((m) => m.codigo)).filter((c) => c !== 'YA')

  test('con cuota conocida la casilla no se suma a la electiva que la cubre', () => {
    /* El plan elige materias CONCRETAS para cubrir la cuota. Si ademas
       dejara la casilla, la misma obligacion saldria dos veces en la hoja:
       una con nombre y otra como hueco sin UC. */
    const plan = planDe([materia('MAT', 1, 4), casilla('casilla-t-1', 'tec')], {
      grupos: [grupo('tec', 3, [materia('ELE', null, 3)])],
    })
    assert.deepEqual(planificadas(plan).sort(), ['ELE', 'MAT'])
  })

  test('sin cuota conocida la casilla se queda: es el unico aviso que hay', () => {
    // Ambiental tiene cinco casillas y ninguna cuota oficial. Quitarlas
    // dejaria un plan que no menciona sus electivas en ninguna parte.
    const plan = planDe([materia('MAT', 1, 4), casilla('casilla-x-1', 'sin')], {
      grupos: [grupo('sin', null, [materia('ELE', null, 3)])],
    })
    assert.deepEqual(planificadas(plan).sort(), ['MAT', 'casilla-x-1'])
  })

  test('sin cuota, la casilla que ya tiene electiva deja paso a esa electiva', () => {
    const plan = planDe([materia('MAT', 1, 4), casilla('casilla-x-1', 'sin')], {
      grupos: [grupo('sin', null, [materia('ELE', null, 3)])],
      elegidas: { 'casilla-x-1': 'ELE' },
    })
    assert.deepEqual(planificadas(plan).sort(), ['ELE', 'MAT'])
  })

  test('la electiva que el estudiante coloco gana a la que elegiriamos sola', () => {
    /* Sin eleccion se prefiere la mas barata y sin prerrequisitos. Con
       eleccion manda la suya, aunque sea la cara: el plan es de quien lo
       imprime. */
    const plan = planDe([casilla('casilla-t-1', 'tec')], {
      grupos: [grupo('tec', 3, [materia('BARATA', null, 3), materia('SUYA', null, 3)])],
      elegidas: { 'casilla-t-1': 'SUYA' },
    })
    assert.deepEqual(planificadas(plan), ['SUYA'])
  })
})

describe('el plan siempre cierra', () => {
  test('un ciclo de prerrequisitos no cuelga el hilo', () => {
    /* El validador de datos ya garantiza que no hay ciclos, pero esta
       funcion no depende de eso: si algun dia entrara uno, tiene que
       devolver un plan corto, no dejar de responder. */
    const plan = planDe([materia('A', 1, 4, ['B']), materia('B', 1, 4, ['A'])])
    assert.equal(plan.semestres.length, 0)
    assert.equal(plan.sinUbicar.length, 2)
  })

  test('las cuentas de lo que falta cuadran con el pensum', () => {
    const plan = planDe([materia('A', 1, 4), materia('B', 2, 5, ['A'])])
    assert.equal(plan.materiasRestantes, 2)
    assert.equal(plan.ucRestantes, 9)
    const colocadas = plan.semestres.flatMap((s) => s.materias).length
    assert.equal(colocadas + plan.sinUbicar.length, plan.materiasRestantes)
  })
})

/* El pensum de verdad, no uno de juguete. Las comprobaciones son las que haria
   alguien a mano con el plan delante. Los datos los genera `npm run datos`;
   sin ellos estas pruebas se saltan en vez de fallar por algo ajeno. */
const RUTA_SISTEMAS = new URL('../data/carreras/ingenieria-de-sistemas.json', import.meta.url)
const haySistemas = existsSync(RUTA_SISTEMAS)

describe(
  'el pensum real de Ingenieria de Sistemas',
  { skip: !haySistemas && 'faltan los datos: npm run datos' },
  () => {
    const carrera = haySistemas ? JSON.parse(readFileSync(RUTA_SISTEMAS, 'utf8')) : null
    const hasta = (semestre) =>
      Object.fromEntries(
        carrera.asignaturas
          .filter((a) => !a.esHueco && a.semestre <= semestre)
          .map((a) => [a.codigo, ESTADO.APROBADA]),
      )
    const plan = (marcas, carga = { unidad: 'uc', valor: 16 }) =>
      planificar({ asignaturas: carrera.asignaturas, grupos: carrera.grupos, marcas, carga })
    const segundoEnCurso = () => {
      const marcas = hasta(1)
      for (const a of carrera.asignaturas) {
        if (a.semestre === 2 && !a.esHueco) marcas[a.codigo] = ESTADO.CURSANDO
      }
      return marcas
    }

    test('nuevo ingreso: el primer semestre es primero entero, con la Extraacademica', () => {
      const primero = carrera.asignaturas
        .filter((a) => a.semestre === 1 && !a.esHueco)
        .map((a) => a.nombre)
      const nombres = plan({}).semestres[0].materias.map((a) => a.nombre)
      assert.deepEqual(nombres.sort(), primero.sort())
      assert.ok(nombres.includes('Extraacadémica'))
      assert.ok(nombres.includes('Química General'))
    })

    for (const [titulo, marcas] of [
      ['nuevo ingreso', () => ({})],
      ['cursando segundo', segundoEnCurso],
      ['hasta quinto aprobado', () => hasta(5)],
    ]) {
      test(`${titulo}: prelaciones, nivel y cuentas en orden`, () => {
        const m = marcas()
        const p = plan(m)
        const hechas = new Set(Object.keys(m))
        for (const s of p.semestres) {
          const nivel = Math.min(
            ...carrera.asignaturas
              .filter((a) => !a.esHueco && !hechas.has(a.codigo))
              .map((a) => a.semestre),
          )
          for (const a of s.materias) {
            for (const pre of a.prerrequisitos ?? []) {
              assert.ok(hechas.has(pre), `${a.nombre} antes que su prerrequisito`)
            }
            if (!a.esElectiva) {
              assert.ok(a.semestre <= nivel + VENTANA_NIVEL, `${a.nombre} adelantada`)
            }
          }
          for (const a of s.materias) hechas.add(a.codigo)
        }
        assert.equal(p.sinUbicar.length, 0)
        assert.ok(p.semestres.every((s) => s.uc <= 16 || (p.nuevoIngreso && s.numero === 1)))
      })
    }

    test('lo que se esta cursando no vuelve a salir en el plan', () => {
      const marcas = segundoEnCurso()
      const planificadas = new Set(plan(marcas).semestres.flatMap((s) => s.materias.map((a) => a.codigo)))
      for (const [codigo, marca] of Object.entries(marcas)) {
        if (marca === ESTADO.CURSANDO) assert.ok(!planificadas.has(codigo))
      }
    })

    test('con una sola materia, Matematicas III va antes que Fisica II', () => {
      const p = plan(segundoEnCurso(), { unidad: 'materias', valor: 1 })
      assert.equal(p.semestres[0].materias[0].nombre, 'Matemáticas III')
      const cuando = (nombre) => p.semestres.findIndex((s) => s.materias[0].nombre === nombre)
      assert.ok(cuando('Matemáticas III') < cuando('Física II'))
    })

    test('las electivas cubren la cuota de cada grupo y no repiten las aprobadas', () => {
      const etica = carrera.grupos
        .find((g) => g.clave === 'humanistica')
        .asignaturas.find((e) => e.nombre === 'Ética')
      const p = plan({ ...hasta(2), [etica.codigo]: ESTADO.APROBADA })
      const electivas = p.semestres.flatMap((s) => s.materias).filter((a) => a.esElectiva)
      const ucDe = (grupo) =>
        electivas.filter((a) => a.grupo === grupo).reduce((s, a) => s + a.uc, 0)
      assert.ok(ucDe('tecnica') >= 15)
      assert.ok(ucDe('humanistica') >= 6 - etica.uc)
      assert.ok(!electivas.some((a) => a.codigo === etica.codigo))
    })

    test('Matematicas III es clave y Fisica II no', () => {
      const primero = plan(segundoEnCurso()).semestres[0].materias
      const de = (nombre) => primero.find((a) => a.nombre === nombre)
      assert.equal(de('Matemáticas III').clave, true)
      assert.equal(de('Física II').clave, false)
    })
  },
)
