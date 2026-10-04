import { useCallback, useMemo, useRef, useState } from 'react'
import { DIAS, enDoceHoras, momentoDe } from '../layout/horario'
import { useAhora } from '../hooks/useAhora'
import { useDeslizar } from '../hooks/useDeslizar'
import AhoraYDespues from './AhoraYDespues'
import TiraSemana from './TiraSemana'
import AgendaDia from './AgendaDia'

/* Lo que dice la cabecera de un dia a la derecha: cuantas clases y a que hora
   se sale, que es lo que se quiere saber de un dia antes de leerlo. */
function resumenDelDia(sesiones) {
  if (!sesiones.length) return 'Sin clases'
  const salida = Math.max(...sesiones.map((s) => s.fin))
  const cuantas = sesiones.length === 1 ? '1 clase' : `${sesiones.length} clases`
  return `${cuantas} · sales ${enDoceHoras(salida)}`
}

/**
 * El horario en una columna: lo que toca ahora, la semana en miniatura y el
 * dia elegido, de arriba abajo.
 *
 * Es la forma del telefono y de cualquier ventana donde la semana en rejilla
 * no cabe. Cinco columnas en 375 px dejan cada dia en sesenta pixeles, menos
 * que el nombre de cualquier materia; en vez de encoger la rejilla, se cambia
 * de pregunta. La rejilla contesta "como es mi semana"; esto contesta "que me
 * toca", y deja la semana en una tira que cabe en un pulgar.
 *
 * Se cambia de dia tocandolo en la tira o deslizando la lista. Las dos cosas
 * mueven lo mismo, y la lente de la tira sigue al dedo: lo que se aprende con
 * un gesto vale para el otro.
 *
 * @param {object[][]} props.porDia  las clases de cada dia
 * @param {import('react').ReactNode} props.acciones  compartir, descargar y lo demas
 * @param {(dia: number, franja: object, elemento: HTMLElement) => void} props.alAnadir
 */
function HorarioAgenda({
  porDia,
  idMenuAbierto,
  aspectoDe,
  acciones,
  alEditar,
  alAbrirMenu,
  alAnadir,
}) {
  const ahora = useAhora()
  /* Se abre por hoy; el fin de semana, por el lunes */
  const [dia, setDia] = useState(() => (ahora.dia < DIAS.length ? ahora.dia : 0))
  /* Hacia donde se va, solo para que la lista entre por el lado correcto */
  const [sentido, setSentido] = useState(1)
  /* La capa que se arrastra con el dedo al deslizar (ver useDeslizar) */
  const refCapa = useRef(null)

  const momento = useMemo(() => momentoDe(porDia, ahora), [porDia, ahora])
  const esHoy = dia === ahora.dia

  const irA = useCallback(
    (destino) => {
      if (destino === dia || destino < 0 || destino >= DIAS.length) return
      setSentido(destino > dia ? 1 : -1)
      setDia(destino)
    },
    [dia],
  )

  const { fueDeslizamiento, gestos } = useDeslizar({
    refCapa,
    hayAnterior: dia > 0,
    haySiguiente: dia < DIAS.length - 1,
    alAnterior: () => irA(dia - 1),
    alSiguiente: () => irA(dia + 1),
  })

  return (
    <div className="agenda-horario min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
      <div className="mx-auto flex min-h-full w-full max-w-[520px] flex-col px-5 pt-[max(0.875rem,var(--reserva-cabecera))] pb-[calc(var(--reserva-barra)+1.5rem)]">
        <AhoraYDespues
          momento={momento}
          ahora={ahora}
          aspectoDe={aspectoDe}
          aLaDerecha={acciones}
        />

        <div className="mt-8">
          <TiraSemana
            porDia={porDia}
            dia={dia}
            ahora={ahora}
            aspectoDe={aspectoDe}
            alElegir={irA}
          />
        </div>

        {/* pan-y reparte el gesto: lo vertical lo desplaza el navegador, que
            lo hace mejor que nosotros, y lo horizontal lo recoge el
            deslizamiento. Ocupa lo que queda de pantalla, para que se pueda
            deslizar tambien por debajo de un dia corto.
            El click que el navegador dispara al soltar un deslizamiento no es
            un toque: se para en la captura, antes de que llegue a una clase y
            le abra la ficha. */}
        <div
          {...gestos}
          onClickCapture={(e) => {
            if (fueDeslizamiento()) e.stopPropagation()
          }}
          style={{ touchAction: 'pan-y' }}
          className="mt-6 flex-1"
        >
          {/* La key rearranca la animacion en cada cambio de dia, y el sentido
              decide por que lado entra: sin eso, pasar de dia no diria si se
              avanza o se retrocede. */}
          <section
            key={dia}
            ref={refCapa}
            aria-label={DIAS[dia]}
            className={sentido > 0 ? 'entra-dia-derecha' : 'entra-dia-izquierda'}
          >
            <header className="flex items-baseline justify-between gap-3 pb-5">
              <h3 className="rotulo-horario font-ui">
                {esHoy ? (
                  <>
                    <b>{DIAS[dia]}</b> · hoy
                  </>
                ) : (
                  DIAS[dia]
                )}
              </h3>
              <span className="text-[12px] leading-none text-tinta-tenue tabular-nums">
                {resumenDelDia(porDia[dia])}
              </span>
            </header>

            <AgendaDia
              sesiones={porDia[dia]}
              minuto={esHoy ? ahora.minuto : null}
              conAnclas
              idMenuAbierto={idMenuAbierto}
              aspectoDe={aspectoDe}
              alEditar={alEditar}
              alAbrirMenu={alAbrirMenu}
              alAnadir={(franja, elemento) => alAnadir(dia, franja, elemento)}
            />
          </section>
        </div>
      </div>
    </div>
  )
}

export default HorarioAgenda
