import { useEsTelefono } from '../hooks/useEsTelefono'

import '../estilos/plan-ruta.css'

import HojaInferior from './HojaInferior'
import Cabecera from './plan/Cabecera'
import Ruta from './plan/Ruta'

/**
 * Planificar mi ruta: cuando te gradúas, con que carga, y en que orden.
 *
 * En el telefono es una hoja que sube desde abajo, como la del avance de la
 * que se abre. En escritorio, una ventana con la ruta a la izquierda y, a la
 * derecha, la hoja que se imprime tal como va a salir.
 *
 * Mientras esta cerrada no calcula nada: el plan vive en Ruta, que solo se
 * monta con la hoja abierta.
 */
function PlanRuta({ abierto, alCerrar, ...datos }) {
  const telefono = useEsTelefono()

  if (telefono) {
    return (
      <HojaInferior
        abierta={abierto}
        alCerrar={alCerrar}
        etiqueta="Tu ruta"
        cabecera={<Cabecera carrera={datos.carrera} alCerrar={alCerrar} />}
      >
        <Ruta {...datos} telefono />
      </HojaInferior>
    )
  }
  return abierto ? <Ruta {...datos} alCerrar={alCerrar} /> : null
}

export default PlanRuta
