import { ShieldCheck } from 'lucide-react'
import { REPO, enlaceReporte } from '../../data/proyecto'

/**
 * El pie, en tres renglones de mas a menos importante, todos en la misma
 * columna y la misma letra: que no hay cuentas -lo que da confianza a quien
 * llega-, de donde salen los datos y las dos salidas si uno esta mal. Los
 * enlaces van en texto, separados por un punto medio, como en el pie de
 * cualquier pagina de Apple.
 *
 * No se pone "actualizado en tal fecha" porque el scrape de la DACE no trae
 * fecha, y una fecha inventada en el sitio que promete honestidad con los
 * datos seria justo lo contrario.
 */
function PiePortada() {
  return (
    <footer className="pie-portada">
      <p className="pie-confianza">
        <ShieldCheck size={16} strokeWidth={2} />
        Sin cuentas. Tu avance se guarda en este teléfono.
      </p>
      <p>
        Datos de los pensums publicados por la{' '}
        <a href="http://dacemonagas.udo.edu.ve" target="_blank" rel="noreferrer">
          DACE del Núcleo de Monagas
        </a>
        . Pueden tener errores: confírmalos con control de estudios antes de inscribir.
      </p>
      <nav aria-label="Proyecto" className="pie-enlaces">
        <a href={enlaceReporte()} target="_blank" rel="noreferrer">
          Reportar un error
        </a>
        <a href={REPO} target="_blank" rel="noreferrer">
          Código abierto
        </a>
      </nav>
    </footer>
  )
}

export default PiePortada
