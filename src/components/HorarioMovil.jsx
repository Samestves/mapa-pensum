import { useCallback, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import {
  ABRE,
  CIERRA,
  DIAS,
  DIAS_CORTOS,
  FILAS,
  ANCHO_HORAS_PX,
  etiquetaHora,
  franjaPropuesta,
  horasEnPunto,
} from '../layout/horario'
import { useDeslizar } from '../hooks/useDeslizar'
import BloqueClase from './BloqueClase'

const LINEA = 'border-[var(--horario-linea)]'

/* En el telefono la fila no se ajusta a la pantalla: se fija comoda y el dia
   se desplaza. Solo hay una columna, asi que desplazarse hacia abajo es el
   gesto natural, y apretar doce filas en la altura de un movil dejaria
   bloques donde no cabe el nombre de la materia. */
const ALTO_HORA = 76

/** Lunes a viernes; el fin de semana entra por el lunes */
const diaDeHoy = () => {
  const d = (new Date().getDay() + 6) % 7
  return d < DIAS.length ? d : 0
}

/**
 * El horario en un telefono: un dia a la vez.
 *
 * La semana de cinco columnas no cabe en 375 px sin volverse ilegible -cada
 * dia quedaria en unos sesenta pixeles, menos que el nombre de cualquier
 * materia-, asi que en vez de encoger la misma rejilla se apila: se enseña un
 * dia entero y se pasa de uno a otro deslizando el dedo.
 *
 * Es la misma rejilla, no otra cosa: mismas horas, mismos bloques colocados
 * por minutos y el mismo formulario. Lo unico que cambia es cuantos dias se
 * ven a la vez.
 *
 * Arrastrar clases se queda fuera a proposito. Mover una clase de dia exige
 * ver los dos dias, y aqui solo hay uno; con el dia a la vista, el gesto seria
 * adivinar. Cambiar de dia se hace desde la ficha, que es explicito.
 */
function HorarioMovil({ porDia, porCodigo, idMenuAbierto, alPulsarHueco, alAbrirMenu }) {
  const [dia, setDia] = useState(diaDeHoy)
  /* Hacia donde se va, solo para que la animacion entre por el lado correcto */
  const [sentido, setSentido] = useState(1)
  const refDia = useRef(null)

  const irA = useCallback((siguiente) => {
    setDia((actual) => {
      const destino = Math.max(0, Math.min(siguiente, DIAS.length - 1))
      setSentido(destino >= actual ? 1 : -1)
      return destino
    })
  }, [])

  const { fueDeslizamiento, gestos } = useDeslizar({
    alIzquierda: () => irA(dia + 1),
    alDerecha: () => irA(dia - 1),
  })

  const pxPorMinuto = ALTO_HORA / 60
  const aY = (min) => (min - ABRE) * pxPorMinuto

  const tocarHueco = (e) => {
    // El click que sigue a un deslizamiento no es un toque en el hueco
    if (fueDeslizamiento() || e.target.closest('.bloque-clase')) return
    const caja = refDia.current.getBoundingClientRect()
    const minuto = ABRE + (e.clientY - caja.top) / pxPorMinuto
    if (minuto < ABRE || minuto >= CIERRA) return

    const franja = franjaPropuesta(porDia[dia], minuto)
    if (!franja) return
    alPulsarHueco(
      { dia, ...franja },
      {
        izquierda: caja.left,
        derecha: caja.right,
        arriba: caja.top + aY(franja.inicio),
        abajo: caja.top + aY(franja.fin),
      },
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Los cinco dias siempre a la vista, no solo el actual: enseñar donde
          estas Y a donde puedes ir es lo que convierte el deslizamiento en
          algo que se descubre en vez de adivinarse. El punto marca los dias
          que tienen clase, para saber si vale la pena ir sin ir. */}
      <div
        className={`transicion-tema flex shrink-0 items-center gap-1 border-b ${LINEA} bg-panel-suave px-2 py-2`}
      >
        <button
          type="button"
          onClick={() => irA(dia - 1)}
          disabled={dia === 0}
          aria-label="Día anterior"
          className="grid size-8 shrink-0 place-items-center rounded-lg text-tinta-tenue transition-colors hover:text-tinta disabled:opacity-25"
        >
          <ChevronLeft size={17} />
        </button>

        {DIAS.map((nombre, i) => (
          <button
            key={nombre}
            type="button"
            onClick={() => irA(i)}
            aria-current={i === dia ? 'true' : undefined}
            className={`flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 text-[12px] font-extrabold tracking-[0.08em] uppercase transition-colors ${
              i === dia ? 'bg-panel text-tinta shadow-sm' : 'text-tinta-tenue'
            }`}
          >
            {DIAS_CORTOS[i]}
            <span
              aria-hidden="true"
              className={`size-1 rounded-full transition-colors ${
                porDia[i].length ? 'bg-aprobada' : 'bg-transparent'
              }`}
            />
          </button>
        ))}

        <button
          type="button"
          onClick={() => irA(dia + 1)}
          disabled={dia === DIAS.length - 1}
          aria-label="Día siguiente"
          className="grid size-8 shrink-0 place-items-center rounded-lg text-tinta-tenue transition-colors hover:text-tinta disabled:opacity-25"
        >
          <ChevronRight size={17} />
        </button>
      </div>

      {/* pan-y reparte el gesto: lo vertical lo desplaza el navegador, que lo
          hace mejor que nosotros, y lo horizontal lo recoge el deslizamiento. */}
      <div
        {...gestos}
        onClick={tocarHueco}
        style={{ touchAction: 'pan-y' }}
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
      >
        {/* La key rearranca la animacion en cada cambio de dia, y el sentido
            decide por que lado entra: sin eso, pasar de dia no diria si se
            avanza o se retrocede. */}
        <div key={dia} className={sentido > 0 ? 'entra-dia-derecha' : 'entra-dia-izquierda'}>
          <div className={`flex border-b ${LINEA}`} style={{ height: FILAS * ALTO_HORA }}>
            <div style={{ width: ANCHO_HORAS_PX }} className="relative shrink-0">
              {horasEnPunto().map((min) => (
                <span
                  key={min}
                  style={{ top: aY(min) }}
                  className="absolute right-3 translate-y-1.5 text-[12px] font-semibold tabular-nums text-tinta-tenue"
                >
                  {etiquetaHora(min)}
                </span>
              ))}
            </div>

            <div
              ref={refDia}
              style={{
                backgroundImage: `repeating-linear-gradient(to bottom, var(--horario-linea) 0 1px, transparent 1px ${ALTO_HORA}px)`,
              }}
              className={`relative flex-1 border-l ${LINEA}`}
            >
              {porDia[dia].map((sesion) => (
                <BloqueClase
                  key={sesion.id}
                  sesion={sesion}
                  asignatura={porCodigo.get(sesion.codigo)}
                  pxPorMinuto={pxPorMinuto}
                  arrastrable={false}
                  menuAbierto={idMenuAbierto === sesion.id}
                  alAbrirMenu={alAbrirMenu}
                />
              ))}

              {porDia[dia].length === 0 && (
                <p className="absolute inset-x-6 top-24 text-center text-[13px] leading-relaxed font-medium text-tinta-tenue">
                  <Plus size={16} className="mx-auto mb-2 opacity-60" />
                  Toca cualquier hora para agregar una clase
                  <span className="mt-1.5 block text-[11.5px] opacity-70">
                    Desliza para ver otro día
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HorarioMovil
