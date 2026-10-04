import test from 'node:test'
import assert from 'node:assert/strict'
import {
  aDia,
  aHora,
  aSesiones,
  corregir,
  emparejar,
  incluir,
  ordenarRevision,
  parecido,
  revisar,
  rivalDe,
} from './importarHorario.js'
import { ABRE, aTexto, enDoceHoras } from './horario.js'

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
    // La jornada no abre de madrugada: "1:40" solo puede ser la una y cuarenta
    assert.equal(aHora('1:40'), 13 * 60 + 40)
    assert.equal(aHora('3:20'), 15 * 60 + 20)
    // Pero la hora de apertura es de la mañana: ya esta dentro de la jornada
    assert.equal(aHora(aTexto(ABRE)), ABRE)
    assert.equal(aHora(enDoceHoras(ABRE)), ABRE)
  })

  await t.test('una hora de antes de abrir solo se lee de la mañana si lo dice', () => {
    // "5:30" a secas es la media de la tarde; "5:30 AM" es la de la madrugada
    assert.equal(aHora('5:30'), 17 * 60 + 30)
    assert.equal(aHora('5:30 AM'), 5 * 60 + 30)
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

  await t.test('una clase a las 6:00 AM es valida y una a las 5:30 AM queda fuera', () => {
    const [alAbrir] = revisar([fila({ inicio: '6:00 AM', fin: '7:40 AM' })], MATERIAS)
    assert.deepEqual(alAbrir.avisos, [])
    assert.equal(alAbrir.inicio, ABRE)

    const [antes] = revisar([fila({ inicio: '5:30 AM', fin: '7:00 AM' })], MATERIAS)
    assert.ok(antes.avisos.includes('fuera'))
  })

  await t.test('lo que el lector devuelve en 24 horas a la hora de apertura cabe', () => {
    // Es el formato que se le pide al modelo: "06:00", con el cero delante
    const [c] = revisar([fila({ inicio: aTexto(ABRE), fin: aTexto(ABRE + 100) })], MATERIAS)
    assert.deepEqual(c.avisos, [])
    assert.equal(c.inicio, ABRE)
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
      {
        incluir: true,
        avisos: [],
        codigo: 'A',
        dia: 0,
        inicio: 420,
        fin: 500,
        seccion: '01',
        aula: '',
        profesor: '',
      },
      { incluir: false, avisos: [], codigo: 'B', dia: 1, inicio: 420, fin: 500 },
      { incluir: true, avisos: ['choca'], codigo: 'C', dia: 2, inicio: 420, fin: 500 },
    ]
    const sesiones = aSesiones(candidatas)
    assert.equal(sesiones.length, 1)
    assert.equal(sesiones[0].codigo, 'A')
  })

  await t.test('salen con la forma que el horario guarda', () => {
    const [s] = aSesiones([
      {
        incluir: true,
        avisos: [],
        codigo: 'A',
        dia: 0,
        inicio: 420,
        fin: 500,
        seccion: '01',
        aula: 'B-3',
        profesor: 'Pérez',
      },
    ])
    assert.deepEqual(Object.keys(s).sort(), [
      'aula',
      'codigo',
      'color',
      'dia',
      'fin',
      'id',
      'inicio',
      'profesor',
      'seccion',
    ])
    assert.equal(s.color, null, 'sin color propio: toma el de su area')
    assert.ok(s.id.startsWith('ia-'))
  })
})

test('corregir lo leido', async (t) => {
  const fila = (extra) => ({
    codigo: '0071814',
    nombre: 'Matemática I',
    dia: 'Lunes',
    inicio: '07:00',
    fin: '08:40',
    ...extra,
  })

  await t.test('una fila rota que se arregla entra sola', () => {
    const leidas = revisar([fila({ codigo: '', nombre: 'Yoga' })], MATERIAS)
    assert.equal(leidas[0].incluir, false)

    const [c] = corregir(leidas, leidas[0].id, { codigo: '0081733' }, MATERIAS)
    assert.equal(c.materia.nombre, 'Programación I')
    assert.deepEqual(c.avisos, [])
    assert.equal(c.incluir, true, 'quien la arregla es porque la quiere')
  })

  await t.test('una correccion a medias no la mete', () => {
    const leidas = revisar([fila({ codigo: '', nombre: 'Yoga', dia: 'sábado' })], MATERIAS)
    const [c] = corregir(leidas, leidas[0].id, { codigo: '0081733' }, MATERIAS)
    assert.deepEqual(c.avisos, ['sin-dia'])
    assert.equal(c.incluir, false)
  })

  await t.test('mover una clase encima de otra las marca a las dos', () => {
    const leidas = revisar([fila(), fila({ codigo: '0072914', dia: 'Martes' })], MATERIAS)
    const tras = corregir(leidas, leidas[1].id, { dia: 0 }, MATERIAS)
    assert.ok(tras.every((c) => c.avisos.includes('choca')))
  })

  await t.test('y tambien contra lo que ya estaba guardado', () => {
    const guardadas = [{ id: 'x', codigo: 'A', dia: 1, inicio: 420, fin: 500 }]
    const leidas = revisar([fila()], MATERIAS, guardadas)
    const [c] = corregir(leidas, leidas[0].id, { dia: 1 }, MATERIAS, guardadas)
    assert.ok(c.avisos.includes('choca'))
  })
})

test('meter y sacar clases', async (t) => {
  const leidas = revisar(
    [
      { codigo: '0071814', nombre: 'Matemática I', dia: 'Lunes', inicio: '07:00', fin: '08:40' },
      {
        codigo: '0071814',
        nombre: 'Matemática I',
        dia: 'Miércoles',
        inicio: '07:00',
        fin: '08:40',
      },
      { codigo: '', nombre: 'Yoga', dia: 'Viernes', inicio: '07:00', fin: '08:40' },
    ],
    MATERIAS,
  )
  const [lunes, miercoles, yoga] = leidas.map((c) => c.id)

  await t.test('una materia sale entera, con todas sus clases', () => {
    const tras = incluir(leidas, [lunes, miercoles], false)
    assert.deepEqual(
      tras.map((c) => c.incluir),
      [false, false, false],
    )
  })

  await t.test('una rota no entra por mucho que se marque', () => {
    const tras = incluir(leidas, [yoga], true)
    assert.equal(tras[2].incluir, false)
  })

  await t.test('sacar una de dos que chocan libera a la otra', () => {
    const chocan = revisar(
      [
        { codigo: '0071814', nombre: 'Matemática I', dia: 'Lunes', inicio: '07:00', fin: '08:40' },
        { codigo: '0072914', nombre: 'Física I', dia: 'Lunes', inicio: '08:00', fin: '09:40' },
      ],
      MATERIAS,
    )
    assert.ok(chocan.every((c) => c.avisos.includes('choca')))

    const tras = incluir(chocan, [chocan[1].id], false)
    assert.deepEqual(tras[0].avisos, [])
    assert.deepEqual(tras[1].avisos, [], 'la que se saco ya no choca con nadie')
  })
})

test('la revision, ordenada para leerla', async (t) => {
  const leidas = revisar(
    [
      {
        codigo: '0071814',
        nombre: 'MAT I',
        dia: 'Lunes',
        inicio: '07:00',
        fin: '08:40',
        aula: 'A-12',
      },
      {
        codigo: '0072914',
        nombre: 'FIS I',
        dia: 'Martes',
        inicio: '08:50',
        fin: '10:30',
        aula: 'B-1',
      },
      {
        codigo: '0071814',
        nombre: 'MAT I',
        dia: 'Miércoles',
        inicio: '07:00',
        fin: '08:40',
        aula: 'A-12',
      },
      { codigo: '', nombre: 'Yoga', dia: 'Viernes', inicio: '07:00', fin: '08:40' },
      {
        codigo: '0071814',
        nombre: 'MAT I',
        dia: 'Viernes',
        inicio: '10:00',
        fin: '11:40',
        aula: 'LAB',
      },
    ],
    MATERIAS,
  )
  const nombres = (tarjetas) => tarjetas.map((x) => x.materia?.nombre ?? x.sesiones[0].leido.nombre)

  await t.test('una tarjeta por materia, y las que llegan con dudas primero', () => {
    const tarjetas = ordenarRevision(leidas)
    assert.deepEqual(nombres(tarjetas), ['Yoga', 'Matemática I', 'Física I'])
    assert.deepEqual(
      tarjetas.map((x) => [x.sesiones.length, x.porRevisar]),
      [
        [1, 1],
        [3, 0],
        [1, 0],
      ],
    )
  })

  await t.test('arreglar una tarjeta no la cambia de sitio', () => {
    const yoga = leidas.find((c) => c.leido.nombre === 'Yoga')
    const tras = corregir(leidas, yoga.id, { codigo: '0081733' }, MATERIAS)
    const tarjetas = ordenarRevision(tras)

    assert.deepEqual(nombres(tarjetas), ['Programación I', 'Matemática I', 'Física I'])
    assert.equal(tarjetas[0].porRevisar, 0)
    assert.equal(tarjetas[0].incluida, true)
  })

  await t.test('ni se funde con otra aunque se le ponga su materia', () => {
    const yoga = leidas.find((c) => c.leido.nombre === 'Yoga')
    const tras = corregir(leidas, yoga.id, { codigo: '0072914' }, MATERIAS)
    assert.deepEqual(nombres(ordenarRevision(tras)), ['Física I', 'Matemática I', 'Física I'])
  })

  await t.test('las clases a la misma hora y en la misma aula son un solo tramo', () => {
    const matematica = ordenarRevision(leidas)[1]
    assert.deepEqual(matematica.tramos, [
      { inicio: 420, fin: 520, aula: 'A-12', dias: [0, 2] },
      { inicio: 600, fin: 700, aula: 'LAB', dias: [4] },
    ])
  })

  await t.test('una materia sigue incluida mientras entre alguna de sus clases', () => {
    const sinElLunes = incluir(leidas, [leidas[0].id], false)
    const matematica = ordenarRevision(sinElLunes)[1]
    assert.equal(matematica.incluida, true)
    assert.deepEqual(matematica.tramos[0].dias, [2], 'y dice solo las que entran')
  })

  await t.test('fuera del todo, sigue diciendo que es lo que se dejo fuera', () => {
    const ids = leidas.filter((c) => c.codigo === '0071814').map((c) => c.id)
    const matematica = ordenarRevision(incluir(leidas, ids, false))[1]
    assert.equal(matematica.incluida, false)
    assert.equal(matematica.tramos.length, 2)
  })

  await t.test('dos que se pisan al leerlas van arriba las dos, y se sabe con quien', () => {
    const chocan = revisar(
      [
        { codigo: '0081733', nombre: 'PROG I', dia: 'Jueves', inicio: '07:00', fin: '08:40' },
        { codigo: '0071814', nombre: 'MAT I', dia: 'Lunes', inicio: '07:00', fin: '08:40' },
        { codigo: '0072914', nombre: 'FIS I', dia: 'Lunes', inicio: '08:00', fin: '09:40' },
      ],
      MATERIAS,
    )
    assert.deepEqual(nombres(ordenarRevision(chocan)), [
      'Matemática I',
      'Física I',
      'Programación I',
    ])
    assert.equal(rivalDe(chocan[1], chocan).materia.nombre, 'Física I')
    assert.equal(rivalDe(chocan[0], chocan), null)
  })

  await t.test('tambien se sabe cuando se pisa con algo que ya estaba guardado', () => {
    const guardadas = [{ id: 'x', codigo: '0075812', dia: 0, inicio: 420, fin: 500 }]
    const [c] = revisar(
      [{ codigo: '0071814', nombre: 'MAT I', dia: 'Lunes', inicio: '07:00', fin: '08:40' }],
      MATERIAS,
      guardadas,
    )
    assert.equal(rivalDe(c, [c], guardadas).codigo, '0075812')
  })
})
