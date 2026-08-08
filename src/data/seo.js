const SITIO = 'https://mapa-pensum.vercel.app'

/**
 * El <title> y la descripcion cambian por carrera: cada una es su pagina.
 * Recibe el resumen del indice (que ya trae nombre, asignaturas y semestres
 * como numeros) o null para el selector.
 */
export function ponerMeta(carrera) {
  document.title = carrera
    ? `Pensum de ${carrera.nombre} — UDO Núcleo de Monagas`
    : 'Mapa de Pensum — UDO Núcleo de Monagas'

  const descripcion = carrera
    ? `Mapa interactivo del pensum de ${carrera.nombre} en la UDO Núcleo de Monagas: ` +
      `${carrera.asignaturas} materias en ${carrera.semestres} semestres, con sus prelaciones.`
    : 'Mapa interactivo de los pensums de la Universidad de Oriente, Núcleo de Monagas. ' +
      'Nueve carreras con sus materias, prelaciones y avance.'

  document.querySelector('meta[name="description"]')?.setAttribute('content', descripcion)
  document
    .querySelector('link[rel="canonical"]')
    ?.setAttribute('href', `${SITIO}/${carrera?.slug ?? ''}`)
}
