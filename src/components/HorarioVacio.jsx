import { useRef, useState } from 'react'
import { ImageIcon, Pencil } from 'lucide-react'
import { FORMATOS, precalentarLector } from '../data/leerHorario'
import { useConsulta } from '../hooks/useConsulta'
import DibujoCaptura from './DibujoCaptura'

/* Desde donde hay sitio para ver la captura y la semana a la vez, y la pantalla
   se reparte en dos columnas. Es el mismo corte que usa Horario para elegir
   entre la semana en rejilla y la agenda (y el breakpoint lg de Tailwind). */
const CABE_EL_PAR = '(min-width: 1024px)'

/* La silueta del sello, de lucide (badge-check): se rellena en vez de
   dibujarse con trazo, y el visto va encima del color del fondo. */
const SELLO =
  'M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z'

/**
 * El sello que separa el texto de las acciones: dice, sin ponerse a explicar
 * nada, que el lector esta hecho para ESTE horario y no para cualquier foto.
 * Va encima del boton lleno porque es lo que respalda la promesa de ese boton.
 *
 * Monocromo: el azul de esta app esta reservado para lo que se puede
 * inscribir, y un sello azul se leeria como un estado.
 *
 * En el telefono es una linea centrada con un hilo a cada lado; en escritorio,
 * donde las acciones son una columna a la derecha, va a la izquierda de ella y
 * el unico hilo sigue hasta el borde.
 */
function SelloIntradace() {
  return (
    <p className="mb-3.5 flex w-full items-center gap-3 font-ui text-[10.5px] font-medium tracking-[0.22em] text-tinta-suave uppercase [--hilo:color-mix(in_oklab,var(--tinta)_14%,transparent)] before:h-px before:flex-1 before:bg-(--hilo) after:h-px after:flex-1 after:bg-(--hilo) lg:before:hidden">
      {/* El -mr es el espacio que el tracking deja detras de la ultima letra:
          sin quitarlo la linea queda dos pixeles descentrada. */}
      <span className="-mr-[0.22em] inline-flex items-center gap-2">
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" className="shrink-0">
          <path
            d={SELLO}
            className="fill-tinta stroke-tinta"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="m9 12 2 2 4-4"
            fill="none"
            className="stroke-panel-suave"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span>
          Optimizado para <b className="font-medium text-tinta">INTRADACE</b>
        </span>
      </span>
    </p>
  )
}

/**
 * El horario cuando todavia no hay nada.
 *
 * Una rejilla vacia de toda la jornada por cinco dias no es una pantalla vacia
 * cualquiera: es una pantalla que PARECE terminada. No hay nada roto ni
 * ningun hueco evidente, asi que quien llega por primera vez no ve que le
 * toca a el, y lo que hace es irse. De ahi que esto tape la rejilla en vez de
 * ponerse encima con un cartelito: mientras no haya clases, la rejilla no
 * tiene nada que enseñar.
 *
 * Y de ahi tambien el dibujo, que es lo primero y lo mas grande: antes de leer
 * una palabra se ve que una captura de INTRADACE se vuelve una semana.
 *
 * Dos salidas y no una, porque son dos personas distintas. El que ya tiene su
 * horario en una captura quiere que se lo copien; el que todavia esta armando
 * la inscripcion quiere probar combinaciones. Ofrecer solo lo primero deja al
 * segundo sin sitio, y solo lo segundo condena al primero a teclear catorce
 * clases a mano.
 *
 * La captura es la accion llena porque resuelve el caso de casi todo el mundo
 * en un gesto; armarlo a mano va debajo como texto callado, sin caja: se ve,
 * pero no compite.
 *
 * Tiene que caber entera sin desplazarse, tambien en un telefono: una
 * pantalla de bienvenida con scroll esconde justo lo que viene a ofrecer.
 * Va en una columna estrecha y centrada, y en pantallas bajas encoge primero
 * el dibujo (ver .dibujo), nunca los botones. En escritorio son dos columnas:
 * el texto a la izquierda, y a la derecha lo que se hace.
 */
function HorarioVacio({ alSubir, alCrear }) {
  const refArchivo = useRef(null)
  const [encima, setEncima] = useState(false)
  const cabeElPar = useConsulta(CABE_EL_PAR)

  const elegir = (archivo) => {
    if (archivo) alSubir(archivo)
  }

  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-6 pt-[var(--reserva-cabecera)] pb-[var(--reserva-barra)]"
      /* Soltar la imagen encima funciona en toda la zona, no solo sobre el
         boton: en un escritorio, arrastrar la captura desde el escritorio a
         "por ahi en medio" es el gesto natural, y obligar a acertar un
         rectangulo de trescientos pixeles solo sirve para fallar. */
      onDragOver={(e) => {
        e.preventDefault()
        setEncima(true)
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setEncima(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        setEncima(false)
        elegir(e.dataTransfer.files?.[0])
      }}
    >
      {/* Al arrastrar una imagen, toda la pantalla se convierte en el sitio
          donde soltarla: un marco discontinuo dentro del borde. */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-3 rounded-3xl border border-dashed border-[color-mix(in_oklab,var(--tinta)_38%,transparent)] transition-opacity duration-300 ${
          encima ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* my-auto y no justify-center: centra cuando sobra alto y, cuando no,
          deja que el contenido empiece arriba y se pueda desplazar. Con
          justify-center la parte de arriba se saldria por encima, fuera del
          alcance del scroll. */}
      <div className="my-auto flex w-full max-w-[360px] flex-col items-center py-5 text-center lg:max-w-[780px]">
        <DibujoCaptura forma={cabeElPar ? 'par' : 'uno'} />

        {/* En escritorio, las mismas tres columnas del dibujo (43%, 14% y 43%):
            el texto bajo la captura y las acciones bajo la semana. */}
        <div className="mt-6 flex w-full flex-col items-center lg:mt-9 lg:grid lg:grid-cols-[43fr_14fr_43fr] lg:items-start lg:text-left">
          <div
            className="lista-entrar flex flex-col items-center gap-3 lg:items-start"
            style={{ animationDelay: '60ms' }}
          >
            <p className="font-ui text-[10.5px] font-medium tracking-[0.26em] text-tinta-tenue uppercase">
              Mi horario
            </p>
            <h2 className="font-ui text-[34px] leading-[1.08] font-light tracking-[-0.015em] text-balance text-tinta lg:text-[42px]">
              {encima ? 'Suéltala para leerla' : 'Arma tu semana'}
            </h2>
            <p className="max-w-[31ch] text-[14.5px] leading-normal text-balance text-tinta-suave lg:text-[15px]">
              Sube la captura de tu horario y la pasamos a tu semana, clase por clase.
            </p>
          </div>

          <div
            className="lista-entrar mt-7 flex w-full flex-col items-center lg:col-start-3 lg:mt-0 lg:items-start"
            style={{ animationDelay: '140ms' }}
          >
            <SelloIntradace />
            <button
              type="button"
              onClick={() => {
                // El lector va llegando mientras se busca la captura en la galeria
                precalentarLector()
                refArchivo.current?.click()
              }}
              className="boton-tinta h-[52px] w-full rounded-2xl text-[15px]"
            >
              <ImageIcon size={18} strokeWidth={1.75} />
              Subir mi horario
            </button>
            <button
              type="button"
              onClick={alCrear}
              className="group mt-1.5 inline-flex h-11 items-center gap-[9px] rounded-xl px-2.5 text-[14.5px] font-medium text-tinta-suave transition-[color,transform] duration-200 hover:text-tinta active:scale-[0.985] lg:px-0"
            >
              <Pencil
                size={16}
                strokeWidth={1.75}
                className="text-tinta-tenue transition-colors duration-200 group-hover:text-tinta"
              />
              Crearlo manualmente
            </button>
            {/* De donde sale la mejor lectura. Solo donde sobra alto: en un
                telefono bajo, lo primero es que los botones quepan sin
                desplazarse. */}
            <p className="mt-3 hidden max-w-[36ch] text-center text-[12px] leading-relaxed text-balance text-tinta-tenue lg:text-left [@media(min-height:720px)]:block">
              Se lee mejor el PNG de «Descargar Horario» de INTRADACE, o una captura de la tabla.
            </p>
          </div>
        </div>

        <input
          ref={refArchivo}
          type="file"
          accept={FORMATOS}
          className="hidden"
          onChange={(e) => {
            elegir(e.target.files?.[0])
            /* Se limpia para que elegir DOS VECES el mismo archivo vuelva a
               disparar el cambio. Sin esto, quien falla la primera lectura y
               reintenta con la misma foto no consigue que pase nada. */
            e.target.value = ''
          }}
        />
      </div>
    </div>
  )
}

export default HorarioVacio
