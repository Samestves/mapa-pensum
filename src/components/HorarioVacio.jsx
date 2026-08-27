import { useRef, useState } from 'react'
import { CalendarRange, ImageUp, MousePointerClick, PencilLine, Sparkles } from 'lucide-react'
import { FORMATOS } from '../data/leerHorario'

/**
 * Una de las dos salidas. Es un boton, no una tarjeta con un boton dentro:
 * toda la superficie responde, que es lo que se espera de algo de este
 * tamaño, y de paso llega con Tab en un solo salto.
 */
function Salida({ icono: Ico, titulo, detalle, pie, destacada, alPulsar, ...resto }) {
  return (
    <button
      type="button"
      onClick={alPulsar}
      className={`group transicion-tema relative flex flex-1 flex-col items-start gap-3 rounded-2xl border p-4 text-left transition-[transform,border-color,background-color] duration-200 hover:-translate-y-0.5 active:scale-[0.99] sm:p-5 ${
        destacada
          ? 'border-[color-mix(in_oklab,var(--estado-aprobada)_38%,var(--panel-borde))] bg-[color-mix(in_oklab,var(--estado-aprobada)_7%,var(--panel))] hover:border-[var(--estado-aprobada)]'
          : 'border-panel-borde bg-panel hover:border-tinta-tenue'
      }`}
      {...resto}
    >
      <span
        className={`grid size-10 place-items-center rounded-xl transition-transform duration-200 group-hover:scale-105 ${
          destacada
            ? 'bg-[color-mix(in_oklab,var(--estado-aprobada)_16%,transparent)] text-[var(--estado-aprobada)]'
            : 'bg-panel-suave text-tinta-suave'
        }`}
      >
        <Ico size={19} />
      </span>

      <span className="min-w-0">
        <span className="block text-[15px] font-extrabold tracking-[-0.01em] text-tinta">
          {titulo}
        </span>
        <span className="mt-1 block text-[12px] leading-snug text-tinta-suave">{detalle}</span>
      </span>

      {pie && (
        <span className="mt-auto flex items-center gap-1.5 pt-1 text-[10.5px] font-bold text-tinta-tenue">
          {pie}
        </span>
      )}
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
 */
function HorarioVacio({ alSubir, alCrear }) {
  const refArchivo = useRef(null)
  const [encima, setEncima] = useState(false)

  const elegir = (archivo) => {
    if (archivo) alSubir(archivo)
  }

  return (
    <div
      className="surgir flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-5 py-8"
      /* Soltar la imagen encima funciona en toda la zona, no solo sobre la
         tarjeta: en un escritorio, arrastrar la captura desde el escritorio a
         "por ahi en medio" es el gesto natural, y obligar a acertar un
         rectangulo de trescientos pixeles solo sirve para fallar. */
      onDragOver={(e) => {
        e.preventDefault()
        setEncima(true)
      }}
      onDragLeave={() => setEncima(false)}
      onDrop={(e) => {
        e.preventDefault()
        setEncima(false)
        elegir(e.dataTransfer.files?.[0])
      }}
    >
      <div className="w-full max-w-[560px]">
        <div className="flex flex-col items-center text-center">
          <span className="transicion-tema grid size-14 place-items-center rounded-2xl border border-panel-borde bg-panel text-tinta-tenue">
            <CalendarRange size={24} />
          </span>
          <h2 className="mt-4 text-[19px] font-extrabold tracking-[-0.02em] text-tinta sm:text-[22px]">
            Todavía no tienes horario
          </h2>
          <p className="mt-2 max-w-[46ch] text-[13px] leading-relaxed text-tinta-suave">
            Móntalo en un minuto: sube la foto del que te dieron y lo copiamos por ti, o colócalo
            tú mismo sobre la semana.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Salida
            destacada
            icono={ImageUp}
            titulo="Subir una foto"
            detalle="La captura o la foto de tu horario. Leemos las materias, los días y las horas."
            pie={
              <>
                <Sparkles size={12} className="text-[var(--estado-aprobada)]" />
                Lo revisas antes de guardarlo
              </>
            }
            alPulsar={() => refArchivo.current?.click()}
          />

          <Salida
            icono={PencilLine}
            titulo="Crearlo a mano"
            detalle="Pulsa un hueco de la semana y añade cada clase. Se arrastran para moverlas."
            /* Las dos llevan pie. No es simetria por simetria: sin el, la
               segunda tarjeta deja su contenido arriba y un hueco muerto
               abajo, y ese desequilibrio se lee como que la opcion vale
               menos, cuando para media carrera es la que va a usar. */
            pie={
              <>
                <MousePointerClick size={12} />
                Al instante y sin conexión
              </>
            }
            alPulsar={alCrear}
          />
        </div>

        {/* Solo en escritorio: en un telefono no se arrastra nada, y la linea
            seria una instruccion imposible ocupando sitio. */}
        <p className="mt-4 hidden text-center text-[11px] text-tinta-tenue sm:block">
          {encima ? 'Suéltala aquí' : 'También puedes arrastrar la imagen a esta pantalla'}
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
