import { memo } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { colorClase } from '../theme/areas'
import { ABRE, HUECO_CELDA, enDoceHoras, tramoCorto } from '../layout/horario'

/* A partir de que altura cabe cada cosa. En vez de encoger la letra hasta que
   no se lea, se deja de enseñar lo prescindible: una clase de media hora no
   puede decir lo mismo que una de dos. El nombre va siempre; luego su tramo,
   y con sitio de sobra, el aula. */
const CABE_TRAMO = 44
const CABE_PIE = 84

/* Lo que ocupa cada renglon, para saber cuantos del nombre caben */
const RELLENO = 14
const ALTO_TRAMO = 19
const ALTO_PIE = 18
const RENGLON_NOMBRE = 16.7

/**
 * Una clase colocada en la rejilla de la semana.
 *
 * Se posiciona por minutos, no por celdas: una clase de 08:15 a 09:50 empieza
 * y acaba donde le toca, y dos clases seguidas -una acaba a las nueve, la
 * otra empieza a las nueve- quedan pegadas sin hueco ni solape, que es lo que
 * hace que la semana se lea de un vistazo.
 *
 * Dice primero que es y debajo de cuando a cuando, escrito. La posicion en la
 * rejilla ya cuenta la hora a ojo; el tramo la dice exacta, y por eso va en
 * el bloque y no hay que ir a buscarla al carril de la izquierda.
 *
 * Se tiñe del color de su materia (--c, ver .bloque-clase en
 * estilos/horario.css): el fondo apenas y el filo de la izquierda del todo.
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
  alAgarrar,
  alAbrirMenu,
}) {
  const alto = Math.max((sesion.fin - sesion.inicio) * pxPorMinuto - HUECO_CELDA, 22)
  const nombre = asignatura?.nombre ?? sesion.codigo
  const pie = [sesion.aula, sesion.seccion && `Sec. ${sesion.seccion}`].filter(Boolean)

  const conTramo = alto >= CABE_TRAMO
  const conPie = alto >= CABE_PIE && pie.length > 0
  const libre = alto - RELLENO - (conTramo ? ALTO_TRAMO : 0) - (conPie ? ALTO_PIE : 0)
  const renglones = Math.max(1, Math.floor(libre / RENGLON_NOMBRE))

  return (
    <div
      id={`clase-${sesion.id}`}
      onPointerDown={(e) => alAgarrar(sesion, e)}
      title={`${nombre} · ${enDoceHoras(sesion.inicio)} a ${enDoceHoras(sesion.fin)}`}
      style={{
        top: (sesion.inicio - ABRE) * pxPorMinuto,
        height: alto,
        left: `calc(${(sesion.carril / sesion.carriles) * 100}% + ${HUECO_CELDA / 2}px)`,
        width: `calc(${(1 / sesion.carriles) * 100}% - ${HUECO_CELDA}px)`,
        '--c': colorClase(sesion, colores),
        // Mientras viaja se queda su hueco marcado, tenue: sin el, la semana
        // parece tener un agujero justo donde estaba la clase.
        opacity: arrastrando ? 0.3 : undefined,
      }}
      className={`bloque-clase group absolute flex cursor-grab touch-none flex-col overflow-hidden rounded-[9px] pr-2 pl-3.5 text-left active:cursor-grabbing ${
        conTramo ? 'py-[7px]' : 'justify-center'
      }`}
    >
      <span
        style={{ WebkitLineClamp: renglones }}
        className="[display:-webkit-box] overflow-hidden text-[13px] leading-[1.28] font-medium tracking-[-0.01em] text-tinta [-webkit-box-orient:vertical]"
      >
        {nombre}
      </span>

      {conTramo && (
        <span className="mt-[3px] block truncate text-[11.5px] leading-snug text-tinta-suave tabular-nums">
          {tramoCorto(sesion.inicio, sesion.fin)}
        </span>
      )}

      {conPie && (
        <span className="mt-auto block truncate text-[11px] leading-snug text-tinta-tenue">
          {pie.join(' · ')}
        </span>
      )}

      {/* Los tres puntos SON el boton del menu, no un adorno. El cuerpo del
          bloque queda entonces para una sola cosa -arrastrarlo- y no hay que
          adivinar que hace un click segun donde caiga.
          El pointerdown se para aqui para que pulsarlos no arranque un
          arrastre: sin eso, el gesto empezaria y el click nunca llegaria.
          Se quedan visibles mientras el menu esta abierto; si desaparecieran
          al salir el raton del bloque, el menu quedaria colgando de nada.
          Van abajo y con su propio fondo: arriba taparian el nombre, que es
          lo primero que se lee. */}
      <button
        type="button"
        aria-label={`Acciones de ${nombre}`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          alAbrirMenu(sesion, e.currentTarget)
        }}
        className={`acciones-clase absolute right-1 bottom-1 grid size-6 cursor-pointer place-items-center rounded-full text-tinta transition-opacity duration-150 focus-visible:opacity-100 ${
          menuAbierto ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
      >
        <MoreHorizontal size={15} />
      </button>
    </div>
  )
}

export default memo(BloqueClase)
