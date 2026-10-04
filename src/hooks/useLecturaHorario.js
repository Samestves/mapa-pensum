import { useEffect, useState } from 'react'
import {
  FalloLectura,
  VALOR,
  comoFallo,
  falloDeLosDos,
  leerHorarioDeImagen,
  leerHorarioEnElAparato,
  precalentarLector,
  prepararImagen,
  valorDe,
} from '../data/leerHorario.js'
import { revisar } from '../layout/importarHorario.js'

export const FASE = {
  LEYENDO: 'leyendo',
  /* Hay cola en la IA: se espera y se vuelve sin que nadie pulse nada */
  ESPERANDO: 'esperando',
  REVISAR: 'revisar',
  ERROR: 'error',
}

/* Quien lee: el propio aparato, con el OCR, o la IA del servidor */
export const MOTOR = { OCR: 'ocr', IA: 'ia' }

/* Por que se le pregunta a la IA. La pantalla lo dice: que la lectura cambie
   de sitio a media espera sin explicar por que parece un fallo. */
export const PORQUE = {
  /* El aparato leyo, pero con dudas: la IA confirma */
  CONFIRMAR: 'confirmar',
  /* El aparato leyo y no encontro la captura del sistema */
  FORMATO: 'formato',
  /* El aparato no pudo leer */
  FALLO: 'fallo',
}

/* Cuantas veces se espera y se vuelve a intentar sola antes de rendirse. La
   IA gratuita atiende unas veinte lecturas por minuto y por modelo: en el
   rato de mas gente, la segunda o la tercera vuelta entra casi siempre. Mas
   seria tener a alguien cinco minutos delante de una cuenta atras. */
const VUELTAS_SOLAS = 3

/* Un margen al azar sobre lo que dice el servidor. A todos los que esperan
   les dice el mismo numero, y volviendo todos en el mismo segundo se
   volverian a atascar entre ellos. */
const MARGEN_MS = 3000

/* Lo que se espera a la IA cuando solo confirma un borrador del aparato. El
   borrador ya es una respuesta: no se tiene a nadie un minuto mirando la
   pantalla para mejorar algo que ya puede revisar. */
const PLAZO_PARA_CONFIRMAR_MS = 25000

/* Una espera que se corta si se cierra la pantalla */
const dormir = (ms, senal) =>
  new Promise((listo) => {
    const reloj = setTimeout(listo, ms)
    senal.addEventListener(
      'abort',
      () => {
        clearTimeout(reloj)
        listo()
      },
      { once: true },
    )
  })

/* Una señal que se corta con la de fuera o al pasar `ms` */
function conPlazo(senal, ms) {
  const control = new AbortController()
  const cortar = () => control.abort()
  const reloj = setTimeout(cortar, ms)
  senal.addEventListener('abort', cortar, { once: true })
  return {
    senal: control.signal,
    soltar: () => {
      clearTimeout(reloj)
      senal.removeEventListener('abort', cortar)
    },
  }
}

const avisarEnConsola = (fallo) => {
  // Lo que dijo quien fallo no se le enseña al estudiante, pero quien venga a arreglarlo lo necesita
  if (fallo.tecnico) console.warn(`[lector] ${fallo.codigo} · ${fallo.tecnico}`)
}

/**
 * La lectura de un horario, de la imagen a las filas por revisar.
 *
 * Son dos pasos y por eso dos efectos. Preparar la imagen -reducirla y
 * pasarla a JPEG- se hace una vez por archivo. Leerla se repite: cuando la IA
 * tiene cola se espera y se vuelve con LA MISMA imagen ya preparada, y lo
 * mismo si alguien pulsa reintentar. Con un solo efecto, cada vuelta volvia a
 * decodificar y comprimir una foto de varios megas.
 *
 * Leer tiene a su vez dos sitios, y en este orden: el propio aparato, que es
 * gratis y no tiene cupo pero solo entiende la captura del sistema de la
 * universidad, y la IA del servidor, que entiende cualquier foto pero atiende
 * pocas al dia y es de todos. Por eso a la IA solo se va cuando el aparato no
 * basta (ver VALOR en data/leerHorario.js): asi le queda cupo a quien de
 * verdad la necesita.
 *
 * @returns {{
 *   fase: string, motor: string, avance: object|undefined, porQue: string|undefined,
 *   dudas: string[]|undefined, fallo: Error|undefined,
 *   espera: { hasta: number, plazo: number }|undefined,
 *   imagen: object|null, candidatas: object[], setCandidatas: Function,
 *   reintentar: Function,
 * }}  `avance` es por donde va el aparato (ver leerEnElAparato en
 *   data/lectorLocal.js); `dudas`, las del aparato si lo que se revisa es suyo;
 *   `espera`, la cola: el instante en que termina y los milisegundos que dura
 */
export function useLecturaHorario({ archivo, materias, sesiones }) {
  const [imagen, setImagen] = useState(null)
  const [estado, setEstado] = useState({
    fase: FASE.LEYENDO,
    motor: MOTOR.OCR,
    avance: { paso: 'preparando' },
  })
  const [candidatas, setCandidatas] = useState([])
  /* Sube uno para volver a leer la misma imagen. Es una dependencia del
     efecto y nada mas. */
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    let vivo = true
    let preparada = null

    /* Se vuelve al principio en cada imagen. Elegir OTRA vez la misma foto da
       un File distinto con el mismo nombre, asi que el componente no se
       remonta y sin esto la pantalla se quedaria enseñando el error anterior
       mientras por detras vuelve a leer: parece que el boton no hizo nada. */
    setImagen(null)
    setCandidatas([])
    setEstado({ fase: FASE.LEYENDO, motor: MOTOR.OCR, avance: { paso: 'preparando' } })
    // El lector del aparato va llegando mientras se prepara la imagen
    precalentarLector()

    prepararImagen(archivo).then(
      (lista) => {
        // Llego tarde: ya se cambio de imagen o se cerro la pantalla
        if (!vivo) return lista.soltar()
        preparada = lista
        setImagen(lista)
      },
      (error) => vivo && setEstado({ fase: FASE.ERROR, fallo: comoFallo(error) }),
    )

    return () => {
      vivo = false
      preparada?.soltar()
    }
  }, [archivo])

  useEffect(() => {
    if (!imagen) return undefined
    const control = new AbortController()
    const cortado = () => control.signal.aborted

    const revisarFilas = (filas, motor, dudas = []) => {
      setCandidatas(revisar(filas, materias, sesiones))
      setEstado({ fase: FASE.REVISAR, motor, dudas })
    }

    const preguntarALaIA = (senal) =>
      leerHorarioDeImagen({
        base64: imagen.base64,
        tipo: imagen.tipo,
        materias: materias.map((m) => ({ codigo: m.codigo, nombre: m.nombre })),
        senal,
      })

    ;(async () => {
      /* Primero, en el aparato */
      const local = {}
      setEstado({ fase: FASE.LEYENDO, motor: MOTOR.OCR, avance: { paso: 'arrancando' } })
      try {
        local.leido = await leerHorarioEnElAparato({
          archivo,
          materias,
          senal: control.signal,
          alAvance: (avance) =>
            !cortado() && setEstado({ fase: FASE.LEYENDO, motor: MOTOR.OCR, avance }),
        })
      } catch (error) {
        if (cortado()) return
        local.fallo = comoFallo(error)
        avisarEnConsola(local.fallo)
      }
      if (cortado()) return

      const valor = valorDe(local.leido)
      if (valor === VALOR.LISTO) return revisarFilas(local.leido.clases, MOTOR.OCR)

      /* Un borrador se confirma con la IA una sola vez, sin hacer cola y con
         plazo. Si no sale, se revisa el borrador: lo que le falte sale
         marcado, y eso se arregla en dos toques; un "vuelve mañana" no. */
      if (valor === VALOR.BORRADOR) {
        setEstado({ fase: FASE.LEYENDO, motor: MOTOR.IA, porQue: PORQUE.CONFIRMAR })
        const plazo = conPlazo(control.signal, PLAZO_PARA_CONFIRMAR_MS)
        try {
          const filas = await preguntarALaIA(plazo.senal)
          if (cortado()) return
          if (filas.length) return revisarFilas(filas, MOTOR.IA)
        } catch (error) {
          if (cortado()) return
          avisarEnConsola(comoFallo(error))
        } finally {
          plazo.soltar()
        }
        return revisarFilas(local.leido.clases, MOTOR.OCR, local.leido.dudas)
      }

      /* Sin nada del aparato, la IA es lo unico que queda: aqui si se hace
         cola si hace falta */
      const porQue = local.fallo ? PORQUE.FALLO : PORQUE.FORMATO
      for (let vuelta = 0; ; vuelta++) {
        setEstado({ fase: FASE.LEYENDO, motor: MOTOR.IA, porQue })
        try {
          const filas = await preguntarALaIA(control.signal)
          if (cortado()) return
          /* Sin ninguna clase no hay nada que revisar: es un fallo de la
             foto, y se cuenta como los demas. */
          if (!filas.length) throw new FalloLectura('sin-clases')
          return revisarFilas(filas, MOTOR.IA)
        } catch (error) {
          if (cortado()) return
          const fallo = comoFallo(error)
          avisarEnConsola(fallo)

          if (fallo.espera == null || vuelta >= VUELTAS_SOLAS) {
            setEstado({ fase: FASE.ERROR, fallo: falloDeLosDos(local, fallo) })
            return
          }
          const plazo = fallo.espera * 1000 + Math.random() * MARGEN_MS
          setEstado({
            fase: FASE.ESPERANDO,
            motor: MOTOR.IA,
            espera: { hasta: Date.now() + plazo, plazo },
          })
          await dormir(plazo, control.signal)
          if (cortado()) return
        }
      }
    })()

    return () => control.abort()
    /* Solo la imagen y el intento. `archivo` cambia siempre antes que la
       imagen -es de donde sale-. `materias` y `sesiones` se calculan con
       useMemo arriba pero cambian de identidad si la carrera se repinta, y
       volver a leer por eso costaria otra lectura -y otro trozo de cupo- por
       nada. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imagen, intento])

  return {
    ...estado,
    imagen,
    candidatas,
    setCandidatas,
    reintentar: () => setIntento((n) => n + 1),
  }
}
