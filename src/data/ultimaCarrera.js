const CLAVE = 'mapa-pensum:ultima-carrera'

/**
 * Ultima carrera abierta. Sirve para marcarla con "Continuar" en el selector,
 * no para redirigir: saltar automaticamente dejaria el selector inalcanzable
 * para quien ya entro una vez, y esa pantalla es tambien la que posiciona en
 * buscadores.
 */
export function recordarCarrera(slug) {
  try {
    localStorage.setItem(CLAVE, slug)
  } catch {
    // Modo privado: no pasa nada, solo no habra atajo la proxima vez
  }
}

export function ultimaCarrera() {
  try {
    return localStorage.getItem(CLAVE)
  } catch {
    return null
  }
}
