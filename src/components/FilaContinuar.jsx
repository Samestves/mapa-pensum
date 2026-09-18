import { ArrowRight } from 'lucide-react'
import { precargarCarrera } from '../data/carreras'
import { precargarVista } from './vistaDiferida'

/**
 * «CONTINUAR», como el primer renglon del menu de un juego: un toque y
 * vuelves a la carrera donde lo dejaste, con cuanto llevas del titulo.
 *
 * Fue una pastillita dentro de una de las nueve tarjetas, que habia que
 * encontrar entre las demas. Ahora es lo primero de la portada.
 *
 * Tiene dos formas porque tiene dos sitios:
 *   - `pastilla`, en la cabecera del escritorio, arriba a la derecha. Ahi no
 *     suma alto: la portada esta medida para que las nueve carreras quepan
 *     en una pantalla de portatil, y una fila de mas las echaria del pliegue;
 *   - `fila`, en el telefono, a lo ancho encima de la lista, con la linea de
 *     avance en el borde de abajo, donde el pulgar llega primero.
 */
function FilaContinuar({ carrera, tema, avance, forma = 'fila', className = '', alElegir }) {
  const color =
    (tema === 'oscuro' ? carrera.color?.oscuro : carrera.color?.claro) ?? 'var(--tinta-suave)'
  const porcentaje = avance == null ? null : Math.round(avance)

  const precargar = () => {
    precargarCarrera(carrera.slug)
    precargarVista()
  }
  const entrar = () => {
    precargar()
    alElegir(carrera.slug)
  }

  if (forma === 'pastilla') {
    return (
      <button
        type="button"
        onClick={entrar}
        onPointerEnter={precargar}
        onFocus={precargar}
        title={`Volver a ${carrera.nombre}`}
        className={`continuar group transicion-tema relative flex items-center gap-3 overflow-hidden rounded-full border border-panel-borde bg-panel py-2 pr-3 pl-4 focus-visible:ring-2 focus-visible:ring-[var(--acento)] focus-visible:outline-none ${className}`}
        style={{ '--acento': color }}
      >
        <span aria-hidden="true" className="filo-carrera filo-fijo" />
        <span className="font-ui text-[9px] font-medium tracking-[0.26em] text-tinta-tenue uppercase">
          Continuar
        </span>
        <span
          aria-hidden="true"
          className="size-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span
          className="max-w-[12rem] truncate font-ui text-[14px] text-tinta"
          style={{ fontWeight: 'var(--peso-nombre)' }}
        >
          {carrera.nombreCorto}
        </span>
        {porcentaje != null && (
          <span
            className="font-dato text-[12px] text-tinta-suave"
            style={{ fontWeight: 'var(--peso-dato)' }}
          >
            {porcentaje}%
          </span>
        )}
        <ArrowRight
          size={15}
          strokeWidth={1.6}
          className="shrink-0 text-tinta-suave transition-transform duration-300 group-hover:translate-x-0.5"
        />
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={entrar}
      onPointerDown={precargar}
      onFocus={precargar}
      className={`continuar group transicion-tema relative flex w-full items-center gap-3 overflow-hidden rounded-[14px] border border-panel-borde bg-panel px-4 py-3.5 text-left focus-visible:ring-2 focus-visible:ring-[var(--acento)] focus-visible:outline-none ${className}`}
      style={{ '--acento': color }}
    >
      <span aria-hidden="true" className="filo-carrera filo-fijo" />
      <span className="min-w-0 flex-1">
        <span className="block font-ui text-[9px] font-medium tracking-[0.26em] text-tinta-tenue uppercase">
          Continuar
        </span>
        <span
          className="mt-1 block truncate font-ui text-[17px] leading-tight text-tinta"
          style={{ fontWeight: 'var(--peso-nombre)' }}
        >
          {carrera.nombre}
        </span>
      </span>
      {porcentaje != null && (
        <span
          className="shrink-0 font-dato text-[13px] text-tinta-suave"
          style={{ fontWeight: 'var(--peso-dato)' }}
        >
          {porcentaje}%
        </span>
      )}
      <span className="boton-aro grid size-9 shrink-0 place-items-center rounded-full">
        <ArrowRight size={16} strokeWidth={1.6} />
      </span>
      {/* Cuanto llevas del titulo, en el borde de abajo y en el color de la
          carrera */}
      {porcentaje != null && (
        <span
          aria-hidden="true"
          className="avance-continuar absolute bottom-0 left-0 h-[2px]"
          style={{ width: `${porcentaje}%`, backgroundColor: color }}
        />
      )}
    </button>
  )
}

export default FilaContinuar
