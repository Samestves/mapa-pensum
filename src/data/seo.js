const SITIO = 'https://mapa-pensum.vercel.app'

/**
 * El <title> y la descripcion cambian por carrera: cada una es su pagina.
 * Recibe el resumen del indice (que ya trae nombre, asignaturas y semestres
 * como numeros) o null para el selector.
 */
export function ponerMeta(carrera) {
  /* Corto. En la pestaña de un navegador caben unos veinte caracteres antes
     de que el texto se corte, asi que "Mapa de Pensum — UDO Núcleo de
     Monagas" se leia como "Mapa de Pensu...". Lo que sobraba no era
     informacion, era relleno: el nucleo y la universidad ya los dice la
     meta description, que es la que usan los buscadores para el resumen. */
  document.title = carrera
    ? `${carrera.nombre} — Pensum`
    : 'Mapa de Pensum'

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
