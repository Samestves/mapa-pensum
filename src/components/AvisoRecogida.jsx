import { useEffect } from 'react'
import { IconoSituacion } from './IconoSituacion'
import { SITUACION } from '../layout/situacion'

/* Lo que se queda en pantalla. Da tiempo a leer dos nombres y a pulsar
   Deshacer, y se va antes de estorbar. */
const DURACION = 5200

/**
 * El aviso de lo que acabas de conseguir al aprobar una materia: cuantas se
 * te abren y cuales. Es el mismo gesto que el juego usa al recoger algo, una
 * linea discreta en la esquina que entra, se lee y se va sola.
 *
 * Lleva Deshacer porque aprobar ahora aparta la ficha: sin el, corregir un
 * toque equivocado obligaba a buscar la materia otra vez y abrirla.
 *
 * Entra con retraso a proposito, cuando la luz del cable ya llego a su
 * destino: primero se ve lo que paso y despues se lee.
 */
function AvisoRecogida({ aviso, alDeshacer, alCerrar }) {
  useEffect(() => {
    const reloj = setTimeout(alCerrar, DURACION)
    return () => clearTimeout(reloj)
  }, [aviso.n, alCerrar])

  const cuantas = aviso.desbloqueadas.length

  return (
    <div
      role="status"
      className="aviso-recogida transicion-tema absolute left-4 z-30 flex max-w-[calc(100%-2rem)] items-center gap-3 rounded-[10px] border border-panel-borde bg-panel py-2.5 pr-2 pl-3 shadow-xl"
      style={{ bottom: 'calc(var(--reserva-barra, 0px) + 1rem)' }}
    >
      <span
        className="grid size-8 shrink-0 place-items-center rounded-full border font-dato text-[11px] font-light"
        style={{
          borderColor: 'color-mix(in oklab, var(--estado-aprobada) 55%, transparent)',
          color: 'var(--estado-aprobada)',
        }}
      >
        {cuantas ? (
          `+${cuantas}`
        ) : (
          <IconoSituacion situacion={SITUACION.HECHA} size={14} color="var(--estado-aprobada)" />
        )}
      </span>
      <div className="min-w-0">
        <p className="font-ui text-[9.5px] font-medium tracking-[0.24em] text-tinta uppercase">
          {cuantas === 0 ? 'Aprobada' : cuantas === 1 ? 'Desbloqueada' : 'Desbloqueadas'}
        </p>
        <p className="truncate text-[12.5px] text-tinta-suave" style={{ fontWeight: 380 }}>
          {cuantas ? aviso.desbloqueadas.join(' · ') : aviso.nombre}
        </p>
      </div>
      <button
        type="button"
        onClick={alDeshacer}
        className="ml-1 shrink-0 rounded-full px-3 py-2 font-ui text-[9.5px] font-medium tracking-[0.2em] text-tinta-suave uppercase transition-colors hover:bg-panel-suave hover:text-tinta"
      >
        Deshacer
      </button>
    </div>
  )
}

export default AvisoRecogida
