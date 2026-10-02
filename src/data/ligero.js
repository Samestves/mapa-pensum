/**
 * El modo ligero: el mismo mapa y la misma app, sin lo que en un telefono
 * modesto se paga en cada fotograma.
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
 * pero quietos, y las islas son opacas. Se ve igual de claro que hay que
 * hacer y donde; solo deja de haber cosas moviendose solas.
 *
 * Se decide una vez, al arrancar, con lo que el navegador cuenta del
 * aparato. deviceMemory solo existe en Chrome y lo redondea a potencias de
 * dos -un telefono de 6 GB dice 4-; donde no existe (Safari) no se supone
 * nada y va completo, que en un iPhone sobra potencia.
 */
export function esAparatoModesto({ memoria, nucleos, ahorroDatos, menosMovimiento }) {
  return Boolean(
    menosMovimiento ||
      ahorroDatos ||
      (memoria != null && memoria <= 4) ||
      (nucleos != null && nucleos <= 4),
  )
}

/** Marca <html data-ligero> si el aparato es modesto. Ver index.css. */
export function aplicarModoLigero() {
  const modesto = esAparatoModesto({
    memoria: navigator.deviceMemory,
    nucleos: navigator.hardwareConcurrency,
    ahorroDatos: navigator.connection?.saveData,
    menosMovimiento: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  })
  document.documentElement.toggleAttribute('data-ligero', modesto)
}
