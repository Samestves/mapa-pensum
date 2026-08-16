import { TriangleAlert, X } from 'lucide-react'

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
 * dentro, por la misma razon que PanelProgreso: la cabecera es colapsable y
 * sus hijos llevan overflow:hidden para que la animacion de plegado no
 * desborde. Cualquier panel colgado del boton se recortaria contra ese borde.
 * El boton se queda en la barra y el panel se pinta sobre el mapa.
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
      /* Sin borde, como el resto de la barra: el color ambar ya lo distingue
         de sobra y no hacia falta ademas encerrarlo en una caja. */
      className={`transicion-tema group grid size-9 shrink-0 place-items-center rounded-lg text-cursando transition-[background-color,color,transform] duration-150 active:scale-[0.92] ${
        abierto ? 'bg-panel-suave' : 'hover:bg-panel-suave'
      }`}
    >
      {/* Sube un pixel como el resto de la barra: es un boton mas de la fila
          y responder distinto al mismo gesto lo desemparejaria del grupo. */}
      <TriangleAlert
        size={16}
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
      <div className="surgir transicion-tema absolute top-2 right-3 z-40 flex max-h-[calc(100%-1rem)] w-[21rem] max-w-[calc(100vw-1.5rem)] flex-col overflow-y-auto rounded-2xl border border-panel-borde bg-panel/95 p-4 shadow-2xl backdrop-blur-xl">
        <div className="flex items-start justify-between gap-3">
          <h2 className="flex items-center gap-2 text-[12px] leading-snug font-extrabold text-tinta">
            <TriangleAlert size={14} className="shrink-0 text-cursando" />
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
