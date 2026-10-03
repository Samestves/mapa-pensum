/**
 * El aro de la casilla de un semestre, partido en un tramo por materia.
 *
 * Los tramos van en el orden en que se leen: primero las aprobadas, luego las
 * que se cursan, las que faltan y, al final, las casillas de electiva sin
 * elegir. Cada clase sale como UN trazo -varios arcos en el mismo `d`-: en
 * la cabecera del mapa son diez casillas, y un elemento por materia serian
 * setenta trazos para lo que se pinta con cuatro colores.
 *
 * Sin transform: los arcos van ya en sus coordenadas, en la rejilla de 14 de
 * la casilla, que dentro del mapa es lo que no cuesta en cada cuadro (ver
 * layout/trazo.js).
 */
const CENTRO = 7
const RADIO = 5.9
const VUELTA = Math.PI * 2

/* El hueco entre tramos, en fraccion de vuelta. Con muchas materias se
   estrecha: si no, el hueco se comia medio tramo. */
const huecoDe = (total) => (total <= 1 ? 0 : total > 7 ? 0.04 : 0.05)

const num = (n) => +n.toFixed(2)

function punto(vuelta) {
  const a = VUELTA * vuelta
  return `${num(CENTRO + RADIO * Math.sin(a))} ${num(CENTRO - RADIO * Math.cos(a))}`
}

/* Un arco entre dos puntos de la vuelta, en el sentido del reloj y desde
   arriba. Nunca de mas de media vuelta: con los extremos enfrentados o
   juntos, un arco de SVG no sabe por que lado ir. */
function arco(desde, hasta) {
  if (hasta - desde > 0.5) {
    const medio = (desde + hasta) / 2
    return arco(desde, medio) + arco(medio, hasta)
  }
  return `M${punto(desde)}A${RADIO} ${RADIO} 0 0 1 ${punto(hasta)}`
}

const trazos = new Map()

/**
 * Los cuatro trazos del aro de un semestre: { hechas, cursando, pendientes,
 * huecos }, cada uno el `d` de sus tramos o '' si no tiene ninguno.
 */
export function tramosDeSemestre({ total, hechas, cursando, huecos }) {
  const clave = `${total}|${hechas}|${cursando}|${huecos}`
  let aro = trazos.get(clave)
  if (aro) return aro

  const hueco = huecoDe(total)
  const tramo = (i) => arco(i / total + hueco / 2, (i + 1) / total - hueco / 2)
  const de = (desde, hasta) => {
    let d = ''
    for (let i = desde; i < hasta; i++) d += tramo(i)
    return d
  }
  const finCursando = hechas + cursando
  const finPendientes = total - huecos
  aro = {
    hechas: de(0, hechas),
    cursando: de(hechas, finCursando),
    pendientes: de(finCursando, finPendientes),
    huecos: de(finPendientes, total),
  }
  trazos.set(clave, aro)
  return aro
}
