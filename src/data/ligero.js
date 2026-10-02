/**
 * El modo ligero: el mismo mapa y la misma app, sin lo que en un telefono
 * se paga en cada fotograma.
 *
 * Medido con Chrome a CPU x4 y pantalla de telefono, el mapa quieto gastaba
 * un 20 % del hilo principal sin que nadie lo tocara: la luz que corre por
 * los cables es una animacion de guiones, y cada cuadro de esa animacion
 * repinta su plano entero. Y las islas de cristal desenfocan lo que tienen
 * detras en cada cuadro en que eso se mueve. En un portatil o un telefono
 * bueno no se nota; en uno de 3 o 4 GB, que es lo que tiene la mayoria de
 * los estudiantes, es la diferencia entre ir fluido e ir a tirones.
 *
 * Con modo ligero los cables de lo que puedes inscribir quedan encendidos
 * pero quietos, las islas son opacas, las hojas no llevan sombra y el mapa
 * se pinta con menos margen fuera de la pantalla (ver MARGEN_CAPA), que es
 * memoria de GPU. Se ve igual de claro que hay que hacer y donde; solo deja
 * de haber cosas moviendose solas.
 *
 * Se decide una vez, al arrancar. Va ligero todo lo tactil: probado en
 * telefonos reales, la memoria que dice el navegador no separa los que van
 * bien de los que no -un Tecno con 8 GB y un procesador de gama baja dice lo
 * mismo que uno de gama alta-, y quien estudia con el telefono quiere que
 * responda antes que una luz corriendo por los cables. En escritorio, solo
 * si el equipo es justo: 4 GB o menos, o 4 nucleos o menos. Y siempre que se
 * pida menos movimiento o ahorro de datos.
 */
export function esAparatoModesto({ tactil, memoria, nucleos, ahorroDatos, menosMovimiento }) {
  return Boolean(
    tactil ||
      menosMovimiento ||
      ahorroDatos ||
      (memoria != null && memoria <= 4) ||
      (nucleos != null && nucleos <= 4),
  )
}

/** Si la app arranco en modo ligero. Fuera del navegador -en las pruebas- no. */
export const esModoLigero = () =>
  typeof document !== 'undefined' && document.documentElement.hasAttribute('data-ligero')

/** Marca <html data-ligero> si el aparato es modesto. Ver index.css. */
export function aplicarModoLigero() {
  const modesto = esAparatoModesto({
    tactil: window.matchMedia('(pointer: coarse)').matches,
    memoria: navigator.deviceMemory,
    nucleos: navigator.hardwareConcurrency,
    ahorroDatos: navigator.connection?.saveData,
    menosMovimiento: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  })
  document.documentElement.toggleAttribute('data-ligero', modesto)
}
