/**
 * Adyacencia del grafo en las dos direcciones. Se construye una sola vez y
 * sirve para resaltar la cadena completa al pasar el cursor por un nodo.
 */
export function construirRelaciones(nodos) {
  const atras = new Map() // codigo → prerrequisitos directos
  const adelante = new Map() // codigo → asignaturas que desbloquea

  for (const n of nodos) {
    atras.set(n.codigo, n.prerrequisitos ?? [])
    if (!adelante.has(n.codigo)) adelante.set(n.codigo, [])
  }

  for (const n of nodos) {
    for (const pre of n.prerrequisitos ?? []) {
      if (!adelante.has(pre)) adelante.set(pre, [])
      adelante.get(pre).push(n.codigo)
    }
  }

  return { atras, adelante }
}

// Recorrido en profundidad. El Set de vistos tambien lo hace inmune a ciclos,
// aunque el validador ya garantiza que no los hay.
function alcanzables(inicio, mapa) {
  const vistos = new Set()
  const pila = [...(mapa.get(inicio) ?? [])]

  while (pila.length) {
    const codigo = pila.pop()
    if (vistos.has(codigo)) continue
    vistos.add(codigo)
    pila.push(...(mapa.get(codigo) ?? []))
  }

  return vistos
}

/**
 * Toda la cadena de un nodo: sus prerrequisitos hacia atras (directos e
 * indirectos), todo lo que desbloquea hacia adelante, y el nodo en si.
 */
export function cadenaDe(codigo, relaciones) {
  return new Set([
    codigo,
    ...alcanzables(codigo, relaciones.atras),
    ...alcanzables(codigo, relaciones.adelante),
  ])
}
