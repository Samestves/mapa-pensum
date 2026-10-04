import { sinTildes } from '../data/texto.js'

/* El horario que entrega el sistema de la UDO es una rejilla: arriba las
   franjas ("09:30 - 10:15"), a la izquierda los dias, y cada clase es un
   bloque de color que ocupa una o varias franjas seguidas con el codigo de la
   materia dentro. La hora de una clase no esta escrita en ningun sitio: es la
   de las columnas que tapa.

   Aqui se arma eso a partir de las palabras que da un OCR, cada una con su
   caja, y de una funcion que dice hasta donde llega la celda de una palabra.
   Esa funcion se recibe, no se importa: en el navegador mira los pixeles
   (pixelesHorario.js) y en las pruebas es una tabla escrita a mano. Por eso
   todo esto se prueba sin imagen y sin OCR.

   Lo que sale tiene la misma forma que devuelve el servidor, texto crudo, y
   quien decide si una clase vale sigue siendo importarHorario.js. */

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

const centroX = (c) => (c.x0 + c.x1) / 2
const centroY = (c) => (c.y0 + c.y1) / 2
const alto = (c) => c.y1 - c.y0
const dentro = (celda, caja) =>
  centroX(caja) >= celda.x0 &&
  centroX(caja) <= celda.x1 &&
  centroY(caja) >= celda.y0 &&
  centroY(caja) <= celda.y1

const unir = (a, b) => ({
  x0: Math.min(a.x0, b.x0),
  y0: Math.min(a.y0, b.y0),
  x1: Math.max(a.x1, b.x1),
  y1: Math.max(a.y1, b.y1),
})

/* Las letras que un OCR pone donde habia una cifra. Solo se deshacen en
   sitios donde no puede haber letras: una hora o un codigo de materia. */
const CIFRA = { O: '0', o: '0', D: '0', I: '1', l: '1', '|': '1', S: '5', B: '8' }
const aCifras = (texto) => texto.replace(/[OoDIl|SB]/g, (letra) => CIFRA[letra])

const HORA = /(\d{1,2})[:.;](\d{2})/g
const dosCifras = (n) => String(n).padStart(2, '0')
const aMinutos = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3))

/* Las horas escritas en una palabra. Casi siempre una; dos cuando el OCR pega
   la franja entera en una sola palabra, "09:30-10:15". */
function horasDe(palabra) {
  if (!/\d[:.;]\d|[:.;]\d\d/.test(palabra.texto)) return []
  return [...aCifras(palabra.texto).matchAll(HORA)]
    .filter(([, h, m]) => Number(h) < 24 && Number(m) < 60)
    .map(([, h, m]) => ({ hora: `${dosCifras(h)}:${m}`, caja: palabra }))
}

/* Junta en renglones lo que esta a la misma altura, de arriba abajo, y cada
   renglon de izquierda a derecha. */
function enRenglones(cosas, cajaDe = (c) => c) {
  const renglones = []
  for (const cosa of [...cosas].sort((a, b) => centroY(cajaDe(a)) - centroY(cajaDe(b)))) {
    const caja = cajaDe(cosa)
    const ultimo = renglones[renglones.length - 1]
    if (ultimo && Math.abs(centroY(caja) - ultimo.y) <= Math.max(alto(caja), ultimo.alto) / 2) {
      ultimo.cosas.push(cosa)
    } else {
      renglones.push({ y: centroY(caja), alto: alto(caja), cosas: [cosa] })
    }
  }
  return renglones.map((r) => r.cosas.sort((a, b) => cajaDe(a).x0 - cajaDe(b).x0))
}

/**
 * Las franjas de la cabecera, de izquierda a derecha.
 *
 * La cabecera es el renglon con mas horas de toda la imagen: dentro de los
 * bloques no hay ninguna. Las horas van por parejas, inicio y fin.
 *
 * Devuelve [] si no cuadran -un numero impar de horas, una franja que acaba
 * antes de empezar, dos que se pisan-: una cabecera mal leida descoloca todas
 * las clases, y eso no se arregla adivinando.
 *
 * @param {{texto: string, x0: number, y0: number, x1: number, y1: number}[]} palabras
 * @returns {{inicio: string, fin: string, caja: object}[]}
 */
export function franjasDe(palabras) {
  const horas = palabras.flatMap(horasDe)
  const renglones = enRenglones(horas, (h) => h.caja)
  const cabecera = renglones.sort((a, b) => b.length - a.length)[0] ?? []
  if (cabecera.length < 2 || cabecera.length % 2) return []

  const franjas = []
  for (let i = 0; i < cabecera.length; i += 2) {
    const [a, b] = [cabecera[i], cabecera[i + 1]]
    franjas.push({ inicio: a.hora, fin: b.hora, caja: unir(a.caja, b.caja) })
  }

  const enOrden = franjas.every(
    (f, i) =>
      aMinutos(f.fin) > aMinutos(f.inicio) &&
      (i === 0 || aMinutos(f.inicio) >= aMinutos(franjas[i - 1].fin)),
  )
  return enOrden ? franjas : []
}

/**
 * Cuanto mide de alto la letra de la cabecera, o 0 si no hay cabecera.
 *
 * Es la regla con la que se decide si la imagen hay que ampliarla mas: un OCR
 * lee bien una letra de veintitantos pixeles y falla con una de doce.
 */
export function altoDeLetra(palabras) {
  const altos = franjasDe(palabras)
    .map((f) => alto(f.caja))
    .sort((a, b) => a - b)
  return altos[altos.length >> 1] ?? 0
}

/**
 * Cambia las palabras de una zona por las de una segunda lectura de esa zona.
 */
export const sustituir = (palabras, zona, nuevas) => [
  ...palabras.filter((p) => !dentro(zona, p)),
  ...nuevas,
]

/* Cuantas letras hay que cambiar para ir de una palabra a otra */
function distancia(a, b) {
  let fila = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const nueva = [i]
    for (let j = 1; j <= b.length; j++) {
      nueva[j] = Math.min(
        fila[j] + 1,
        nueva[j - 1] + 1,
        fila[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
    }
    fila = nueva
  }
  return fila[b.length]
}

/**
 * El dia que dice una palabra, con su nombre bien escrito, o null.
 *
 * Se perdona una letra: el OCR lee sin diccionario de español y la "é" de
 * Miércoles sale como le parece. Mas de una ya no, que "Martes" y "Jueves"
 * no estan tan lejos de otras palabras.
 *
 * La "rn" leida como "m" se prueba aparte porque son dos letras por una, y es
 * justo lo que le pasa a "Viernes" en letra pequeña: sale "Viemes".
 */
export function diaDe(texto) {
  const letras = sinTildes(texto).replace(/[^a-z]/g, '')
  if (letras.length < 5) return null
  const lecturas = [letras, letras.replace(/m/g, 'rn')]
  return DIAS.find((dia) => lecturas.some((leido) => distancia(leido, sinTildes(dia)) <= 1)) ?? null
}

/** El codigo de materia que dice una palabra -siete cifras-, o null. */
export function codigoDe(texto) {
  const limpio = texto.replace(/^[^\w|]+|[^\w|]+$/g, '')
  if (limpio.length !== 7) return null
  /* Como mucho dos cifras leidas como letra. Sin ese tope, cualquier palabra
     de siete letras hecha de O, I, S y B pasaria por codigo. */
  if ((limpio.match(/\d/g) ?? []).length < 5) return null
  const cifras = aCifras(limpio)
  return /^\d{7}$/.test(cifras) ? cifras : null
}

/* "Secc: 02 - Aula: A-46". Las dos etiquetas se reconocen por como empiezan y
   no enteras: en una captura pequeña el OCR lee "Sec:", "Aulx" o "Auk", y lo
   que importa -el numero y el aula que vienen detras- lo lee bien. */
const SECCION = /\bSec\w*\s*[:.;]?\s*([A-Za-z0-9]{1,3})\b/i
const AULA = /\bAu\w{0,3}\s*[:.;]?\s*([A-Za-z0-9][\w-]*)/i
const esSeccion = (palabra) => /^sec/i.test(palabra.texto)

/* Lo que dice un bloque ademas del codigo. El renglon del correo no se toca:
   ni se guarda ni se enseña, y por eso el nombre solo se toma de lo que hay
   ANTES del renglon de la seccion. Si ese renglon no se leyo, el nombre se
   queda en el del codigo y nada mas, antes que arriesgarse a meter el correo
   de un profesor en el nombre de la materia. */
function textoDelBloque(ancla, palabras, celda) {
  const suyas = palabras.filter((p) => p !== ancla && dentro(celda, p))
  const renglones = enRenglones([ancla, ...suyas])
  const delAncla = renglones.findIndex((r) => r.includes(ancla))
  const deSeccion = renglones.findIndex((r) => r.some(esSeccion))

  const hasta = deSeccion > delAncla ? deSeccion : delAncla + 1
  const nombre = renglones
    .slice(delAncla, hasta)
    .flat()
    .filter((p) => p !== ancla)
    .map((p) => p.texto)
    .join(' ')

  const detalle = deSeccion >= 0 ? renglones[deSeccion].map((p) => p.texto).join(' ') : ''
  return {
    nombre: nombre.trim(),
    seccion: detalle.match(SECCION)?.[1] ?? '',
    aula: detalle.match(AULA)?.[1] ?? '',
  }
}

const mismaCelda = (a, b) => a && b && a.x0 === b.x0 && a.y0 === b.y0 && a.x1 === b.x1

/**
 * Las clases de una rejilla de horario.
 *
 * `dudas` es lo que decide si el resultado se usa tal cual o si se pregunta
 * al servidor: vacia quiere decir que se encontro la rejilla y que cada
 * bloque tiene su codigo, su dia y sus horas.
 *
 *   'sin-rejilla'  no hay cabecera de franjas: no es este formato
 *   'sin-clases'   hay rejilla pero ningun codigo de materia
 *   'sin-dia'      un bloque no cae en la fila de ningun dia
 *   'sin-hora'     un bloque no tapa ninguna franja, o no se supo cuanto mide
 *   'pegadas'      dos codigos en la misma celda: dos bloques sin separar
 *   'de-menos'     hay mas renglones de seccion que codigos: falta un bloque
 *   'no-esta'      un codigo que no es de este pensum: una cifra mal leida
 *
 * `repasos` son las zonas que merece la pena volver a leer de cerca, cada una
 * por separado: la celda del dia de un bloque que se quedo sin dia, y el
 * bloque al que le falta la seccion o el aula. Leyendo la pagina entera el
 * OCR se salta a veces una palabra suelta; recortada, no.
 *
 * @param {{texto: string, x0: number, y0: number, x1: number, y1: number}[]} palabras
 * @param {(caja: object) => object|null} celdaDe  la celda que rodea a una caja
 * @param {object} [opciones]
 * @param {Set<string>} [opciones.codigos]  los codigos del pensum abierto
 * @returns {{clases: object[], dudas: string[], repasos: object[]}}
 */
export function leerRejilla(palabras, celdaDe, { codigos } = {}) {
  const franjas = franjasDe(palabras)
  if (!franjas.length) return { clases: [], dudas: ['sin-rejilla'], repasos: [] }

  const bordeCabecera = Math.max(...franjas.map((f) => f.caja.y1))
  const margen = Math.min(...franjas.map((f) => f.caja.x0))
  const debajo = palabras.filter((p) => p.y0 > bordeCabecera)

  /* Los dias son los de la columna de la izquierda. Un nombre de materia
     puede llevar un dia dentro, y ese esta a la derecha del margen. */
  const dias = debajo
    .filter((p) => p.x1 < margen)
    .map((p) => ({ dia: diaDe(p.texto), caja: p }))
    .filter((d) => d.dia)

  const anclas = debajo
    .map((p) => ({ palabra: p, codigo: codigoDe(p.texto) }))
    .filter((a) => a.codigo)
  if (!anclas.length) return { clases: [], dudas: ['sin-clases'], repasos: [] }

  const dudas = new Set()
  const repasos = new Map()
  const celdas = anclas.map((a) => celdaDe(a.palabra))
  /* Donde acaba la columna de los dias: en el borde de la primera celda de
     la cabecera. Sin ese borde no se repasa ningun dia: recortar a ojo meteria
     en el recorte el texto del primer bloque de la fila. */
  const primera = celdaDe(franjas[0].caja)
  const segunda = franjas[1] && celdaDe(franjas[1].caja)
  /* Lo que mide la linea de la rejilla: el hueco entre dos celdas de la
     cabecera. El recorte del dia se mete eso hacia dentro por los dos lados,
     porque una linea vertical en el borde el OCR la lee como una "l". */
  const linea = primera && segunda ? Math.max(0, segunda.x0 - primera.x1 - 1) : 0
  const bordeDias = (primera?.x0 ?? 0) - 1 - linea

  const clases = anclas.map(({ palabra, codigo }, i) => {
    const celda = celdas[i]
    const tapadas = celda
      ? franjas.filter((f) => centroX(f.caja) >= celda.x0 && centroX(f.caja) <= celda.x1)
      : []
    const dia = celda
      ? dias.find((d) => centroY(d.caja) >= celda.y0 && centroY(d.caja) <= celda.y1)
      : null

    if (!tapadas.length) dudas.add('sin-hora')
    if (!dia) {
      dudas.add('sin-dia')
      if (celda && bordeDias > linea) {
        repasos.set(`dia-${celda.y0}`, { x0: linea, y0: celda.y0, x1: bordeDias, y1: celda.y1 })
      }
    }
    if (celdas.some((otra, j) => j !== i && mismaCelda(otra, celda))) dudas.add('pegadas')
    if (codigos && !codigos.has(codigo)) dudas.add('no-esta')

    const texto = celda
      ? textoDelBloque(palabra, debajo, celda)
      : { nombre: '', seccion: '', aula: '' }
    if (celda && !(texto.seccion && texto.aula)) repasos.set(`bloque-${i}`, celda)
    return {
      codigo,
      ...texto,
      dia: dia?.dia ?? '',
      inicio: tapadas[0]?.inicio ?? '',
      fin: tapadas[tapadas.length - 1]?.fin ?? '',
      profesor: '',
    }
  })

  if (debajo.filter(esSeccion).length > anclas.length) dudas.add('de-menos')

  return { clases, dudas: [...dudas], repasos: [...repasos.values()] }
}
