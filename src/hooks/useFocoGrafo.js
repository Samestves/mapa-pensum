import { useMemo } from 'react'
import { NODO } from '../layout/constantes'
import { cadenaDe } from '../layout/relaciones'
import { planoDeFoco } from '../layout/foco'

/**
 * Logica de foco del grafo: que nodo esta seleccionado o señalado, que cadena
 * de prelaciones forma, que queda nitido en el plano de foco (ver
 * layout/foco.js), y los datos que necesita la ficha flotante
 * (DetalleAsignatura).
 *
 * Se extrae de GrafoPensum para que el componente se quede solo con el
 * renderizado del SVG y no mezcle calculo de foco con JSX.
 */
export function useFocoGrafo({
  seleccionado,
  senalado,
  estados,
  relaciones,
  porCodigo,
  nodos,
  casillasFranja,
  aristas,
  enCasilla,
  vista,
}) {
  // Manda la seleccion; el hover solo resalta si no hay nada seleccionado
  const mirada = seleccionado ?? senalado

  /* Cambia de identidad solo cuando cambia lo que se mira: es lo que decide
     si el plano de foco se vuelve a dibujar. */
  const foco = useMemo(
    () =>
      planoDeFoco({
        cadena: mirada ? cadenaDe(mirada, relaciones) : null,
        nodos,
        casillasFranja,
        aristas,
        enCasilla,
      }),
    [mirada, relaciones, nodos, casillasFranja, aristas, enCasilla],
  )

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
      /* El rectangulo del nodo en pixeles de pantalla: x es su borde
         DERECHO, y el de arriba. Va tambien el alto porque la ficha se
         centra en el nodo y le saca un piquito hacia su mitad, y sin el
         alto la mitad habria que adivinarla. */
      posicion: {
        x: vista.x + (nodoSeleccionado.x + NODO.ancho) * vista.escala,
        y: vista.y + nodoSeleccionado.y * vista.escala,
        ancho: NODO.ancho * vista.escala,
        alto: NODO.alto * vista.escala,
      },
    }
  }, [nodoSeleccionado, seleccionado, relaciones, porCodigo, estados, vista])

  return { mirada, foco, nodoSeleccionado, detalle }
}
