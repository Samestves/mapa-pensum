import test from 'node:test'
import assert from 'node:assert/strict'
import {
  altoDeUnSemestre,
  columnaDeArranque,
  escalaDeArranque,
  vistaDeArranque,
} from './vistaInicial.js'
import { hayDetalle } from './detalle.js'
import { NODO, ESPACIADO, MARGEN } from './constantes.js'

/* Un pensum de juguete con la forma del real: columnas separadas por el paso
   de siempre, y siete materias en cada semestre. */
const columnas = [1, 2, 3].map((semestre, i) => ({
  semestre,
  x: MARGEN.left + i * (NODO.ancho + ESPACIADO.columna),
  cantidad: 7,
}))
const nodos = columnas.flatMap((c) =>
  Array.from({ length: 7 }, (_, i) => ({ codigo: `${c.semestre}-${i}`, semestre: c.semestre })),
)

const TELEFONO = { ancho: 360, alto: 700 }
const ESCRITORIO = { ancho: 1512, alto: 860 }

test('donde arranca el mapa', async (t) => {
  await t.test('sin nada aprobado arranca en el primer semestre', () => {
    assert.equal(columnaDeArranque(columnas, nodos, () => false).semestre, 1)
  })

  await t.test('arranca en el primer semestre que aun tiene algo pendiente', () => {
    const aprobadas = new Set(nodos.filter((n) => n.semestre === 1).map((n) => n.codigo))
    aprobadas.delete('1-0')
    // Falta una de primero: sigue siendo primero, aunque falten todas las demas.
    assert.equal(columnaDeArranque(columnas, nodos, (c) => aprobadas.has(c)).semestre, 1)

    aprobadas.add('1-0')
    assert.equal(columnaDeArranque(columnas, nodos, (c) => aprobadas.has(c)).semestre, 2)
  })

  await t.test('con la carrera terminada arranca en el ultimo', () => {
    assert.equal(columnaDeArranque(columnas, nodos, () => true).semestre, 3)
  })

  await t.test('con el pensum vacio no hay vista, y se dice con null', () => {
    assert.equal(columnaDeArranque([], [], () => false), null)
    assert.equal(vistaDeArranque(TELEFONO, [], [], () => false), null)
    assert.equal(vistaDeArranque({ ancho: 0, alto: 0 }, columnas, nodos, () => false), null)
  })

  await t.test('el semestre cabe entero de arriba abajo', () => {
    for (const medida of [TELEFONO, ESCRITORIO]) {
      const { escala } = vistaDeArranque(medida, columnas, nodos, () => false)
      assert.ok(
        altoDeUnSemestre(7) * escala <= medida.alto,
        `un semestre de 7 no cabe en ${medida.ancho}x${medida.alto}`,
      )
    }
  })

  await t.test('SIEMPRE arranca con el texto visible, que es el motivo de todo esto', () => {
    /* El semestre mas cargado de las nueve carreras tiene nueve materias, y la
       pantalla mas estrecha que hay que aguantar ronda los 320 x 480. */
    for (const materias of [4, 7, 9]) {
      for (const alto of [480, 700, 860]) {
        assert.ok(
          hayDetalle(escalaDeArranque(alto, materias)),
          `${materias} materias en ${alto} px de alto arrancarian sin texto`,
        )
      }
    }
  })

  await t.test('nunca amplia de salida', () => {
    assert.equal(escalaDeArranque(4000, 1), 1)
  })

  await t.test('la columna queda centrada a lo ancho', () => {
    const columna = columnas[1]
    const v = vistaDeArranque(TELEFONO, columnas, nodos, (c) => c.startsWith('1-'))
    const centro = v.x + (columna.x + NODO.ancho / 2) * v.escala
    assert.ok(Math.abs(centro - TELEFONO.ancho / 2) < 0.001)
  })

  await t.test('un semestre vacio no rompe la cuenta del alto', () => {
    assert.equal(altoDeUnSemestre(0), altoDeUnSemestre(0))
    assert.ok(Number.isFinite(escalaDeArranque(700, 0)))
  })
})
