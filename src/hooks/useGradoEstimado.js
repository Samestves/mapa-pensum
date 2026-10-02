import { useMemo } from 'react'
import { leerCarga } from '../data/cargaPlan'
import { mesEstimadoGrado, planificar } from '../layout/planificador'

/**
 * Cuando te gradúas, con el mismo calculo que el plan de ruta.
 *
 * Es la respuesta que el plan da al final de la hoja, adelantada: la hoja de
 * avance del telefono la enseña en la tarjeta que abre el plan, y asi el
 * boton dice lo que vas a encontrar antes de pulsarlo.
 *
 * Usa la carga por semestre que el estudiante eligio en el plan, no una
 * propia: si la hoja dijera "julio de 2029" y el plan "enero de 2030", una de
 * las dos estaria mintiendo.
 *
 * Solo se calcula mientras el componente que lo llama esta montado. La hoja
 * lo monta al abrirse, asi que con la hoja cerrada no cuesta nada.
 */
export function useGradoEstimado({ asignaturas, grupos, marcas, elegidas }) {
  return useMemo(() => {
    const carga = leerCarga()
    const plan = planificar({ asignaturas, grupos, marcas, elegidas, carga })
    const semestres = plan.semestres.length
    return {
      semestres,
      materias: plan.materiasRestantes,
      fecha: mesEstimadoGrado(semestres),
      carga,
    }
  }, [asignaturas, grupos, marcas, elegidas])
}
