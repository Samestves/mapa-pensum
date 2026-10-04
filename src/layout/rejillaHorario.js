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

/* La rejilla de la UDO: clases de 45 minutos que empiezan cada 50, desde las
   siete. Con ella, una hora leida sola dice de que franja es y si es su
   inicio o su fin. Hace falta: en una columna estrecha la cabecera parte
   "07:00 - 07:45" en dos o tres renglones, y a veces el inicio ni se ve. */
const PRIMERA_FRANJA = 7 * 60
const CADA = 50
const DURA = 45

/* Cuanto pueden separarse en vertical dos horas seguidas de la cabecera, en
   altos de letra. Una celda partida en tres renglones ("09:30", "-",
   "10:15") deja dos de distancia entre sus horas; la hora del reloj de la
   barra de tareas, en una foto de la pantalla, queda mucho mas lejos. */
const SALTO_EN_LA_CABECERA = 3

/* Que franja de la rejilla es una hora, y si es su inicio o su fin. null si
   no cae en la rejilla: una cifra mal leida, o una hora que no es de la
   cabecera. */
function lugarDe(minutos) {
  const desde = minutos - PRIMERA_FRANJA
  if (desde >= 0 && desde % CADA === 0) return desde / CADA
  if (desde >= DURA && (desde - DURA) % CADA === 0) return (desde - DURA) / CADA
  return null
}

const aHora = (minutos) => `${dosCifras(Math.floor(minutos / 60))}:${dosCifras(minutos % 60)}`
const mediana = (valores) => [...valores].sort((a, b) => a - b)[valores.length >> 1]

/* Las horas de la cabecera: el grupo mas grande de horas de la rejilla que
   estan juntas en vertical. Dentro de los bloques no hay ninguna, pero en una
   foto de la pantalla puede colarse la del reloj del sistema. */
function horasDeLaCabecera(palabras) {
  const horas = palabras
    .flatMap(horasDe)
    .filter((h) => lugarDe(aMinutos(h.hora)) != null)
    .sort((a, b) => centroY(a.caja) - centroY(b.caja))
  if (!horas.length) return []
  const salto = mediana(horas.map((h) => alto(h.caja))) * SALTO_EN_LA_CABECERA
  const grupos = [[horas[0]]]
  for (const hora of horas.slice(1)) {
    const grupo = grupos[grupos.length - 1]
    if (centroY(hora.caja) - centroY(grupo[grupo.length - 1].caja) <= salto) grupo.push(hora)
    else grupos.push([hora])
  }
  return grupos.sort((a, b) => b.length - a.length)[0]
}

/* De unas franjas en orden de izquierda a derecha, las que van hacia
   delante: la secuencia creciente mas larga. Una hora mal leida que cae en
   otra franja de la rejilla queda fuera, y el resto sigue valiendo. */
function enAvance(franjas) {
  const largo = franjas.map(() => 1)
  const previa = franjas.map(() => -1)
  for (let i = 0; i < franjas.length; i++) {
    for (let j = 0; j < i; j++) {
      if (franjas[j].lugar < franjas[i].lugar && largo[j] + 1 > largo[i]) {
        largo[i] = largo[j] + 1
        previa[i] = j
      }
    }
  }
  const quedan = []
  for (let i = largo.indexOf(Math.max(...largo)); i >= 0; i = previa[i]) quedan.unshift(franjas[i])
  return quedan
}

/**
 * Las franjas de la cabecera, de izquierda a derecha.
 *
 * Cada hora de la cabecera dice su franja por si sola (ver lugarDe): no hace
 * falta que el inicio y el fin esten en el mismo renglon, ni siquiera que se
 * lean los dos. Las horas de una misma franja se juntan en una caja, que es
 * la que dice en que columna esta.
 *
 * Devuelve [] si la cabecera no avanza de izquierda a derecha: si mas de un
 * tercio de las franjas esta fuera de su sitio, no es una cabecera mal leida
 * sino otra cosa, y eso no se arregla adivinando.
 *
 * @param {{texto: string, x0: number, y0: number, x1: number, y1: number}[]} palabras
 * @returns {{inicio: string, fin: string, caja: object}[]}
 */
export function franjasDe(palabras) {
  const porLugar = new Map()
  for (const { hora, caja } of horasDeLaCabecera(palabras)) {
    const lugar = lugarDe(aMinutos(hora))
    porLugar.set(lugar, porLugar.has(lugar) ? unir(porLugar.get(lugar), caja) : caja)
  }
  const todas = [...porLugar]
    .map(([lugar, caja]) => ({ lugar, caja }))
    .sort((a, b) => centroX(a.caja) - centroX(b.caja))
  const franjas = enAvance(todas)
  if (franjas.length * 3 < todas.length * 2) return []

  return franjas.map(({ lugar, caja }) => {
    const inicio = PRIMERA_FRANJA + lugar * CADA
    return { inicio: aHora(inicio), fin: aHora(inicio + DURA), caja }
  })
}

/**
 * Cuanto mide de alto la letra de la cabecera, o 0 si no hay cabecera.
 *
 * Es la regla con la que se decide si la imagen hay que ampliarla mas: un OCR
 * lee bien una letra de veintitantos pixeles y falla con una de doce. Se mide
 * en cada hora y no en la caja de la franja, que con la cabecera partida en
 * renglones abarca dos o tres.
 */
export function altoDeLetra(palabras) {
  const horas = horasDeLaCabecera(palabras)
  return horas.length ? mediana(horas.map((h) => alto(h.caja))) : 0
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
 *
 * Y vale el principio de un dia, desde cuatro letras: en una foto de la
 * pantalla el final de la palabra se pierde a menudo ("Lune", "Miérco"), y
 * ninguno de los dias empieza como otro.
 */
export function diaDe(texto) {
  const letras = sinTildes(texto).replace(/[^a-z]/g, '')
  if (letras.length < 4) return null
  const lecturas = [letras, letras.replace(/m/g, 'rn')]
  const parecido = (dia) =>
    lecturas.some(
      (leido) =>
        (leido.length >= 5 && distancia(leido, sinTildes(dia)) <= 1) ||
        sinTildes(dia).startsWith(leido),
    )
  return DIAS.find(parecido) ?? null
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
const textoDe = (renglon) => renglon.map((p) => p.texto).join(' ')

/* En un bloque estrecho, el renglon de la seccion parte por donde puede:
   "Aula: A-" y "80" debajo, o "Aula:" y "LC-05". Si acaba en una etiqueta o
   en un guion, sigue en el renglon de abajo, salvo que ese ya sea el correo. */
function detalleDe(renglones, deSeccion) {
  const detalle = textoDe(renglones[deSeccion])
  const siguiente = renglones[deSeccion + 1]
  if (!siguiente || /^correo/i.test(siguiente[0].texto)) return detalle
  if (/-$/.test(detalle)) return detalle + textoDe(siguiente)
  if (/:$/.test(detalle)) return `${detalle} ${textoDe(siguiente)}`
  return detalle
}

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

  const detalle = deSeccion >= 0 ? detalleDe(renglones, deSeccion) : ''
  return {
    nombre: nombre.trim(),
    seccion: detalle.match(SECCION)?.[1] ?? '',
    aula: detalle.match(AULA)?.[1] ?? '',
  }
}

const mismaCelda = (a, b) => a && b && a.x0 === b.x0 && a.y0 === b.y0 && a.x1 === b.x1
const solapan = (a, b) => a.y0 <= b.y1 && b.y0 <= a.y1

/**
 * Pone nombre a las filas que no lo tienen por su sitio entre las que si.
 *
 * Los dias de la rejilla van seguidos y en orden: si entre el Lunes y el
 * Miercoles hay justo una fila sin nombre, es el Martes. Solo se nombra lo
 * que encaja exacto. Si entre dos dias leidos no caben justas las filas que
 * hay, o la fila esta antes del primero o despues del ultimo, se queda sin
 * nombre y se repasa su celda.
 *
 * Si no se leyo ningun dia y las filas son cinco o seis, son de lunes a
 * viernes, o a sabado: es como las pone el sistema.
 *
 * @param {{dia: string|null}[]} filas  de arriba abajo
 */
export function nombrarFilas(filas) {
  const nombradas = filas.map((f) => ({ ...f }))
  const conNombre = nombradas.map((f, i) => [i, DIAS.indexOf(f.dia)]).filter(([, d]) => d >= 0)
  if (!conNombre.length && (filas.length === 5 || filas.length === 6)) {
    return nombradas.map((f, i) => ({ ...f, dia: DIAS[i] }))
  }
  for (let k = 1; k < conNombre.length; k++) {
    const [desde, diaDesde] = conNombre[k - 1]
    const [hasta, diaHasta] = conNombre[k]
    if (hasta - desde !== diaHasta - diaDesde) continue
    for (let i = desde + 1; i < hasta; i++) nombradas[i].dia = DIAS[diaDesde + i - desde]
  }
  return nombradas
}

/**
 * Las filas de la rejilla, de arriba abajo, cada una con su dia o sin el.
 *
 * Las de los dias leidos salen de la celda de su nombre. Pero un dia que el
 * OCR no leyo dejaba su fila fuera de todo, y con ella cualquier bloque que
 * tampoco se leyera. Por eso, si se puede, la columna de los dias se recorre
 * por pixeles y aparecen tambien las filas sin nombre (ver nombrarFilas). El
 * color de sus celdas sale de `muestra`: un dia leido o, si no hay ninguno,
 * el "Día" de la cabecera.
 */
function filasDeLaRejilla({ dias, celdaDe, filasEnColumna, columnaDias, muestra }) {
  const leidas = new Map()
  for (const { dia, caja } of dias) {
    // Sin una celda que medir, la fila es el propio renglon del nombre
    const { y0, y1 } = celdaDe(caja) ?? caja
    leidas.set(y0, { y0, y1, dia })
  }
  const conNombre = [...leidas.values()]
  if (!filasEnColumna || !columnaDias || !muestra) {
    return conNombre.sort((a, b) => a.y0 - b.y0)
  }
  const sinNombre = filasEnColumna(columnaDias, muestra)
    .filter((medida) => !conNombre.some((fila) => solapan(fila, medida)))
    .map(({ y0, y1 }) => ({ y0, y1, dia: null }))
  return nombrarFilas([...conNombre, ...sinNombre].sort((a, b) => a.y0 - b.y0))
}

/**
 * Los bloques de clase que la lectura de la pagina se salto entera.
 *
 * Pasa, y sin dejar rastro: el OCR pasa la captura a blanco y negro con un
 * solo umbral para toda la imagen, y segun el color de un bloque, sus letras
 * blancas caen del mismo lado que su fondo y desaparecen. Sin su codigo no hay
 * clase, y sin clase no hay ninguna duda que avise de que falta: el
 * estudiante añadiria su semana a medias creyendola entera.
 *
 * Asi que se mira la rejilla casilla por casilla -la columna de cada franja
 * por cada fila- y se buscan las que tienen color de clase (ver `ocupadas`)
 * sin que las tape ninguna clase leida. Las seguidas de una misma fila se
 * juntan en un tramo, que suele ser un solo bloque, y cada tramo se vuelve a
 * leer recortado: con un solo color de fondo, el umbral ya no falla.
 *
 * @returns {{zona: object, fila: object}[]}
 */
function bloquesSinLeer({ franjas, filas, celdas, celdaDe, ocupadas }) {
  if (!ocupadas || !filas.length) return []
  const columnas = franjas.map((f) => celdaDe(f.caja))
  if (columnas.some((c) => !c)) return []

  const libres = filas
    .flatMap((fila) =>
      columnas.map((columna, j) => ({
        j,
        fila,
        caja: { x0: columna.x0, y0: fila.y0, x1: columna.x1, y1: fila.y1 },
      })),
    )
    .filter(({ caja }) => !celdas.some((celda) => celda && dentro(celda, caja)))
  const llenas = new Set(ocupadas(libres.map((l) => l.caja)))

  const tramos = []
  for (const { j, fila, caja } of libres) {
    if (!llenas.has(caja)) continue
    const ultimo = tramos[tramos.length - 1]
    if (ultimo && ultimo.fila === fila && ultimo.j === j - 1) {
      ultimo.zona.x1 = caja.x1
      ultimo.j = j
    } else {
      tramos.push({ j, fila, zona: { ...caja } })
    }
  }
  return tramos
}

/**
 * Las clases de una rejilla de horario.
 *
 * `dudas` es lo que decide si el resultado se usa tal cual o si se pregunta
 * a la IA: vacia quiere decir que se encontro la rejilla y que cada bloque
 * tiene su codigo, su dia y sus horas.
 *
 *   'sin-rejilla'  no hay cabecera de franjas: no es este formato
 *   'sin-clases'   hay rejilla pero ningun codigo de materia
 *   'sin-leer'     un bloque con color de clase en el que no se leyo nada
 *   'sin-dia'      un bloque no cae en la fila de ningun dia
 *   'sin-hora'     un bloque no tapa ninguna franja, o no se supo cuanto mide
 *   'pegadas'      dos codigos en la misma celda: dos bloques sin separar
 *   'de-menos'     hay mas renglones de seccion que codigos: falta un bloque
 *   'no-esta'      un codigo que no es de este pensum: una cifra mal leida
 *
 * `repasos` son las zonas que merece la pena volver a leer de cerca, cada una
 * por separado y con su motivo. Leyendo la pagina entera el OCR se salta a
 * veces una palabra suelta, o un bloque entero; recortado, no. Van en orden
 * de lo que hacen falta, por si no da tiempo a todas:
 *
 *   'bloque'   un bloque sin leer: sin el falta una clase
 *   'dia'      la celda del dia de una fila sin nombre que tiene clases: sin
 *              dia, la clase no se puede añadir
 *   'detalle'  un bloque al que le falta la seccion o el aula: sin ellas, si
 *
 * @param {{texto: string, x0: number, y0: number, x1: number, y1: number}[]} palabras
 * @param {(caja: object) => object|null} celdaDe  la celda que rodea a una caja
 * @param {object} [opciones]
 * @param {Set<string>} [opciones.codigos]  los codigos del pensum abierto
 * @param {(casillas: object[]) => object[]} [opciones.ocupadas]  de unas
 *   casillas de la rejilla, las que tienen color de clase. Sin ella no se
 *   buscan bloques sin leer.
 * @param {(columna: object, muestra: object) => {y0: number, y1: number}[]} [opciones.filasEnColumna]
 *   las filas de una columna de la rejilla, medidas por pixeles a partir del
 *   color de fondo de `muestra`. Sin ella solo hay las filas de los dias leidos.
 * @returns {{clases: object[], dudas: string[], repasos: {zona: object, motivo: string}[]}}
 */
export function leerRejilla(palabras, celdaDe, { codigos, ocupadas, filasEnColumna } = {}) {
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
  const hayColumnaDias = Boolean(primera) && bordeDias > linea
  const celdaDelDia = (fila) => ({ x0: linea, y0: fila.y0, x1: bordeDias, y1: fila.y1 })

  const rotulo = palabras.find(
    (p) => p.x1 < margen && /^dias?$/.test(sinTildes(p.texto).replace(/[^a-z]/g, '')),
  )
  const filas = filasDeLaRejilla({
    dias,
    celdaDe,
    filasEnColumna,
    columnaDias: hayColumnaDias && { x0: linea, y0: primera.y1 + 1, x1: bordeDias },
    muestra: dias[0]?.caja ?? rotulo,
  })

  const anclas = debajo
    .map((p) => ({ palabra: p, codigo: codigoDe(p.texto) }))
    .filter((a) => a.codigo)
  const celdas = anclas.map((a) => celdaDe(a.palabra))

  const repasosDeDias = new Map()
  const repasarDia = (fila) => {
    if (hayColumnaDias) repasosDeDias.set(fila.y0, { zona: celdaDelDia(fila), motivo: 'dia' })
  }
  const sinLeer = bloquesSinLeer({ franjas, filas, celdas, celdaDe, ocupadas }).map(
    ({ zona, fila }) => {
      if (!fila.dia) repasarDia(fila)
      return { zona, motivo: 'bloque' }
    },
  )

  if (!anclas.length) {
    return {
      clases: [],
      dudas: sinLeer.length ? ['sin-clases', 'sin-leer'] : ['sin-clases'],
      repasos: [...sinLeer, ...repasosDeDias.values()],
    }
  }

  const dudas = new Set(sinLeer.length ? ['sin-leer'] : [])
  const repasosDeDetalles = []

  const clases = anclas.map(({ palabra, codigo }, i) => {
    const celda = celdas[i]
    const tapadas = celda
      ? franjas.filter((f) => centroX(f.caja) >= celda.x0 && centroX(f.caja) <= celda.x1)
      : []
    const fila = celda
      ? filas.find((f) => f.dia && centroY(f) >= celda.y0 && centroY(f) <= celda.y1)
      : null

    if (!tapadas.length) dudas.add('sin-hora')
    if (!fila) {
      dudas.add('sin-dia')
      if (celda) repasarDia(celda)
    }
    if (celdas.some((otra, j) => j !== i && mismaCelda(otra, celda))) dudas.add('pegadas')
    if (codigos && !codigos.has(codigo)) dudas.add('no-esta')

    const texto = celda
      ? textoDelBloque(palabra, debajo, celda)
      : { nombre: '', seccion: '', aula: '' }
    if (celda && !(texto.seccion && texto.aula)) {
      repasosDeDetalles.push({ zona: celda, motivo: 'detalle' })
    }
    return {
      codigo,
      ...texto,
      dia: fila?.dia ?? '',
      inicio: tapadas[0]?.inicio ?? '',
      fin: tapadas[tapadas.length - 1]?.fin ?? '',
      profesor: '',
    }
  })

  if (debajo.filter(esSeccion).length > anclas.length) dudas.add('de-menos')

  return {
    clases,
    dudas: [...dudas],
    repasos: [...sinLeer, ...repasosDeDias.values(), ...repasosDeDetalles],
  }
}
