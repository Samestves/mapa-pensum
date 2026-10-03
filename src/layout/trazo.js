/**
 * Mueve y escala un trazo de SVG -el `d` de un <path>- reescribiendo sus
 * numeros, en vez de ponerle un transform.
 *
 * Por que hace falta. En el mapa, cada elemento con su propio transform o su
 * propio recorte obliga a Chrome a abrir un trozo de pintado aparte, y esos
 * trozos se vuelven a repartir en capas en cada cuadro en que el mapa se
 * mueve. Los iconos de estado empezaron como <use> de un <symbol>: un recorte
 * y una transformacion por tarjeta, y ese reparto paso de 1,7 a 3,9 ms por
 * cuadro (telefono emulado, CPU x4). Con el dibujo ya colocado en las
 * coordenadas de la tarjeta no hay nada que abrir: vuelve a 1,7.
 *
 * Solo escala uniforme y traslacion, que es lo unico que no deforma un arco.
 * Las ordenes en mayuscula son posiciones y se trasladan; las de minuscula
 * son desplazamientos y solo se escalan.
 */

/* Cuantos numeros lleva cada orden */
const POR_ORDEN = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7, z: 0 }

const NUMERO = /-?\d*\.?\d+(?:e-?\d+)?/g
const redondear = (v) => +v.toFixed(3)

export function colocarTrazo(d, escala = 1, dx = 0, dy = 0) {
  if (escala === 1 && dx === 0 && dy === 0) return d

  return d.replace(/([a-zA-Z])([^a-zA-Z]*)/g, (_, orden, resto) => {
    const tipo = orden.toLowerCase()
    const absoluta = orden !== tipo
    const cuantos = POR_ORDEN[tipo] || 1
    const numeros = (resto.match(NUMERO) ?? []).map(Number)

    const colocados = numeros.map((v, i) => {
      const k = i % cuantos
      /* Arco: dos radios, el giro y las dos banderas -que no se tocan-, y el
         punto de llegada. */
      if (tipo === 'a') {
        if (k < 2) return redondear(v * escala)
        if (k < 5) return v
        return redondear(v * escala + (absoluta ? (k === 5 ? dx : dy) : 0))
      }
      const enY = tipo === 'v' || (tipo !== 'h' && k % 2 === 1)
      return redondear(v * escala + (absoluta ? (enY ? dy : dx) : 0))
    })
    return orden + colocados.join(' ')
  })
}
