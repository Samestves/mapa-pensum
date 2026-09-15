import { useRef, useState } from 'react'
import { ArrowRight, ImageUp, PencilLine, Plus } from 'lucide-react'
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
 */
function SemanaMuestra({ foco, soltando }) {
  return (
    <div
      aria-hidden="true"
      className="semana-muestra transicion-tema relative w-full max-w-[340px] overflow-hidden rounded-2xl border border-panel-borde bg-panel p-3"
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
        style={{ gridTemplateRows: `repeat(${FILAS}, 18px)` }}
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
 * Una de las dos salidas. Es un boton, no una tarjeta con un boton dentro:
 * toda la superficie responde, que es lo que se espera de algo de este
 * tamaño, y de paso llega con Tab en un solo salto.
 */
function Salida({ icono: Ico, titulo, detalle, pie, destacada, alPulsar, alEnfocar, ...resto }) {
  return (
    <button
      type="button"
      onClick={alPulsar}
      onPointerEnter={alEnfocar}
      onFocus={alEnfocar}
      className={`group transicion-tema relative flex flex-1 items-start gap-3.5 rounded-2xl border p-4 text-left transition-[transform,border-color,background-color] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 active:scale-[0.99] sm:flex-col sm:gap-4 sm:p-5 ${
        destacada
          ? 'border-[color-mix(in_oklab,var(--estado-aprobada)_32%,var(--panel-borde))] bg-[color-mix(in_oklab,var(--estado-aprobada)_5%,var(--panel))] hover:border-[color-mix(in_oklab,var(--estado-aprobada)_70%,transparent)]'
          : 'border-panel-borde bg-panel hover:border-[color-mix(in_oklab,var(--tinta)_30%,transparent)]'
      }`}
      {...resto}
    >
      <span
        className={`grid size-10 shrink-0 place-items-center rounded-xl border transition-transform duration-300 group-hover:scale-105 ${
          destacada
            ? 'border-[color-mix(in_oklab,var(--estado-aprobada)_35%,transparent)] text-[var(--estado-aprobada)]'
            : 'border-panel-borde text-tinta-suave'
        }`}
      >
        <Ico size={18} strokeWidth={1.5} />
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-1 self-stretch">
        <span className="flex items-center gap-1.5 text-[15.5px] tracking-[-0.01em] text-tinta">
          {titulo}
          <ArrowRight
            size={14}
            strokeWidth={1.5}
            className="-translate-x-1 text-tinta-tenue opacity-0 transition-[opacity,transform] duration-300 group-hover:translate-x-0 group-hover:opacity-100"
          />
        </span>
        <span className="text-[12.5px] leading-relaxed text-tinta-tenue">{detalle}</span>
        {pie && (
          <span className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-2 text-[10.5px] font-medium tracking-[0.12em] text-tinta-tenue uppercase">
            {pie}
          </span>
        )}
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
 * Tipografia fina, como la lista y la portada: el titulo en peso ligero y
 * los datos pequeños en versalitas espaciadas. Lo unico con peso es lo que
 * se pulsa.
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
      className="relative flex min-h-0 flex-1 justify-center overflow-y-auto px-5 py-8 sm:items-center"
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
          donde soltarla: un marco discontinuo que respira dentro del borde. */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-3 rounded-3xl border-2 border-dashed transition-[opacity,border-color] duration-300 ${
          encima
            ? 'border-[color-mix(in_oklab,var(--estado-aprobada)_60%,transparent)] opacity-100'
            : 'border-transparent opacity-0'
        }`}
      />

      <div className="w-full max-w-[560px]">
        <div className="flex flex-col items-center text-center">
          <div className="lista-entrar flex w-full justify-center">
            <SemanaMuestra foco={foco} soltando={encima} />
          </div>

          <p
            className="lista-entrar mt-7 text-[10.5px] font-medium tracking-[0.24em] text-tinta-tenue uppercase"
            style={{ animationDelay: '60ms' }}
          >
            Mi horario
          </p>
          <h2
            className="lista-entrar mt-2 text-[26px] leading-tight font-light tracking-[-0.025em] text-balance text-tinta sm:text-[30px]"
            style={{ animationDelay: '90ms' }}
          >
            {encima ? 'Suéltala para leerla' : 'Arma tu semana'}
          </h2>
          <p
            className="lista-entrar mt-2.5 max-w-[44ch] text-[13.5px] leading-relaxed text-tinta-suave"
            style={{ animationDelay: '120ms' }}
          >
            Sube la foto del horario que te dieron y lo copiamos por ti, o colócalo tú mismo
            probando combinaciones.
          </p>

          {/* Lo que el pensum ya te deja inscribir. Es el dato con el que se
              arma un horario, y decirlo aqui convierte la pantalla vacia en
              un punto de partida con numeros. */}
          {disponibles > 0 && (
            <p
              className="lista-entrar mt-4 flex items-center gap-2 rounded-full border border-panel-borde px-3 py-1.5 text-[12px] text-tinta-suave"
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
        </div>

        <div
          className="lista-entrar mt-7 flex flex-col gap-3 sm:flex-row"
          style={{ animationDelay: '190ms' }}
          onPointerLeave={() => setFoco(null)}
        >
          <Salida
            destacada
            icono={ImageUp}
            titulo="Subir una foto"
            detalle="La captura de INTRADACE o una foto de tu horario. Leemos materias, días y horas."
            pie={<span className="text-[var(--estado-aprobada)]">Lo revisas antes de guardar</span>}
            alPulsar={() => refArchivo.current?.click()}
            alEnfocar={() => setFoco('foto')}
          />

          <Salida
            icono={PencilLine}
            titulo="Crearlo a mano"
            detalle="Pulsa un hueco de la semana y añade cada clase. Se arrastran para moverlas."
            /* Las dos llevan pie. No es simetria por simetria: sin el, la
               segunda tarjeta deja su contenido arriba y un hueco muerto
               abajo, y ese desequilibrio se lee como que la opcion vale
               menos, cuando para media carrera es la que va a usar. */
            pie="Al instante · sin conexión"
            alPulsar={alCrear}
            alEnfocar={() => setFoco('mano')}
          />
        </div>

        {/* Solo en escritorio: en un telefono no se arrastra nada, y la linea
            seria una instruccion imposible ocupando sitio. */}
        <p
          className="lista-entrar mt-5 hidden text-center text-[11.5px] text-tinta-tenue sm:block"
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
