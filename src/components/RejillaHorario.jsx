import { Fragment } from 'react'
import {
  ALTO_HORA,
  ANCHO_HORAS,
  DIAS,
  enDoceHoras,
  horasDelDia,
} from '../layout/horario'

/* Una sola rejilla CSS para toda la semana: la columna de las horas y cinco
   columnas de dia con minmax(0, 1fr), que es lo que garantiza que midan
   exactamente lo mismo pase lo que pase con su contenido. Con 1fr a secas,
   una celda con algo dentro empujaria a las demas. */
const COLUMNAS = `${ANCHO_HORAS} repeat(${DIAS.length}, minmax(0, 1fr))`

/* Las lineas van al 55% de su color: el borde del tema esta pensado para
   tarjetas sueltas y aqui se repite catorce veces por cinco columnas. A
   plena opacidad la rejilla grita; a la mitad se lee como papel pautado. */
const LINEA = 'border-panel-borde/55'

/**
 * La cuadricula vacia de la semana.
 *
 * Fase 1: solo estructura. No sabe de materias, ni de bloques, ni de
 * arrastre. Lo unico que hace es dejar la retícula lista y con el ritmo
 * visual correcto, que es sobre lo que se monta todo lo demas.
 */
function RejillaHorario() {
  return (
    <div className="grid min-w-[46rem]" style={{ gridTemplateColumns: COLUMNAS }}>
      {/* Esquina vacia sobre la columna de las horas. Existe para ocupar su
          celda: sin ella, la colocacion automatica correria los dias una
          posicion a la izquierda. */}
      <div className="transicion-tema sticky top-0 z-10 bg-panel" />

      {DIAS.map((dia) => (
        <div
          key={dia}
          className={`transicion-tema sticky top-0 z-10 flex items-center justify-center border-b border-l ${LINEA} bg-panel py-4 text-[14.5px] font-extrabold tracking-[0.13em] text-tinta uppercase`}
        >
          {dia}
        </div>
      ))}

      {horasDelDia().map((hora) => (
        <Fragment key={hora}>
          {/* La etiqueta va arriba de su franja y alineada a la derecha,
              pegada a la primera linea vertical: asi se lee como el punto en
              el que empieza esa hora, no como el centro de un bloque. */}
          <div
            style={{ height: ALTO_HORA }}
            className="flex justify-end pt-2 pr-4 text-[13px] font-semibold tabular-nums text-tinta-tenue"
          >
            {enDoceHoras(hora)}
          </div>

          {DIAS.map((dia) => (
            <div
              key={dia}
              style={{ height: ALTO_HORA }}
              className={`transicion-tema border-b border-l ${LINEA} bg-panel-suave/40`}
            />
          ))}
        </Fragment>
      ))}
    </div>
  )
}

export default RejillaHorario
