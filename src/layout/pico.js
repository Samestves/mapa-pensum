/**
 * La forma del piquito de las nubecitas, en geometria pura.
 *
 * Vive aqui y no dentro del componente por lo mismo que layout/popover.js: es
 * un dibujo que se sigue con un lapiz y no tiene nada que ver con React. Asi
 * ademas se puede medir sin montar nada.
 *
 * El primer intento fue un cuadrado girado 45 grados. Un cuadrado girado solo
 * sabe hacer una cosa: una punta de noventa grados que sale a escuadra de la
 * pared del panel. Se ve pegada, no brotada. El segundo fue una sola curva de
 * un extremo al otro, y salio lo contrario: un bulto blando, sin punta.
 *
 * Lo que hace falta son las TRES piezas que tiene un pico de verdad, y en
 * este orden:
 *
 *   1. una FALDA concava donde nace, para que el contorno salga del borde del
 *      panel en su misma direccion en vez de arrancar en angulo;
 *   2. un FLANCO recto, que es lo unico que se lee como "punta";
 *   3. una PUNTA redondeada, pequeña, del orden del grosor del trazo.
 *
 * Las tres empalman con tangente comun, asi que el contorno entero -borde del
 * panel incluido- no tiene ni un solo vertice.
 */

/* El triangulo de dentro: medio ancho y altura del apice. La altura no es lo
   que asoma -la punta redondeada se come algo mas de pixel y medio-, por eso
   ALTO se calcula y no se escribe. */
const SEMIBASE = 9
const APICE = 12.5

/* Radio de la falda y de la punta. La falda es grande a proposito: es la
   pieza que hace todo el trabajo de que el pico parezca salir del panel en
   vez de estar apoyado en el. */
const R_FALDA = 5
const R_PUNTA = 2

/* Cuanto se mete el relleno DENTRO del panel. Solo hace falta tapar el pixel
   del borde; mas seria una mancha opaca sobre el contenido cuando el panel
   lleva scroll. */
export const PISADA = 2

const LARGO = Math.hypot(SEMIBASE, APICE)

/** Lo que asoma de verdad. Tiene que ser menor que el HUECO de popover.js. */
export const ALTO = APICE - (R_PUNTA * LARGO) / SEMIBASE + R_PUNTA

/** Ancho de la base, faldas incluidas. */
export const ANCHO = 2 * (SEMIBASE + (R_FALDA * (LARGO - SEMIBASE)) / APICE)

const MEDIO = ANCHO / 2

/* Un arco como cubica: devuelve inicio, sus dos tiradores y final. Se
   aproxima en vez de usar el comando A de SVG porque el mismo dibujo se pinta
   hacia los cuatro lados y dos de ellos son espejos: los banderines de
   barrido de A habria que voltearlos segun el lado, y eso es justo la clase
   de cuenta que se escribe mal una vez y no se nota hasta que alguien abre un
   popover que apunta al otro lado. Con puntos sueltos, cambiar de lado es
   cambiar de sistema de coordenadas y ya. */
function arco(cx, cy, r, desde, hasta) {
  const k = (4 / 3) * Math.tan((hasta - desde) / 4) * r
  const p = (a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)]
  const t = (a) => [-Math.sin(a) * k, Math.cos(a) * k]

  const [x0, y0] = p(desde)
  const [x1, y1] = p(hasta)
  const [dx0, dy0] = t(desde)
  const [dx1, dy1] = t(hasta)

  return [
    [x0, y0],
    [x0 + dx0, y0 + dy0],
    [x1 - dx1, y1 - dy1],
    [x1, y1],
  ]
}

/* Los angulos, en "espacio piquito": u corre a lo largo de la base y v se
   aleja del panel. El centro de cada falda cae justo encima del punto donde
   el contorno toca el borde del panel, a R_FALDA de alto; el de la punta, en
   el eje. */
const ABAJO = -Math.PI / 2
const FLANCO = Math.atan2(-SEMIBASE, APICE)
const V_PUNTA = APICE - (R_PUNTA * LARGO) / SEMIBASE

const TRAMOS = [
  arco(0, R_FALDA, R_FALDA, ABAJO, FLANCO),
  arco(MEDIO, V_PUNTA, R_PUNTA, Math.PI - Math.atan2(SEMIBASE, APICE), Math.atan2(SEMIBASE, APICE)),
  arco(ANCHO, R_FALDA, R_FALDA, -Math.PI - FLANCO, ABAJO),
]

/* Cada lado es el mismo dibujo mirado desde otro sitio: una caja y una forma
   de llevar (u, v) a coordenadas del SVG. Nada de rotar el elemento: eso
   obliga a llevar la cuenta del orden de translate y rotate, y ya nos costo
   una vez. */
export const LADOS = {
  arriba: { w: ANCHO, h: ALTO + PISADA, eje: 'top', cruce: 'left', p: (u, v) => [u, ALTO - v] },
  abajo: { w: ANCHO, h: ALTO + PISADA, eje: 'bottom', cruce: 'left', p: (u, v) => [u, PISADA + v] },
  izquierda: { w: ALTO + PISADA, h: ANCHO, eje: 'left', cruce: 'top', p: (u, v) => [ALTO - v, u] },
  derecha: { w: ALTO + PISADA, h: ANCHO, eje: 'right', cruce: 'top', p: (u, v) => [PISADA + v, u] },
}

/* La base cae medio pixel por dentro para que el trazo del pico y el borde
   del panel compartan centro y se lean como la misma linea. */
export const SALIENTE = -(ALTO - 0.5)

/**
 * El contorno del pico como atributo `d`.
 *
 * Entre arco y arco va una recta: ese es el flanco. No se dibuja como tal,
 * sale de unir el final de un tramo con el principio del siguiente, y es
 * recto porque los dos arcos son tangentes a la misma linea.
 *
 * @param lado    borde del panel por el que asoma.
 * @param cierre  si se cierra por debajo de la base. El relleno lo necesita
 *                -es lo que tapa el trozo de borde del panel-, el trazo no:
 *                si se cerrara, dibujaria una recta cruzando la base y
 *                volveriamos justo al problema que esto viene a arreglar.
 */
export function trazar(lado, cierre) {
  const { p } = LADOS[lado]
  const q = (u, v) => p(u, v).map((n) => Math.round(n * 1000) / 1000).join(' ')

  const d = TRAMOS.reduce((acc, [inicio, c1, c2, fin], i) => {
    const salto = i === 0 ? `M ${q(...inicio)}` : ` L ${q(...inicio)}`
    return `${acc}${salto} C ${q(...c1)}, ${q(...c2)}, ${q(...fin)}`
  }, '')

  return cierre ? `${d} L ${q(ANCHO, -PISADA)} L ${q(0, -PISADA)} Z` : d
}
