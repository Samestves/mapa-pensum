import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import { APAGADO_MS, FIJA_MS, esToque, mantenerRuta } from '../layout/mantenerRuta'

/* Un toque corto de motor al fijarse: lo que en el telefono dice "ya" sin
   mirar la pantalla. Navegadores sin vibracion -iPhone- lo ignoran. */
const vibrar = () => {
  try {
    navigator.vibrate?.(10)
  } catch {
    // Sin permiso para vibrar: el contorno ya lo dice
  }
}

/**
 * Mantener el dedo en una tarjeta para fijar su ruta. La decision vive en
 * layout/mantenerRuta.js; aqui van el reloj, la vibracion y los eventos.
 *
 * Devuelve:
 *  - carga: la pulsacion en curso, para dibujar su contorno (o null)
 *  - manejadores: para el mismo elemento que ya lleva el arrastre del mapa
 *  - tragarToque(): true si el click que llega es el final de un mantener
 *    -cumplido o a medias- y no un toque. Al levantar el dedo el navegador
 *    manda el click de siempre, y ese click abriria la ficha.
 *
 * Solo el dedo: con raton la ruta ya se enciende al pasar por encima.
 */
export function useMantenerRuta(alFijar) {
  const [carga, despachar] = useReducer(mantenerRuta, null)
  // La pulsacion en curso, para los manejadores, que no cambian de identidad
  const cargaRef = useRef(null)

  /* Un evento solo llega a React si cambia algo.

     Despachar en un useReducer vuelve a ejecutar el componente aunque el
     estado salga igual, y aqui los eventos son los movimientos del dedo: cada
     pointermove de un arrastre -y los dos de cada cuadro de un pellizco-
     re-ejecutaba GrafoPensum entero para nada.

     El reducer es una funcion pura, asi que se le pregunta antes: si
     devuelve el mismo estado, no hay nada que contar. La ref va al dia en el
     acto, sin esperar al render, para que el evento siguiente se decida
     sobre lo que ya se despacho. */
  const enviar = useCallback((evento) => {
    const siguiente = mantenerRuta(cargaRef.current, evento)
    if (siguiente === cargaRef.current) return
    cargaRef.current = siguiente
    despachar(evento)
  }, [])
  const dedos = useRef(new Set())
  const tragar = useRef(false)
  const alFijarRef = useRef(alFijar)
  useEffect(() => {
    alFijarRef.current = alFijar
  })

  /* El reloj de cada fase. Va atado a la pulsacion: una nueva -otra
     tarjeta, otro dedo- cambia `carga` y el efecto cancela el reloj viejo. */
  useEffect(() => {
    if (carga?.fase === 'cargando') {
      const reloj = setTimeout(() => {
        tragar.current = true
        alFijarRef.current(carga.codigo)
        vibrar()
        enviar({ tipo: 'cumple' })
      }, FIJA_MS)
      return () => clearTimeout(reloj)
    }
    if (carga?.fase === 'hecha') {
      const reloj = setTimeout(() => enviar({ tipo: 'apaga' }), APAGADO_MS)
      return () => clearTimeout(reloj)
    }
  }, [carga, enviar])

  const manejadores = useMemo(() => {
    const deDedo = (e) => e.pointerType === 'touch'
    return {
      onPointerDown(e) {
        if (!deDedo(e)) return
        dedos.current.add(e.pointerId)
        // Una pulsacion nueva: el click que llegue ya no es el de la anterior
        tragar.current = false
        enviar({
          tipo: 'apoya',
          dedo: e.pointerId,
          x: e.clientX,
          y: e.clientY,
          t: e.timeStamp,
          codigo: e.target.closest?.('[data-codigo]')?.dataset.codigo ?? null,
          dedos: dedos.current.size,
        })
      },
      onPointerMove(e) {
        if (deDedo(e)) enviar({ tipo: 'mueve', dedo: e.pointerId, x: e.clientX, y: e.clientY })
      },
      onPointerUp(e) {
        if (!deDedo(e)) return
        dedos.current.delete(e.pointerId)
        if (!esToque(cargaRef.current, e.timeStamp)) tragar.current = true
        enviar({ tipo: 'suelta', dedo: e.pointerId })
      },
      onPointerCancel(e) {
        if (!deDedo(e)) return
        dedos.current.delete(e.pointerId)
        enviar({ tipo: 'suelta', dedo: e.pointerId })
      },
      /* Mantener el dedo es tambien lo que abre el menu contextual del
         navegador. Con un dedo apoyado, o recien fijada una ruta, no. Se
         mira el dedo y no el tipo de puntero del evento porque Firefox no
         lo trae; el clic derecho del raton sigue funcionando. */
      onContextMenu(e) {
        if (dedos.current.size > 0 || tragar.current) e.preventDefault()
      },
    }
  }, [enviar])

  const tragarToque = useCallback(() => {
    const era = tragar.current
    tragar.current = false
    return era
  }, [])

  return { carga, manejadores, tragarToque }
}
