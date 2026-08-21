/**
 * Rampa de tonos de una carrera.
 *
 * Sistemas tiene ocho areas clasificadas a mano y de ahi sale su color. Las
 * otras siete no tienen esa clasificacion, y pintarlas de un solo color deja
 * el mapa plano: los cables se vuelven indistinguibles y se pierde justo lo
 * que hace legible seguir una cadena.
 *
 * Asi que el tono sale de la PROFUNDIDAD en la cadena de prelaciones, que es
 * un dato que si tenemos. Se prefiere al semestre porque el semestre ya es el
 * eje X del mapa: teñir por semestre repetiria lo que la posicion ya dice,
 * mientras que la profundidad añade informacion (una materia de 8vo sin
 * prelaciones es profundidad 1 y se ve distinta de una que arrastra siete).
 *
 * Los tonos se abren en arco alrededor del color de la carrera en vez de ser
 * claros y oscuros del mismo: se ven varios colores, pero todos siguen
 * perteneciendo a la misma familia.
 */

// Grados a cada lado del tono de la carrera. Sistemas reparte sus ocho areas
// por casi toda la rueda y es justo eso lo que hace bonito su mapa, asi que
// el arco es ancho: la carrera se sigue reconociendo por donde esta centrado
// el abanico, no por tener un solo tono.
const ARCO = 116

// Cuantos tonos distintos tiene una carrera. Ocho son los de Sistemas por
// areas; con diez el mapa se ve variado sin que dos cables vecinos acaben
// pareciendo el mismo color.
export const TONOS = 10

const limitar = (n, min, max) => Math.min(max, Math.max(min, n))

function hexAHsl(hex) {
  const n = hex.replace('#', '')
  const completo = n.length === 3 ? [...n].map((c) => c + c).join('') : n
  const r = parseInt(completo.slice(0, 2), 16) / 255
  const g = parseInt(completo.slice(2, 4), 16) / 255
  const b = parseInt(completo.slice(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min

  if (!d) return [0, 0, l * 100]

  const s = d / (1 - Math.abs(2 * l - 1))
  let h
  if (max === r) h = ((g - b) / d) % 6
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4

  return [(h * 60 + 360) % 360, s * 100, l * 100]
}

function hslAHex(h, s, l) {
  const sn = s / 100
  const ln = l / 100
  const c = (1 - Math.abs(2 * ln - 1)) * sn
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = ln - c / 2

  const [r, g, b] =
    h < 60 ? [c, x, 0]
    : h < 120 ? [x, c, 0]
    : h < 180 ? [0, c, x]
    : h < 240 ? [0, x, c]
    : h < 300 ? [x, 0, c]
    : [c, 0, x]

  const componente = (v) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0')

  return `#${componente(r)}${componente(g)}${componente(b)}`
}

/**
 * Devuelve `niveles` colores repartidos en arco alrededor de `hexBase`.
 * El indice 0 corresponde a profundidad 1.
 */
/* Suelo de saturacion. Las areas de Sistemas se subieron a croma alto para
   que el mapa deje de verse lavado, y estas ocho carreras heredan la
   saturacion del color de SU carrera, que en varios casos es bastante suave:
   sin este suelo, Sistemas quedaria vivo y las otras ocho apagadas, o sea la
   misma aplicacion con dos calidades distintas segun a que carrera entres. */
const SATURACION_MINIMA = 74

function tonosDeCarrera(hexBase, niveles) {
  const [h, sBase, l] = hexAHsl(hexBase)
  const s = Math.max(sBase, SATURACION_MINIMA)
  if (niveles <= 1) return [hexBase]

  return Array.from({ length: niveles }, (_, i) => {
    const t = i / (niveles - 1)
    const tono = (h - ARCO + t * ARCO * 2 + 360) % 360
    // Una pizca de luminosidad ademas del tono: si dos colores solo se
    // distinguen por matiz, quien no distingue esos matices no ve nada.
    const luz = limitar(l + (t - 0.5) * 12, 22, 76)
    return hslAHex(tono, s, luz)
  })
}

/**
 * Variables CSS --tono-N para el contenedor de la carrera. Los nodos las
 * referencian por su profundidad, asi que no hace falta pasar el color por
 * props hasta el ultimo componente.
 *
 * Devuelve undefined donde no aplica (Sistemas, que va por areas), y entonces
 * colorNodo cae en su rama de siempre y nada cambia.
 */
export function variablesDeTono(carrera, tema) {
  if (carrera.tieneAreas || !carrera.color) return undefined

  const base = tema === 'oscuro' ? carrera.color.oscuro : carrera.color.claro
  const tonos = tonosDeCarrera(base, TONOS)

  const vars = { '--carrera': base }
  tonos.forEach((color, i) => {
    vars[`--tono-${i + 1}`] = color
  })
  return vars
}
