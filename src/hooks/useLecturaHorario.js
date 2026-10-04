import { useEffect, useState } from 'react'
import {
  FalloLectura,
  comoFallo,
  esFiable,
  leerHorarioDeImagen,
  leerHorarioEnElAparato,
  prepararImagen,
  valeElBorrador,
} from '../data/leerHorario.js'
import { revisar } from '../layout/importarHorario.js'

export const FASE = {
  LEYENDO: 'leyendo',
  /* Hay cola en el lector: se espera y se vuelve sin que nadie pulse nada */
  ESPERANDO: 'esperando',
  REVISAR: 'revisar',
  ERROR: 'error',
}

/* Cuantas veces se espera y se vuelve a intentar sola antes de rendirse. El
   lector gratuito atiende unas veinte lecturas por minuto y por modelo: en el
   rato de mas gente, la segunda o la tercera vuelta entra casi siempre. Mas
   seria tener a alguien cinco minutos delante de una cuenta atras. */
const VUELTAS_SOLAS = 3

/* Un margen al azar sobre lo que dice el servidor. A todos los que esperan
   les dice el mismo numero, y volviendo todos en el mismo segundo se
   volverian a atascar entre ellos. */
const MARGEN_MS = 3000

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

/**
 * La lectura de un horario, de la imagen a las filas por revisar.
 *
 * Son dos pasos y por eso dos efectos. Preparar la imagen -reducirla y
 * pasarla a JPEG- se hace una vez por archivo. Leerla se repite: cuando el
 * lector tiene cola se espera y se vuelve con LA MISMA imagen ya preparada, y
 * lo mismo si alguien pulsa reintentar. Con un solo efecto, cada vuelta
 * volvia a decodificar y comprimir una foto de varios megas.
 *
 * Leer tiene a su vez dos sitios, y en este orden: el propio aparato, que es
 * gratis y no tiene cupo pero solo entiende la captura del sistema de la
 * universidad, y el servidor, que entiende cualquier foto pero atiende unas
 * veinte al dia. Si el aparato lee sin dudas, al servidor no se le llama.
 *
 * @returns {{
 *   fase: string, fallo: Error|undefined,
 *   espera: { hasta: number, plazo: number }|undefined,
 *   imagen: object|null, candidatas: object[], setCandidatas: Function,
 *   reintentar: Function,
 * }}  `espera` es la cola: el instante en que termina y los milisegundos que dura
 */
export function useLecturaHorario({ archivo, materias, sesiones }) {
  const [imagen, setImagen] = useState(null)
  const [estado, setEstado] = useState({ fase: FASE.LEYENDO })
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
    setEstado({ fase: FASE.LEYENDO })

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

    const revisarFilas = (filas) => {
      setCandidatas(revisar(filas, materias, sesiones))
      setEstado({ fase: FASE.REVISAR })
    }

    ;(async () => {
      setEstado({ fase: FASE.LEYENDO })

      const enElAparato = await leerHorarioEnElAparato({
        archivo,
        materias,
        senal: control.signal,
      })
      if (cortado()) return
      if (esFiable(enElAparato)) return revisarFilas(enElAparato.clases)

      for (let vuelta = 0; ; vuelta++) {
        try {
          const filas = await leerHorarioDeImagen({
            base64: imagen.base64,
            tipo: imagen.tipo,
            materias: materias.map((m) => ({ codigo: m.codigo, nombre: m.nombre })),
            senal: control.signal,
          })
          if (cortado()) return
          /* Sin ninguna clase no hay nada que revisar: es un fallo de la
             foto, y se cuenta como los demas. */
          if (!filas.length) throw new FalloLectura('sin-clases')
          return revisarFilas(filas)
        } catch (error) {
          if (cortado()) return
          const fallo = comoFallo(error)
          /* Lo que dijo el servidor no se le enseña al estudiante, pero quien
             venga a arreglarlo lo necesita. */
          if (fallo.tecnico) console.warn(`[lector] ${fallo.codigo} · ${fallo.tecnico}`)

          if (fallo.espera == null || vuelta >= VUELTAS_SOLAS) {
            /* El servidor no pudo -casi siempre, el cupo del dia- pero el
               aparato habia sacado algo: mejor un borrador que revisar que
               un "vuelve mañana". Lo que le falte sale marcado. */
            if (valeElBorrador(enElAparato, fallo)) return revisarFilas(enElAparato.clases)
            setEstado({ fase: FASE.ERROR, fallo })
            return
          }
          const plazo = fallo.espera * 1000 + Math.random() * MARGEN_MS
          setEstado({ fase: FASE.ESPERANDO, espera: { hasta: Date.now() + plazo, plazo } })
          await dormir(plazo, control.signal)
          if (cortado()) return
          setEstado({ fase: FASE.LEYENDO })
        }
      }
    })()

    return () => control.abort()
    /* Solo la imagen y el intento. `archivo` cambia siempre antes que la
       imagen -es de donde sale-. `materias` y `sesiones` se calculan con
       useMemo arriba pero cambian de identidad si la carrera se repinta, y
       volver a llamar a la lectura por eso costaria otra peticion -y otro
       trozo de cupo- por nada. */
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
