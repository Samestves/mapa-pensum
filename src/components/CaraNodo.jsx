import { NODO } from '../layout/constantes'

/**
 * La superficie de una tarjeta del mapa: el color del estado, el brillo y las
 * dos reacciones -señalar y confirmar-.
 *
 * Existe porque las tres clases de tarjeta -materia, casilla de electiva y
 * electiva de la zona de abajo- tienen que verse EXACTAMENTE igual, y antes
 * cada una se dibujaba su fondo por su cuenta. Tres copias de lo mismo es como
 * una de las tres se queda con el aspecto viejo, que es literalmente lo que ha
 * pasado ya una vez: la casilla con electiva elegida se quedo con el diseño
 * anterior entero porque nadie se acordo de tocarla.
 *
 * Son TRES rectangulos, no seis. La version con contorno apilaba fondo, tinte,
 * resaltado, resplandor, borde y barra de area, y eso multiplicado por las 494
 * materias del pensum. Con el estado mandando solo sobre el color, el fondo es
 * un relleno y ya.
 */
function CaraNodo({
  alto,
  radio = NODO.radio,
  piel,
  resaltado,
  seleccionado,
  destellando,
  claveDestello,
  tocado,
  claveToque,
}) {
  const comun = { width: NODO.ancho, height: alto, rx: radio }

  return (
    <>
      <rect {...comun} fill={piel.fondo} style={{ transition: 'fill 300ms ease' }} />

      {/* El toque de vidrio: la luz cae por arriba y se apaga a media altura.
          Un degradado definido UNA vez en <defs> y referenciado por las 494
          materias, asi que no cuesta nada por tarjeta. Nada de desenfoque de
          verdad: en un rect de SVG no se aplica -comprobado mirandolo- y
          metiendo cada tarjeta en un foreignObject para conseguirlo el mapa
          baja de 92 fotogramas a 25. */}
      <rect {...comun} className="detalle-nodo" fill="url(#brillo-nodo)" />

      {/* Señalar y seleccionar suben la luz, no dibujan un borde. */}
      <rect
        {...comun}
        fill="var(--tinta)"
        fillOpacity={seleccionado ? 0.12 : resaltado ? 0.06 : 0}
        style={{ transition: 'fill-opacity 180ms ease' }}
      />

      {destellando && (
        <rect {...comun} key={claveDestello} className="destello" fill="var(--tinta)" />
      )}

      {/* El anillo de confirmacion es un trazo y no contradice el "sin
          bordes": no esta en reposo. Aparece al marcar una materia, se expande
          y se va. */}
      {tocado && (
        <rect
          {...comun}
          key={claveToque}
          className="anillo-cambio"
          fill="none"
          stroke="var(--tinta)"
        />
      )}
    </>
  )
}

export default CaraNodo
