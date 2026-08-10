import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import {
  ABRE,
  ANCHO_HORAS_PX,
  CIERRA,
  DIAS,
  LADO_MAX,
  LADO_MIN,
  acotar,
  etiquetaHora,
  franjaPropuesta,
  horasEnPunto,
} from '../layout/horario'
import BloqueClase from './BloqueClase'

const LINEA = 'border-[var(--horario-linea)]'

/**
 * Cuanto mide el lado de una celda de una hora.
 *
 * La celda es un cuadrado de verdad: el alto de una fila es el ancho de una
 * columna. Para eso hay que medir, porque el ancho depende de la ventana.
 *
 * Y hay que acotarlo por arriba. Sin tope, en un monitor ancho la columna se
 * va a trescientos cincuenta pixeles, la fila con ella, y las catorce horas
 * de la jornada se convierten en cinco mil pixeles de desplazamiento para
 * enseñar lo mismo. Con el tope la rejilla deja de estirarse y se queda
 * centrada, que es como se ve en una tablet -que es donde ya gustaba-.
 */
function useLadoCelda() {
  const refMedida = useRef(null)
  const [lado, setLado] = useState(LADO_MIN)

  useLayoutEffect(() => {
    const el = refMedida.current
    if (!el) return
    const medir = ([entrada]) => {
      const disponible = entrada.contentRect.width - ANCHO_HORAS_PX
      setLado(acotar(Math.floor(disponible / DIAS.length), LADO_MIN, LADO_MAX))
    }
    const ro = new ResizeObserver(medir)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return { refMedida, lado }
}

/**
 * La cuadricula de la semana, con sus clases.
 *
 * Las clases NO viven en celdas de la rejilla. Se colocan en posicion
 * absoluta a partir de sus minutos, que es lo unico que permite dibujar una
 * clase de 08:15 a 09:50 en su sitio exacto y que dos seguidas -una acaba a
 * las nueve, la otra empieza a las nueve- queden pegadas sin hueco.
 *
 * Las lineas de hora son un degradado repetido y no un div por hora: cinco
 * columnas por catorce horas serian setenta nodos que no aportan nada.
 */
function RejillaHorario({ porDia, porCodigo, alPulsarHueco, alEditar }) {
  const { refMedida, lado } = useLadoCelda()
  const refDias = useRef(null)
  const [fantasma, setFantasma] = useState(null)

  const pxPorMinuto = lado / 60
  const aY = (min) => (min - ABRE) * pxPorMinuto
  const altoRejilla = (CIERRA - ABRE) * pxPorMinuto

  /* De un punto de la pantalla al dia y la hora que hay debajo. Un unico
     sitio hace esta traduccion; el resto del componente habla en minutos. */
  const puntoADiaYMinuto = useCallback(
    (clienteX, clienteY) => {
      const caja = refDias.current.getBoundingClientRect()
      return {
        dia: acotar(
          Math.floor((clienteX - caja.left) / (caja.width / DIAS.length)),
          0,
          DIAS.length - 1,
        ),
        minuto: ABRE + (clienteY - caja.top) / pxPorMinuto,
      }
    },
    [pxPorMinuto],
  )

  /* La franja que se propone bajo el puntero, ya recortada contra las clases
     vecinas. La regla vive en franjaPropuesta; aqui solo se le añade el dia. */
  const celdaDe = useCallback(
    (dia, minuto) => {
      if (minuto < ABRE || minuto >= CIERRA) return null
      const franja = franjaPropuesta(porDia[dia], minuto)
      return franja && { dia, ...franja }
    },
    [porDia],
  )

  /** La caja en pantalla de una franja, para que el popover cuelgue de ella */
  const cajaDe = (celda) => {
    const caja = refDias.current.getBoundingClientRect()
    const ancho = caja.width / DIAS.length
    return {
      izquierda: caja.left + celda.dia * ancho,
      derecha: caja.left + (celda.dia + 1) * ancho,
      arriba: caja.top + aY(celda.inicio),
      abajo: caja.top + aY(celda.fin),
    }
  }

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
    alPulsarHueco(celda, cajaDe(celda))
  }

  /* La rejilla mide lo que necesita para que sus celdas sean cuadradas, y se
     centra en lo que sobre. Estirarla llenaria el monitor a costa de
     convertir cada cuadrado en una tira. */
  const anchoRejilla = ANCHO_HORAS_PX + lado * DIAS.length

  return (
    <div ref={refMedida} className="min-w-[46rem] px-4">
      <div className="mx-auto" style={{ width: anchoRejilla }}>
        {/* Cabecera de dias. Se queda arriba al desplazar y va opaca para que
            las clases pasen por debajo sin transparentarse. */}
        <div
          className={`transicion-tema sticky top-0 z-20 flex border-b ${LINEA} bg-panel-suave`}
        >
          <span style={{ width: ANCHO_HORAS_PX }} className="shrink-0" />
          {DIAS.map((dia) => (
            <span
              key={dia}
              style={{ width: lado }}
              className={`flex shrink-0 items-center justify-center border-l ${LINEA} py-4 text-[13.5px] font-extrabold tracking-[0.12em] text-tinta uppercase`}
            >
              {dia}
            </span>
          ))}
        </div>

        <div className={`flex border-b ${LINEA}`} style={{ height: altoRejilla }}>
          {/* Columna de horas. La etiqueta va debajo de su linea y no centrada
              en ella: centrada, la primera quedaria partida por la cabecera. */}
          <div style={{ width: ANCHO_HORAS_PX }} className="relative shrink-0">
            {horasEnPunto().map((min, i, todas) => (
              <span
                key={min}
                style={{ top: aY(min) }}
                className={`absolute right-4 text-[12.5px] font-semibold tabular-nums text-tinta-tenue ${
                  // La ultima cierra la rejilla: debajo de su linea se saldria
                  i === todas.length - 1 ? '-translate-y-5' : 'translate-y-1.5'
                }`}
              >
                {etiquetaHora(min)}
              </span>
            ))}
          </div>

          {/* Los cinco dias. El puntero se sigue aqui y no columna por
              columna: el dia sale de una division, no de cinco manejadores. */}
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
                style={{
                  width: lado,
                  backgroundImage: `repeating-linear-gradient(to bottom, var(--horario-linea) 0 1px, transparent 1px ${lado}px)`,
                }}
                className={`relative shrink-0 border-l ${LINEA}`}
              >
                {fantasma?.dia === i && (
                  <span
                    aria-hidden="true"
                    style={{
                      top: aY(fantasma.inicio),
                      height: (fantasma.fin - fantasma.inicio) * pxPorMinuto - 5,
                    }}
                    className="celda-fantasma pointer-events-none absolute inset-x-1.5 flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-aprobada/40 bg-aprobada/[0.07]"
                  >
                    <span className="grid size-8 place-items-center rounded-full bg-aprobada text-[var(--lienzo)] shadow-[0_4px_14px_-4px_var(--estado-aprobada)]">
                      <Plus size={17} strokeWidth={2.5} />
                    </span>
                    <span className="text-[11.5px] font-bold tracking-wide text-aprobada">
                      Agregar materia
                    </span>
                  </span>
                )}

                {porDia[i].map((sesion) => (
                  <BloqueClase
                    key={sesion.id}
                    sesion={sesion}
                    asignatura={porCodigo.get(sesion.codigo)}
                    pxPorMinuto={pxPorMinuto}
                    alEditar={alEditar}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default RejillaHorario
