import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import {
  ABRE,
  ALTO_MIN,
  ANCHO_HORAS_PX,
  DIAS,
  acotar,
  enDoceHoras,
  etiquetaHora,
  finVisible,
  franjaPropuesta,
  horasEnPunto,
} from '../layout/horario'
import { useArrastreClase } from '../hooks/useArrastreClase'
import BloqueClase from './BloqueClase'

const LINEA = 'border-[var(--horario-linea)]'
/* Lo que mide la cabecera de dias, que hay que descontar del alto util */
const ALTO_CABECERA = 54

/**
 * Cuanto mide de alto una fila de hora.
 *
 * Reparte TODA la altura disponible entre las horas de la jornada: la fila
 * queda tan alta -y por tanto tan cuadrada- como puede sin obligar a
 * desplazarse. El ancho no entra en la cuenta; las columnas se estiran a lo
 * que haya, que es lo que se quiere.
 *
 * Depende de la ventana y del numero de filas, no de las clases: mover o
 * agregar una clase no reescala la rejilla bajo el cursor.
 */
function useAltoHora(refVista, filas) {
  const [util, setUtil] = useState(0)

  useLayoutEffect(() => {
    const el = refVista.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setUtil(e.contentRect.height - ALTO_CABECERA))
    ro.observe(el)
    return () => ro.disconnect()
  }, [refVista])

  return Math.max(ALTO_MIN, Math.floor(util / filas) || ALTO_MIN)
}

/**
 * La cuadricula de la semana, con sus clases.
 *
 * Ocupa todo el ancho: los cinco dias se reparten en columnas de flex-1, que
 * miden exactamente lo mismo y llegan a los dos bordes. La semana es lo que
 * se viene a mirar, y una rejilla centrada con doscientos pixeles de margen a
 * cada lado desperdicia justo el sitio donde iba a leerse.
 *
 * Las clases NO viven en celdas. Se colocan en posicion absoluta a partir de
 * sus minutos, que es lo unico que permite dibujar una clase de 08:15 a 09:50
 * en su sitio exacto y que dos seguidas -una acaba a las nueve, la otra
 * empieza a las nueve- queden pegadas sin hueco.
 *
 * Las lineas de hora son un degradado repetido y no un div por hora: cinco
 * columnas por catorce horas serian setenta nodos que no aportan nada.
 */
function RejillaHorario({ porDia, porCodigo, idMenuAbierto, alPulsarHueco, alMoverClase, alAbrirMenu }) {
  const refVista = useRef(null)
  const refDias = useRef(null)
  const [fantasma, setFantasma] = useState(null)

  /* La jornada llega a las seis salvo que alguien tenga algo mas tarde. Una
     clase guardada que no se ve seria peor que una fila de mas. */
  const hasta = finVisible(porDia.flat())
  const filas = (hasta - ABRE) / 60
  const altoHora = useAltoHora(refVista, filas)
  const pxPorMinuto = altoHora / 60
  const aY = (min) => (min - ABRE) * pxPorMinuto

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

  const { agarrar, arrastrando } = useArrastreClase({
    puntoADiaYMinuto,
    porDia,
    alMover: alMoverClase,
  })

  /* La franja que se propone bajo el puntero, ya recortada contra las clases
     vecinas. La regla vive en franjaPropuesta; aqui solo se le añade el dia. */
  const celdaDe = useCallback(
    (dia, minuto) => {
      if (minuto < ABRE || minuto >= hasta) return null
      const franja = franjaPropuesta(porDia[dia], minuto)
      return franja && { dia, ...franja }
    },
    [porDia, hasta],
  )

  /** La caja en pantalla de una franja, para que la ficha cuelgue de ella */
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
    // En tactil no hay puntero al que seguir: la previsualizacion no aplica.
    // Y mientras se arrastra manda la vista previa del arrastre, no la de
    // crear: dos rectangulos punteados a la vez no dicen nada.
    if (e.pointerType === 'touch' || arrastrando) return
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

  return (
    <div
      ref={refVista}
      className="min-h-0 min-w-[46rem] flex-1 overflow-auto [scrollbar-gutter:stable]"
    >
      {/* Cabecera de dias. Se queda arriba al desplazar y va opaca para que
          las clases pasen por debajo sin transparentarse. */}
      <div className={`transicion-tema sticky top-0 z-20 flex border-b ${LINEA} bg-panel-suave`}>
        <span style={{ width: ANCHO_HORAS_PX }} className="shrink-0" />
        {DIAS.map((dia) => (
          <span
            key={dia}
            className={`flex flex-1 items-center justify-center border-l ${LINEA} py-4 text-[13.5px] font-extrabold tracking-[0.12em] text-tinta uppercase`}
          >
            {dia}
          </span>
        ))}
      </div>

      <div className={`flex border-b ${LINEA}`} style={{ height: filas * altoHora }}>
        {/* Columna de horas. La etiqueta va debajo de su linea y no centrada
            en ella: centrada, la primera quedaria partida por la cabecera. */}
        <div style={{ width: ANCHO_HORAS_PX }} className="relative shrink-0">
          {horasEnPunto(hasta).map((min, i, todas) => (
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
              style={{
                backgroundImage: `repeating-linear-gradient(to bottom, var(--horario-linea) 0 1px, transparent 1px ${altoHora}px)`,
              }}
              className={`relative flex-1 border-l ${LINEA}`}
            >
              {/* Donde caeria la clase que se esta arrastrando. Siempre es
                  una posicion legal, asi que se pinta en verde y no hay caso
                  de error que enseñar. */}
              {arrastrando?.propuesta.dia === i && (
                <span
                  aria-hidden="true"
                  style={{
                    top: aY(arrastrando.propuesta.inicio),
                    height:
                      (arrastrando.propuesta.fin - arrastrando.propuesta.inicio) * pxPorMinuto - 4,
                  }}
                  className="pointer-events-none absolute inset-x-1.5 z-10 flex items-start rounded-xl border-2 border-dashed border-aprobada/70 bg-aprobada/10 px-2.5 py-1.5 text-[11.5px] font-bold tabular-nums text-aprobada"
                >
                  {enDoceHoras(arrastrando.propuesta.inicio)} –{' '}
                  {enDoceHoras(arrastrando.propuesta.fin)}
                </span>
              )}

              {fantasma?.dia === i && !arrastrando && (
                <span
                  aria-hidden="true"
                  style={{
                    top: aY(fantasma.inicio),
                    height: (fantasma.fin - fantasma.inicio) * pxPorMinuto - 5,
                  }}
                  className="celda-fantasma pointer-events-none absolute inset-x-1.5 flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-[var(--horario-linea)] bg-tinta/[0.028]"
                >
                  {/* Neutro y de trazo fino, no un boton verde relleno. Esto
                      es una pista de que ahi se puede crear algo, no una
                      accion consumada: si pesa mas que las clases que ya
                      estan puestas, compite con lo unico que importa. El
                      color sale de la tinta del tema, asi que sirve igual en
                      claro y en oscuro sin definir nada aparte. */}
                  <span className="grid size-6 place-items-center rounded-full border border-tinta-tenue/40 text-tinta-tenue">
                    <Plus size={13} strokeWidth={1.75} />
                  </span>
                  <span className="text-[11px] font-semibold tracking-wide text-tinta-tenue">
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
                  arrastrando={arrastrando?.sesion.id === sesion.id}
                  menuAbierto={idMenuAbierto === sesion.id}
                  alAgarrar={agarrar}
                  alAbrirMenu={alAbrirMenu}
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
