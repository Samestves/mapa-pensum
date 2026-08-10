import { memo } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { colorClase } from '../theme/areas'
import { ABRE, enDoceHoras } from '../layout/horario'

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
 * `carril` y `carriles` solo entran en juego si dos clases se pisaran. El
 * formulario no deja guardar un solape, asi que en la practica siempre son
 * 0 y 1 y el bloque ocupa la columna entera.
 */
function BloqueClase({ sesion, asignatura, pxPorMinuto, arrastrando, menuAbierto, alAgarrar, alAbrirMenu }) {
  const color = colorClase(sesion, asignatura)
  const alto = (sesion.fin - sesion.inicio) * pxPorMinuto
  const nombre = asignatura?.nombre ?? sesion.codigo
  const pie = [sesion.aula, sesion.seccion && `Sec. ${sesion.seccion}`].filter(Boolean)

  return (
    <div
      id={`clase-${sesion.id}`}
      onPointerDown={(e) => alAgarrar(sesion, e)}
      title={`${nombre} · ${enDoceHoras(sesion.inicio)} a ${enDoceHoras(sesion.fin)}`}
      style={{
        top: (sesion.inicio - ABRE) * pxPorMinuto,
        height: Math.max(alto - 4, 22),
        left: `calc(${(sesion.carril / sesion.carriles) * 100}% + 4px)`,
        width: `calc(${(1 / sesion.carriles) * 100}% - 8px)`,
        backgroundColor: `color-mix(in oklab, ${color} 12%, var(--panel))`,
        borderColor: `color-mix(in oklab, ${color} 28%, transparent)`,
        '--sombra': `color-mix(in oklab, ${color} 30%, transparent)`,
        // Mientras viaja se queda su hueco marcado, tenue: sin el, la semana
        // parece tener un agujero justo donde estaba la clase.
        opacity: arrastrando ? 0.3 : undefined,
      }}
      className={`bloque-clase group absolute flex touch-none cursor-grab flex-col overflow-hidden rounded-xl border px-3 text-left transition-[transform,box-shadow] duration-200 hover:-translate-y-px hover:shadow-[0_6px_18px_-8px_var(--sombra)] active:cursor-grabbing ${
        alto < CABE_HORA ? 'justify-center py-1' : 'py-2'
      }`}
    >
      {/* El nombre lleva el color de la materia y el resto va en gris: el
          bloque entero ya esta teñido, asi que repetir el color en cada linea
          solo le quita jerarquia a la unica que identifica la clase. */}
      <span
        style={{ color: `color-mix(in oklab, ${color} 58%, var(--tinta))` }}
        className={`text-[13px] leading-tight font-extrabold ${
          alto >= CABE_PIE ? 'line-clamp-2' : 'block truncate'
        }`}
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
        className={`absolute top-1 right-1 grid size-6 cursor-pointer place-items-center rounded-md text-tinta-tenue transition-[opacity,background-color] duration-150 hover:bg-tinta/[0.06] hover:text-tinta focus-visible:opacity-100 ${
          menuAbierto ? 'bg-tinta/[0.06] text-tinta opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
      >
        <MoreHorizontal size={15} />
      </button>

      {alto >= CABE_HORA && (
        <span className="mt-1 block truncate text-[11.5px] font-semibold tabular-nums text-tinta-suave">
          {enDoceHoras(sesion.inicio)} – {enDoceHoras(sesion.fin)}
        </span>
      )}

      {alto >= CABE_PIE && pie.length > 0 && (
        <span className="mt-1 block truncate text-[11px] font-medium text-tinta-tenue">
          {pie.join('  ·  ')}
        </span>
      )}

      {alto >= CABE_PROFESOR && sesion.profesor && (
        <span className="mt-auto block truncate text-[11px] font-medium text-tinta-tenue">
          {sesion.profesor}
        </span>
      )}
    </div>
  )
}

export default memo(BloqueClase)
