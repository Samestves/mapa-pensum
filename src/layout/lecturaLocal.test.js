import test from 'node:test'
import assert from 'node:assert/strict'
import { leerCaptura, primeraAmpliacion, segundaAmpliacion } from './lecturaLocal.js'

test('a que tamaño se lee', async (t) => {
  await t.test('una captura corriente se amplia hasta el ancho comodo', () => {
    assert.equal(primeraAmpliacion(1200, 500), 2)
  })

  await t.test('una pequeña no pasa del triple, y una grande no se encoge', () => {
    assert.equal(primeraAmpliacion(400, 200), 3)
    assert.equal(primeraAmpliacion(3000, 1400), 1)
  })

  await t.test('una foto enorme se queda en lo que cabe en un lienzo', () => {
    assert.equal(primeraAmpliacion(8192, 4000), 0.5)
  })

  await t.test('solo se repite si la letra salio pequeña, y apuntando a la comoda', () => {
    assert.equal(segundaAmpliacion(1, 30, 1900, 600), null)
    assert.equal(segundaAmpliacion(1, 0, 1900, 600), null)
    assert.equal(segundaAmpliacion(1, 13, 1900, 600), 2)
  })

  await t.test('si no cabe una ampliacion que merezca la pena, no se repite', () => {
    assert.equal(segundaAmpliacion(1, 13, 4000, 2000), null)
  })
})

/* Una captura de mentira de 300x100: la columna de los dias, dos franjas y un
   bloque que tapa las dos. Se pinta al tamaño que se pida, y sus palabras se
   escriben en medidas de la captura sin ampliar. */
const LINEA = [73, 80, 87]
const VACIA = [33, 37, 41]
const AZUL = [59, 130, 246]

const CELDAS = [
  { x0: 2, y0: 2, x1: 58, y1: 28, color: VACIA },
  { x0: 62, y0: 2, x1: 178, y1: 28, color: VACIA },
  { x0: 182, y0: 2, x1: 297, y1: 28, color: VACIA },
  { x0: 2, y0: 32, x1: 58, y1: 97, color: VACIA },
  { x0: 62, y0: 32, x1: 297, y1: 97, color: AZUL },
]

const palabra = (texto, x0, y0, x1) => ({ texto, x0, y0, x1, y1: y0 + 8 })
const CABECERA = [
  palabra('07:00', 80, 10, 110),
  palabra('-', 114, 10, 118),
  palabra('07:45', 122, 10, 152),
  palabra('07:50', 200, 10, 230),
  palabra('-', 234, 10, 238),
  palabra('08:35', 242, 10, 272),
]
const DIA = palabra('Lunes', 12, 60, 46)
const CODIGO = palabra('0001234', 90, 42, 132)
const NOMBRE = palabra('Dibujo', 138, 42, 174)
const DETALLE = [
  palabra('Secc:', 100, 58, 128),
  palabra('07', 132, 58, 144),
  palabra('-', 148, 58, 152),
  palabra('Aula:', 156, 58, 184),
  palabra('C-3', 188, 58, 206),
]

const escalar = (caja, f) => ({
  ...caja,
  x0: Math.round(caja.x0 * f),
  y0: Math.round(caja.y0 * f),
  x1: Math.round(caja.x1 * f),
  y1: Math.round(caja.y1 * f),
})

function pintar(f) {
  const [ancho, alto] = [Math.round(300 * f), Math.round(100 * f)]
  const datos = new Uint8ClampedArray(ancho * alto * 4)
  const rellenar = ({ x0, y0, x1, y1 }, color) => {
    for (let y = y0; y <= Math.min(y1, alto - 1); y++) {
      for (let x = x0; x <= Math.min(x1, ancho - 1); x++)
        datos.set([...color, 255], (y * ancho + x) * 4)
    }
  }
  rellenar({ x0: 0, y0: 0, x1: ancho - 1, y1: alto - 1 }, LINEA)
  for (const celda of CELDAS) rellenar(escalar(celda, f), celda.color)
  return { ancho, alto, datos }
}

/* `pagina` es lo que da la lectura de la pagina entera; `zonas`, lo que da
   cada lectura de cerca, en orden. */
function captura({ pagina, zonas = [] }) {
  const pedidas = []
  const pendientes = [...zonas]
  return {
    pedidas,
    ancho: 300,
    alto: 100,
    ampliar: async (f) => ({
      imagen: pintar(f),
      leer: async (zona) => {
        pedidas.push({ f, zona })
        return (zona ? (pendientes.shift() ?? []) : pagina).map((p) => escalar(p, f))
      },
    }),
  }
}

const CLASE = {
  codigo: '0001234',
  nombre: 'Dibujo',
  seccion: '07',
  aula: 'C-3',
  dia: 'Lunes',
  inicio: '07:00',
  fin: '08:35',
  profesor: '',
}

test('leer una captura', async (t) => {
  await t.test('si todo sale a la primera, es una sola lectura', async () => {
    const c = captura({ pagina: [...CABECERA, DIA, CODIGO, NOMBRE, ...DETALLE] })
    const leido = await leerCaptura(c)
    assert.deepEqual(leido, { clases: [CLASE], dudas: [], lecturas: 1 })
    assert.deepEqual(c.pedidas, [{ f: 3, zona: undefined }])
  })

  await t.test(
    'el dia que se salto la lectura entera sale al mirar su celda de cerca',
    async () => {
      const c = captura({ pagina: [...CABECERA, CODIGO, NOMBRE, ...DETALLE], zonas: [[DIA]] })
      const leido = await leerCaptura(c)
      assert.deepEqual(leido, { clases: [CLASE], dudas: [], lecturas: 2 })
      // La zona pedida es la celda del dia, metida hacia dentro lo que mide la linea
      const { zona } = c.pedidas[1]
      assert.ok(zona.x0 > 0 && zona.x1 < 62 * 3 && zona.y0 >= 32 * 3 && zona.y1 <= 97 * 3)
    },
  )

  await t.test('el aula que falta sale al releer el bloque', async () => {
    const c = captura({
      pagina: [...CABECERA, DIA, CODIGO, NOMBRE, ...DETALLE.slice(0, 2)],
      zonas: [[CODIGO, NOMBRE, ...DETALLE]],
    })
    assert.deepEqual((await leerCaptura(c)).clases, [CLASE])
  })

  await t.test('una relectura que pierde el codigo no se acepta', async () => {
    const c = captura({
      pagina: [...CABECERA, DIA, CODIGO, NOMBRE, ...DETALLE.slice(0, 2)],
      zonas: [[NOMBRE, ...DETALLE]],
    })
    const leido = await leerCaptura(c)
    assert.deepEqual(leido.clases, [{ ...CLASE, aula: '' }])
    assert.deepEqual(leido.dudas, [])
  })

  await t.test('lo que no es una rejilla sale con su duda y sin clases', async () => {
    const c = captura({ pagina: [DIA, NOMBRE] })
    assert.deepEqual(await leerCaptura(c), { clases: [], dudas: ['sin-rejilla'], lecturas: 1 })
  })

  await t.test('un codigo que no es del pensum deja la lectura en duda', async () => {
    const c = captura({ pagina: [...CABECERA, DIA, CODIGO, NOMBRE, ...DETALLE] })
    const leido = await leerCaptura(c, { codigos: new Set(['0009999']) })
    assert.deepEqual(leido.dudas, ['no-esta'])
    assert.equal(leido.clases.length, 1)
  })
})
