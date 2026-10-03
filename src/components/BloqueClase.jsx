import { memo } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { colorClase } from '../theme/areas'
import { ABRE, HUECO_CELDA, enDoceHoras, tramoCorto } from '../layout/horario'

/* A partir de que altura cabe cada cosa. En vez de encoger la letra hasta que
   no se lea, se deja de enseñar lo prescindible: una clase de media hora mide
   cincuenta y seis pixeles y no puede decir lo mismo que una de dos horas. */
const CABE_HORA = 44
const CABE_PIE = 92
const CABE_PROFESOR = 136

/**
 * Una clase colocada en la rejilla.
 *
 * Se posiciona por minutos, no por celdas: una clase de 08:15 a 09:50 empieza
 * y acaba donde le toca, y dos clases seguidas -una acaba a las nueve, la
 * otra empieza a las nueve- quedan pegadas sin hueco ni solape, que es lo que
 * hace que la semana se lea de un vistazo.
 *
 * Se tiñe del color de su materia (--c, ver coloresDelHorario y
 * .bloque-clase en index.css): la tarjeta apenas, el contorno algo mas y la
 * hora del todo.
 *
 * `carril` y `carriles` solo entran en juego si dos clases se pisaran. El
 * formulario no deja guardar un solape, asi que en la practica siempre son
 * 0 y 1 y el bloque ocupa la columna entera.
 */
function BloqueClase({
  sesion,
  asignatura,
  colores,
  pxPorMinuto,
  arrastrando,
  menuAbierto,
  /* En el telefono no se arrastra: solo hay un dia a la vista, y ademas
     touch-none impediria desplazar la jornada con el dedo. */
  arrastrable = true,
  alAgarrar,
  alAbrirMenu,
}) {
  const alto = (sesion.fin - sesion.inicio) * pxPorMinuto
  const nombre = asignatura?.nombre ?? sesion.codigo
  const pie = [sesion.aula, sesion.seccion && `Sec. ${sesion.seccion}`].filter(Boolean)

  return (
    <div
      id={`clase-${sesion.id}`}
      onPointerDown={arrastrable ? (e) => alAgarrar(sesion, e) : undefined}
      title={`${nombre} · ${enDoceHoras(sesion.inicio)} a ${enDoceHoras(sesion.fin)}`}
      style={{
        top: (sesion.inicio - ABRE) * pxPorMinuto,
        height: Math.max(alto - HUECO_CELDA, 22),
        left: `calc(${(sesion.carril / sesion.carriles) * 100}% + ${HUECO_CELDA / 2}px)`,
        width: `calc(${(1 / sesion.carriles) * 100}% - ${HUECO_CELDA}px)`,
        '--c': colorClase(sesion, colores),
        // Mientras viaja se queda su hueco marcado, tenue: sin el, la semana
        // parece tener un agujero justo donde estaba la clase.
        opacity: arrastrando ? 0.3 : undefined,
      }}
      className={`bloque-clase group absolute flex flex-col overflow-hidden rounded-[14px] border px-3 text-left transition-[transform,box-shadow] duration-200 hover:-translate-y-px ${arrastrable ? 'touch-none cursor-grab active:cursor-grabbing' : ''} ${
        alto < CABE_HORA ? 'justify-center py-1' : 'py-2.5'
      }`}
    >
      {/* Primero cuando, en pequeño y del color de la materia, y debajo
          que: el mismo orden que la cabecera de un panel -el rotulo y el
          titulo-. El color va solo en el rotulo; el nombre en tinta, que es
          lo que se lee. */}
      {alto >= CABE_HORA && (
        <span className="hora-clase block truncate pr-5 text-[10.5px] font-semibold tracking-[0.04em] tabular-nums">
          {tramoCorto(sesion.inicio, sesion.fin)}
        </span>
      )}

      <span
        className={`text-[13.5px] leading-snug font-semibold tracking-[-0.01em] text-tinta ${
          alto >= CABE_HORA ? 'mt-1' : 'pr-5'
        } ${alto >= CABE_PIE ? 'line-clamp-3' : 'block truncate'}`}
      >
        {nombre}
      </span>

      {/* Los tres puntos SON el boton del menu, no un adorno. El cuerpo del
          bloque queda entonces para una sola cosa -arrastrarlo- y no hay que
          adivinar que hace un click segun donde caiga.
          El pointerdown se para aqui para que pulsarlos no arranque un
          arrastre: sin eso, el gesto empezaria y el click nunca llegaria.
          Se quedan visibles mientras el menu esta abierto; si desaparecieran
          al salir el raton del bloque, el menu quedaria colgando de nada. */}
      <button
        type="button"
        aria-label={`Acciones de ${nombre}`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          alAbrirMenu(sesion, e.currentTarget)
        }}
        className={`acciones-clase absolute top-1.5 right-1.5 grid size-6 cursor-pointer place-items-center rounded-full text-tinta-suave transition-[opacity,background-color] duration-150 hover:bg-tinta/[0.08] hover:text-tinta focus-visible:opacity-100 ${
          menuAbierto
            ? 'bg-tinta/[0.08] text-tinta opacity-100'
            : 'opacity-0 group-hover:opacity-100'
        }`}
      >
        <MoreHorizontal size={15} />
      </button>

      {alto >= CABE_PIE && pie.length > 0 && (
        <span className="mt-auto block truncate pt-1 text-[11px] text-tinta-suave">
          {pie.join('  ·  ')}
        </span>
      )}

      {alto >= CABE_PROFESOR && sesion.profesor && (
        <span className="block truncate text-[11px] text-tinta-tenue">{sesion.profesor}</span>
      )}
    </div>
  )
}

export default memo(BloqueClase)
