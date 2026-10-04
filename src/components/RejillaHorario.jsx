import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import {
  ABRE,
  CIERRA,
  FILAS,
  ANCHO_HORAS_PX,
  DIAS,
  acotar,
  altoHoraPara,
  enDoceHoras,
  franjaPropuesta,
  horaEnPunto,
  horasEnPunto,
  lineasDeHora,
  partesDeHora,
} from '../layout/horario'
import { useArrastreClase } from '../hooks/useArrastreClase'
import { colorClase } from '../theme/areas'
import BloqueClase from './BloqueClase'
import HuecoPropuesto from './HuecoPropuesto'

const LINEA = 'border-[var(--horario-linea)]'

/* Lo que mide la fila de los dias, pegada arriba, y el aire que hay entre
   ella y la primera linea: sin el, la etiqueta de las siete -que va centrada
   en su linea- quedaria cortada por la mitad. */
const ALTO_DIAS = 40
const AIRE = 12

/* A menos de esto de la hora de ahora, la etiqueta de una hora en punto se
   calla: dos textos encimados en el carril no se leen ninguno. */
const CERCA_DE_AHORA = 13

/* El alto de hora que toca a una vista de este alto: lo que queda quitando la
   fila de los dias y el aire de arriba y de abajo */
const altoHoraEn = (altoVista) => altoHoraPara(altoVista - ALTO_DIAS - 2 * AIRE)

/**
 * Cuanto mide de alto una fila de hora: lo que haga falta para que la jornada
 * quepa en lo que hay, dentro de un suelo y un techo (ver altoHoraPara).
 *
 * Se mide el elemento y no la ventana porque lo que le toca a la rejilla no
 * es la pantalla: es lo que le dejan la cabecera y el panel de al lado. El
 * alto del elemento lo pone el flex de fuera, no su contenido, asi que
 * medirlo para decidir el contenido no se muerde la cola.
 */
function useAltoHora(refVista) {
  const [alto, setAlto] = useState(() => altoHoraEn(window.innerHeight - 110))

  useLayoutEffect(() => {
    const el = refVista.current
    if (!el) return
    setAlto(altoHoraEn(el.clientHeight))
    const ro = new ResizeObserver(([e]) => setAlto(altoHoraEn(e.contentRect.height)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [refVista])

  return alto
}

/**
 * La semana en rejilla, con sus clases.
 *
 * Los cinco dias se reparten en columnas de flex-1, que miden exactamente lo
 * mismo. Las clases NO viven en celdas: se colocan en posicion absoluta a
 * partir de sus minutos, que es lo unico que permite dibujar una clase de
 * 08:15 a 09:50 en su sitio exacto y que dos seguidas queden pegadas.
 *
 * Solo lleva las lineas de las horas, que son las que se leen; las verticales
 * entre dias no decian nada que no digan ya las columnas de bloques. Y son un
 * degradado repetido, no un div por hora.
 *
 * La hora de ahora cruza el dia de hoy en rojo y se escribe en el carril, en
 * el sitio de la etiqueta que le quede debajo.
 *
 * @param {{ dia: number, minuto: number }} props.ahora
 */
function RejillaHorario({
  porDia,
  porCodigo,
  colores,
  ahora,
  idMenuAbierto,
  alPulsarHueco,
  alMoverClase,
  alAbrirMenu,
}) {
  const refVista = useRef(null)
  const refDias = useRef(null)
  const [fantasma, setFantasma] = useState(null)

  const altoHora = useAltoHora(refVista)
  const pxPorMinuto = altoHora / 60
  const aY = (min) => (min - ABRE) * pxPorMinuto

  const ahoraSeVe = ahora.dia < DIAS.length && ahora.minuto >= ABRE && ahora.minuto <= CIERRA

  /* La primera vez, la semana se abre por donde empiezan las clases. En una
     pantalla baja la jornada no cabe entera, y quien solo tiene clases de
     tarde no puede encontrarse una mañana vacia y tener que buscarlas. */
  useLayoutEffect(() => {
    const el = refVista.current
    const primera = Math.min(...porDia.flat().map((s) => s.inicio))
    if (el && Number.isFinite(primera)) {
      el.scrollTop = (Math.floor(primera / 60) * 60 - ABRE) * (altoHoraEn(el.clientHeight) / 60)
    }
    // Solo al entrar: despues el desplazamiento es de quien lo mueve
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    /* Su propio contenedor de desplazamiento: en una pantalla baja la jornada
       no cabe y se mueve aqui dentro, con la fila de los dias pegada arriba. */
    <div ref={refVista} className="desplazable-panel min-h-0 flex-1 overflow-auto pr-6">
      <div className="min-w-[38rem]">
        {/* Los dias. Opaca, para que las clases pasen por debajo. Hoy va en
            tinta; a la derecha de cada uno, un punto por clase y de su color:
            la carga del dia antes de mirar la columna. */}
        <div
          style={{ height: ALTO_DIAS, paddingLeft: ANCHO_HORAS_PX }}
          className="sticky top-0 z-20 flex bg-panel-suave"
        >
          {DIAS.map((dia, i) => (
            <div key={dia} className="flex flex-1 items-center justify-between gap-2 px-2.5">
              <span className="rotulo-horario font-ui">{i === ahora.dia ? <b>{dia}</b> : dia}</span>
              <span className="flex gap-1" aria-hidden="true">
                {porDia[i].map((s) => (
                  <i
                    key={s.id}
                    style={{ background: colorClase(s, colores) }}
                    className="size-1 rounded-full"
                  />
                ))}
              </span>
            </div>
          ))}
        </div>

        <div className="flex" style={{ paddingBlock: AIRE }}>
          {/* El carril de las horas. Cada etiqueta va centrada en su linea,
              que es como se lee una regla: la marca ES la linea. Las trece,
              tambien la del cierre: aqui las lineas no abren filas, marcan
              horas. */}
          <div
            style={{ width: ANCHO_HORAS_PX, height: FILAS * altoHora }}
            className="relative shrink-0"
          >
            {[...horasEnPunto(), CIERRA].map((min) => {
              const { hora, meridiano } = horaEnPunto(min)
              const tapada = ahoraSeVe && Math.abs(aY(min) - aY(ahora.minuto)) < CERCA_DE_AHORA
              return (
                <span
                  key={min}
                  style={{ top: aY(min) }}
                  className={`absolute right-3 -translate-y-1/2 text-[12px] leading-none font-medium whitespace-nowrap text-tinta-suave tabular-nums ${
                    tapada ? 'invisible' : ''
                  }`}
                >
                  {hora}
                  <span className="meridiano font-ui">{meridiano}</span>
                </span>
              )
            })}

            {ahoraSeVe && (
              <span
                style={{ top: aY(ahora.minuto) }}
                className="absolute right-3 -translate-y-1/2 text-[12px] leading-none font-semibold text-[var(--estado-rojo)] tabular-nums"
              >
                {partesDeHora(ahora.minuto).hora}
              </span>
            )}
          </div>

          {/* Los cinco dias. El puntero se sigue aqui y no columna por columna:
              el dia sale de una division, no de cinco manejadores iguales.
              Las lineas de las horas se pintan una vez, en este contenedor:
              las once de dentro el degradado, y la de las siete y la del
              cierre sus dos bordes (ver lineasDeHora). */}
          <div
            ref={refDias}
            onPointerMove={seguirPuntero}
            onPointerLeave={() => setFantasma(null)}
            onClick={pulsar}
            style={{ height: FILAS * altoHora, ...lineasDeHora(altoHora) }}
            className={`relative box-content flex flex-1 border-y ${LINEA} -my-px`}
          >
            {DIAS.map((dia, i) => (
              <div key={dia} className="relative flex-1">
                {/* Donde caeria la clase que se esta arrastrando. Siempre es
                    una posicion legal, asi que se pinta en verde y no hay caso
                    de error que enseñar. */}
                {arrastrando?.propuesta.dia === i && (
                  <span
                    aria-hidden="true"
                    style={{
                      top: aY(arrastrando.propuesta.inicio),
                      height:
                        (arrastrando.propuesta.fin - arrastrando.propuesta.inicio) * pxPorMinuto -
                        4,
                    }}
                    className="pointer-events-none absolute inset-x-0.5 z-10 flex items-start rounded-[9px] border-2 border-dashed border-aprobada/70 bg-aprobada/10 px-2.5 py-1.5 text-[11.5px] font-medium text-aprobada tabular-nums"
                  >
                    {enDoceHoras(arrastrando.propuesta.inicio)} –{' '}
                    {enDoceHoras(arrastrando.propuesta.fin)}
                  </span>
                )}

                {/* celda-fantasma: la animacion de aparecer al pasar el raton */}
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

                {ahoraSeVe && i === ahora.dia && (
                  <span
                    aria-hidden="true"
                    className="ahora-linea"
                    style={{ top: aY(ahora.minuto) }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default RejillaHorario
