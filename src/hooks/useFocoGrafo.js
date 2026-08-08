import { useMemo } from 'react'
import { NODO } from '../layout/constantes'
import { cadenaDe } from '../layout/relaciones'

/**
 * Logica de foco del grafo: que nodo esta seleccionado o senalado, que cadena
 * de prelaciones forma, que nodos se atenúan, y los datos que necesita la ficha
 * flotante (DetalleAsignatura).
 *
 * Se extrae de GrafoPensum para que el componente se quede solo con el
 * renderizado del SVG y no mezcle calculo de foco con JSX.
 */
export function useFocoGrafo({
  seleccionado,
  senalado,
  areaFiltrada,
  estados,
  relaciones,
  porCodigo,
  vista,
}) {
  // Manda la seleccion; el hover solo resalta si no hay nada seleccionado
  const foco = seleccionado ?? senalado

  const cadena = useMemo(
    () => (foco ? cadenaDe(foco, relaciones) : null),
    [foco, relaciones],
  )

  // Un nodo se apaga si hay una cadena en foco y no entra, o si hay un area
  // filtrada desde el panel y no es la suya.
  const atenuado = (codigo) => {
    if (areaFiltrada && porCodigo.get(codigo)?.area !== areaFiltrada) return true
    return cadena != null && !cadena.has(codigo)
  }

  const nodoSeleccionado = seleccionado ? porCodigo.get(seleccionado) : null

  const detalle = useMemo(() => {
    if (!nodoSeleccionado) return null
    const relacionadas = (codigos) =>
      codigos
        .map((c) => porCodigo.get(c))
        .filter(Boolean)
        .map((asignatura) => ({ asignatura, estado: estados[asignatura.codigo] }))

    return {
      prerrequisitos: relacionadas(relaciones.atras.get(seleccionado) ?? []),
      desbloquea: relacionadas(relaciones.adelante.get(seleccionado) ?? []),
      posicion: {
        x: vista.x + (nodoSeleccionado.x + NODO.ancho) * vista.escala,
        y: vista.y + nodoSeleccionado.y * vista.escala,
        ancho: NODO.ancho * vista.escala,
      },
    }
  }, [nodoSeleccionado, seleccionado, relaciones, porCodigo, estados, vista])

  return { foco, cadena, atenuado, nodoSeleccionado, detalle }
}
