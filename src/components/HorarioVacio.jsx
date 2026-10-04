import { useRef, useState } from 'react'
import { ImagePlus, Plus } from 'lucide-react'
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
 * que se viene a hacer aqui: una semana de lunes a viernes que se llena de
 * clases. Entran una tras otra, y despues una linea la recorre de arriba
 * abajo y cada clase se enciende cuando le pasa por encima: es lo que va a
 * pasar con la foto.
 *
 * No lleva caja. Es un trozo de semana que sale del fondo y se desvanece
 * hacia abajo, no una tarjeta con un dibujo dentro.
 *
 * `foco` cuenta la opcion que se esta mirando: con "mano" aparece un hueco
 * con un mas donde iria la siguiente clase; con "foto" -al arrastrar una
 * imagen sobre la pantalla- las clases se quedan encendidas.
 *
 * El alto de cada fila es una variable que encoge en pantallas bajas: es lo
 * primero que cede para que todo quepa sin desplazarse, porque un dibujo
 * sigue leyendose igual un poco mas aplastado y un boton no.
 */
function SemanaMuestra({ foco }) {
  return (
    <div aria-hidden="true" className="semana-muestra w-full max-w-[300px]" data-foco={foco}>
      <div className="grid grid-cols-5 gap-2 pb-2.5">
        {DIAS.map((d) => (
          <span
            key={d}
            className="text-center font-ui text-[10px] font-medium tracking-[0.22em] text-tinta-tenue"
          >
            {d}
          </span>
        ))}
      </div>

      <div
        className="rejilla-muestra relative grid grid-cols-5 gap-x-2 gap-y-1.5 overflow-hidden"
        style={{ gridTemplateRows: `repeat(${FILAS}, var(--fila-muestra))` }}
      >
        {Array.from({ length: FILAS - 1 }, (_, i) => (
          <span
            key={i}
            className="hora-muestra"
            style={{ top: `calc(${((i + 1) / FILAS) * 100}% - 3px)` }}
          />
        ))}

        {MUESTRA.map((c, i) => (
          <span
            key={i}
            className="clase-muestra"
            style={{
              gridColumn: c.dia + 1,
              gridRow: `${c.desde + 1} / span ${c.filas}`,
              '--color': c.color,
              // La fila por la que pasa su centro: cuando le llega la linea
              '--fila': c.desde + c.filas / 2,
              animationDelay: `${140 + i * 70}ms`,
            }}
          >
            <i />
          </span>
        ))}

        {/* El hueco que se ofrece a mano */}
        <span
          className="hueco-muestra grid place-items-center rounded-[5px] bg-[color-mix(in_oklab,var(--tinta)_8%,transparent)] text-tinta-suave"
          style={{ gridColumn: 2, gridRow: '4 / span 2' }}
        >
          <Plus size={12} strokeWidth={1.75} />
        </span>

        <span className="lectura-muestra" />
      </div>
    </div>
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
 * Dos salidas y no una, porque son dos personas distintas. El que ya tiene su
 * horario en una foto de INTRADACE quiere que se lo copien; el que todavia
 * esta armando la inscripcion quiere probar combinaciones. Ofrecer solo lo
 * primero deja al segundo sin sitio, y solo lo segundo condena al primero a
 * teclear catorce clases a mano.
 *
 * La foto es la accion llena porque resuelve el caso de casi todo el mundo en
 * un gesto; armarlo a mano va debajo, del mismo tamaño y sin relleno: se ve
 * igual de pronto, pero no compite. Y se dice que hay una revision despues:
 * prometer "sube y ya" y luego enseñar una lista que hay que repasar se
 * siente como una trampa.
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
      <div className="my-auto flex w-full max-w-[360px] flex-col items-center py-5 text-center [@media(max-height:660px)]:py-3">
        <div className="lista-entrar flex w-full justify-center">
          <SemanaMuestra foco={encima ? 'foto' : foco} />
        </div>

        <p
          className="lista-entrar mt-7 font-ui text-[10.5px] font-medium tracking-[0.26em] text-tinta-tenue uppercase [@media(max-height:760px)]:mt-4"
          style={{ animationDelay: '60ms' }}
        >
          Mi horario
        </p>
        <h2
          className="lista-entrar mt-2 font-ui text-[32px] leading-[1.1] font-light tracking-[-0.015em] text-tinta sm:text-[36px]"
          style={{ animationDelay: '90ms' }}
        >
          {encima ? 'Suéltala para leerla' : 'Arma tu semana'}
        </h2>
        <p
          className="lista-entrar mt-3 max-w-[30ch] text-[14px] leading-relaxed text-balance text-tinta-suave"
          style={{ animationDelay: '120ms' }}
        >
          Sube la foto de tu horario y la pasamos a tu semana, clase por clase.
        </p>

        <div
          className="lista-entrar mt-7 flex w-full flex-col gap-2.5 [@media(max-height:760px)]:mt-5"
          style={{ animationDelay: '170ms' }}
          onPointerLeave={() => setFoco(null)}
        >
          <button
            type="button"
            onClick={() => refArchivo.current?.click()}
            onPointerEnter={() => setFoco(null)}
            onFocus={() => setFoco(null)}
            className="boton-tinta h-[52px] w-full rounded-2xl text-[15px]"
          >
            <ImagePlus size={18} strokeWidth={1.75} />
            Subir una foto
          </button>
          <button
            type="button"
            onClick={alCrear}
            onPointerEnter={() => setFoco('mano')}
            onFocus={() => setFoco('mano')}
            className="boton-sordo h-[52px] w-full rounded-2xl text-[15px]"
          >
            Crearlo a mano
          </button>
        </div>

        <p
          className="lista-entrar mt-4 max-w-[34ch] text-[12px] leading-relaxed text-balance text-tinta-tenue"
          style={{ animationDelay: '210ms' }}
        >
          Vale una captura. Nada entra a tu horario sin que lo revises
          <span className="hidden sm:inline">, y también puedes arrastrar la imagen aquí</span>.
        </p>

        {/* Lo que el pensum ya te deja inscribir. Es el dato con el que se
            arma un horario, y decirlo aqui convierte la pantalla vacia en un
            punto de partida con numeros. */}
        {disponibles > 0 && (
          <p
            className="lista-entrar mt-5 flex items-center gap-2 text-[12.5px] text-tinta-suave [@media(max-height:700px)]:mt-3"
            style={{ animationDelay: '250ms' }}
          >
            <IconoSituacion
              situacion={SITUACION.INSCRIBIBLE}
              color={ASPECTO[SITUACION.INSCRIBIBLE].icono}
              size={13}
            />
            <span>
              <span className="text-tinta tabular-nums">{disponibles}</span>{' '}
              {disponibles === 1 ? 'materia disponible' : 'materias disponibles'} para inscribir
            </span>
          </p>
        )}

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
