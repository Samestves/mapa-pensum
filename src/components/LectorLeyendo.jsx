import { X } from 'lucide-react'
import { MOTOR, PORQUE } from '../hooks/useLecturaHorario'
import MotorLector from './MotorLector'

const mayuscula = (texto) => texto[0].toUpperCase() + texto.slice(1)

/* Lo que se dice en cada paso del lector del aparato (ver leerEnElAparato en
   data/lectorLocal.js). Cada uno dice que esta pasando y por que tarda: un
   "leyendo" fijo durante un minuto de bajada parece colgado. */
const PASOS = {
  preparando: { titulo: 'Preparando la imagen', detalle: () => 'Un momento.' },
  bajando: {
    titulo: 'Bajando el lector',
    detalle: () => 'Solo esta vez: después lee sin internet.',
  },
  arrancando: { titulo: 'Preparando el lector', detalle: () => 'Un momento.' },
  /* El mismo paso cuando tesseract tiene que bajarse el lector por su cuenta
     (ver leerEnElAparato): tarda mas, y sin contar cuanto */
  arrancandoConBajada: {
    titulo: 'Preparando el lector',
    detalle: () => 'La primera vez tarda más: también se baja el lector.',
  },
  leyendo: {
    titulo: 'Buscando tus clases',
    detalle: (aparato) => `Tu imagen no sale de ${aparato}.`,
  },
  acercando: {
    titulo: 'Mirando más de cerca',
    detalle: () => 'La letra es pequeña: la leo otra vez, más grande.',
  },
  repasando: {
    titulo: 'Repasando detalles',
    detalle: () => 'Días, secciones y aulas que se escaparon.',
  },
  /* Un repaso que no es un detalle: un bloque entero que la primera lectura
     se salto (ver bloquesSinLeer en layout/rejillaHorario.js) */
  bloques: {
    titulo: 'Leyendo bloque por bloque',
    detalle: () => 'Algunas clases no se vieron a la primera.',
  },
}

function pasoDe(avance) {
  if (avance?.paso === 'repasando' && avance.motivo === 'bloque') return PASOS.bloques
  if (avance?.paso === 'arrancando' && avance.conBajada) return PASOS.arrancandoConBajada
  return PASOS[avance?.paso]
}

/* Y cuando lee la IA, por que es ella: que la lectura cambie de sitio a
   media espera sin explicarlo parece un fallo. */
const CON_IA = {
  [PORQUE.CONFIRMAR]: {
    titulo: 'Confirmando tus clases',
    detalle: () => 'La IA mira lo que no quedó claro.',
  },
  [PORQUE.FORMATO]: {
    titulo: 'Buscando tus clases',
    detalle: () => 'No parece la captura del sistema, así que la lee la IA.',
  },
  [PORQUE.FALLO]: {
    titulo: 'Buscando tus clases',
    detalle: (aparato) => `${mayuscula(aparato)} no pudo leerla, así que la lee la IA.`,
  },
}

/* Cuanto va el paso, de 0 a 1, o null si no se sabe */
function progresoDe(avance) {
  if (avance?.paso === 'repasando') return avance.total ? avance.hechos / avance.total : null
  return Number.isFinite(avance?.progreso) ? avance.progreso : null
}

/* Una raya fina con lo que va del paso. Cuando no se sabe -la IA no lo
   dice-, un trozo va y viene: algo se mueve, pero no se promete cuanto
   falta. */
function Avance({ valor }) {
  const sabido = valor != null
  const tanto = sabido ? Math.round(valor * 100) : null
  return (
    <div className="flex w-full max-w-[320px] items-center gap-3">
      <div
        className="lector-progreso"
        role="progressbar"
        aria-label="Avance de la lectura"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={tanto ?? undefined}
        data-indeterminado={sabido ? undefined : ''}
      >
        <span
          className="lector-progreso-relleno"
          style={sabido ? { transform: `scaleX(${valor})` } : undefined}
        />
      </div>
      <span className="w-10 shrink-0 text-right text-[12px] text-tinta-tenue tabular-nums">
        {sabido ? `${tanto} %` : ''}
      </span>
    </div>
  )
}

/**
 * El lector mientras lee: la imagen es la hoja.
 *
 * Durante esos segundos no hay nada que decidir ni que tocar, asi que se
 * enseña lo unico que importa -la foto que se subio, para comprobar de un
 * vistazo que es la buena- y una linea que la recorre. Debajo, a la
 * izquierda y sin caja: quien lee (ver MotorLector), que esta haciendo y
 * cuanto lleva.
 *
 * La foto va a todo el ancho y con su proporcion, y la hoja mide lo que mida
 * ella: una captura apaisada da una hoja baja; una foto en vertical se corta
 * a media pantalla.
 *
 * El texto NO se monta sobre la foto. Antes lo hacia, con un velo que la
 * fundia con la hoja, y ese velo se comia la mitad de abajo de una captura
 * apaisada -que en un telefono mide unos 180 px- y con ella la linea: parecia
 * que el barrido empezaba a media foto. La linea tiene que verse recorrerla
 * entera, asi que la foto acaba donde acaba y el texto empieza despues.
 *
 * Antes de que la imagen este lista -reducirla tarda un instante en un
 * telefono modesto- su hueco ya esta ahi, para que la hoja no de un salto
 * cuando llegue.
 *
 * @param {object} props
 * @param {string} props.motor  quien lee: uno de MOTOR
 * @param {object} [props.avance]  por donde va el aparato, si lee el
 * @param {string} [props.porQue]  por que lee la IA, si lee ella: uno de PORQUE
 */
function LectorLeyendo({ imagen, motor, avance, porQue, telefono, alCancelar }) {
  const ia = motor === MOTOR.IA
  const { titulo, detalle } = (ia ? CON_IA[porQue] : pasoDe(avance)) ?? PASOS.arrancando
  const aparato = telefono ? 'tu teléfono' : 'tu equipo'

  return (
    <div className="lector-cara relative">
      <div className="lector-foto relative max-h-[52dvh] min-h-[168px] overflow-hidden bg-panel-suave md:max-h-[46vh]">
        {imagen && (
          <>
            <img src={imagen.vistaPrevia} alt="El horario que subiste" className="block w-full" />
            <span aria-hidden="true" className="lector-barrido" />
          </>
        )}
      </div>

      <button
        type="button"
        onClick={alCancelar}
        aria-label="Cerrar"
        className="absolute top-3 right-3 z-10 grid size-8 place-items-center rounded-full bg-[color-mix(in_oklab,var(--panel)_72%,transparent)] text-tinta transition-colors hover:bg-panel"
      >
        <X size={16} strokeWidth={1.5} />
      </button>

      <div className="lector-lineas flex flex-col items-start gap-3 px-5 pt-6 pb-5 sm:px-7 sm:pb-6">
        {/* La key la vuelve a montar al cambiar de motor: entra de nuevo, y
            ese relevo es justo lo que tiene que verse */}
        <MotorLector key={motor} motor={motor} telefono={telefono} />

        <div role="status" className="flex flex-col gap-1.5">
          <h2
            key={titulo}
            className="lector-relevo font-ui text-[28px] leading-[1.12] font-light tracking-[-0.012em] text-tinta"
          >
            {titulo}
          </h2>
          <p className="text-[13px] leading-normal text-tinta-suave">{detalle(aparato)}</p>
        </div>

        {/* Una por paso: si no, al pasar de un paso lleno al siguiente la raya
            se vaciaria hacia atras */}
        <Avance key={ia ? porQue : avance?.paso} valor={ia ? null : progresoDe(avance)} />

        <button
          type="button"
          onClick={alCancelar}
          className="-mt-1 py-1.5 text-[13.5px] font-medium text-tinta-tenue transition-colors hover:text-tinta"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}

export default LectorLeyendo
