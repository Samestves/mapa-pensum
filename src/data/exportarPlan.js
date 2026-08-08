import { codigoVisible } from './codigoVisible'
import { etiquetaSemestre } from '../layout/planificador'

const MES = (fecha) => {
  const texto = fecha?.toLocaleDateString('es-VE', { month: 'long', year: 'numeric' })
  return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : ''
}

/**
 * Genera el contenido Markdown del plan de ruta y dispara la descarga
 * como archivo .md en el navegador.
 */
export function descargarMarkdown({ carrera, nombre, progreso, plan, ucPorSemestre, grado }) {
  const totalSemestres = plan.semestres.length

  const lineas = [
    `# Mi ruta hasta el grado`,
    ``,
    `${carrera.nombre} — ${carrera.nucleo}`,
    nombre ? `Estudiante: ${nombre}` : null,
    `Generado el ${new Date().toLocaleDateString('es-VE')}`,
    ``,
    progreso.porcentaje != null
      ? `- Avance: ${progreso.porcentaje.toFixed(1)}% (${progreso.ucAprobadas}/${progreso.ucTotales} UC)`
      : `- Avance: ${progreso.aprobadas}/${progreso.total} materias (${progreso.ucAprobadas} UC)`,
    `- Materias pendientes: ${plan.materiasRestantes}`,
    `- Semestres estimados: ${totalSemestres} con ${ucPorSemestre} UC por semestre`,
    grado ? `- Grado aproximado: ${MES(grado)}` : null,
    ``,
    ...plan.semestres.flatMap((s) => [
      `## ${etiquetaSemestre(s.numero)} — ${s.materias.length} materias · ${s.uc} UC`,
      ``,
      ...s.materias.map((a) => `- [ ] \`${codigoVisible(a)}\` ${a.nombre} (${a.uc} UC)`),
      ``,
    ]),
    `---`,
    `Generado con Mapa de Pensum · https://mapa-pensum.vercel.app`,
    `Las unidades crédito no están verificadas contra el pensum oficial.`,
  ].filter((l) => l !== null)

  const blob = new Blob([lineas.join('\n')], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'mi-ruta-pensum.md'
  a.click()
  URL.revokeObjectURL(url)
}

export { MES }
