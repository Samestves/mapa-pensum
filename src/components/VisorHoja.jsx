import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Minus, Plus, Scan } from 'lucide-react'
import { relojAplazable } from '../layout/relojAplazable'
import { ESCALA_MAX, acotarVisor, estaAjustada, vistaDeAjuste, zoomEnPunto } from '../layout/visor'

/* Lo que acerca o aleja cada pulsacion de los botones, y la rueda por cada
   pixel que gira: la misma constante que el mapa, para que la rueda se sienta
   igual en los dos sitios. El pellizco del trackpad llega como una rueda con
   Ctrl y pasos mucho mas pequeños, y se compensa. */
const PASO_BOTON = 1.4
const ZOOM_POR_PIXEL = 0.0015
const PELLIZCO_TRACKPAD = 6

/* Lo que tarda la hoja quieta en volver a pintarse nitida (ver .moviendose en
   estilos/plan-ruta.css), y lo que dura el viaje de un boton. */
const REPOSO_MS = 160
const VIAJE_MS = 260
/* Cada cuanto se pone al dia la cifra del mando mientras la hoja se mueve.
   Cambiar un texto es maquetarlo y pintarlo: en cada cuadro costaba 4 ms de
   los 16 que hay (CPU x4), y diez veces por segundo se sigue leyendo como
   una cifra que corre. Al reposar queda la exacta. */
const CIFRA_MS = 100

const BOTON =
  'grid size-9 place-items-center rounded-full text-tinta-suave transition-[background-color,color,opacity] duration-150 hover:bg-tinta/[0.08] hover:text-tinta disabled:pointer-events-none disabled:opacity-30'

const porcentajeDe = (escala) => `${Math.round(escala * 100)}%`

/**
 * La hoja de Tu ruta, para mirarla de cerca: se acerca con la rueda o
 * pellizcando, se arrastra para recorrerla y vuelve entera con un boton.
 * Abre con la hoja entera, que es como se revisa una pagina.
 *
 * Funciona como el mapa, y por lo mismo: mientras se mueve, la hoja ya
 * pintada se estira en la GPU, y cuando se queda quieta se pinta de verdad a
 * su tamaño, con las letras nitidas.
 *
 * Mover no pasa por React. En cada cuadro se escribe el transform de la hoja
 * y nada mas; la cifra del mando se pone al dia unas pocas veces por segundo,
 * y React se entera cuando la hoja reposa: ahi se apagan los botones que
 * toque y cambia el cursor. Pasando cada cuadro por el estado, el mando
 * entero se volvia a maquetar y a pintar sesenta veces por segundo.
 *
 * `ancho` y `alto` son lo que mide la hoja a tamaño de papel.
 */
export default function VisorHoja({ ancho, alto, children }) {
  const refPanel = useRef(null)
  const refHoja = useRef(null)
  const refCifra = useRef(null)
  const cifraPuesta = useRef(0)
  // Lo que mide el panel y donde esta en pantalla, medido una vez por gesto
  const panel = useRef({ ancho: 0, alto: 0, izq: 0, arr: 0 })
  const vista = useRef({ x: 0, y: 0, escala: 1 })
  /* Lo que React sabe de la vista: lo justo para el mando, y solo en reposo */
  const [lectura, setLectura] = useState({ escala: 1, ajustada: true })

  const hoja = { ancho, alto }

  /* La hoja lleva su propia capa de GPU solo mientras se mueve. Quieta no:
     sin capa, el navegador la pinta al tamaño al que se ve y el texto sale
     nitido a cualquier zoom. */
  const reposar = useRef(null)
  useEffect(() => {
    reposar.current = () => {
      refHoja.current?.classList.remove('moviendose', 'suave')
      const { escala } = vista.current
      refCifra.current.firstChild.nodeValue = porcentajeDe(escala)
      const ajustada = estaAjustada(vista.current, panel.current, hoja)
      setLectura((l) => (l.escala === escala && l.ajustada === ajustada ? l : { escala, ajustada }))
    }
  })
  const [reposo] = useState(() => relojAplazable(REPOSO_MS, () => reposar.current()))
  useEffect(() => () => reposo.cancelar(), [reposo])

  const medirPanel = () => {
    const caja = refPanel.current.getBoundingClientRect()
    panel.current = { ancho: caja.width, alto: caja.height, izq: caja.left, arr: caja.top }
  }
  /* Donde esta el panel solo cambia al cambiar la ventana, pero medirlo
     obliga al navegador a ponerlo todo al dia: una vez al empezar a mover la
     hoja, no en cada cuadro. */
  const empezarGesto = () => {
    if (!refHoja.current.classList.contains('moviendose')) medirPanel()
  }

  const mover = (siguiente, suave = false) => {
    const v = acotarVisor(siguiente, panel.current, hoja)
    vista.current = v
    const el = refHoja.current
    el.classList.add('moviendose')
    el.classList.toggle('suave', suave)
    el.style.transform = `translate(${v.x}px, ${v.y}px) scale(${v.escala})`
    reposo.aplazar()

    const ahora = performance.now()
    if (ahora - cifraPuesta.current < CIFRA_MS) return
    cifraPuesta.current = ahora
    // El mismo nodo de texto que puso React, para que lo siga encontrando
    refCifra.current.firstChild.nodeValue = porcentajeDe(v.escala)
  }

  /* El panel se mide solo. Si la hoja estaba entera, sigue entera al cambiar
     el tamaño de la ventana; si estaba acercada, se queda donde estaba. */
  useLayoutEffect(() => {
    const medir = () => {
      const estabaAjustada =
        !panel.current.ancho || estaAjustada(vista.current, panel.current, hoja)
      medirPanel()
      mover(estabaAjustada ? vistaDeAjuste(panel.current, hoja) : vista.current)
    }
    medir()
    const observador = new ResizeObserver(medir)
    observador.observe(refPanel.current)
    return () => observador.disconnect()
    // La hoja mide siempre lo mismo: solo hay que volver a medir el panel
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ancho, alto])

  const zoom = (factor, px, py, suave) =>
    mover(zoomEnPunto(vista.current, factor, px, py, panel.current, hoja), suave)
  const zoomAlCentro = (factor) => {
    empezarGesto()
    zoom(factor, panel.current.ancho / 2, panel.current.alto / 2, true)
  }
  const verEntera = () => {
    empezarGesto()
    mover(vistaDeAjuste(panel.current, hoja), true)
  }

  /* La rueda, a mano: React la registra como pasiva y ahi no se puede
     impedir que desplace la pagina. Una vez por cuadro, como en el mapa. */
  const rodar = useRef(null)
  useEffect(() => {
    rodar.current = (paso, x, y) => {
      empezarGesto()
      zoom(Math.exp(-paso * ZOOM_POR_PIXEL), x - panel.current.izq, y - panel.current.arr)
    }
  })
  useEffect(() => {
    const el = refPanel.current
    let acumulado = 0
    let cuadro = 0
    let puntero = { x: 0, y: 0 }
    const alRodar = (e) => {
      e.preventDefault()
      acumulado += e.deltaY * (e.ctrlKey ? PELLIZCO_TRACKPAD : 1)
      puntero = { x: e.clientX, y: e.clientY }
      if (cuadro) return
      cuadro = requestAnimationFrame(() => {
        cuadro = 0
        const paso = acumulado
        acumulado = 0
        rodar.current(paso, puntero.x, puntero.y)
      })
    }
    el.addEventListener('wheel', alRodar, { passive: false })
    return () => {
      el.removeEventListener('wheel', alRodar)
      cancelAnimationFrame(cuadro)
    }
  }, [])

  /* Un puntero arrastra; dos pellizcan. */
  const punteros = useRef(new Map())
  const arrastre = useRef(null)
  const pellizco = useRef(null)

  const medirPellizco = () => {
    const [a, b] = [...punteros.current.values()]
    return {
      distancia: Math.hypot(a.x - b.x, a.y - b.y),
      x: (a.x + b.x) / 2 - panel.current.izq,
      y: (a.y + b.y) / 2 - panel.current.arr,
    }
  }

  const alPresionar = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    empezarGesto()
    e.currentTarget.setPointerCapture(e.pointerId)
    punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (punteros.current.size === 2) {
      arrastre.current = null
      pellizco.current = medirPellizco()
    } else {
      const v = vista.current
      arrastre.current = { x: e.clientX, y: e.clientY, vx: v.x, vy: v.y }
    }
  }

  const alMover = (e) => {
    if (!punteros.current.has(e.pointerId)) return
    punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (pellizco.current && punteros.current.size >= 2) {
      const ahora = medirPellizco()
      if (pellizco.current.distancia > 0) {
        zoom(ahora.distancia / pellizco.current.distancia, ahora.x, ahora.y)
      }
      pellizco.current = ahora
      return
    }

    const inicio = arrastre.current
    if (!inicio) return
    const dx = e.clientX - inicio.x
    const dy = e.clientY - inicio.y
    // Un clic no es un arrastre: sin moverse no hay nada que mover
    if (!dx && !dy) return
    mover({ ...vista.current, x: inicio.vx + dx, y: inicio.vy + dy })
  }

  const alSoltar = (e) => {
    punteros.current.delete(e.pointerId)
    // Al levantar un dedo del pellizco no se sigue arrastrando con el otro
    pellizco.current = null
    arrastre.current = null
  }

  /* Doble clic: de la hoja entera a su tamaño de papel donde se pulso, y de
     cualquier otra vista, de vuelta a la hoja entera. */
  const alDobleClic = (e) => {
    empezarGesto()
    if (!estaAjustada(vista.current, panel.current, hoja)) {
      mover(vistaDeAjuste(panel.current, hoja), true)
      return
    }
    const { izq, arr } = panel.current
    zoom(1 / vista.current.escala, e.clientX - izq, e.clientY - arr, true)
  }

  const alTeclear = (e) => {
    if (e.key === '+' || e.key === '=') zoomAlCentro(PASO_BOTON)
    else if (e.key === '-') zoomAlCentro(1 / PASO_BOTON)
    else if (e.key === '0') verEntera()
    else return
    e.preventDefault()
  }

  return (
    <div
      ref={refPanel}
      role="group"
      aria-label="La hoja de tu ruta. Rueda o pellizco para acercar, arrastrar para mover."
      tabIndex={0}
      data-acercada={lectura.ajustada ? undefined : ''}
      className="visor-hoja relative min-w-0 flex-1 overflow-hidden bg-lienzo outline-none"
      style={{ '--viaje': `${VIAJE_MS}ms` }}
      onPointerDown={alPresionar}
      onPointerMove={alMover}
      onPointerUp={alSoltar}
      onPointerCancel={alSoltar}
      onDoubleClick={alDobleClic}
      onKeyDown={alTeclear}
    >
      <div
        ref={refHoja}
        className="hoja-visor absolute top-0 left-0 origin-top-left overflow-hidden rounded-md shadow-2xl"
      >
        {children}
      </div>

      {/* El mando: encima de la hoja y abajo, como el de un visor de fotos.
          Opaco, y no de cristal como las islas: debajo le pasa una hoja
          blanca, y el cristal se quedaba sin contraste -ademas de desenfocar
          en cada cuadro algo que se mueve-. No arranca arrastres ni cuenta
          como doble clic. */}
      <div
        className="absolute bottom-5 left-1/2 flex h-11 -translate-x-1/2 items-center gap-0.5 rounded-full border border-panel-borde bg-panel px-1 shadow-[0_10px_30px_-10px_rgb(0_0_0/0.55)]"
        onPointerDown={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className={BOTON}
          aria-label="Alejar"
          title="Alejar"
          disabled={lectura.ajustada}
          onClick={() => zoomAlCentro(1 / PASO_BOTON)}
        >
          <Minus size={16} strokeWidth={2} />
        </button>
        {/* La cifra cambia en cada cuadro de un zoom: de tamaño fijo y
            contenida, para que cambiarla no vuelva a maquetar el mando. */}
        <button
          ref={refCifra}
          type="button"
          className="cifra-visor h-9 w-[52px] rounded-full text-[12.5px] font-medium text-tinta tabular-nums transition-colors duration-150 hover:bg-tinta/[0.08]"
          aria-label="Ver la hoja a tamaño real"
          title="Tamaño real"
          onClick={() => zoomAlCentro(1 / vista.current.escala)}
        >
          {porcentajeDe(lectura.escala)}
        </button>
        <button
          type="button"
          className={BOTON}
          aria-label="Acercar"
          title="Acercar"
          disabled={lectura.escala >= ESCALA_MAX}
          onClick={() => zoomAlCentro(PASO_BOTON)}
        >
          <Plus size={16} strokeWidth={2} />
        </button>
        <span aria-hidden="true" className="mx-1 h-5 w-px bg-tinta/[0.12]" />
        <button
          type="button"
          className={BOTON}
          aria-label="Ver la hoja entera"
          title="Ver la hoja entera"
          disabled={lectura.ajustada}
          onClick={verEntera}
        >
          <Scan size={16} strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}
