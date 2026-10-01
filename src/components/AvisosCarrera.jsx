import { X } from 'lucide-react'
import { IconoAviso } from './IconosSF'
import { CELDA_BASE } from './estiloCabecera'

/**
 * Las salvedades de una carrera: de donde salio el pensum, que se dedujo y
 * que no cuadra en la fuente.
 *
 * Existian en los datos desde el principio pero no se enseñaban en ninguna
 * parte, o sea que en la practica era como no tenerlas. Un proyecto que
 * dedica media documentacion a ser honesto con los datos no puede guardarse
 * las dudas en un JSON.
 *
 * Va partido en boton y panel, y no en un solo componente con su estado
 * dentro, por la misma razon que PanelProgreso: el panel se pinta sobre la
 * vista y no dentro de la isla, que es una capsula con overflow recortado.
 * El boton se queda en la isla y el panel cuelga de la vista.
 */
export function BotonAvisos({ cantidad, abierto, alPulsar }) {
  if (!cantidad) return null
  const etiqueta = `${cantidad} salvedad${cantidad > 1 ? 'es' : ''} sobre estos datos`

  return (
    <button
      type="button"
      onClick={alPulsar}
      title={etiqueta}
      aria-label={etiqueta}
      aria-expanded={abierto}
      /* Es una celda, no una isla: el cristal lo pone la isla que la
         envuelve en la cabecera. El ambar ya lo distingue de sobra. */
      className={`${CELDA_BASE} w-9 text-cursando ${abierto ? 'bg-cursando/15' : 'hover:bg-cursando/10'}`}
    >
      {/* Sube un pixel como el resto de la barra: es un boton mas de la fila
          y responder distinto al mismo gesto lo desemparejaria del grupo. */}
      <IconoAviso
        size={18}
        relleno={abierto}
        className="transition-transform duration-200 group-hover:-translate-y-px"
      />
    </button>
  )
}

function PanelAvisos({ avisos, abierto, alCerrar }) {
  if (!abierto || !avisos?.length) return null

  return (
    <>
      <button
        type="button"
        aria-label="Cerrar"
        onClick={alCerrar}
        className="fixed inset-0 z-30 cursor-default"
      />
      <div className="surgir absolute top-[calc(var(--reserva-cabecera)+0.25rem)] right-3 z-40 flex max-h-[calc(100%-var(--reserva-cabecera)-1.25rem)] w-[21rem] max-w-[calc(100vw-1.5rem)] flex-col overflow-y-auto rounded-2xl border border-panel-borde bg-panel/95 p-4 shadow-2xl backdrop-blur-xl">
        <div className="flex items-start justify-between gap-3">
          <h2 className="flex items-center gap-2 text-[12px] leading-snug font-extrabold text-tinta">
            <IconoAviso size={15} relleno className="shrink-0 text-cursando" />
            Salvedades sobre estos datos
          </h2>
          <button
            type="button"
            onClick={alCerrar}
            aria-label="Cerrar"
            className="-mt-0.5 -mr-1 grid size-6 shrink-0 place-items-center rounded-lg text-tinta-tenue transition-colors duration-200 hover:text-tinta"
          >
            <X size={14} />
          </button>
        </div>

        <ul className="mt-3 flex flex-col gap-2.5">
          {avisos.map((aviso) => (
            <li
              key={aviso}
              className="border-l-2 border-panel-borde pl-2.5 text-[11px] leading-relaxed text-tinta-suave"
            >
              {aviso}
            </li>
          ))}
        </ul>

        <p className="mt-3 border-t border-panel-borde pt-2.5 text-[10px] leading-relaxed text-tinta-tenue">
          Ante cualquier duda, control de estudios manda.
        </p>
      </div>
    </>
  )
}

export default PanelAvisos
