import test from 'node:test'
import assert from 'node:assert/strict'
import {
  altoDeLetra,
  codigoDe,
  diaDe,
  franjasDe,
  leerRejilla,
  sustituir,
} from './rejillaHorario.js'
import { revisar } from './importarHorario.js'

/* Una rejilla inventada, con las medidas de una captura corriente: la columna
   de los dias mide 100 y cada franja 200; la cabecera mide 40 y cada dia 80.
   Entre celda y celda hay una linea de 2. Nada de esto sale de un horario de
   verdad: los codigos, las aulas y los nombres son de mentira. */
const FRANJAS = ['07:00 - 07:45', '07:50 - 08:35', '08:40 - 09:25', '09:30 - 10:15']
const DIAS = ['Lunes', 'Martes', 'Miércoles']
const columna = (i) => ({ x0: 102 + i * 202, x1: 300 + i * 202 })
const fila = (j) => ({ y0: 42 + j * 82, y1: 120 + j * 82 })

let cursor = 0
/* Una palabra de 12 de alto; el ancho sale de sus letras */
const palabra = (texto, x, y) => ({ texto, x0: x, y0: y, x1: x + texto.length * 8, y1: y + 12 })
/* Varias palabras seguidas en un renglon */
const renglon = (frase, x, y) => {
  cursor = x
  return frase.split(' ').map((t) => {
    const p = palabra(t, cursor, y)
    cursor = p.x1 + 6
    return p
  })
}

const cabecera = () => FRANJAS.flatMap((f, i) => renglon(f, columna(i).x0 + 40, 14))
const dias = () => DIAS.map((d, j) => palabra(d, 20, fila(j).y0 + 33))

/* Un bloque de clase que tapa las franjas de `desde` a `hasta` en un dia */
function bloque({ dia, desde, hasta, codigo, nombre, seccion, aula }) {
  const celda = { x0: columna(desde).x0, x1: columna(hasta).x1, ...fila(dia) }
  const x = celda.x0 + 20
  return {
    celda,
    palabras: [
      ...renglon(`${codigo} ${nombre}`, x, celda.y0 + 10),
      ...renglon(`Secc: ${seccion} - Aula: ${aula}`, x, celda.y0 + 30),
      ...renglon('Correo: alguien@ejemplo.test', x, celda.y0 + 50),
    ],
  }
}

/* La celda de una palabra, mirada en una tabla en vez de en los pixeles */
const celdaEntre = (celdas) => (caja) =>
  celdas.find((c) => caja.x0 >= c.x0 && caja.x1 <= c.x1 && caja.y0 >= c.y0 && caja.y1 <= c.y1) ??
  null

function rejilla(bloques) {
  const hechos = bloques.map(bloque)
  return {
    palabras: [
      palabra('Día', 30, 14),
      ...cabecera(),
      ...dias(),
      ...hechos.flatMap((b) => b.palabras),
    ],
    celdaDe: celdaEntre(hechos.map((b) => b.celda)),
  }
}

const ALGEBRA = {
  dia: 0,
  desde: 1,
  hasta: 2,
  codigo: '0001234',
  nombre: 'Álgebra Lineal',
  seccion: '02',
  aula: 'B-12',
}
const DIBUJO = {
  dia: 2,
  desde: 0,
  hasta: 0,
  codigo: '0005678',
  nombre: 'Dibujo',
  seccion: '11',
  aula: 'LAB-3',
}

test('las franjas de la cabecera', async (t) => {
  await t.test('salen en orden, con su inicio y su fin', () => {
    const franjas = franjasDe(cabecera())
    assert.deepEqual(
      franjas.map((f) => `${f.inicio}-${f.fin}`),
      ['07:00-07:45', '07:50-08:35', '08:40-09:25', '09:30-10:15'],
    )
    // La caja de la franja abarca sus dos horas
    assert.equal(franjas[0].caja.x0, 142)
    assert.ok(franjas[0].caja.x1 > 220)
  })

  await t.test('una franja leida como una sola palabra tambien vale', () => {
    const franjas = franjasDe([
      palabra('07:00-07:45', 120, 14),
      ...renglon('07:50 - 08:35', 340, 14),
    ])
    assert.deepEqual(
      franjas.map((f) => `${f.inicio}-${f.fin}`),
      ['07:00-07:45', '07:50-08:35'],
    )
  })

  await t.test('una letra donde iba una cifra se deshace', () => {
    const [franja] = franjasDe(renglon('O7:00 - 07:4S', 120, 14))
    assert.deepEqual([franja.inicio, franja.fin], ['07:00', '07:45'])
  })

  await t.test('si falta una hora no hay cabecera: no se adivina', () => {
    assert.deepEqual(
      franjasDe([...renglon('07:00 - 07:45', 120, 14), palabra('07:50', 340, 14)]),
      [],
    )
  })

  await t.test('si las horas no avanzan, tampoco', () => {
    assert.deepEqual(franjasDe(renglon('07:50 - 08:35 07:00 - 07:45', 120, 14)), [])
    assert.deepEqual(franjasDe(renglon('08:35 - 07:50', 120, 14)), [])
  })

  await t.test('sin horas, nada', () => {
    assert.deepEqual(franjasDe(renglon('Lista de materias inscritas', 20, 14)), [])
  })
})

test('el dia y el codigo de una palabra', async (t) => {
  await t.test('el dia se reconoce con una letra cambiada', () => {
    assert.equal(diaDe('Lunes'), 'Lunes')
    assert.equal(diaDe('Miercoles'), 'Miércoles')
    assert.equal(diaDe('Mi¢rcoles'), 'Miércoles')
    assert.equal(diaDe('Viemes'), 'Viernes')
    assert.equal(diaDe('Vientos'), null)
    assert.equal(diaDe('Dia'), null)
    assert.equal(diaDe('Mares'), 'Martes')
  })

  await t.test('el codigo son siete cifras, aunque alguna se lea como letra', () => {
    assert.equal(codigoDe('0001234'), '0001234')
    assert.equal(codigoDe('O00l234'), '0001234')
    assert.equal(codigoDe('0001234:'), '0001234')
    assert.equal(codigoDe('000123'), null)
    assert.equal(codigoDe('00012345'), null)
    assert.equal(codigoDe('SOLIDOS'), null)
  })
})

test('leer la rejilla', async (t) => {
  await t.test('cada bloque sale con su dia y las horas de las franjas que tapa', () => {
    const { palabras, celdaDe } = rejilla([ALGEBRA, DIBUJO])
    const { clases, dudas, repasos } = leerRejilla(palabras, celdaDe)

    assert.deepEqual(dudas, [])
    assert.deepEqual(repasos, [])
    assert.deepEqual(clases, [
      {
        codigo: '0001234',
        nombre: 'Álgebra Lineal',
        seccion: '02',
        aula: 'B-12',
        dia: 'Lunes',
        inicio: '07:50',
        fin: '09:25',
        profesor: '',
      },
      {
        codigo: '0005678',
        nombre: 'Dibujo',
        seccion: '11',
        aula: 'LAB-3',
        dia: 'Miércoles',
        inicio: '07:00',
        fin: '07:45',
        profesor: '',
      },
    ])
  })

  await t.test('el correo no sale por ningun lado', () => {
    const { palabras, celdaDe } = rejilla([ALGEBRA, DIBUJO])
    const { clases } = leerRejilla(palabras, celdaDe)
    assert.ok(!JSON.stringify(clases).includes('@'))
    assert.ok(!/correo/i.test(JSON.stringify(clases)))
  })

  await t.test('sin el renglon de la seccion, el nombre no se come el correo', () => {
    const { palabras, celdaDe } = rejilla([ALGEBRA])
    const sinSeccion = palabras.filter((p) => !/^(Secc|02|-|Aula|B-12)/.test(p.texto) || p.y0 < 40)
    const { clases } = leerRejilla(sinSeccion, celdaDe)
    assert.equal(clases[0].nombre, 'Álgebra Lineal')
    assert.equal(clases[0].seccion, '')
    assert.ok(!JSON.stringify(clases).includes('@'))
  })

  await t.test('la seccion y el aula se entienden sin los dos puntos', () => {
    const { palabras, celdaDe } = rejilla([ALGEBRA])
    const sinPuntos = palabras.map((p) => ({
      ...p,
      texto: p.texto.replace(/^(Secc|Aula):$/, '$1'),
    }))
    const { clases } = leerRejilla(sinPuntos, celdaDe)
    assert.deepEqual([clases[0].seccion, clases[0].aula], ['02', 'B-12'])
  })

  await t.test('lo que sale lo entiende la revision tal cual', () => {
    const { palabras, celdaDe } = rejilla([ALGEBRA])
    const { clases } = leerRejilla(palabras, celdaDe)
    const [candidata] = revisar(clases, [{ codigo: '0001234', nombre: 'Álgebra Lineal' }])
    assert.deepEqual(candidata.avisos, [])
    assert.deepEqual(
      [candidata.dia, candidata.inicio, candidata.fin],
      [0, 7 * 60 + 50, 9 * 60 + 25],
    )
    assert.equal(candidata.via, 'codigo')
  })

  await t.test('sin cabecera no es este formato', () => {
    const { palabras, celdaDe } = rejilla([ALGEBRA])
    const sinCabecera = palabras.filter((p) => p.y0 > 40)
    assert.deepEqual(leerRejilla(sinCabecera, celdaDe).dudas, ['sin-rejilla'])
  })

  await t.test('sin ningun dia leido, las clases salen igual y la duda es el dia', () => {
    const { palabras, celdaDe } = rejilla([ALGEBRA])
    const sinDias = palabras.filter((p) => !DIAS.includes(p.texto))
    const { clases, dudas } = leerRejilla(sinDias, celdaDe)
    assert.deepEqual(dudas, ['sin-dia'])
    assert.deepEqual([clases[0].dia, clases[0].inicio], ['', '07:50'])
  })

  await t.test('una rejilla sin ningun codigo no tiene clases', () => {
    const { palabras, celdaDe } = rejilla([])
    assert.deepEqual(leerRejilla(palabras, celdaDe).dudas, ['sin-clases'])
  })

  await t.test('un bloque cuya celda no se pudo medir sale, pero con duda', () => {
    const { palabras } = rejilla([ALGEBRA])
    const { clases, dudas } = leerRejilla(palabras, () => null)
    assert.equal(clases[0].codigo, '0001234')
    assert.equal(clases[0].inicio, '')
    assert.deepEqual(dudas.sort(), ['sin-dia', 'sin-hora'])
  })

  await t.test('dos codigos en la misma celda: dos bloques que no se separaron', () => {
    const { palabras, celdaDe } = rejilla([ALGEBRA])
    const otro = palabra('0009999', columna(2).x0 + 20, fila(0).y0 + 10)
    const { clases, dudas } = leerRejilla([...palabras, otro], celdaDe)
    assert.equal(clases.length, 2)
    assert.ok(dudas.includes('pegadas'))
  })

  await t.test('mas renglones de seccion que codigos: se perdio un bloque', () => {
    const { palabras, celdaDe } = rejilla([ALGEBRA, DIBUJO])
    const sinUnCodigo = palabras.filter((p) => p.texto !== '0005678')
    const { clases, dudas } = leerRejilla(sinUnCodigo, celdaDe)
    assert.equal(clases.length, 1)
    assert.deepEqual(dudas, ['de-menos'])
  })

  await t.test('un codigo que no es del pensum es una duda', () => {
    const { palabras, celdaDe } = rejilla([ALGEBRA, DIBUJO])
    const { dudas } = leerRejilla(palabras, celdaDe, { codigos: new Set(['0001234']) })
    assert.deepEqual(dudas, ['no-esta'])
    const todos = leerRejilla(palabras, celdaDe, { codigos: new Set(['0001234', '0005678']) })
    assert.deepEqual(todos.dudas, [])
  })

  await t.test('un dia escrito dentro del nombre de una materia no cuenta como fila', () => {
    const { palabras, celdaDe } = rejilla([{ ...ALGEBRA, nombre: 'Seminario Viernes' }])
    const { clases, dudas } = leerRejilla(palabras, celdaDe)
    assert.deepEqual(dudas, [])
    assert.equal(clases[0].dia, 'Lunes')
  })
})

test('lo que merece una segunda lectura de cerca', async (t) => {
  /* La cabecera tambien tiene celdas: el borde de la primera es donde acaba
     la columna de los dias */
  const conCabecera = (celdaDe) => (caja) =>
    celdaDe(caja) ??
    (caja.y1 < 40
      ? [0, 1, 2, 3]
          .map((i) => ({ ...columna(i), y0: 2, y1: 38 }))
          .find((c) => caja.x0 >= c.x0 && caja.x1 <= c.x1)
      : null)

  await t.test('un bloque sin dia pide la celda del dia de su fila', () => {
    const { palabras, celdaDe } = rejilla([ALGEBRA])
    const sinLunes = palabras.filter((p) => p.texto !== 'Lunes')
    const { dudas, repasos } = leerRejilla(sinLunes, conCabecera(celdaDe))
    assert.deepEqual(dudas, ['sin-dia'])
    // La linea mide 3 aqui: el recorte se mete eso por cada lado
    assert.deepEqual(repasos, [{ zona: { x0: 3, x1: 98, ...fila(0) }, motivo: 'dia' }])
  })

  await t.test('dos bloques de la misma fila piden el dia una sola vez', () => {
    const otro = { ...DIBUJO, dia: 0, desde: 3, hasta: 3 }
    const { palabras, celdaDe } = rejilla([ALGEBRA, otro])
    const sinLunes = palabras.filter((p) => p.texto !== 'Lunes')
    assert.equal(leerRejilla(sinLunes, conCabecera(celdaDe)).repasos.length, 1)
  })

  await t.test('un bloque sin aula pide su propia celda, y no es una duda', () => {
    const { palabras, celdaDe } = rejilla([ALGEBRA])
    const sinAula = palabras.filter((p) => p.texto !== 'Aula:')
    const { clases, dudas, repasos } = leerRejilla(sinAula, celdaDe)
    assert.equal(clases[0].aula, '')
    assert.deepEqual(dudas, [])
    assert.deepEqual(repasos, [
      { zona: { x0: columna(1).x0, x1: columna(2).x1, ...fila(0) }, motivo: 'detalle' },
    ])
  })

  /* Toda la rejilla tiene celdas: la cabecera, la columna de los dias y los
     bloques. Y los pixeles se fingen: una casilla esta ocupada si cae dentro
     de algun bloque, se haya leido o no. */
  const conDias = (celdaDe) => (caja) =>
    conCabecera(celdaDe)(caja) ??
    (caja.x1 < 100
      ? [0, 1, 2]
          .map((j) => ({ x0: 2, x1: 98, ...fila(j) }))
          .find((c) => caja.y0 >= c.y0 && caja.y1 <= c.y1)
      : null)
  const pintadas = (bloques) => (casillas) =>
    casillas.filter((c) =>
      bloques.some((b) => {
        const celda = bloque(b).celda
        return c.x0 >= celda.x0 && c.x1 <= celda.x1 && c.y0 >= celda.y0 && c.y1 <= celda.y1
      }),
    )

  await t.test('un bloque pintado que no se leyo pide leerse entero, y es una duda', () => {
    const ancho = { ...DIBUJO, desde: 1, hasta: 2 }
    const { palabras, celdaDe } = rejilla([ALGEBRA, ancho])
    // De Dibujo no se leyo ni una palabra: el OCR se salto el bloque entero
    const suyas = new Set(bloque(ancho).palabras.map((p) => `${p.texto}@${p.x0},${p.y0}`))
    const leidas = palabras.filter((p) => !suyas.has(`${p.texto}@${p.x0},${p.y0}`))
    const { clases, dudas, repasos } = leerRejilla(leidas, conDias(celdaDe), {
      ocupadas: pintadas([ALGEBRA, ancho]),
    })
    assert.equal(clases.length, 1)
    assert.deepEqual(dudas, ['sin-leer'])
    // Las dos casillas seguidas del bloque son un solo tramo, y va primero
    assert.deepEqual(repasos[0], {
      zona: { x0: columna(1).x0, y0: fila(2).y0, x1: columna(2).x1, y1: fila(2).y1 },
      motivo: 'bloque',
    })
  })

  await t.test('sin ningun codigo leido, los bloques pintados siguen pidiendo leerse', () => {
    const { palabras, celdaDe } = rejilla([ALGEBRA])
    const sinCodigo = palabras.filter((p) => p.texto !== ALGEBRA.codigo)
    const leido = leerRejilla(sinCodigo, conDias(celdaDe), { ocupadas: pintadas([ALGEBRA]) })
    assert.deepEqual(leido.dudas, ['sin-clases', 'sin-leer'])
    assert.equal(leido.repasos.length, 1)
  })

  await t.test('lo pintado que ya se leyo no se repasa', () => {
    const { palabras, celdaDe } = rejilla([ALGEBRA, DIBUJO])
    const leido = leerRejilla(palabras, conDias(celdaDe), { ocupadas: pintadas([ALGEBRA, DIBUJO]) })
    assert.deepEqual(leido.dudas, [])
    assert.deepEqual(leido.repasos, [])
  })

  await t.test('sustituir cambia solo las palabras de la zona', () => {
    const { palabras, celdaDe } = rejilla([ALGEBRA])
    const zona = { x0: 0, x1: 101, ...fila(0) }
    const mal = palabras.map((p) => (p.texto === 'Lunes' ? { ...p, texto: 'Lun' } : p))
    const arreglado = sustituir(mal, zona, [palabra('Lunes', 20, fila(0).y0 + 33)])
    assert.equal(arreglado.length, palabras.length)
    assert.deepEqual(leerRejilla(arreglado, celdaDe).dudas, [])
  })

  await t.test('el alto de la letra sale de la cabecera', () => {
    assert.equal(altoDeLetra(cabecera()), 12)
    assert.equal(altoDeLetra(dias()), 0)
  })
})
