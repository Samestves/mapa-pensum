/**
 * Saca de las librerias de iconos SOLO los que usan las materias y los deja
 * en datos/iconos.json, que es lo que lee normalizar.js.
 *
 * Las librerias no son dependencias del proyecto: pesan megas y de cada una
 * se usan unas decenas de trazos. Para volver a generar el archivo -porque
 * cambian las reglas de scripts/iconosMaterias.js- se instalan de paso:
 *
 *   npm i --no-save @phosphor-icons/core@2 @tabler/icons@3
 *   node scripts/extraerIconos.js
 *
 * Phosphor en peso "light": un solo grosor de linea fino, sin rellenos, que
 * es el idioma de los iconos de The Last of Us. Sus SVG vienen ya como
 * contorno relleno. Los de Tabler y los dibujados aqui son trazos, y se
 * pintan con el mismo grosor que tiene la linea de Phosphor light para que
 * no se note de que familia viene cada uno.
 *
 * Las coordenadas se redondean -a enteros en la caja de 256 de Phosphor, a
 * dos decimales en la de 24 de Tabler-: el icono mide 72 unidades del mapa,
 * asi que el error es de dos decimas de unidad y no se ve, y cada carrera
 * baja entre un 15 y un 20 % lo que pesa. Viajan con el pensum de cada
 * carrera, que es lo que se descarga al abrirla.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ICONOS_USADOS } from './iconosMaterias.js'

const PHOSPHOR = process.env.PHOSPHOR ?? 'node_modules/@phosphor-icons/core/assets/light'
const TABLER = process.env.TABLER ?? 'node_modules/@tabler/icons/icons/outline'

/* Los de Tabler, con el nombre que les da la regla */
const DE_TABLER = {
  cerdo: 'pig',
  leche: 'milk',
  carne: 'meat',
  semilla: 'seedling',
  satelite: 'satellite',
}

/* Los que no existen en ninguna de las dos, dibujados en la misma caja de
   256 y con las mismas proporciones que Phosphor: el dibujo ocupa del 40 al
   216 y la linea mide 12, como la de su peso light. */
const PROPIOS = {
  // Torre de perforacion: dos patas que se juntan arriba, dos travesaños con
  // una cruz entre ellos y el suelo
  torre: [
    'M56 224H200',
    'M84 224L116 48M172 224L140 48M104 48H152',
    'M95.6 160H160.4M106.5 100H149.5M95.6 160L149.5 100M160.4 160L106.5 100',
  ],
  // Oveja de perfil: el cuerpo es una nube, la cabeza un ovalo aparte y
  // cuatro patas cortas
  oveja: [
    'M76 172A34 34 0 0 1 64 128A26 26 0 0 1 100 96A24 24 0 0 1 144 92A22 22 0 0 1 180 112A25 25 0 0 1 184 160A24 24 0 0 1 140 176A34 34 0 0 1 76 172Z',
    'M208 86A17 21 0 1 1 208 128A17 21 0 1 1 208 86Z',
    'M195 94L182 86',
    'M96 180V216M120 181V216M152 178V216M172 170V216',
  ],
  // Panal: tres celdas hexagonales, dos abajo y una encima
  panal: [
    'M128 46L164.4 67L164.4 109L128 130L91.6 109L91.6 67Z',
    'M87.6 116L124 137L124 179L87.6 200L51.2 179L51.2 137Z',
    'M168.4 116L204.8 137L204.8 179L168.4 200L132 179L132 137Z',
  ],
  // Regadera: cuerpo, asa, pico largo con su alcachofa y dos gotas
  regadera: [
    'M56 112H156V200A12 12 0 0 1 144 212H68A12 12 0 0 1 56 200Z',
    'M76 112C76 60 136 60 136 112',
    'M156 180L214 110M200 98L228 122',
    'M236 140L240 152M222 150L224 162',
  ],
}

/** Los numeros de un trazo, redondeados y reescritos sin ambiguedades */
function compactar(d, decimales) {
  const piezas = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g)
  let salida = ''
  let previo = ''
  for (const pieza of piezas) {
    if (/[a-zA-Z]/.test(pieza)) {
      salida += pieza
      previo = pieza
      continue
    }
    let n = Number(Number(pieza).toFixed(decimales))
    if (Object.is(n, -0)) n = 0
    const texto = String(n).replace(/^(-?)0\./, '$1.')
    // Entre dos numeros hace falta separarlos, salvo si el segundo lleva
    // signo o empieza por punto y el primero ya tenia punto
    const necesita =
      previo !== '' &&
      !/[a-zA-Z]/.test(previo) &&
      !texto.startsWith('-') &&
      !(texto.startsWith('.') && previo.includes('.'))
    salida += (necesita ? ' ' : '') + texto
    previo = texto
  }
  return salida
}

const trazosDe = (svg) =>
  [...svg.matchAll(/<path([^>]*)\/?>/g)]
    .map(([, atributos]) => atributos)
    .filter((a) => !/stroke="none"/.test(a))
    .map((a) => a.match(/\sd="([^"]+)"/)[1])

const iconos = {}
for (const nombre of ICONOS_USADOS) {
  if (PROPIOS[nombre]) {
    iconos[nombre] = { caja: 256, trazo: true, d: PROPIOS[nombre] }
  } else if (DE_TABLER[nombre]) {
    const svg = readFileSync(join(TABLER, `${DE_TABLER[nombre]}.svg`), 'utf8')
    iconos[nombre] = { caja: 24, trazo: true, d: trazosDe(svg).map((d) => compactar(d, 2)) }
  } else {
    const svg = readFileSync(join(PHOSPHOR, `${nombre}-light.svg`), 'utf8')
    iconos[nombre] = { caja: 256, d: trazosDe(svg).map((d) => compactar(d, 0)) }
  }
}

writeFileSync(
  'datos/iconos.json',
  JSON.stringify(
    {
      _licencias: [
        'Phosphor Icons, MIT License, Copyright (c) 2023 Phosphor Icons. https://phosphoricons.com',
        'Tabler Icons, MIT License, Copyright (c) 2020-2026 Paweł Kuna. https://tabler.io/icons',
      ],
      iconos,
    },
    null,
    0,
  ),
)
const bytes = JSON.stringify(iconos).length
console.log(
  `  ${Object.keys(iconos).length} iconos en datos/iconos.json (${(bytes / 1024).toFixed(1)} kB)`,
)
