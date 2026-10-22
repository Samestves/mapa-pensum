import { IconoBuscar } from '../IconosSF'

/**
 * El buscador del telefono: una isla abajo, donde llega el pulgar sin mover
 * la mano. Abre la hoja de buscar (ver BuscadorCarreras). En escritorio no
 * sale: alli el buscador va en linea, encima de la lista.
 */
function BotonBuscar({ abierto, alAbrir }) {
  return (
    <div className="dock-portada">
      <button
        type="button"
        onClick={alAbrir}
        aria-haspopup="dialog"
        aria-expanded={abierto}
        className="panel-cristal boton-buscar"
      >
        <IconoBuscar size={20} />
        Buscar tu carrera
      </button>
    </div>
  )
}

export default BotonBuscar
