import test from 'node:test'
import assert from 'node:assert/strict'
import { aDia, aHora, aSesiones, emparejar, parecido, revisar } from './importarHorario.js'

const MATERIAS = [
  { codigo: '0071814', nombre: 'Matemática I' },
  { codigo: '0071824', nombre: 'Matemática II' },
  { codigo: '0072914', nombre: 'Física I' },
  { codigo: '0052131', nombre: 'Laboratorio de Física I' },
  { codigo: '0075812', nombre: 'Inglés Técnico I' },
  { codigo: '0081733', nombre: 'Programación I' },
  { codigo: '0081743', nombre: 'Base de Datos' },
]

test('los dias', async (t) => {
  await t.test('nombre completo, abreviatura e inicial', () => {
    assert.equal(aDia('Lunes'), 0)
    assert.equal(aDia('MIÉRCOLES'), 2)
    assert.equal(aDia('mie'), 2)
    assert.equal(aDia('Vie.'), 4)
    assert.equal(aDia('J'), 3)
  })

  await t.test('sabado y domingo no existen en esta rejilla', () => {
    assert.equal(aDia('sábado'), null)
    assert.equal(aDia('domingo'), null)
  })

  await t.test('lo que no se entiende no se inventa', () => {
    assert.equal(aDia(''), null)
    assert.equal(aDia('???'), null)
    assert.equal(aDia(undefined), null)
  })
})

test('las horas', async (t) => {
  await t.test('con y sin cero delante', () => {
    assert.equal(aHora('07:00'), 7 * 60)
    assert.equal(aHora('7:00'), 7 * 60)
    assert.equal(aHora('8:40'), 8 * 60 + 40)
  })

  await t.test('con meridiano', () => {
    assert.equal(aHora('1:40 PM'), 13 * 60 + 40)
    assert.equal(aHora('11:00 AM'), 11 * 60)
    assert.equal(aHora('12:00 PM'), 12 * 60)
  })

  await t.test('sin meridiano, lo que caeria antes de abrir es de la tarde', () => {
    // Un horario que va de 7 a 19: "1:40" solo puede ser la una y cuarenta
    assert.equal(aHora('1:40'), 13 * 60 + 40)
    assert.equal(aHora('3:20'), 15 * 60 + 20)
    // Pero las 7:00 son las de la mañana: ya estan dentro de la jornada
    assert.equal(aHora('7:00'), 7 * 60)
  })

  await t.test('basura fuera', () => {
    assert.equal(aHora('mediodía'), null)
    assert.equal(aHora('25:00'), null)
    assert.equal(aHora('7:99'), null)
    assert.equal(aHora(''), null)
  })
})

test('el parecido de nombres', async (t) => {
  await t.test('el nivel manda: I y II no son la misma materia', () => {
    assert.equal(parecido('Matemática I', 'Matemática II'), 0)
    assert.equal(parecido('MAT II', 'Matemática I'), 0)
    assert.ok(parecido('MATEMATICA I', 'Matemática I') > 0.9)
  })

  await t.test('las abreviaturas cuentan', () => {
    assert.ok(parecido('PROG I', 'Programación I') > 0.9)
    assert.ok(parecido('BASE DATOS', 'Base de Datos') > 0.9)
  })

  await t.test('cosas distintas puntuan bajo', () => {
    assert.ok(parecido('Física I', 'Base de Datos') < 0.3)
  })

  await t.test('sobrar palabras cuesta: el laboratorio NO empata con la materia', () => {
    // Medido contra la lista mas corta, los dos daban 1 exacto y se anulaban
    const exacta = parecido('FISICA I', 'Física I')
    const conSobras = parecido('FISICA I', 'Laboratorio de Física I')
    assert.equal(exacta, 1)
    assert.ok(conSobras < exacta, `${conSobras} tendria que ser menor que ${exacta}`)
    assert.ok(exacta - conSobras >= 0.15, 'y por margen suficiente para poder elegir')
  })
})

test('el emparejamiento', async (t) => {
  await t.test('el codigo gana, aunque el nombre venga mal leido', () => {
    const { materia, via } = emparejar({ codigo: '0072914', nombre: 'FSICA' }, MATERIAS)
    assert.equal(materia.codigo, '0072914')
    assert.equal(via, 'codigo')
  })

  await t.test('un codigo que no es de esta carrera no vale', () => {
    const { materia } = emparejar({ codigo: '9999999', nombre: 'Base de Datos' }, MATERIAS)
    assert.equal(materia.codigo, '0081743', 'cae al nombre, no se queda sin materia')
  })

  await t.test('una materia que existe se encuentra aunque haya un laboratorio suyo', () => {
    const { materia } = emparejar({ nombre: 'FISICA I' }, MATERIAS)
    assert.equal(materia?.nombre, 'Física I')
  })

  await t.test('sin nada que se parezca, ninguna', () => {
    assert.equal(emparejar({ nombre: 'Yoga Aplicada' }, MATERIAS).materia, null)
  })

  await t.test('dos candidatas igual de buenas no eligen: adivinar sale caro', () => {
    // "Matemática" sin nivel esta a la misma distancia de la I y de la II
    assert.equal(emparejar({ nombre: 'Matemática' }, MATERIAS).materia, null)
  })
})

test('la revision', async (t) => {
  const fila = (extra) => ({
    codigo: '0071814',
    nombre: 'Matemática I',
    dia: 'Lunes',
    inicio: '07:00',
    fin: '08:40',
    ...extra,
  })

  await t.test('una fila limpia entra marcada y sin avisos', () => {
    const [c] = revisar([fila()], MATERIAS)
    assert.equal(c.codigo, '0071814')
    assert.equal(c.dia, 0)
    assert.equal(c.inicio, 420)
    assert.deepEqual(c.avisos, [])
    assert.equal(c.incluir, true)
  })

  await t.test('lo que no se entiende sale marcado y NO se incluye', () => {
    const [c] = revisar([fila({ dia: 'sábado', nombre: 'Yoga', codigo: '' })], MATERIAS)
    assert.deepEqual(c.avisos.sort(), ['sin-dia', 'sin-materia'])
    assert.equal(c.incluir, false)
  })

  await t.test('fuera de la jornada de la rejilla', () => {
    const [c] = revisar([fila({ inicio: '5:00 AM', fin: '6:00 AM' })], MATERIAS)
    assert.ok(c.avisos.includes('fuera'))
  })

  await t.test('el fin antes del inicio es una hora sin sentido, no una clase', () => {
    const [c] = revisar([fila({ inicio: '10:00', fin: '8:00 AM' })], MATERIAS)
    assert.ok(c.avisos.includes('sin-hora'))
  })

  await t.test('dos clases que se pisan se marcan las dos', () => {
    const cs = revisar(
      [fila(), fila({ codigo: '0072914', nombre: 'Física I', inicio: '08:00', fin: '09:40' })],
      MATERIAS,
    )
    assert.ok(cs.every((c) => c.avisos.includes('choca')))
  })

  await t.test('chocar con lo que ya estaba guardado tambien cuenta', () => {
    const guardadas = [{ id: 'x', dia: 0, inicio: 420, fin: 500 }]
    const [c] = revisar([fila()], MATERIAS, guardadas)
    assert.ok(c.avisos.includes('choca'))
  })

  await t.test('lo que no viene no rompe nada', () => {
    assert.deepEqual(revisar(null, MATERIAS), [])
    assert.deepEqual(revisar(undefined, MATERIAS), [])
    const [c] = revisar([{}], MATERIAS)
    assert.equal(c.incluir, false)
  })
})

test('el paso a sesiones', async (t) => {
  await t.test('solo pasan las marcadas y sanas', () => {
    const candidatas = [
      { incluir: true, avisos: [], codigo: 'A', dia: 0, inicio: 420, fin: 500, seccion: '01', aula: '', profesor: '' },
      { incluir: false, avisos: [], codigo: 'B', dia: 1, inicio: 420, fin: 500 },
      { incluir: true, avisos: ['choca'], codigo: 'C', dia: 2, inicio: 420, fin: 500 },
    ]
    const sesiones = aSesiones(candidatas)
    assert.equal(sesiones.length, 1)
    assert.equal(sesiones[0].codigo, 'A')
  })

  await t.test('salen con la forma que el horario guarda', () => {
    const [s] = aSesiones([
      { incluir: true, avisos: [], codigo: 'A', dia: 0, inicio: 420, fin: 500, seccion: '01', aula: 'B-3', profesor: 'Pérez' },
    ])
    assert.deepEqual(Object.keys(s).sort(), [
      'aula', 'codigo', 'color', 'dia', 'fin', 'id', 'inicio', 'profesor', 'seccion',
    ])
    assert.equal(s.color, null, 'sin color propio: toma el de su area')
    assert.ok(s.id.startsWith('ia-'))
  })
})
