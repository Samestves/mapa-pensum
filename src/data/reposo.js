/**
 * Corre `fn` cuando el aparato no tiene nada mejor que hacer, y devuelve como
 * cancelarlo, que es lo que espera un efecto de React.
 *
 * Sin requestIdleCallback (Safari), un rato despues. El tope de cuatro
 * segundos es para el telefono que nunca llega a estar en reposo: lo que se
 * deja para luego tiene que acabar pasando.
 */
export function enReposo(fn) {
  if ('requestIdleCallback' in window) {
    const id = requestIdleCallback(fn, { timeout: 4000 })
    return () => cancelIdleCallback(id)
  }
  const id = setTimeout(fn, 2500)
  return () => clearTimeout(id)
}
