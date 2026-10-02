import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import {
  ABRE,
  CIERRA,
  FILAS,
  ANCHO_HORAS_PX,
  ANCHO_SEMANA_MAX,
  DIAS,
  DIAS_CORTOS,
  HUECO_CELDA,
  acotar,
  enDoceHoras,
  etiquetaHora,
  fechasDeSemana,
  franjaPropuesta,
  horasEnPunto,
  ladoCeldaPara,
  momentoEnSemana,
} from '../layout/horario'
import { useArrastreClase } from '../hooks/useArrastreClase'
import BloqueClase from './BloqueClase'
import HuecoPropuesto from './HuecoPropuesto'

/* Las celdas de cada dia, una por hora, de una vez: no cambian nunca. */
const FILAS_DEL_DIA = Array.from({ length: FILAS }, (_, i) => i)

/**
 * Cuanto mide el lado de una celda: lo que mide un dia del ancho que tiene
 * la semana (ver ladoCeldaPara). Se mide la zona de la semana y no la
 * ventana, porque lo que le toca es lo que dejan el resumen de al lado y los
 * margenes. Cuando el ancho cambia sin que cambie el lado -ya en el suelo o
 * en el techo-, React no vuelve a pintar.
 */
function useLadoCelda(refVista) {
  const [lado, setLado] = useState(() => ladoCeldaPara(window.innerWidth - 400))

  useLayoutEffect(() => {
    const el = refVista.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setLado(ladoCeldaPara(e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [refVista])

  return lado
}

/**
 * La semana de escritorio, en cuadrados: una celda redondeada por cada hora
 * de cada dia, tan alta como ancha, separadas por un hueco fino y sin una
 * sola linea dibujada. Cada hora libre se ve como un sitio que se puede
 * pulsar, y la semana se lee como un calendario de Apple: los dias arriba,
 * con su fecha y la de hoy en rojo, y la jornada desplazandose debajo.
 *
 * Las clases NO viven en celdas. Se colocan en posicion absoluta a partir de
 * sus minutos, que es lo unico que permite dibujar una clase de 08:15 a 09:50
 * en su sitio exacto. Pero las celdas y las clases comparten hueco
 * (HUECO_CELDA): una clase en punto cubre sus celdas al pixel, como si las
 * fundiera, y dos seguidas quedan separadas igual que dos celdas.
 */
function RejillaHorario({
  porDia,
  porCodigo,
  colores,
  fecha,
  idMenuAbierto,
  alPulsarHueco,
  alMoverClase,
  alAbrirMenu,
}) {
  const refVista = useRef(null)
  const refDias = useRef(null)
  const [fantasma, setFantasma] = useState(null)

  const lado = useLadoCelda(refVista)
  const ahora = momentoEnSemana(fecha)
  const fechas = fechasDeSemana(fecha)
  const pxPorMinuto = lado / 60
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
    <div
      ref={refVista}
      style={{ maxWidth: ANCHO_SEMANA_MAX }}
      className="desplazable-limpio min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain"
    >
      <div className="mx-auto" style={{ width: ANCHO_HORAS_PX + DIAS.length * lado }}>
        {/* Los dias, quietos arriba mientras la jornada se desplaza: el
            nombre corto y la fecha. Hoy lleva su numero en el rojo de los
            calendarios, que es lo que dice "hoy" sin tener que explicarlo;
            los demas dias no se marcan. */}
        <div className="sticky top-0 z-30 flex bg-[var(--lienzo-mapa)] pb-3">
          <span style={{ width: ANCHO_HORAS_PX }} className="shrink-0" />
          {DIAS.map((dia, i) => {
            const hoy = ahora?.dia === i
            return (
              <span
                key={dia}
                aria-current={hoy ? 'date' : undefined}
                className="flex flex-1 flex-col items-center gap-1"
              >
                <span
                  className={`text-[11px] font-semibold tracking-[0.18em] uppercase ${
                    hoy ? 'text-[var(--ahora)]' : 'text-tinta-tenue'
                  }`}
                >
                  {DIAS_CORTOS[i]}
                </span>
                <span
                  className={`grid size-9 place-items-center rounded-full text-[19px] font-light tabular-nums ${
                    hoy ? 'bg-[var(--ahora)] font-medium text-white' : 'text-tinta'
                  }`}
                >
                  {fechas[i].getDate()}
                </span>
              </span>
            )
          })}
        </div>

        <div className="relative flex" style={{ height: FILAS * lado - HUECO_CELDA }}>
          {/* Cada hora rotulada arriba de su fila, a la altura del borde de
              sus celdas. La del cierre -7 PM- no abre fila y no va. */}
          <div style={{ width: ANCHO_HORAS_PX }} className="relative shrink-0">
            {horasEnPunto().map((min) => (
              <span
                key={min}
                style={{ top: aY(min) + 8 }}
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
                    style={{ top: fila * lado, height: lado - HUECO_CELDA }}
                    className="celda-horario pointer-events-none absolute inset-x-0.5 rounded-[14px]"
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
                    className="pointer-events-none absolute inset-x-0.5 z-10 flex items-start rounded-[14px] border-2 border-dashed border-aprobada/70 bg-aprobada/10 px-2.5 py-1.5 text-[11.5px] font-medium tabular-nums text-aprobada"
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
                    colores={colores}
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
  )
}

export default RejillaHorario
