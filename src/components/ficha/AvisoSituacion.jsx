import { ESTADO } from '../../data/estados'
import { SITUACION } from '../../layout/situacion'
import { ASPECTO } from '../../theme/situacion'

import { IconoSituacion } from '../IconoSituacion'

/* Quien falta, dicho con nombre. Una lista de dos se dice "A y B"; de tres o
   mas, las dos primeras y cuantas quedan, para que el aviso no crezca hasta
   repetir la lista de prelaciones que ya esta justo debajo. */
function nombrar(materias) {
  const n = materias.map((m) => m.asignatura.nombre)
  if (n.length <= 2) return n.join(' y ')
  return `${n.slice(0, 2).join(', ')} y ${n.length - 2} más`
}

/**
 * La frase que responde "¿puedo inscribirla?". A la disponible se le dice
 * que si; a la que se abre si apruebas lo que cursas, QUE tienes que aprobar
 * para meterla el semestre que viene; a la lejana, que le falta.
 */
export default function AvisoSituacion({ estado, situacion, prerrequisitos }) {
  const clase = 'flex items-start gap-2.5 text-[12.5px] leading-snug text-tinta-suave'
  const icono = (s) => (
    <IconoSituacion
      situacion={s}
      size={13}
      className="mt-[2px] shrink-0"
      color={ASPECTO[s].icono}
    />
  )

  if (estado === ESTADO.DISPONIBLE) {
    return (
      <p className={clase}>
        {icono(SITUACION.INSCRIBIBLE)}
        Puedes inscribirla: tienes aprobadas todas sus prelaciones.
      </p>
    )
  }
  if (estado !== ESTADO.BLOQUEADA) return null

  const pendientes = prerrequisitos.filter((p) => p.estado !== ESTADO.APROBADA)
  const sinEmpezar = pendientes.filter((p) => p.estado !== ESTADO.CURSANDO)

  if (situacion === SITUACION.PROXIMA && pendientes.length > 0) {
    return (
      <p className={clase}>
        {icono(SITUACION.PROXIMA)}
        <span>
          Se abre el próximo semestre si apruebas{' '}
          <span className="text-tinta">{nombrar(pendientes)}</span>.
        </span>
      </p>
    )
  }

  return (
    <p className={clase}>
      {icono(SITUACION.LEJANA)}
      <span>
        {sinEmpezar.length > 0 ? (
          <>
            Aún te falta{sinEmpezar.length > 1 ? 'n' : ''}{' '}
            <span className="text-tinta">{nombrar(sinEmpezar)}</span>.
          </>
        ) : (
          'Te falta aprobar sus prelaciones.'
        )}{' '}
        Puedes marcarla igual si ya la viste.
      </span>
    </p>
  )
}
