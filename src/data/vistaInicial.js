import { guardar, leer } from './almacen'

const CLAVE = 'mapa-pensum:vista'

/**
 * La vista con la que abre una carrera: la ultima que se uso y, si es la
 * primera vez, la que sirve en ese aparato. En un telefono es la lista: el
 * mapa completo solo cabe a 0.10.
 *
 * Vive aparte porque la regla la necesitan dos que no se conocen: la vista de
 * carrera, para pintarla, y quien empieza a bajar su codigo antes de que la
 * carrera exista (ver carreraPorTrozos.js). La pagina de cada carrera la
 * repite en un script suelto, por lo mismo que el tema: ver
 * scripts/prerenderizar.js. Si cambia aqui, cambia alli.
 */
export const vistaInicial = () => leer(CLAVE) ?? (window.innerWidth < 768 ? 'lista' : 'mapa')

export const recordarVista = (vista) => guardar(CLAVE, vista)
