import { useCallback, useEffect, useState } from 'react'
import { guardarJSON, leer, leerJSON } from '../data/almacen'

const CLAVE = 'mapa-pensum:instalar-descartado'

/* Descartar no dura siempre ni dura lo mismo cada vez: se espacia.

   Un solo toque en la X no quiere decir "no me interesa", casi siempre quiere
   decir "ahora no". Cobrarselo con un mes de silencio es pasarse; volver a
   preguntar al refrescar es acoso. La escalera dice lo que un plazo fijo no
   sabe decir: la PRIMERA negativa apenas cuenta, la tercera ya es una
   respuesta.

   Tres dias, dos semanas, tres meses. A la tercera se deja de insistir en la
   practica: quien ha cerrado el aviso tres veces ya dijo que no. */
const ESPERA = [3, 14, 90].map((dias) => dias * 24 * 60 * 60 * 1000)

/**
 * Lo guardado, en el formato que sea. Hubo tres:
 * el 'si' original sin fecha, el sello de tiempo suelto, y ahora {n, t}.
 * Los dos viejos se leen para no castigar a quien ya venia con algo puesto.
 */
function leerDescarte() {
  const crudo = leer(CLAVE)
  if (!crudo) return null
  if (crudo === 'si') return { n: 1, t: 0 } // sin fecha: caducado hace mucho
  const suelto = Number(crudo)
  if (Number.isFinite(suelto)) return { n: 1, t: suelto }
  return leerJSON(CLAVE, null)
}

const yaInstalada = () =>
  window.__instalada === true ||
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true

const esIOS = () =>
  /iphone|ipad|ipod/i.test(window.navigator.userAgent) ||
  // iPadOS 13+ miente y dice ser un Mac; se delata por el tactil
  (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1)

/**
 * Telefono o tableta contra ordenador.
 *
 * userAgentData.mobile es la respuesta buena y viene de serie justo donde
 * hace falta: beforeinstallprompt solo existe en navegadores Chromium, que
 * son los mismos que traen userAgentData. El puntero grueso queda de reserva.
 *
 * No vale mirar el ancho de la ventana: una ventana estrecha en un portatil
 * sigue siendo un portatil.
 */
/* Lo que espera en el PC antes de aparecer. Estuvo en 7 segundos y era
   demasiado: para entonces ya estas eligiendo carrera y el aviso llega a
   interrumpir algo empezado, que es peor que llegar pronto. Cuatro dan para
   ver de que va la pagina sin que te pille a media tarea. */
const ESPERA_PC = 4000

const esMovil = () => {
  if (window.navigator.userAgentData) return window.navigator.userAgentData.mobile === true
  return window.matchMedia('(pointer: coarse)').matches
}

function descartadoSigueVigente() {
  const d = leerDescarte()
  if (!d) return false
  const espera = ESPERA[Math.min(d.n, ESPERA.length) - 1]
  return Date.now() - d.t < espera
}

/* Escotilla para poder VER el aviso cuando toca comprobarlo.
   Sin esto no hay forma de revisarlo: en cuanto la aplicacion esta instalada
   -o se descarto una vez- el navegador deja de dar el evento y el aviso no
   se puede volver a sacar ni borrando datos, porque el bloqueo esta en el
   navegador y no en la pagina. Con ?instalar=forzar se dibuja igual. */
const forzado = () => new URLSearchParams(window.location.search).get('instalar') === 'forzar'

/**
 * Decide si ofrecer instalar la aplicacion, a quien, y como.
 *
 * Hay tres caminos porque ni los navegadores ni los aparatos se parecen:
 *
 *   movil       Chromium en telefono. Hay dialogo del sistema, y el
 *               argumento que importa es abrir sin datos.
 *   escritorio  Chromium en PC. Tambien hay dialogo, pero el argumento es
 *               otro: una ventana propia sin barra de navegador.
 *   ios         Safari no tiene beforeinstallprompt ni lo va a tener, asi
 *               que ahi solo se puede explicar el gesto manual.
 *
 * El evento NO se escucha aqui. Llega antes de que React monte, asi que lo
 * recoge un script del head y lo deja en window; esto solo lo consulta. Ver
 * el comentario de index.html, que es donde esta el porque.
 */
export function useInstalable() {
  const [evento, setEvento] = useState(null)
  const [modo, setModo] = useState(null)
  const [porque, setPorque] = useState(null)

  useEffect(() => {
    const fuerza = forzado()

    /* Lo que impide que salga, en orden. Se calcula siempre porque es lo que
       se enseña con ?instalar=forzar: sin esto, averiguar por que no aparece
       en el telefono de otro es imposible -no hay consola donde mirar-. */
    const estado = {
      instalada: yaInstalada(),
      descartada: descartadoSigueVigente(),
      veces: leerDescarte()?.n ?? 0,
      hayEvento: !!window.__instalable,
      ios: esIOS(),
      movil: esMovil(),
    }
    setPorque(estado)

    if (!fuerza && (estado.instalada || estado.descartada)) return

    let vigente = true
    let reloj

    /* En el PC espera mas. En el telefono guardar la aplicacion resuelve un
       problema real -abrirla sin datos-, asi que a los pocos segundos ya es
       util. En un PC es una comodidad, y una comodidad que interrumpe a los
       tres segundos de llegar molesta mas de lo que ofrece. */
    const mostrar = (cual, espera) => {
      clearTimeout(reloj)
      reloj = setTimeout(() => vigente && setModo(cual), espera)
    }

    const revisar = () => {
      if (!vigente) return
      if (!fuerza && yaInstalada()) {
        setEvento(null)
        setModo(null)
        return
      }
      const guardado = window.__instalable
      if (guardado) {
        setEvento(guardado)
        const movil = esMovil()
        mostrar(movil ? 'movil' : 'escritorio', movil ? 2600 : ESPERA_PC)
      }
    }

    // Lo que ya estuviera esperando desde antes de que montaramos
    revisar()
    // Y lo que llegue despues, si Chrome tardo mas que nosotros
    window.addEventListener('instalable', revisar)

    // En iPhone el evento no existe: se ofrece el camino manual
    if (!window.__instalable && esIOS()) mostrar('ios', 2600)

    /* Forzado y sin evento: se dibuja igualmente para poder mirarlo. Sin
       evento el boton no puede abrir el dialogo del sistema, y eso el aviso
       lo dice en vez de fingir que funciona. */
    if (fuerza && !window.__instalable && !esIOS()) {
      mostrar(esMovil() ? 'movil' : 'escritorio', 600)
    }

    return () => {
      vigente = false
      clearTimeout(reloj)
      window.removeEventListener('instalable', revisar)
    }
  }, [])

  const instalar = useCallback(async () => {
    if (!evento) return
    evento.prompt()
    await evento.userChoice
    /* El evento no se puede reutilizar. Se suelta tambien de window: si
       alguien cancela el dialogo, Chrome disparara otro cuando vuelva a
       tocar, y el viejo ya no sirve para nada. */
    window.__instalable = null
    setEvento(null)
    setModo(null)
  }, [evento])

  const descartar = useCallback(() => {
    // Cuenta las veces, no solo la ultima: es lo que hace la escalera
    const previo = leerDescarte()
    guardarJSON(CLAVE, { n: (previo?.n ?? 0) + 1, t: Date.now() })
    setModo(null)
  }, [])

  return { modo, instalar, descartar, porque, hayEvento: !!evento, forzado: forzado() }
}
