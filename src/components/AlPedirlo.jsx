import { Suspense, useState } from 'react'

/**
 * Monta `children` la primera vez que `cuando` es cierto, y ya no lo quita.
 *
 * Es para lo que vive en un trozo aparte y se abre de vez en cuando -el plan
 * de ruta, la paleta-: mientras nadie lo pide no se monta nada, y su codigo
 * no hace falta para pintar la carrera. Despues se queda montado, cerrado:
 * lo que se cierra con una animacion de salida no puede desmontarse a medias.
 *
 * Mientras llega el codigo no enseña nada: es algo que se abre encima, no un
 * hueco en la pagina. Y casi nunca se espera, porque los trozos se adelantan
 * en reposo (ver PedirElResto en carreraPorTrozos.js).
 */
export default function AlPedirlo({ cuando, children }) {
  const [pedido, setPedido] = useState(cuando)
  if (cuando && !pedido) setPedido(true)
  return pedido ? <Suspense fallback={null}>{children}</Suspense> : null
}
