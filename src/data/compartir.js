/* Sacar de la app las imagenes que dibuja: bajarlas como archivo o mandarlas
   con la hoja de compartir del sistema. Lo usan el horario y la ruta. */

/** Baja el archivo, en el ordenador y en el telefono */
export function descargarArchivo(archivo) {
  const url = URL.createObjectURL(archivo)
  const a = document.createElement('a')
  a.href = url
  a.download = archivo.name
  a.click()
  /* Se suelta despues y no en el acto: Safari y Firefox leen el enlace un
     instante mas tarde, y soltado antes la descarga sale vacia o no sale. */
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/**
 * Si este aparato sabe compartir imagenes con la hoja del sistema. Solo en
 * los tactiles: en el ordenador la hoja de compartir es una rareza y basta
 * con descargar.
 */
export const puedeCompartir = () =>
  window.matchMedia('(pointer: coarse)').matches &&
  Boolean(navigator.canShare?.({ files: [new File([''], 'x.png', { type: 'image/png' })] }))

/**
 * Abre la hoja de compartir con la imagen y lo que diria uno al mandarla.
 * Devuelve si se mando. Nunca falla: cerrar la hoja sin elegir nada, o un
 * navegador que la niega, no son errores de nadie.
 */
export async function compartirArchivo(archivo, { titulo, texto }) {
  try {
    await navigator.share({ files: [archivo], title: titulo, text: texto })
    return true
  } catch {
    return false
  }
}
