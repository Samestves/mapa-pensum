/* Lo que hace falta para SUBIR un horario, antes de leer nada: que imagenes
   se pueden elegir y empezar a traer el lector.

   Aparte de leerHorario.js a proposito. Esto lo usa la pantalla del horario,
   que se abre a diario; lo de leer -reducir la imagen, hablar con el servidor,
   los mensajes de cada fallo- solo hace falta con una foto ya elegida, y vive
   en el trozo de la hoja que la lee (ver carreraPorTrozos.js). */

/* Lo que el selector de archivos deja elegir. Sin esto, en el telefono se
   abre el explorador entero y hay que ir a buscar la foto entre los PDF.
   Lo piden tres pantallas -la bienvenida, el menu del horario y el reintento
   de la revision-: una sola lista, para que no se separen el dia que alguien
   añada un formato. */
export const FORMATOS = 'image/png,image/jpeg,image/webp,image/heic,image/heif'

/**
 * Empieza a bajar el lector del aparato antes de que haga falta.
 *
 * Se llama al tocar "Subir una foto": mientras se busca la captura en la
 * galeria, que son unos segundos, el lector ya va llegando. Con el ahorro de
 * datos activado no se adelanta nada; se bajara al leer, si hace falta.
 */
export function precalentarLector() {
  if (navigator.connection?.saveData) return
  import('./lectorLocal.js').then((lector) => lector.precargar()).catch(() => {})
}
