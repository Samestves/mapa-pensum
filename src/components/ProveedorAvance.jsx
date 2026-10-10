import { useCallback, useLayoutEffect, useMemo, useRef } from 'react'
import {
  ContextoAcciones,
  ContextoAvance,
  ContextoDescarga,
  ContextoToque,
} from '../hooks/useAvance'
import { usePensum } from '../hooks/usePensum'

/**
 * Dueño del avance de una carrera: llama a usePensum y lo reparte por
 * contextos (ver useAvance). Es el unico sitio que repinta por una marca.
 *
 * Tiene que montarse con una key por carrera, como VistaCarrera: las acciones
 * de usePensum solo cambian de identidad con el slug, y que no cambien en toda
 * la vida del proveedor es lo que mantiene fuera de cada marca a quien solo
 * actua.
 */
export default function ProveedorAvance({ carrera, children }) {
  const {
    marcas,
    estados,
    progreso,
    avanceGrupos,
    descarga,
    toque,
    marcar,
    marcarVarias,
    reiniciar,
  } = usePensum(carrera)

  const avance = useMemo(
    () => ({ marcas, estados, progreso, avanceGrupos }),
    [marcas, estados, progreso, avanceGrupos],
  )

  /* leer() devuelve el avance de la ultima pasada ya pintada. La ref se pone
     al dia en un efecto y no durante el render: un render que React descarta
     no puede dejar aqui un avance que nunca llego a la pantalla. */
  const vigente = useRef(avance)
  useLayoutEffect(() => {
    vigente.current = avance
  }, [avance])
  const leer = useCallback(() => vigente.current, [])

  const acciones = useMemo(
    () => ({ marcar, marcarVarias, reiniciar, leer }),
    [marcar, marcarVarias, reiniciar, leer],
  )

  return (
    <ContextoAvance value={avance}>
      <ContextoToque value={toque}>
        <ContextoDescarga value={descarga}>
          <ContextoAcciones value={acciones}>{children}</ContextoAcciones>
        </ContextoDescarga>
      </ContextoToque>
    </ContextoAvance>
  )
}
