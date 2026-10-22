import { useMemo } from 'react'

/* La banda: las siluetas de las nueve carreras una detras de otra, cada una
   en su color, como un solo dibujo. Medidas en las unidades del dibujo. */
const PASO_X = 10
const PASO_Y = 8
const RADIO = 2.4
const HUECO = 16
const ALTO = 9 * PASO_Y
/* Lo que mide la banda en pantalla, en px */
const ALTO_BANDA = 58

/**
 * Las siluetas de todas las carreras en un SVG, como imagen de fondo.
 *
 * Es UNA imagen y no quinientos circulos en el DOM: la portada se mide por
 * nodos (ver scripts/banco/arranque.js) y esto es adorno. Se desliza con un
 * transform en bucle, que lo mueve el compositor sin repintar nada; en modo
 * ligero o con menos movimiento se queda quieta.
 */
function dibujoDeLaBanda(carreras, colorDe) {
  let x = 0
  let puntos = ''
  for (const carrera of carreras) {
    const color = colorDe(carrera)
    for (const cantidad of carrera.silueta) {
      for (let fila = 0; fila < cantidad; fila++) {
        const opacidad = (1 - fila / 11).toFixed(2)
        puntos += `<circle cx="${x + PASO_X / 2}" cy="${fila * PASO_Y + PASO_Y / 2}" r="${RADIO}" fill="${color}" opacity="${opacidad}"/>`
      }
      x += PASO_X
    }
    x += HUECO
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${x} ${ALTO}">${puntos}</svg>`
  return {
    url: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
    ancho: x * (ALTO_BANDA / ALTO),
  }
}

/**
 * Lo primero que ve quien llega sin saber nada: que es esto, en una frase, y
 * para que le sirve, en otra. La segunda linea del titulo lleva los colores
 * de las nueve carreras, y la banda de abajo sus formas: antes de leer nada
 * ya se ve que aqui hay varias carreras y que cada una tiene la suya.
 */
function Presentacion({ carreras, colorDe }) {
  const colores = carreras.map(colorDe)
  const banda = useMemo(() => dibujoDeLaBanda(carreras, colorDe), [carreras, colorDe])

  return (
    <section aria-labelledby="presentacion" className="presentacion">
      <h2
        id="presentacion"
        className="font-ui text-[44px] leading-[0.98] font-light tracking-[-0.025em] text-balance text-tinta sm:text-[52px] lg:text-[58px]"
      >
        Tu carrera,
        <span
          className="presentacion-color block font-normal"
          style={{ backgroundImage: `linear-gradient(90deg, ${colores.join(', ')})` }}
        >
          en un mapa.
        </span>
      </h2>
      <p className="mt-4 max-w-[34ch] text-[16px] leading-[1.5] text-pretty text-tinta-suave lg:text-[17px]">
        Marca lo que ya aprobaste y te mostramos qué puedes inscribir, qué desbloquea cada materia y
        cuánto te falta para graduarte.
      </p>
      <div className="banda-carreras" aria-hidden="true">
        <span
          style={{
            backgroundImage: banda.url,
            backgroundSize: `${banda.ancho}px ${ALTO_BANDA}px`,
            '--ancho-banda': `${banda.ancho}px`,
          }}
        />
      </div>
    </section>
  )
}

export default Presentacion
