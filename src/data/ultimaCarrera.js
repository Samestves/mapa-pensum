import { guardar, leer } from './almacen'

const CLAVE = 'mapa-pensum:ultima-carrera'

/**
 * Ultima carrera abierta. Sirve para marcarla con "Continuar" en el selector,
 * no para redirigir: saltar automaticamente dejaria el selector inalcanzable
 * para quien ya entro una vez, y esa pantalla es tambien la que posiciona en
 * buscadores.
 */
export function recordarCarrera(slug) {
  // Si el almacen no deja escribir no pasa nada: solo no habra atajo
  guardar(CLAVE, slug)
}

export function ultimaCarrera() {
  return leer(CLAVE)
}
