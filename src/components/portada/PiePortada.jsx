import { Code, Flag, ShieldCheck } from 'lucide-react'
import { REPO, enlaceReporte } from '../../data/proyecto'

/**
 * El pie: lo que da confianza a quien llega -que no hay cuentas y que su
 * avance no sale del telefono- y de donde salen los datos, con las dos
 * salidas si uno esta mal. En texto, no en botones: es un pie.
 *
 * No se pone "actualizado en tal fecha" porque el scrape de la DACE no trae
 * fecha, y una fecha inventada en el sitio que promete honestidad con los
 * datos seria justo lo contrario.
 */
function PiePortada() {
  return (
    <footer className="pie-portada">
      <p className="flex items-start gap-2.5 text-tinta-suave">
        <ShieldCheck
          size={18}
          strokeWidth={1.75}
          className="mt-px shrink-0"
          style={{ color: 'var(--estado-aprobada)' }}
        />
        Sin cuentas ni registro: tu avance se guarda en este teléfono.
      </p>
      <p>
        Datos tomados de los pensums publicados por la{' '}
        <a href="http://dacemonagas.udo.edu.ve" target="_blank" rel="noreferrer">
          DACE del Núcleo de Monagas
        </a>
        . Pueden tener errores: confirma con control de estudios antes de inscribir.
      </p>
      <p className="flex flex-wrap gap-x-5 gap-y-1">
        <a href={enlaceReporte()} target="_blank" rel="noreferrer" className="enlace-pie">
          <Flag size={15} strokeWidth={1.75} />
          Reportar un error
        </a>
        <a href={REPO} target="_blank" rel="noreferrer" className="enlace-pie">
          <Code size={15} strokeWidth={1.75} />
          Código abierto
        </a>
      </p>
    </footer>
  )
}

export default PiePortada
