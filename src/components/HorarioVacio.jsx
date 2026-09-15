import { useRef, useState } from 'react'
import { ArrowRight, ImagePlus, PencilLine, Plus } from 'lucide-react'
import { FORMATOS } from '../data/leerHorario'
import { SITUACION } from '../layout/situacion'
import { ASPECTO } from '../theme/situacion'
import { IconoSituacion } from './IconoSituacion'

const DIAS = ['L', 'M', 'X', 'J', 'V']

/* Las clases de la semana de muestra: dia, fila de inicio, filas que dura y
   color. Inventadas a proposito y sin nombre: es un dibujo de lo que vas a
   tener, no un horario, y con nombres de materias reales se leeria como uno
   que alguien ya te armo. */
const MUESTRA = [
  { dia: 0, desde: 0, filas: 2, color: 'var(--area-sistemas)' },
  { dia: 0, desde: 3, filas: 2, color: 'var(--area-estadistica)' },
  { dia: 1, desde: 1, filas: 2, color: 'var(--area-ciencias-basicas)' },
  { dia: 2, desde: 0, filas: 2, color: 'var(--area-sistemas)' },
  { dia: 2, desde: 4, filas: 1, color: 'var(--area-gestion)' },
  { dia: 3, desde: 1, filas: 2, color: 'var(--area-ciencias-basicas)' },
  { dia: 3, desde: 3, filas: 2, color: 'var(--area-computacion)' },
  { dia: 4, desde: 2, filas: 2, color: 'var(--area-estadistica)' },
]
const FILAS = 5

/**
 * La semana en miniatura que abre la pantalla. Dice sin palabras que es lo
 * que se viene a hacer aqui: una rejilla de lunes a viernes que se llena de
 * clases. Las clases entran una tras otra al llegar, como si alguien las
 * fuera colocando, y despues se quedan quietas.
 *
 * Responde a la opcion que tengas encima: con "Subir una foto" la recorre una
 * linea de lectura, y con "Crearlo a mano" aparece un hueco con un mas donde
 * iria la siguiente clase. Es la misma accion, contada en pequeño antes de
 * pulsar.
 *
 * El alto de cada fila es una variable que encoge en pantallas bajas: es lo
 * primero que cede para que todo quepa sin desplazarse, porque un dibujo
 * sigue leyendose igual un poco mas aplastado y un boton no.
 */
function SemanaMuestra({ foco, soltando }) {
  return (
    <div
      aria-hidden="true"
      className="semana-muestra transicion-tema relative w-full max-w-[320px] overflow-hidden rounded-2xl border border-panel-borde bg-panel p-3"
      data-foco={soltando ? 'foto' : foco}
    >
      <div className="grid grid-cols-5 gap-1.5 pb-2">
        {DIAS.map((d, i) => (
          <span
            key={i}
            className="text-center text-[9.5px] font-medium tracking-[0.2em] text-tinta-tenue"
          >
            {d}
          </span>
        ))}
      </div>

      <div
        className="relative grid grid-cols-5 gap-1.5"
        style={{ gridTemplateRows: `repeat(${FILAS}, var(--fila-muestra))` }}
      >
        {/* Las lineas de las horas, detras de todo */}
        {Array.from({ length: FILAS - 1 }, (_, i) => (
          <span
            key={i}
            className="pointer-events-none absolute inset-x-0 h-px bg-[color-mix(in_oklab,var(--tinta)_6%,transparent)]"
            style={{ top: `calc(${((i + 1) / FILAS) * 100}% - 0.5px)` }}
          />
        ))}

        {MUESTRA.map((c, i) => (
          <span
            key={i}
            className="clase-muestra relative rounded-[5px] border"
            style={{
              gridColumn: c.dia + 1,
              gridRow: `${c.desde + 1} / span ${c.filas}`,
              backgroundColor: `color-mix(in oklab, ${c.color} 22%, transparent)`,
              borderColor: `color-mix(in oklab, ${c.color} 45%, transparent)`,
              animationDelay: `${180 + i * 70}ms`,
            }}
          >
            <span
              className="absolute top-1.5 left-1.5 h-[3px] w-1/2 rounded-full"
              style={{ backgroundColor: `color-mix(in oklab, ${c.color} 70%, transparent)` }}
            />
          </span>
        ))}

        {/* El hueco que se ofrece a mano */}
        <span
          className="hueco-muestra grid place-items-center rounded-[5px] border border-dashed border-tinta-tenue text-tinta-suave"
          style={{ gridColumn: 2, gridRow: '4 / span 2' }}
        >
          <Plus size={12} strokeWidth={1.75} />
        </span>
      </div>

      {/* La linea de lectura de la foto */}
      <span className="escaneo-muestra pointer-events-none absolute inset-x-0 top-0 h-10" />
    </div>
  )
}

/**
 * Una de las dos salidas, como una fila de accion: icono, dos lineas y una
 * flecha. Es un boton entero -toda la superficie responde- y no una tarjeta
 * con un boton dentro.
 *
 * Fila y no tarjeta alta porque en un telefono las dos tarjetas de antes
 * median casi 400 px juntas y obligaban a desplazarse para ver la segunda:
 * justo la opcion que media carrera va a usar quedaba debajo del pliegue. En
 * una fila caben las dos en 150 px y se comparan de un vistazo.
 *
 * La destacada no se distingue por un fondo de color sino por su filo: el
 * mismo contorno de luz de la cajita del logo, que se enciende en una
 * esquina, y una flecha llena. La otra, filo neutro y flecha de contorno.
 */
function Accion({ icono: Ico, titulo, detalle, destacada, alPulsar, alEnfocar }) {
  return (
    <button
      type="button"
      onClick={alPulsar}
      onPointerEnter={alEnfocar}
      onFocus={alEnfocar}
      data-destacada={destacada || undefined}
      /* Sin transicion-tema ni utilidades de transicion: .accion-horario
         declara la suya, y dos declaraciones se pisarian entre si. */
      className="accion-horario group relative flex w-full items-center gap-3.5 rounded-[20px] p-3 text-left active:scale-[0.985] sm:py-3.5"
    >
      <span
        className={`relative grid size-11 shrink-0 place-items-center rounded-[14px] transition-transform duration-300 group-hover:scale-105 ${
          destacada ? 'text-[var(--estado-aprobada)]' : 'text-tinta-suave'
        }`}
      >
        <span className="marca-caja" aria-hidden="true" />
        <Ico size={19} strokeWidth={1.5} className="relative" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-[15px] leading-tight font-medium tracking-[-0.015em] text-tinta">
          {titulo}
        </span>
        <span className="mt-1 block truncate text-[12px] text-tinta-tenue">{detalle}</span>
      </span>

      <span
        className={`grid size-9 shrink-0 place-items-center rounded-full transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 ${
          destacada
            ? 'bg-aprobada text-[var(--lienzo)]'
            : 'border border-panel-borde text-tinta-suave'
        }`}
      >
        <ArrowRight size={16} strokeWidth={destacada ? 2 : 1.5} />
      </span>
    </button>
  )
}

/**
 * El horario cuando todavia no hay nada.
 *
 * Una rejilla vacia de doce horas por cinco dias no es una pantalla vacia
 * cualquiera: es una pantalla que PARECE terminada. No hay nada roto ni
 * ningun hueco evidente, asi que quien llega por primera vez no ve que le
 * toca a el, y lo que hace es irse. De ahi que esto tape la rejilla en vez de
 * ponerse encima con un cartelito: mientras no haya clases, la rejilla no
 * tiene nada que enseñar.
 *
 * Dos salidas y no una, porque son dos personas distintas. El que ya tiene su
 * horario en una foto de INTRADACE quiere que se lo copien; el que todavia
 * esta armando la inscripcion quiere probar combinaciones. Ofrecer solo lo
 * primero deja al segundo sin sitio, y solo lo segundo condena al primero a
 * teclear catorce clases a mano.
 *
 * La foto va primera y destacada porque es la que resuelve el caso de casi
 * todo el mundo en un gesto. Pero se dice claramente que hay una revision
 * despues: prometer "sube y ya" y luego enseñar una lista que hay que repasar
 * se siente como una trampa, y decirlo antes convierte esa misma lista en lo
 * que es, una comprobacion rapida.
 *
 * Tiene que caber entera sin desplazarse, tambien en un telefono: una
 * pantalla de bienvenida con scroll esconde justo lo que viene a ofrecer.
 * Todo va en una columna estrecha y centrada, y en pantallas bajas encogen
 * primero el dibujo y los espacios, nunca los botones.
 */
function HorarioVacio({ disponibles, alSubir, alCrear }) {
  const refArchivo = useRef(null)
  const [encima, setEncima] = useState(false)
  const [foco, setFoco] = useState(null)

  const elegir = (archivo) => {
    if (archivo) alSubir(archivo)
  }

  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-5 pb-[var(--reserva-barra)] [@media(max-height:760px)]:pt-3"
      /* Soltar la imagen encima funciona en toda la zona, no solo sobre la
         tarjeta: en un escritorio, arrastrar la captura desde el escritorio a
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
        className={`pointer-events-none absolute inset-3 rounded-3xl border-2 border-dashed transition-[opacity,border-color] duration-300 ${
          encima
            ? 'border-[color-mix(in_oklab,var(--estado-aprobada)_60%,transparent)] opacity-100'
            : 'border-transparent opacity-0'
        }`}
      />

      {/* my-auto y no justify-center: centra cuando sobra alto y, cuando no,
          deja que el contenido empiece arriba y se pueda desplazar. Con
          justify-center la parte de arriba se saldria por encima, fuera del
          alcance del scroll. */}
      <div className="my-auto flex w-full max-w-[400px] flex-col items-center py-5 text-center [@media(max-height:660px)]:py-3">
        <div className="lista-entrar flex w-full justify-center">
          <SemanaMuestra foco={foco} soltando={encima} />
        </div>

        <p
          className="lista-entrar mt-6 text-[10.5px] font-medium tracking-[0.24em] text-tinta-tenue uppercase [@media(max-height:760px)]:mt-4"
          style={{ animationDelay: '60ms' }}
        >
          Mi horario
        </p>
        <h2
          className="lista-entrar mt-1.5 text-[27px] leading-tight font-light tracking-[-0.03em] text-tinta sm:text-[30px]"
          style={{ animationDelay: '90ms' }}
        >
          {encima ? 'Suéltala para leerla' : 'Arma tu semana'}
        </h2>
        <p
          className="lista-entrar mt-2 max-w-[34ch] text-[13px] leading-relaxed text-balance text-tinta-suave"
          style={{ animationDelay: '120ms' }}
        >
          Sube la foto de tu horario y lo copiamos por ti, o créalo tú probando combinaciones.
        </p>

        {/* Lo que el pensum ya te deja inscribir. Es el dato con el que se
            arma un horario, y decirlo aqui convierte la pantalla vacia en
            un punto de partida con numeros. */}
        {disponibles > 0 && (
          <p
            className="lista-entrar mt-3.5 flex items-center gap-2 rounded-full border border-panel-borde px-3 py-1.5 text-[12px] text-tinta-suave"
            style={{ animationDelay: '150ms' }}
          >
            <IconoSituacion
              situacion={SITUACION.INSCRIBIBLE}
              color={ASPECTO[SITUACION.INSCRIBIBLE].marca.color}
              size={12}
            />
            <span>
              <span className="text-tinta tabular-nums">{disponibles}</span>{' '}
              {disponibles === 1 ? 'materia disponible' : 'materias disponibles'} para inscribir
            </span>
          </p>
        )}

        <div
          className="lista-entrar mt-6 flex w-full flex-col gap-2.5 [@media(max-height:760px)]:mt-4"
          style={{ animationDelay: '190ms' }}
          onPointerLeave={() => setFoco(null)}
        >
          <Accion
            destacada
            icono={ImagePlus}
            titulo="Subir una foto"
            detalle="Captura o foto · la revisas antes"
            alPulsar={() => refArchivo.current?.click()}
            alEnfocar={() => setFoco('foto')}
          />
          <Accion
            icono={PencilLine}
            titulo="Crearlo a mano"
            detalle="Toca un hueco y añade clases"
            alPulsar={alCrear}
            alEnfocar={() => setFoco('mano')}
          />
        </div>

        {/* Solo en escritorio: en un telefono no se arrastra nada, y la linea
            seria una instruccion imposible ocupando sitio. */}
        <p
          className="lista-entrar mt-4 hidden text-[11.5px] text-tinta-tenue sm:block"
          style={{ animationDelay: '230ms' }}
        >
          También puedes arrastrar la imagen a esta pantalla
        </p>

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
