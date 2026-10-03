import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import {
  AUMENTO_GESTO,
  AUMENTO_MAX,
  AUMENTO_VIAJE,
  MARGEN_CAPA,
  capaCubre,
  mismaVista,
  seMueve,
  transformRelativo,
  vistaAdelantada,
  vistaParaViaje,
} from './vistaViva.js'

const VENTANA = { ancho: 400, alto: 300 }

/* Zoom de factor f dejando quieto el punto (px, py), como hace el pellizco */
const acercar = (v, f, px, py) => ({
  escala: v.escala * f,
  x: px - (px - v.x) * f,
  y: py - (py - v.y) * f,
})

test('el transform relativo deja cada punto del mapa donde lo pone la vista viva', () => {
  const pintada = { x: 30, y: -20, escala: 0.8 }
  const viva = acercar(pintada, 1.4, 180, 90)
  const t = transformRelativo(viva, pintada)
  for (const X of [0, 125, 900]) {
    const enPintada = pintada.x + pintada.escala * X
    assert.ok(Math.abs(t.x + t.k * enPintada - (viva.x + viva.escala * X)) < 1e-9)
  }
})

test('sin cambios no hay nada que estirar', () => {
  assert.ok(mismaVista({ x: 1, y: 2, escala: 3 }, { x: 1, y: 2, escala: 3 }))
  assert.ok(!mismaVista({ x: 1, y: 2, escala: 3 }, { x: 1, y: 2, escala: 3.01 }))
  assert.deepEqual(transformRelativo({ x: 5, y: 6, escala: 2 }, { x: 5, y: 6, escala: 2 }), {
    k: 1,
    x: 0,
    y: 0,
  })
})

test('acercar con el mapa llenando la pantalla se resuelve estirando la capa', () => {
  const pintada = { x: -300, y: -200, escala: 1 }
  const viva = acercar(pintada, 1.5, 200, 150)
  assert.ok(capaCubre(viva, pintada, VENTANA, 2000, 1500))
})

test('alejar con el mapa llenando la pantalla dejaria bordes vacios: hay que pintar', () => {
  const pintada = { x: -300, y: -200, escala: 1 }
  const viva = acercar(pintada, 0.8, 200, 150)
  assert.ok(!capaCubre(viva, pintada, VENTANA, 2000, 1500))
})

test('alejar desde el mapa entero si cabe en la capa', () => {
  const pintada = { x: 100, y: 75, escala: 1 }
  const viva = acercar(pintada, 0.5, 200, 150)
  assert.ok(capaCubre(viva, pintada, VENTANA, 200, 150))
})

test('pasado el aumento maximo se repinta aunque cubra, para que no se vea borroso', () => {
  const pintada = { x: -300, y: -200, escala: 1 }
  assert.ok(capaCubre(acercar(pintada, AUMENTO_MAX - 0.01, 200, 150), pintada, VENTANA, 2000, 1500))
  assert.ok(
    !capaCubre(acercar(pintada, AUMENTO_MAX + 0.01, 200, 150), pintada, VENTANA, 2000, 1500),
  )
})

test('con margen, alejar y arrastrar dentro de el se resuelven estirando la capa', () => {
  const pintada = { x: -300, y: -200, escala: 1 }
  const m = MARGEN_CAPA
  // Alejar hasta casi 1/(1 + 2m) alrededor del centro de la ventana
  const lejos = acercar(pintada, 1 / (1 + 2 * m) + 0.01, 200, 150)
  assert.ok(capaCubre(lejos, pintada, VENTANA, 2000, 1500, AUMENTO_MAX, m))
  assert.ok(!capaCubre(lejos, pintada, VENTANA, 2000, 1500))
  // Arrastrar algo menos que el margen
  const arrastre = { ...pintada, x: pintada.x + VENTANA.ancho * m * 0.9 }
  assert.ok(capaCubre(arrastre, pintada, VENTANA, 2000, 1500, AUMENTO_MAX, m))
  // y pasado el margen, pintar
  const lejosDelMargen = { ...pintada, x: pintada.x + VENTANA.ancho * m * 1.1 }
  assert.ok(!capaCubre(lejosDelMargen, pintada, VENTANA, 2000, 1500, AUMENTO_MAX, m))
})

test('desplazarse mientras se pellizca destapa un borde: hay que pintar', () => {
  const pintada = { x: -300, y: -200, escala: 1 }
  const viva = { ...acercar(pintada, 1.1, 200, 150), x: -300 * 1.1 + 200 }
  assert.ok(!capaCubre(viva, pintada, VENTANA, 2000, 1500))
})

describe('la vista para un viaje de camara', () => {
  const MAPA = [2000, 1500]
  const cubreViaje = (viva, pintada) => capaCubre(viva, pintada, VENTANA, ...MAPA, AUMENTO_VIAJE)

  test('alejarse con el mapa llenando la pantalla pinta el destino, que tiene dentro lo de ahora', () => {
    const desde = { x: -300, y: -200, escala: 1 }
    const hasta = acercar(desde, 0.5, 200, 150)
    assert.deepEqual(vistaParaViaje(desde, hasta, VENTANA, ...MAPA), hasta)
  })

  test('alejarse desde el mapa entero encoge lo que ya esta pintado', () => {
    const desde = { x: 100, y: 75, escala: 1 }
    const hasta = acercar(desde, 0.5, 200, 150)
    assert.deepEqual(vistaParaViaje(desde, hasta, VENTANA, 200, 150), desde)
  })

  test('acercarse estira lo pintado y se pinta nitido al final', () => {
    const desde = { x: -300, y: -200, escala: 1 }
    const hasta = acercar(desde, 1.25, 200, 150)
    assert.deepEqual(vistaParaViaje(desde, hasta, VENTANA, ...MAPA), desde)
  })

  test('desplazarse pinta una vista que abarca las dos puntas y el camino entre ellas', () => {
    const desde = { x: -300, y: -200, escala: 1 }
    const hasta = { x: -520, y: -200, escala: 0.9 }
    const base = vistaParaViaje(desde, hasta, VENTANA, ...MAPA)
    assert.ok(base && base.escala < 0.9)
    for (let i = 0; i <= 10; i++) {
      const k = i / 10
      const v = {
        escala: desde.escala + (hasta.escala - desde.escala) * k,
        x: desde.x + (hasta.x - desde.x) * k,
        y: desde.y + (hasta.y - desde.y) * k,
      }
      assert.ok(cubreViaje(v, base), `cubre el cuadro ${i}`)
    }
  })

  test('si haria falta estirar demasiado no hay vista que sirva', () => {
    const desde = { x: -3000, y: -2000, escala: 2.5 }
    const hasta = { x: 40, y: 60, escala: 0.1 }
    assert.equal(vistaParaViaje(desde, hasta, VENTANA, ...MAPA), null)
  })
})

test('con la mano en el mapa se deja estirar hasta el aumento de gesto', () => {
  const pintada = { x: -300, y: -200, escala: 1 }
  const cubre = (f) =>
    capaCubre(acercar(pintada, f, 200, 150), pintada, VENTANA, 2000, 1500, AUMENTO_GESTO)
  assert.ok(cubre(AUMENTO_MAX + 1))
  assert.ok(cubre(AUMENTO_GESTO - 0.01))
  assert.ok(!cubre(AUMENTO_GESTO + 0.01))
})

describe('la vista adelantada, cuando toca pintar con el mapa en marcha', () => {
  const MAPA = [6000, 4500]
  const m = MARGEN_CAPA
  const cubre = (viva, pintada) => capaCubre(viva, pintada, VENTANA, ...MAPA, AUMENTO_GESTO, m)
  const pintada = { x: -2000, y: -1500, escala: 1 }

  test('arrastrando, deja por delante mas recorrido del que daba pintar donde se esta', () => {
    // El mapa se ha corrido a la izquierda mas de lo que cubria el margen
    const viva = { ...pintada, x: pintada.x - VENTANA.ancho * (m + 0.05) }
    assert.ok(!cubre(viva, pintada))

    const adelantada = vistaAdelantada(viva, pintada, VENTANA, m)
    assert.ok(cubre(viva, adelantada), 'lo que se ve ahora sigue dentro')
    assert.equal(adelantada.escala, viva.escala)
    assert.equal(adelantada.y, viva.y, 'solo se adelanta en la direccion del arrastre')

    const sigue = (pantallas) => ({ ...viva, x: viva.x - VENTANA.ancho * pantallas })
    assert.ok(cubre(sigue(0.65), adelantada), 'seguir 0,65 pantallas se resuelve estirando')
    assert.ok(!cubre(sigue(0.65), viva), 'y pintando donde se estaba, no')
    assert.ok(cubre(sigue(-0.05), adelantada), 'rectificar un poco tampoco destapa nada')
  })

  test('arrastrando en diagonal se adelanta en los dos ejes sin salirse del margen', () => {
    const viva = {
      ...pintada,
      x: pintada.x + VENTANA.ancho * 0.2,
      y: pintada.y + VENTANA.alto * (m + 0.1),
    }
    const adelantada = vistaAdelantada(viva, pintada, VENTANA, m)
    assert.ok(cubre(viva, adelantada))
    assert.ok(adelantada.x > viva.x && adelantada.y > viva.y)
  })

  test('alejando, pinta mas lejos y deja alejar bastante mas sin volver a pintar', () => {
    const viva = acercar(pintada, 0.5, 200, 150)
    assert.ok(!cubre(viva, pintada))

    const adelantada = vistaAdelantada(viva, pintada, VENTANA, m)
    assert.ok(cubre(viva, adelantada), 'lo que se ve ahora sigue dentro')
    const estirada = transformRelativo(viva, adelantada).k
    assert.ok(Math.abs(estirada - AUMENTO_MAX) < 1e-9, 'estirada lo que no se nota, no mas')

    const mas = acercar(viva, 0.35, 200, 150)
    assert.ok(cubre(mas, adelantada), 'alejar casi el triple mas se resuelve encogiendo')
    assert.ok(!cubre(mas, viva), 'y pintando a la escala de ahora, no')
  })

  test('acercando no hay nada que adelantar', () => {
    const viva = acercar(pintada, AUMENTO_GESTO + 0.5, 200, 150)
    assert.deepEqual(vistaAdelantada(viva, pintada, VENTANA, m), viva)
  })
})

describe('el temblor de un dedo no cuenta como movimiento', () => {
  const v = { x: 100, y: 50, escala: 0.8 }

  test('arrastrando: un par de pixeles no, tres si', () => {
    assert.ok(!seMueve(v, { ...v, x: 101.5, y: 49 }, VENTANA))
    assert.ok(seMueve(v, { ...v, x: 103 }, VENTANA))
    assert.ok(seMueve(v, { ...v, y: 47 }, VENTANA))
  })

  test('pellizcando: medio por ciento de escala no, un dos por ciento si', () => {
    assert.ok(!seMueve(v, acercar(v, 1.005, 200, 150), VENTANA))
    assert.ok(seMueve(v, acercar(v, 1.02, 200, 150), VENTANA))
  })

  test('con el mapa ampliado y su origen lejos, el temblor de un pellizco sigue sin contar', () => {
    const lejos = { x: -5200, y: -3900, escala: 2.4 }
    const tiembla = acercar(lejos, 1.004, 200, 150)
    assert.ok(Math.abs(tiembla.x - lejos.x) > 20, 'el origen se corre decenas de pixeles')
    assert.ok(!seMueve(lejos, tiembla, VENTANA), 'y en pantalla no se ha movido nada')
  })
})
