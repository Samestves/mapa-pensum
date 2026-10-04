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

/* Cuantos puntos se miran por lado para saber el color de una casilla */
const MUESTRAS = 9

const parecidos = (datos, i, [r, g, b]) =>
  Math.abs(datos[i] - r) + Math.abs(datos[i + 1] - g) + Math.abs(datos[i + 2] - b) <= TOLERANCIA

const distancia = (a, b) => a.reduce((suma, v, k) => suma + Math.abs(v - b[k]), 0)

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

/* Lo que tiene que cambiar el gris de un pixel al de dos mas alla para contar
   como un borde: una linea de la rejilla o el filo de una letra. A dos y no al
   de al lado porque en una captura reducida la linea queda borrosa y el
   cambio se reparte en dos pasos. El ruido de un JPEG no llega. */
const BORDE = 20

/* Las filas seguidas sin un solo borde que caben dentro de la tabla, en altos
   de la cabecera. Dentro de una rejilla no hay ninguna -las lineas verticales
   la cruzan entera-; mas que esto ya es el margen de fuera. */
const HUECO = 1.5

const MARGEN_DE_ZONA = 4

/* Cuanto tiene que medir un hueco liso entre dos partes de una captura para
   separarlas, en parte del alto de la imagen: la barra de estado de la
   tabla, o la tabla del pie de la pagina. */
const SEPARACION = 0.02

const gris = (datos, i) => 0.299 * datos[i] + 0.587 * datos[i + 1] + 0.114 * datos[i + 2]

/* Cuantos bordes tiene cada fila de la imagen, y donde estan el primero y el
   ultimo */
function bordesPorFila({ ancho, alto, datos }) {
  const bordes = new Uint32Array(alto)
  const primero = new Int32Array(alto).fill(ancho)
  const ultimo = new Int32Array(alto).fill(-1)
  for (let y = 0; y < alto; y++) {
    const fila = y * ancho * 4
    for (let x = 2; x < ancho; x++) {
      if (Math.abs(gris(datos, fila + x * 4) - gris(datos, fila + (x - 2) * 4)) > BORDE) {
        bordes[y]++
        if (primero[y] === ancho) primero[y] = x
        ultimo[y] = x
      }
    }
  }
  return { bordes, primero, ultimo }
}

/* La caja de unas filas: de su primer borde a su ultimo, con un margen */
function cajaDeFilas(imagen, { primero, ultimo }, y0, y1, minimo = {}) {
  let [x0, x1] = [minimo.x0 ?? imagen.ancho, minimo.x1 ?? -1]
  for (let y = y0; y <= y1; y++) {
    x0 = Math.min(x0, primero[y])
    x1 = Math.max(x1, ultimo[y])
  }
  return recortar(imagen, {
    x0: x0 - MARGEN_DE_ZONA,
    y0: y0 - MARGEN_DE_ZONA,
    x1: x1 + MARGEN_DE_ZONA,
    y1: y1 + MARGEN_DE_ZONA,
  })
}

/**
 * Donde esta la tabla: alrededor de su cabecera, todo lo que no es margen liso.
 *
 * Una captura de telefono trae la tabla en una franja del medio, con barras y
 * margenes lisos encima y debajo. Leida entera, la imagen alta llega antes al
 * tope del lienzo y no se puede ampliar lo que haria falta, y el OCR se pierde
 * en tanto fondo. Recortada a su zona, se lee mas grande y mejor.
 *
 * Fila por fila se cuentan los bordes. Desde la cabecera se sube y se baja
 * mientras haya bordes, y a lo ancho se toma desde el primero hasta el ultimo.
 *
 * @param {{x0: number, y0: number, x1: number, y1: number}} cabecera  la caja
 *   que abarca las franjas leidas
 * @returns {{x0: number, y0: number, x1: number, y1: number}}
 */
export function zonaDeLaTabla(imagen, cabecera) {
  const perfil = bordesPorFila(imagen)
  const hueco = Math.max(4, Math.round((cabecera.y1 - cabecera.y0) * HUECO))
  const hasta = (desde, paso) => {
    let borde = desde
    for (let y = desde, quietas = 0; y >= 0 && y < imagen.alto && quietas <= hueco; y += paso) {
      if (perfil.bordes[y]) {
        borde = y
        quietas = 0
      } else {
        quietas++
      }
    }
    return borde
  }
  const centro = Math.round((cabecera.y0 + cabecera.y1) / 2)
  return cajaDeFilas(imagen, perfil, hasta(centro, -1), hasta(centro, 1), cabecera)
}

/**
 * La parte de la captura con mas contenido, para cuando ni siquiera se
 * encontro la cabecera.
 *
 * Pasa con la captura de un telefono en tema oscuro: tanto fondo liso
 * alrededor de la tabla confunde al OCR, que no llega a leer ni las horas.
 * Se parte la imagen por los huecos lisos que la cruzan de lado a lado -entre
 * la barra de estado y la pagina, entre la tabla y el pie- y se queda la
 * parte con mas bordes, que es la tabla: lineas y letras por todas partes.
 *
 * @returns {{x0: number, y0: number, x1: number, y1: number}|null}  null si
 *   no hay nada que recortar
 */
export function zonaConMasBordes(imagen) {
  const perfil = bordesPorFila(imagen)
  const separacion = Math.max(8, Math.round(imagen.alto * SEPARACION))
  const partes = []
  let quietas = Infinity
  for (let y = 0; y < imagen.alto; y++) {
    if (!perfil.bordes[y]) {
      quietas++
      continue
    }
    if (quietas > separacion) partes.push({ y0: y, y1: y, bordes: 0 })
    const parte = partes[partes.length - 1]
    parte.y1 = y
    parte.bordes += perfil.bordes[y]
    quietas = 0
  }
  const mejor = partes.sort((a, b) => b.bordes - a.bordes)[0]
  return mejor ? cajaDeFilas(imagen, perfil, mejor.y0, mejor.y1) : null
}

/* Una fila de la rejilla puede medir mas que otra -un nombre largo parte en
   dos renglones-, pero no tanto. Un tramo mas alto que esto, comparado con la
   fila tipica, es la pagina de debajo de la tabla, que a veces es del mismo
   color que las celdas. */
const FILA_MAS_ALTA = 2.5

/**
 * Las filas de una columna de la rejilla, de arriba abajo: los tramos en los
 * que la columna es del color de sus celdas, cortados por las lineas.
 *
 * Es la forma de saber que hay una fila aunque no se haya leido su dia. Fila
 * por fila se mira todo el ancho de la columna, igual que al medir una celda:
 * un renglon de texto deja algo de fondo y una linea no deja nada.
 *
 * @param {{x0: number, y0: number, x1: number}} columna  desde donde se baja
 * @param {object} muestra  la caja de una palabra de esa columna: su fondo es
 *   el color de las celdas, y su alto, lo minimo que mide una fila
 * @returns {{y0: number, y1: number}[]}
 */
export function filasDeColumna(imagen, columna, muestra) {
  const color = colorDeFondo(imagen, muestra)
  if (!color) return []
  const c = recortar(imagen, { ...columna, y1: imagen.alto - 1 })

  const tramos = []
  let inicio = null
  for (let y = c.y0; y <= c.y1; y++) {
    const esCelda = parteDeFondo(imagen, color, y, c.x0, c.x1, true) >= MINIMO_DE_FONDO
    if (esCelda && inicio == null) inicio = y
    if (!esCelda && inicio != null) {
      tramos.push({ y0: inicio, y1: y - 1 })
      inicio = null
    }
  }
  if (inicio != null) tramos.push({ y0: inicio, y1: c.y1 })

  const alto = (t) => t.y1 - t.y0
  const filas = tramos.filter((t) => alto(t) >= muestra.y1 - muestra.y0)
  const tipica = mediana(filas.map(alto))
  return filas.filter((t) => alto(t) <= tipica * FILA_MAS_ALTA)
}

/**
 * El color de fondo de una zona grande, como una casilla de la rejilla: la
 * mediana de una rejilla de puntos. Las letras que caigan debajo de alguno
 * son minoria y no la mueven. Se deja un margen por dentro, que el borde de
 * la zona puede ser ya la linea de la rejilla.
 *
 * @returns {[number, number, number]}
 */
export function colorDeZona(imagen, caja) {
  const c = recortar(imagen, caja)
  const [mx, my] = [(c.x1 - c.x0) * 0.12, (c.y1 - c.y0) * 0.12]
  const canales = [[], [], []]
  for (let i = 0; i < MUESTRAS; i++) {
    for (let j = 0; j < MUESTRAS; j++) {
      const x = Math.round(c.x0 + mx + ((c.x1 - c.x0 - 2 * mx) * i) / (MUESTRAS - 1))
      const y = Math.round(c.y0 + my + ((c.y1 - c.y0 - 2 * my) * j) / (MUESTRAS - 1))
      const k = (y * imagen.ancho + x) * 4
      for (let n = 0; n < 3; n++) canales[n].push(imagen.datos[k + n])
    }
  }
  return canales.map(mediana)
}

/**
 * De unas casillas de la rejilla, las que tienen color de clase.
 *
 * El de la casilla vacia no es fijo -depende del tema del sistema-, pero es
 * el que mas se repite: una semana tiene mas huecos que clases. Asi que se
 * agrupan los colores, el grupo mas grande es el de las vacias, y todo lo
 * demas es una clase.
 *
 * @param {{x0: number, y0: number, x1: number, y1: number}[]} casillas
 * @returns {object[]}  las mismas casillas, solo las ocupadas
 */
export function ocupadas(imagen, casillas) {
  const colores = casillas.map((casilla) => colorDeZona(imagen, casilla))
  const grupos = []
  for (const color of colores) {
    const grupo = grupos.find((g) => distancia(g.color, color) <= TOLERANCIA)
    if (grupo) grupo.cuantas++
    else grupos.push({ color, cuantas: 1 })
  }
  const vacia = grupos.sort((a, b) => b.cuantas - a.cuantas)[0]?.color
  return casillas.filter((_, i) => distancia(colores[i], vacia) > TOLERANCIA)
}
