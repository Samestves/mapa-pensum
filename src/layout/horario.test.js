import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  ABRE,
  CIERRA,
  FILAS,
  MIN_DURACION,
  aMinutos,
  aTexto,
  altoHoraPara,
  choqueCon,
  enDoceHoras,
  etiquetaHoraMovil,
  franjaPropuesta,
  huecoEn,
  imantar,
  imantarInicio,
  lineasDeHora,
  posicionValida,
  repartirEnCarriles,
  solapan,
} from './horario.js'

/* Estas pruebas no cubren la hoja entera a proposito. Van a donde el codigo
   TOMA UNA DECISION -que gana el borde o la rejilla, donde se recorta una
   franja, cuando se devuelve null-, porque es ahi donde un fallo no se ve:
   la rejilla se sigue dibujando igual de bonita con la clase mal colocada.
   Lo que solo formatea texto se prueba en sus casos raros -mediodia,
   medianoche- y no en los normales. */

const clase = (inicio, fin, id = 'x') => ({ id, dia: 0, inicio, fin })
const h = (hora, min = 0) => hora * 60 + min

describe('el tiempo como minutos', () => {
  test('ida y vuelta entre texto y minutos', () => {
    assert.equal(aMinutos('08:30'), 510)
    assert.equal(aTexto(510), '08:30')
    assert.equal(aTexto(aMinutos('07:05')), '07:05')
  })

  test('el reloj de doce horas acierta en el mediodia y la medianoche', () => {
    // Los dos casos donde la formula del modulo se puede escribir mal y
    // nadie se entera hasta que alguien pone una clase a las doce.
    assert.equal(enDoceHoras(h(12)), '12:00 PM')
    assert.equal(enDoceHoras(h(0)), '12:00 AM')
    assert.equal(enDoceHoras(h(13)), '1:00 PM')
    assert.equal(enDoceHoras(h(7)), '7:00 AM')
  })

  test('la marca del telefono solo repite el meridiano cuando cambia', () => {
    // La regla entera: doce marcas al dia y solo dos con AM/PM.
    assert.equal(etiquetaHoraMovil(h(7), null), '7 AM')
    assert.equal(etiquetaHoraMovil(h(8), h(7)), '8')
    assert.equal(etiquetaHoraMovil(h(12), h(11)), '12 PM')
    assert.equal(etiquetaHoraMovil(h(13), h(12)), '1')
  })
})

describe('la escala de la rejilla', () => {
  test('cada tramo de ancho da su alto de fila', () => {
    assert.equal(altoHoraPara(1440), 144)
    assert.equal(altoHoraPara(1280), 144)
    assert.equal(altoHoraPara(1100), 124)
    assert.equal(altoHoraPara(1024), 124)
    assert.equal(altoHoraPara(900), 100)
  })

  test('las lineas de hora pintan las de DENTRO y no la ultima', () => {
    /* Este es el fallo que ya ocurrio y por eso esta escrito aqui: la ultima
       linea la dibuja el borde inferior de la rejilla. Si el degradado
       llegase a pintarla tambien, se sumarian dos hairlines en el mismo
       pixel y la de las siete de la tarde saldria del doble de gruesa, que
       es exactamente lo que pasaba arriba con la cabecera. */
    const { backgroundSize, backgroundImage } = lineasDeHora(144)
    assert.equal(backgroundSize, `100% ${(FILAS - 1) * 144}px`)
    assert.match(backgroundImage, /transparent 0 143px/)
    assert.match(backgroundImage, /143px 144px/)
  })
})

describe('el iman del arrastre', () => {
  test('sin nada cerca, cae al cuarto de hora', () => {
    assert.equal(imantar(487), 480)
    assert.equal(imantar(488), 495)
  })

  test('el borde de una clase GANA al cuarto de hora aunque quede mas lejos', () => {
    /* La razon de existir del iman. Junto a una clase que acaba a las 09:50,
       el multiplo de las 09:45 esta a 3 minutos y el borde a 2... pero lo
       que importa es que aunque la rejilla cayera mas cerca, gana el borde:
       si no, encajar dos clases seguidas seria imposible y ese es justo el
       gesto que se busca. */
    const anterior = clase(h(8, 30), h(9, 50), 'a')
    // 09:48 -> la rejilla diria 09:45; el borde dice 09:50
    assert.equal(imantarInicio(h(9, 48), 60, [anterior]), h(9, 50))
  })

  test('tambien iman para acabar justo donde otra empieza', () => {
    const siguiente = clase(h(10), h(11), 'b')
    // Con una hora de duracion, empezar a las 09:00 la deja pegada por arriba
    assert.equal(imantarInicio(h(9, 3), 60, [siguiente]), h(9))
  })

  test('fuera de la tolerancia manda la rejilla', () => {
    const anterior = clase(h(8), h(9), 'a')
    // 09:20 esta a 20 minutos del borde: demasiado lejos para el iman
    assert.equal(imantarInicio(h(9, 20), 60, [anterior]), h(9, 15))
  })
})

describe('posicionValida nunca propone un sitio ilegal', () => {
  test('si cabe donde se pide, se respeta', () => {
    const otras = [clase(h(8), h(9), 'a')]
    const pedida = { ...clase(h(10), h(11), 'x') }
    assert.deepEqual(posicionValida(otras, pedida), pedida)
  })

  test('encima de otra, salta al hueco pegado mas cercano', () => {
    const otras = [clase(h(8), h(9), 'a')]
    // Se pide 08:20-09:20, que pisa. Pegarse debajo (09:00) queda a 40
    // minutos; encima (07:00) queda a 80. Gana debajo.
    const propuesta = posicionValida(otras, { ...clase(h(8, 20), h(9, 20), 'x') })
    assert.equal(propuesta.inicio, h(9))
    assert.equal(propuesta.fin, h(10))
  })

  test('devuelve null cuando de verdad no cabe en ningun sitio', () => {
    // Un dia lleno de punta a punta no deja hueco para una hora mas
    const lleno = [clase(ABRE, CIERRA, 'a')]
    assert.equal(posicionValida(lleno, { ...clase(h(9), h(10), 'x') }), null)
  })

  test('lo que devuelve jamas se sale de la jornada ni pisa a nadie', () => {
    const otras = [clase(h(8), h(9), 'a'), clase(h(11), h(13), 'b')]
    // Se barre el dia entero de cinco en cinco minutos: ninguna respuesta
    // puede ser ilegal, y ese es el contrato del que depende que soltar el
    // arraste no falle nunca.
    for (let m = ABRE; m + 60 <= CIERRA; m += 5) {
      const r = posicionValida(otras, { ...clase(m, m + 60, 'x') })
      if (r === null) continue
      assert.ok(r.inicio >= ABRE, `se sale por arriba en ${m}`)
      assert.ok(r.fin <= CIERRA, `se sale por abajo en ${m}`)
      for (const o of otras) {
        assert.ok(!solapan({ ...r, dia: 0 }, o), `pisa a ${o.id} viniendo de ${m}`)
      }
    }
  })
})

describe('convivencia de clases', () => {
  test('dos clases pegadas NO se solapan', () => {
    // El caso que decide si la semana se lee de un vistazo: una acaba a las
    // nueve y la otra empieza a las nueve. Con un <= mal puesto, todas las
    // clases encadenadas se declararian en conflicto.
    assert.equal(solapan(clase(h(8), h(9), 'a'), clase(h(9), h(10), 'b')), false)
    assert.equal(solapan(clase(h(8), h(9, 1), 'a'), clase(h(9), h(10), 'b')), true)
  })

  test('clases en dias distintos nunca chocan', () => {
    const lunes = { id: 'a', dia: 0, inicio: h(8), fin: h(9) }
    const martes = { id: 'b', dia: 1, inicio: h(8), fin: h(9) }
    assert.equal(solapan(lunes, martes), false)
  })

  test('una clase no choca consigo misma al editarla', () => {
    // Sin la exclusion por id, mover una clase sin cambiarle la hora se
    // detectaria como choque contra su propia version anterior.
    const guardadas = [clase(h(8), h(9), 'a')]
    assert.equal(choqueCon(guardadas, clase(h(8), h(9), 'a')), null)
    assert.notEqual(choqueCon(guardadas, clase(h(8, 30), h(9, 30), 'otra')), null)
  })

  test('dos clases encima se reparten la columna en dos carriles', () => {
    const repartidas = repartirEnCarriles([clase(h(8), h(10), 'a'), clase(h(9), h(11), 'b')])
    assert.deepEqual(
      repartidas.map((s) => s.carriles),
      [2, 2],
    )
    assert.deepEqual(
      repartidas.map((s) => s.carril),
      [0, 1],
    )
  })

  test('sin solapes, cada clase ocupa la columna entera', () => {
    const repartidas = repartirEnCarriles([clase(h(8), h(9), 'a'), clase(h(10), h(11), 'b')])
    assert.deepEqual(
      repartidas.map((s) => s.carriles),
      [1, 1],
    )
  })
})

describe('la franja que se propone al señalar', () => {
  test('en un dia vacio propone la hora en punto entera', () => {
    assert.deepEqual(franjaPropuesta([], h(10, 20)), { inicio: h(10), fin: h(11) })
  })

  test('se encadena al final de la clase anterior', () => {
    /* El fallo que se vio en el telefono: con una clase de 7:00 a 8:30, la
       pista tiene que ofrecer las 8:30 y no las 9:00. Sin este recorte, el
       hueco que de verdad hay entre las dos se salta. */
    const manana = [clase(h(7), h(8, 30), 'a')]
    assert.deepEqual(franjaPropuesta(manana, h(8, 40)), { inicio: h(8, 30), fin: h(9, 30) })
  })

  test('se recorta contra la clase siguiente', () => {
    const tarde = [clase(h(12), h(13), 'b')]
    assert.deepEqual(franjaPropuesta(tarde, h(11, 30)), { inicio: h(11), fin: h(12) })
  })

  test('dentro de una clase no propone nada', () => {
    assert.equal(franjaPropuesta([clase(h(8), h(9), 'a')], h(8, 30)), null)
  })

  test('un hueco mas corto que el minimo no se ofrece', () => {
    /* Ofrecer veinte minutos seria ofrecer algo que el formulario va a
       rechazar despues: mejor no enseñarlo. */
    const apretado = [clase(h(8), h(9), 'a'), clase(h(9, 20), h(10), 'b')]
    assert.equal(franjaPropuesta(apretado, h(9, 10)), null)
  })

  test('lo que propone siempre es legal, en todo el dia', () => {
    const dia = [clase(h(8), h(9), 'a'), clase(h(10, 30), h(12), 'b')]
    for (let m = ABRE; m < CIERRA; m += 5) {
      const f = franjaPropuesta(dia, m)
      if (f === null) continue
      assert.ok(f.fin - f.inicio >= MIN_DURACION, `franja demasiado corta en ${m}`)
      assert.ok(f.inicio >= ABRE && f.fin <= CIERRA, `se sale de la jornada en ${m}`)
      for (const o of dia) {
        assert.ok(!solapan({ ...f, dia: 0 }, o), `pisa a ${o.id} en ${m}`)
      }
    }
  })
})

describe('huecoEn', () => {
  test('mide desde el final de la anterior hasta el inicio de la siguiente', () => {
    const dia = [clase(h(8), h(9), 'a'), clase(h(11), h(12), 'b')]
    assert.deepEqual(huecoEn(dia, h(10)), { desde: h(9), hasta: h(11) })
  })

  test('en un dia vacio el hueco es la jornada entera', () => {
    assert.deepEqual(huecoEn([], h(10)), { desde: ABRE, hasta: CIERRA })
  })

  test('dentro de una clase no hay hueco', () => {
    assert.equal(huecoEn([clase(h(8), h(9), 'a')], h(8)), null)
  })
})
