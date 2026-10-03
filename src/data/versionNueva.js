/* Cuanto tiene que pasar entre dos recargas por esto. Si al recargar sigue
   fallando, no es una version vieja: se deja ver el error en vez de entrar
   en un bucle de recargas. */
const ENTRE_RECARGAS_MS = 15_000
const CLAVE = 'mapa-pensum:recarga-por-version'

/* Lo que se espera antes de recargar. El trozo se empieza a bajar al rozar
   la tarjeta de una carrera, antes de que el toque cambie la URL: recargando
   en el acto se volveria a la portada. Con esta espera el toque ya llevo a
   la carrera -la salida de la portada dura 170 ms, ver useRuta- y la
   recarga cae en ella. */
const ESPERA_NAVEGACION_MS = 400

/**
 * Cuando un trozo de la aplicacion no se puede bajar, recarga la pagina una
 * vez, ya con la version publicada.
 *
 * Pasa al publicar: los archivos llevan un hash en el nombre, y quien tenia
 * abierta la version anterior -o la tenia guardada sin conexion- pide al
 * entrar a una carrera un archivo que ya no existe. Sin esto veia "Failed to
 * fetch dynamically imported module" hasta recargar a mano.
 *
 * Antes de recargar borra la copia sin conexion: si guardo algo roto de una
 * version anterior, recargar la volveria a servir. El service worker la
 * rehace en cuanto se instala la version nueva.
 *
 * Escucha `vite:preloadError`, que Vite lanza cuando falla un import
 * dinamico o lo que este necesita.
 */
export function recargarSiHayVersionNueva(evento) {
  let ultima = 0
  try {
    ultima = Number(sessionStorage.getItem(CLAVE)) || 0
  } catch {
    // Sin sessionStorage no se puede saber si ya se intento: mejor no recargar
    return
  }
  if (Date.now() - ultima < ENTRE_RECARGAS_MS) return

  evento.preventDefault()
  try {
    sessionStorage.setItem(CLAVE, String(Date.now()))
  } catch {
    // Si no se puede apuntar, la recarga sigue: lo peor es otra mas
  }
  const borrar =
    'caches' in window
      ? caches.keys().then((claves) => Promise.all(claves.map((c) => caches.delete(c))))
      : Promise.resolve()
  Promise.all([
    borrar.catch(() => {}),
    new Promise((r) => setTimeout(r, ESPERA_NAVEGACION_MS)),
  ]).then(() => window.location.reload())
}

/**
 * Envuelve el import de una vista diferida. Si el trozo fallo y ya se esta
 * recargando (ver arriba), Vite devuelve el modulo vacio: en vez de pasarselo
 * a React, que pintaria su pantalla de error, se espera para siempre. La
 * vista se queda en su silueta de carga hasta que llega la recarga.
 */
export const conRecarga = (importar) => () =>
  importar().then((modulo) => modulo ?? new Promise(() => {}))
