import { useEffect, useRef, useState } from 'react'

/* Cuanto hay que arrastrar la tarjeta hacia abajo para cerrarla, o con que
   velocidad -en px por ms- basta un tiron corto. */
const CIERRE_DISTANCIA = 90

const CIERRE_VELOCIDAD = 0.6

/**
 * La ficha en el telefono: una tarjeta que flota encima de la barra de abajo,
 * separada de los bordes.
 *
 * Fue una hoja pegada al fondo de la pantalla, y la barra de cristal de
 * Mapa-Lista-Horario quedaba montada encima de ella: dos capas peleando por
 * el mismo sitio. Flotando se lee como lo que es -algo que se abrio sobre el
 * mapa y se puede apartar- y la barra sigue a mano debajo.
 *
 * Se aparta como cualquier tarjeta de telefono: arrastrandola hacia abajo
 * desde la cabecera. Solo la cabecera arrastra; la lista de prelaciones tiene
 * su propio scroll y no puede pelearse con el gesto.
 *
 * Al abrirse avisa de cuanto tapa por abajo (alTapar), y el mapa se corre
 * para que la materia pulsada quede a la vista encima de ella.
 */
export default function TarjetaTelefono({
  nombre,
  clave,
  alCerrar,
  alTapar,
  cabecera,
  filo,
  saliendo,
  children,
}) {
  const ref = useRef(null)
  const inicio = useRef(null)
  const [bajada, setBajada] = useState(0)
  const [arrastrando, setArrastrando] = useState(false)

  useEffect(() => {
    const tarjeta = ref.current
    if (!tarjeta) return
    /* Se mide cuando el navegador ya maqueto la pagina por su cuenta: el
       primer aviso de un ResizeObserver llega justo despues de esa maqueta,
       y leer ahi no cuesta nada. Leerlo al montarse obligaba a maquetar la
       pagina entera a destiempo, mapa incluido: 90 ms de un toque a CPU x6.

       Con offsetTop y no con getBoundingClientRect: al montarse la tarjeta
       esta entrando desde abajo con un transform, y el rectangulo medido
       saldria mas bajo de donde se va a quedar. offsetTop no ve el
       transform: es el sitio final. */
    const observador = new ResizeObserver(() => {
      observador.disconnect()
      const lienzo = tarjeta.offsetParent
      if (lienzo) alTapar?.(lienzo.clientHeight - tarjeta.offsetTop)
    })
    observador.observe(tarjeta)
    return () => observador.disconnect()
    // Una vez por materia: lo que importa es donde queda al abrirse
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave])

  const empezar = (e) => {
    if (e.target.closest('button')) return
    inicio.current = { y: e.clientY, t: performance.now() }
    e.currentTarget.setPointerCapture?.(e.pointerId)
    setArrastrando(true)
  }
  const mover = (e) => {
    if (!inicio.current) return
    setBajada(Math.max(0, e.clientY - inicio.current.y))
  }
  const soltar = (e) => {
    if (!inicio.current) return
    const distancia = Math.max(0, e.clientY - inicio.current.y)
    const velocidad = distancia / Math.max(1, performance.now() - inicio.current.t)
    inicio.current = null
    setArrastrando(false)
    if (distancia > CIERRE_DISTANCIA || velocidad > CIERRE_VELOCIDAD) alCerrar()
    else setBajada(0)
  }

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={nombre}
      className={`hoja-ficha absolute inset-x-3 z-30 flex flex-col overflow-hidden rounded-[16px] border border-panel-borde bg-panel shadow-2xl ${
        saliendo ? 'tarjeta-saliendo pointer-events-none' : ''
      }`}
      style={{
        bottom: 'var(--reserva-barra, 0px)',
        maxHeight: 'min(66%, calc(100% - var(--reserva-barra, 0px) - 64px))',
        transform: bajada ? `translateY(${bajada}px)` : undefined,
        opacity: bajada ? Math.max(0.4, 1 - bajada / 320) : undefined,
        transition: arrastrando
          ? 'none'
          : 'transform 240ms cubic-bezier(0.32, 0.72, 0, 1), opacity 240ms ease',
      }}
    >
      <div
        className="shrink-0 touch-none"
        onPointerDown={empezar}
        onPointerMove={mover}
        onPointerUp={soltar}
        onPointerCancel={soltar}
      >
        <span aria-hidden="true" className="ficha-filo" style={{ '--filo': filo }} />
        {/* El asa dice "esto se arrastra" con la unica señal que ya conoce
            cualquiera que use un telefono. */}
        <span
          aria-hidden="true"
          className="mx-auto mt-2.5 block h-[5px] w-10 rounded-full bg-[color-mix(in_oklab,var(--tinta)_16%,transparent)]"
        />
        {cabecera}
      </div>
      {children}
    </div>
  )
}
