import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import {
  ABRE,
  CIERRA,
  FILAS,
  ANCHO_HORAS_PX,
  DIAS,
  HUECO_CELDA,
  acotar,
  altoHoraPara,
  enDoceHoras,
  etiquetaHora,
  franjaPropuesta,
  horasEnPunto,
} from '../layout/horario'
import { useArrastreClase } from '../hooks/useArrastreClase'
import { useAhora } from '../hooks/useAhora'
import BloqueClase from './BloqueClase'
import HuecoPropuesto from './HuecoPropuesto'

/* Las celdas de cada dia, una por hora, de una vez: no cambian nunca. */
const FILAS_DEL_DIA = Array.from({ length: FILAS }, (_, i) => i)

/**
 * Cuanto mide de alto una fila de hora: lo que da repartir entre las doce
 * horas el alto que tiene la semana (ver altoHoraPara). Se mide la zona que
 * se desplaza y no la ventana, porque lo que le toca a la semana es lo que
 * dejan las islas y los margenes. La ultima fila no lleva hueco debajo, y
 * por eso se le suma uno al repartir. Cuando el alto cambia sin que cambie
 * la fila -ya en el minimo o en el maximo-, React no vuelve a pintar.
 */
function useAltoHora(refVista) {
  const [alto, setAlto] = useState(() => altoHoraPara(window.innerHeight - 160))

  useLayoutEffect(() => {
    const el = refVista.current
    if (!el) return
    const ro = new ResizeObserver(([e]) =>
      setAlto(altoHoraPara(e.contentRect.height + HUECO_CELDA)),
    )
    ro.observe(el)
    return () => ro.disconnect()
  }, [refVista])

  return alto
}

/**
 * La semana, en cuadros: una celda redondeada por cada hora de cada dia,
 * separadas por un hueco fino, sobre el lienzo y sin hoja que las envuelva.
 * Se lee como una cuadricula de papel sin dibujar ni una linea, y cada hora
 * libre es un sitio que se ve pulsable. Los cinco dias se reparten en
 * columnas de flex-1 que miden exactamente lo mismo, y la semana entera
 * cabe en el alto que dejan las islas de arriba (ver useAltoHora).
 *
 * Las clases NO viven en celdas. Se colocan en posicion absoluta a partir de
 * sus minutos, que es lo unico que permite dibujar una clase de 08:15 a 09:50
 * en su sitio exacto. Pero las celdas y las clases comparten hueco
 * (HUECO_CELDA): una clase en punto cubre sus celdas al pixel, como si las
 * fundiera, y dos seguidas quedan separadas igual que dos celdas.
 */
function RejillaHorario({ porDia, porCodigo, idMenuAbierto, alPulsarHueco, alMoverClase, alAbrirMenu }) {
  const refVista = useRef(null)
  const refDias = useRef(null)
  const [fantasma, setFantasma] = useState(null)

  const altoHora = useAltoHora(refVista)
  const ahora = useAhora()
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
      if (minuto < ABRE || minuto >= CIERRA) return null
      const franja = franjaPropuesta(porDia[dia], minuto)
      return franja && { dia, ...franja }
    },
    [porDia],
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
    <div className="flex min-h-0 flex-1 flex-col overflow-x-auto bg-[var(--lienzo-mapa)] px-5 pt-[calc(var(--reserva-cabecera)+0.25rem)] pb-5">
      <div className="flex min-h-0 min-w-[46rem] flex-1 flex-col">
        {/* Los dias. Hoy se enciende: es el que se viene a mirar. */}
        <div className="flex shrink-0 pb-2">
          <span style={{ width: ANCHO_HORAS_PX }} className="shrink-0" />
          {DIAS.map((dia, i) => (
            <span key={dia} className="flex flex-1 justify-center">
              <span
                aria-current={ahora?.dia === i ? 'date' : undefined}
                className={`rounded-full px-3 py-1 text-[11px] font-semibold tracking-[0.22em] uppercase ${
                  ahora?.dia === i ? 'bg-tinta text-[var(--lienzo)]' : 'text-tinta-tenue'
                }`}
              >
                {dia}
              </span>
            </span>
          ))}
        </div>

        {/* La jornada. Cabe entera casi siempre; en una ventana baja se
            desplaza aqui dentro, con los dias quietos arriba. */}
        <div ref={refVista} className="desplazable-limpio min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="relative flex" style={{ height: FILAS * altoHora - HUECO_CELDA }}>
            {/* Cada hora rotulada arriba de su fila, a la altura del borde
                de sus celdas. La del cierre -7 PM- no abre fila y no va. */}
            <div style={{ width: ANCHO_HORAS_PX }} className="relative shrink-0">
              {horasEnPunto().map((min) => (
                <span
                  key={min}
                  style={{ top: aY(min) + 7 }}
                  className="absolute right-3 text-[11px] leading-none font-medium tabular-nums text-tinta-tenue"
                >
                  {etiquetaHora(min)}
                </span>
              ))}
            </div>

            {/* Los cinco dias. El puntero se sigue aqui y no columna por
                columna: el dia sale de una division, no de cinco manejadores
                iguales. */}
            <div
              ref={refDias}
              onPointerMove={seguirPuntero}
              onPointerLeave={() => setFantasma(null)}
              onClick={pulsar}
              className="relative flex flex-1"
            >
              {DIAS.map((dia, i) => (
                <div key={dia} className="relative flex-1">
                  {FILAS_DEL_DIA.map((fila) => (
                    <span
                      key={fila}
                      aria-hidden="true"
                      data-hoy={ahora?.dia === i}
                      style={{ top: fila * altoHora, height: altoHora - HUECO_CELDA }}
                      className="celda-horario pointer-events-none absolute inset-x-0.5 rounded-xl"
                    />
                  ))}

                  {/* Donde caeria la clase que se esta arrastrando. Siempre
                      es una posicion legal, asi que se pinta en verde y no
                      hay caso de error que enseñar. */}
                  {arrastrando?.propuesta.dia === i && (
                    <span
                      aria-hidden="true"
                      style={{
                        top: aY(arrastrando.propuesta.inicio),
                        height:
                          (arrastrando.propuesta.fin - arrastrando.propuesta.inicio) * pxPorMinuto -
                          HUECO_CELDA,
                      }}
                      className="pointer-events-none absolute inset-x-0.5 z-10 flex items-start rounded-xl border-2 border-dashed border-aprobada/70 bg-aprobada/10 px-2.5 py-1.5 text-[11.5px] font-medium tabular-nums text-aprobada"
                    >
                      {enDoceHoras(arrastrando.propuesta.inicio)} –{' '}
                      {enDoceHoras(arrastrando.propuesta.fin)}
                    </span>
                  )}

                  {/* celda-fantasma solo aqui: es la animacion de aparecer al
                      pasar el raton, y en el telefono la pista no aparece,
                      esta. */}
                  {fantasma?.dia === i && !arrastrando && (
                    <HuecoPropuesto
                      franja={fantasma}
                      pxPorMinuto={pxPorMinuto}
                      etiqueta="Agregar materia"
                      sangria="inset-x-0.5"
                      clase="celda-fantasma"
                    />
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

              {/* Ahora: una linea sobre el dia de hoy, a la hora que es */}
              {ahora && ahora.minuto >= ABRE && ahora.minuto <= CIERRA && (
                <span
                  aria-hidden="true"
                  style={{
                    top: aY(ahora.minuto),
                    left: `${(ahora.dia / DIAS.length) * 100}%`,
                    width: `${100 / DIAS.length}%`,
                  }}
                  className="linea-ahora pointer-events-none absolute z-20"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RejillaHorario
