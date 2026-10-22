import { guardar, leer } from './almacen'

const CLAVE = 'mapa-pensum:bienvenida'

/* La bienvenida sale una vez: al cerrarla, saltarla o terminarla se apunta,
   y desde el menu se puede volver a ver. */
export const bienvenidaVista = () => leer(CLAVE) === 'vista'

export const recordarBienvenida = () => guardar(CLAVE, 'vista')
