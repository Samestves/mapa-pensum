/**
 * Que se queda nitido cuando el mapa enfoca algo.
 *
 * El mapa se dibuja por planos (ver GrafoPensum): uno con todo, que se pinta
 * una vez y no se vuelve a tocar al señalar, y encima otro con solo lo que esta
 * en foco. Enfocar no apaga tarjeta por tarjeta: apaga el plano de abajo
 * entero, como una sola textura que la GPU oscurece y desenfoca, y lo que esta
 * en foco se ve nitido porque va dibujado otra vez por encima.
 *
 * Esto decide QUE va en ese plano de encima. Aritmetica de conjuntos, sin
 * React, para poder probarla.
 */

/**
 * Lo que se ve nitido con el foco puesto, o null si no hay foco.
 *
 * Hay foco cuando se mira una cadena: la materia señalada o elegida con sus
 * prelaciones hacia atras y hacia delante.
 *
 * Devuelve las claves de lo DIBUJADO, no de las materias: una casilla de
 * electiva se dibuja con su codigo de casilla aunque cuente por la electiva
 * que lleva dentro. Un cable entra si se ven sus dos puntas.
 */
export function planoDeFoco({ cadena, nodos, casillasFranja, aristas, enCasilla }) {
  if (!cadena) return null

  const claves = new Set()
  for (const nodo of [...nodos, ...casillasFranja]) {
    // Una casilla llena cuenta por su electiva; vacia, por si misma
    const codigo = nodo.esHueco ? (enCasilla(nodo.codigo)?.codigo ?? nodo.codigo) : nodo.codigo
    if (cadena.has(codigo)) claves.add(nodo.codigo)
  }

  const cables = new Set()
  for (const arista of aristas) {
    if (cadena.has(arista.origen) && cadena.has(arista.destino)) cables.add(arista.id)
  }

  return { nodos: claves, aristas: cables, cadena }
}

/** Lo que esta en `a` y no en `b` (o todo `a` si no hay `b`) */
export function sinLoDe(a, b) {
  if (!a) return new Set()
  if (!b) return new Set(a)
  const resto = new Set()
  for (const x of a) if (!b.has(x)) resto.add(x)
  return resto
}

/**
 * Lo que sale del foco al pasar de `antes` a `despues`, y como sale; o null
 * si antes no habia foco.
 *
 * Lo que ENTRA en el foco se enciende de golpe, como el resaltado de un menu
 * del sistema: el ojo va a lo que se acaba de señalar, y una entrada fundida
 * se lee como retraso. Lo que SALE se funde: se dibuja en un plano aparte,
 * debajo del de foco, y ese plano entero se apaga en la GPU sobre la copia ya
 * apagada de la base, asi que se ve igual que una tarjeta apagandose.
 *
 * Al APAGAR el foco del todo no se funde nada: es la base la que vuelve a
 * encenderse por debajo, y lo que estaba en foco se SOSTIENE encima mientras
 * tanto. Fundirlo a la vez haria un parpadeo.
 */
export function salidaDeFoco(antes, despues) {
  if (!antes) return null
  return {
    nodos: sinLoDe(antes.nodos, despues?.nodos),
    aristas: sinLoDe(antes.aristas, despues?.aristas),
    cadena: antes.cadena,
    fundir: despues != null,
  }
}
