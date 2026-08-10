import { useCallback, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import {
  ABRE,
  ALTO_HORA,
  ANCHO_HORAS,
  CIERRA,
  DIAS,
  DIAS_CORTOS,
  PX_POR_MINUTO,
  acotar,
  etiquetaHora,
  horasEnPunto,
  franjaPropuesta,
} from '../layout/horario'
import BloqueClase from './BloqueClase'

/* Las lineas van al 55% de su color: el borde del tema esta pensado para
   tarjetas sueltas y aqui se repite catorce veces por cinco columnas. A
   plena opacidad la rejilla grita; a la mitad se lee como papel pautado. */
const LINEA = 'border-panel-borde/55'
/* Cabecera y celdas comparten el gris del fondo de la vista. El contraste que
   separa el horario de la cabecera de la aplicacion ya lo pone ese gris
   contra el blanco de arriba. */
const FONDO = 'bg-panel-suave'

const ALTO_REJILLA = (CIERRA - ABRE) * PX_POR_MINUTO
const aY = (min) => (min - ABRE) * PX_POR_MINUTO

/**
 * La cuadricula de la semana, con sus clases.
 *
 * Los dias son columnas de flex-1, que reparten el ancho en cinco partes
 * exactamente iguales, y las lineas de hora son un degradado repetido y no un
 * div por hora: cinco columnas por catorce horas serian setenta nodos que no
 * aportan nada al DOM. La medida es la misma de la fase anterior -columnas
 * iguales, filas de 112 px-, solo cambia como se dibuja.
 *
 * Las clases NO viven en celdas de la rejilla. Se colocan en posicion
 * absoluta a partir de sus minutos, que es lo unico que permite dibujar una
 * clase de 08:15 a 09:50 en su sitio exacto y que dos seguidas -una acaba a
 * las nueve, la otra empieza a las nueve- queden pegadas sin hueco.
 */
function RejillaHorario({ porDia, porCodigo, alPulsarHueco, alEditar }) {
  const refDias = useRef(null)
  const [fantasma, setFantasma] = useState(null)

  /* De un punto de la pantalla al dia y la hora que hay debajo. Un unico
     sitio hace esta traduccion; el resto del componente ya habla en minutos. */
  const puntoADiaYMinuto = useCallback((clienteX, clienteY) => {
    const caja = refDias.current.getBoundingClientRect()
    return {
      dia: acotar(
        Math.floor((clienteX - caja.left) / (caja.width / DIAS.length)),
        0,
        DIAS.length - 1,
      ),
      minuto: ABRE + (clienteY - caja.top) / PX_POR_MINUTO,
    }
  }, [])

  /* La franja que se propone bajo el puntero, ya recortada contra las clases
     vecinas. Toda la regla vive en franjaPropuesta; aqui solo se le añade el
     dia y se descarta lo que cae fuera de la jornada. */
  const celdaDe = useCallback(
    (dia, minuto) => {
      if (minuto < ABRE || minuto >= CIERRA) return null
      const franja = franjaPropuesta(porDia[dia], minuto)
      return franja && { dia, ...franja }
    },
    [porDia],
  )

  const seguirPuntero = (e) => {
    // En tactil no hay puntero al que seguir: la previsualizacion no aplica
    if (e.pointerType === 'touch') return
    const { dia, minuto } = puntoADiaYMinuto(e.clientX, e.clientY)
    const celda = celdaDe(dia, minuto)
    setFantasma((previa) =>
      previa?.dia === celda?.dia && previa?.inicio === celda?.inicio ? previa : celda,
    )
  }

  const pulsar = (e) => {
    // Pulsar una clase la abre desde su propio boton; aqui solo el vacio
    if (e.target.closest('.bloque-clase')) return
    const { dia, minuto } = puntoADiaYMinuto(e.clientX, e.clientY)
    const celda = celdaDe(dia, minuto)
    if (!celda) return
    setFantasma(null)
    alPulsarHueco(celda, { x: e.clientX, y: e.clientY })
  }

  return (
    <div className="min-w-[46rem]">
      {/* Cabecera de dias. Se queda arriba al desplazar y va opaca para que
          las clases pasen por debajo sin transparentarse. */}
      <div className={`transicion-tema sticky top-0 z-20 flex border-b ${LINEA} ${FONDO}`}>
        <span style={{ width: ANCHO_HORAS }} className="shrink-0" />
        {DIAS.map((dia, i) => (
          <span
            key={dia}
            className={`flex flex-1 items-center justify-center border-l ${LINEA} py-4 text-[14.5px] font-extrabold tracking-[0.13em] text-tinta uppercase`}
          >
            <span className="hidden sm:inline">{dia}</span>
            <span className="sm:hidden">{DIAS_CORTOS[i]}</span>
          </span>
        ))}
      </div>

      <div className={`flex border-b ${LINEA}`} style={{ height: ALTO_REJILLA }}>
        {/* Columna de horas. La etiqueta va debajo de su linea y no centrada
            en ella: centrada, la primera quedaria partida por la cabecera. */}
        <div style={{ width: ANCHO_HORAS }} className="relative shrink-0">
          {horasEnPunto().map((min, i, todas) => (
            <span
              key={min}
              style={{ top: aY(min) }}
              className={`absolute right-4 text-[13px] font-semibold tabular-nums text-tinta-tenue ${
                // La ultima cierra la rejilla: debajo de su linea se saldria
                i === todas.length - 1 ? '-translate-y-5' : 'translate-y-1.5'
              }`}
            >
              {etiquetaHora(min)}
            </span>
          ))}
        </div>

        {/* Los cinco dias. El puntero se sigue aqui y no columna por columna:
            el dia sale de una division, no de cinco manejadores iguales. */}
        <div
          ref={refDias}
          onPointerMove={seguirPuntero}
          onPointerLeave={() => setFantasma(null)}
          onClick={pulsar}
          className="relative flex flex-1"
        >
          {DIAS.map((dia, i) => (
            <div
              key={dia}
              className={`relative flex-1 border-l ${LINEA}`}
              style={{
                backgroundImage: `repeating-linear-gradient(to bottom, color-mix(in oklab, var(--panel-borde) 55%, transparent) 0 1px, transparent 1px ${ALTO_HORA}px)`,
              }}
            >
              {/* Previsualizacion: donde caeria la clase si pulsas aqui */}
              {fantasma?.dia === i && (
                <span
                  aria-hidden="true"
                  style={{
                    top: aY(fantasma.inicio),
                    height: (fantasma.fin - fantasma.inicio) * PX_POR_MINUTO - 4,
                  }}
                  className="celda-fantasma pointer-events-none absolute inset-x-1 grid place-items-center rounded-xl border border-dashed border-tinta-tenue/45 bg-tinta/[0.035]"
                >
                  <span className="grid size-7 place-items-center rounded-full border border-tinta-tenue/40 bg-panel/70 text-tinta-tenue">
                    <Plus size={15} />
                  </span>
                </span>
              )}

              {porDia[i].map((sesion) => (
                <BloqueClase
                  key={sesion.id}
                  sesion={sesion}
                  asignatura={porCodigo.get(sesion.codigo)}
                  alEditar={alEditar}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default RejillaHorario
