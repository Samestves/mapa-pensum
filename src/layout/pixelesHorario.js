/* Lo que el lector local saca de los PIXELES de la captura, que es justo lo
   que el OCR no da: hasta donde llega una celda.

   En el horario de la UDO la hora de una clase no esta escrita en su bloque:
   sale de cuantas columnas ocupa. El OCR dice donde esta el codigo de la
   materia, y de ahi hay que saber cuanto mide el rectangulo de color que lo
   rodea. Se hace igual para un bloque de clase y para una celda de la
   cabecera, y no depende del tema: no se busca "azul", se busca "el color que
   hay detras de esta palabra" y hasta donde sigue.

   Todo es funcion pura sobre { ancho, alto, datos } -los mismos campos de un
   ImageData, RGBA- para poder probarlo con imagenes pintadas a mano. */

/* Cuanto pueden separarse dos colores, sumando los tres canales, y seguir
   siendo "el mismo". Tiene que tragarse el ruido de un JPEG y el borde
   suavizado de una imagen ampliada, y aun asi separar una celda de la linea
   de la rejilla: en un tema claro esa linea esta a unos 85 de la celda. */
const TOLERANCIA = 48

/* Que parte de una fila tiene que ser fondo para contar como celda. Una linea
   de la rejilla no tiene nada; un renglon de texto, mirado a todo el ancho del
   bloque, conserva los margenes y los espacios. Por eso el corte esta bajo: lo
   que separa una cosa de la otra es el cero. */
const MINIMO_DE_FONDO = 0.1

/* En las bandas sin letras, en cambio, una columna es fondo o no lo es */
const MITAD = 0.5

const parecidos = (datos, i, [r, g, b]) =>
  Math.abs(datos[i] - r) + Math.abs(datos[i + 1] - g) + Math.abs(datos[i + 2] - b) <= TOLERANCIA

const acotar = (v, min, max) => Math.max(min, Math.min(max, Math.round(v)))

/* La caja, en pixeles enteros y dentro de la imagen */
const recortar = ({ ancho, alto }, caja) => ({
  x0: acotar(caja.x0, 0, ancho - 1),
  x1: acotar(caja.x1, 0, ancho - 1),
  y0: acotar(caja.y0, 0, alto - 1),
  y1: acotar(caja.y1, 0, alto - 1),
})

/* Las dos bandas finas que quedan justo encima y justo debajo de una palabra:
   el hueco hasta el borde de la celda o hasta el renglon siguiente. Ahi no hay
   letras, y por eso es donde se mira el color y por donde se camina. Se dejan
   a un pixel de la palabra, que es hasta donde mancha un JPEG. */
function bandasDe(imagen, caja) {
  const c = recortar(imagen, caja)
  const grosor = Math.max(2, Math.round((c.y1 - c.y0) / 4))
  const arriba = { y0: c.y0 - 1 - grosor, y1: c.y0 - 2 }
  const abajo = { y0: c.y1 + 2, y1: c.y1 + 1 + grosor }
  return [arriba, abajo]
    .filter((b) => b.y0 >= 0 && b.y1 < imagen.alto)
    .map((b) => ({ ...b, x0: c.x0, x1: c.x1 }))
}

const mediana = (valores) => valores.sort((a, b) => a - b)[valores.length >> 1]

/**
 * El color de la celda en la que esta una palabra.
 *
 * Se mira en las bandas de encima y debajo, no dentro de la caja: dentro hay
 * letras con su borde suavizado, y en una captura pasada por JPEG el color
 * que mas se repite ahi ya no es el del fondo. Y la mediana, no la media: si
 * se cuela el rabo de una letra, no la mueve.
 *
 * @returns {[number, number, number]|null}
 */
export function colorDeFondo(imagen, caja) {
  const canales = [[], [], []]
  for (const banda of bandasDe(imagen, caja)) {
    for (let y = banda.y0; y <= banda.y1; y++) {
      for (let x = banda.x0; x <= banda.x1; x++) {
        const i = (y * imagen.ancho + x) * 4
        for (let k = 0; k < 3; k++) canales[k].push(imagen.datos[i + k])
      }
    }
  }
  return canales[0].length ? canales.map(mediana) : null
}

/* Que parte de un tramo recto -una fila o una columna- es del color dado */
function parteDeFondo(imagen, color, fijo, desde, hasta, enFila) {
  let iguales = 0
  for (let v = desde; v <= hasta; v++) {
    const i = (enFila ? fijo * imagen.ancho + v : v * imagen.ancho + fijo) * 4
    if (parecidos(imagen.datos, i, color)) iguales++
  }
  return iguales / (hasta - desde + 1)
}

/* Avanza desde `inicio` en la direccion `paso` mientras siga siendo celda, y
   devuelve la ultima posicion que lo era. */
function extender(inicio, paso, limite, esCelda) {
  let v = inicio
  while (v + paso !== limite && esCelda(v + paso)) v += paso
  return v
}

/**
 * El rectangulo de color liso que rodea a una palabra: su celda.
 *
 * Primero a lo ancho, caminando por las bandas de encima y debajo de la
 * palabra, que cruzan el bloque entero sin tocar una letra; basta con que una
 * de las dos siga siendo fondo, por si en la otra asoma una tilde o el rabo de
 * una "g". Luego a lo alto, mirando ya todo ese ancho: un renglon de texto
 * tiene margenes y espacios de sobra, y una linea de la rejilla no tiene nada.
 *
 * Al reves no sale: a lo alto, con solo el ancho de la palabra, un renglon de
 * letras apretadas justo debajo deja tan poco fondo como una linea.
 *
 * @param {{ancho: number, alto: number, datos: ArrayLike<number>}} imagen
 * @param {{x0: number, y0: number, x1: number, y1: number}} caja  la de la palabra
 * @returns {{x0: number, y0: number, x1: number, y1: number}|null}
 */
export function celdaDe(imagen, caja) {
  const c = recortar(imagen, caja)
  const bandas = bandasDe(imagen, c)
  const color = colorDeFondo(imagen, c)
  if (!color) return null

  const columnaEsCelda = (x) =>
    bandas.some((b) => parteDeFondo(imagen, color, x, b.y0, b.y1, false) >= MITAD)
  /* Si ni la propia palabra esta sobre ese color, no hay celda que medir */
  if (!columnaEsCelda(c.x0) || !columnaEsCelda(c.x1)) return null
  const x0 = extender(c.x0, -1, -1, columnaEsCelda)
  const x1 = extender(c.x1, 1, imagen.ancho, columnaEsCelda)

  const filaEsCelda = (y) => parteDeFondo(imagen, color, y, x0, x1, true) >= MINIMO_DE_FONDO
  const y0 = extender(c.y0, -1, -1, filaEsCelda)
  const y1 = extender(c.y1, 1, imagen.alto, filaEsCelda)

  return { x0, y0, x1, y1 }
}
