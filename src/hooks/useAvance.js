import { createContext, useContext } from 'react'

/**
 * El avance del estudiante, repartido por contextos.
 *
 * Antes lo sabia todo VistaCarrera y lo bajaba por props: cada marca la
 * repintaba entera y, de paso, a los ciento y pico hijos que ni lo miraban.
 * Ahora usePensum vive en ProveedorAvance y cada componente lee solo lo que
 * usa. Como `children` del proveedor es el mismo elemento entre renders, React
 * no baja a repintar lo de dentro: solo vuelve a pintar a los consumidores del
 * contexto que cambio.
 *
 * Son cuatro contextos y no uno porque cambian en momentos distintos:
 *
 *  - ContextoAvance: marcas, estados, progreso y avance de grupos. Salen del
 *    mismo calculo y cambian juntos, en cada marca.
 *  - ContextoToque: la ultima tarjeta tocada, para su anillo.
 *  - ContextoDescarga: la ultima aprobada, para la luz de los cables. Se limpia
 *    sola a los 2,4 s; si viviera con el avance, acabar la animacion repintaria
 *    a todos los que leen las marcas.
 *  - ContextoAcciones: marcar, marcarVarias, reiniciar y leer. Es un solo
 *    objeto con la misma identidad toda la vida del proveedor: quien solo actua
 *    no se repinta nunca por el avance. `leer` devuelve el avance vigente para
 *    los manejadores de eventos que lo necesitan en el momento del click sin
 *    suscribirse a el.
 *
 * Por que contextos y no un almacen con useSyncExternalStore: las vistas viven
 * en un <Activity> que las oculta al dejarlas. Con estado de React, React las
 * pone al dia en segundo plano con prioridad baja y volver a ellas es
 * instantaneo. useSyncExternalStore se suscribe en un efecto, y los efectos de
 * un Activity oculto estan desmontados: todo lo acumulado se repintaria de
 * golpe, y de forma sincrona, al volver a la vista.
 */
export const ContextoAvance = createContext(undefined)
export const ContextoToque = createContext(undefined)
export const ContextoDescarga = createContext(undefined)
export const ContextoAcciones = createContext(undefined)

/* undefined es "no hay proveedor": null es un valor legitimo del toque y de la
   descarga, asi que no sirve para distinguirlo. */
function useContextoObligatorio(contexto, hook) {
  const valor = useContext(contexto)
  if (valor === undefined) throw new Error(`${hook} solo funciona dentro de ProveedorAvance`)
  return valor
}

/** El estado de cada materia: { codigo: aprobada | cursando | disponible | bloqueada } */
export const useEstados = () => useContextoObligatorio(ContextoAvance, 'useEstados').estados

/** Lo que el estudiante marco: { codigo: aprobada | cursando } */
export const useMarcas = () => useContextoObligatorio(ContextoAvance, 'useMarcas').marcas

/** Los totales del avance (ver progresoDe) */
export const useProgreso = () => useContextoObligatorio(ContextoAvance, 'useProgreso').progreso

/** Lo que llevas de la cuota de cada grupo de electivas (ver avanceDeGrupos) */
export const useAvanceGrupos = () =>
  useContextoObligatorio(ContextoAvance, 'useAvanceGrupos').avanceGrupos

/** La ultima tarjeta tocada: { codigo, n }, o null */
export const useToque = () => useContextoObligatorio(ContextoToque, 'useToque')

/** La ultima materia aprobada, mientras dura su animacion: { codigo, n }, o null */
export const useDescarga = () => useContextoObligatorio(ContextoDescarga, 'useDescarga')

/**
 * Lo que se puede hacer con el avance: { marcar, marcarVarias, reiniciar, leer }.
 * No suscribe al avance, asi que no repinta nunca por el.
 */
export const useAccionesAvance = () => useContextoObligatorio(ContextoAcciones, 'useAccionesAvance')
