import { ArrowRight } from 'lucide-react'
import { IconoHorario } from '../IconosSF'

/**
 * La carrera de quien vuelve, arriba y en su color: lo que llevas, lo que
 * puedes inscribir y un toque para seguir.
 *
 * Es lo que viene a hacer casi todo el que abre la portada, y por eso no es
 * una tarjeta mas de la lista sino lo primero. La barra de abajo son los diez
 * semestres, cada uno lleno en lo que llevas de el: la misma silueta de la
 * carrera, leida como progreso.
 *
 * El avance llega un instante despues de pintar (ver useAvancePortada).
 * Hasta entonces la cifra se reserva su sitio en blanco, para no enseñar un
 * cero que luego salta.
 *
 * @param {object} [props.resumen]  lo de resumenParaPortada, si ya llego
 * @param {boolean} props.conMarcas  si hay algo que esperar
 */
function SeguirCarrera({ carrera, color, resumen, conMarcas, alSeguir, alHorario }) {
  const listo = Boolean(resumen) || !conMarcas
  const hechas = resumen?.hechas ?? []

  return (
    <section
      aria-label={`Tu carrera: ${carrera.nombre}`}
      className="tarjeta-seguir"
      style={{ '--acento': color }}
    >
      <p className="text-[13.5px] opacity-80">Sigues en</p>
      <h2 className="mt-0.5 font-ui text-[23px] leading-tight font-normal tracking-[-0.015em] text-balance">
        {carrera.nombre}
      </h2>

      <div className="mt-4 flex items-end justify-between gap-4" data-listo={listo}>
        <p className="seguir-cifra tabular-nums">
          {resumen?.porcentaje ?? 0}
          <small>%</small>
        </p>
        <p className="text-right text-[13.5px] leading-snug opacity-90">
          {resumen ? (
            <>
              {resumen.cuanto}
              <br />
              {resumen.disponibles === 1
                ? '1 materia para inscribir'
                : `${resumen.disponibles} materias para inscribir`}
            </>
          ) : conMarcas ? (
            ' '
          ) : (
            'Aún no has marcado materias'
          )}
        </p>
      </div>

      <div className="tramos-semestre" aria-hidden="true">
        {carrera.silueta.map((cantidad, i) => (
          <i key={i} style={{ '--lleno': Math.min(1, (hechas[i] ?? 0) / cantidad) }} />
        ))}
      </div>

      <div className="mt-5 flex gap-2">
        <button type="button" onClick={alSeguir} className="seguir-entrar">
          Seguir donde ibas
          <ArrowRight size={18} strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={alHorario}
          aria-label="Abrir mi horario"
          title="Abrir mi horario"
          className="seguir-horario"
        >
          <IconoHorario size={21} />
        </button>
      </div>
    </section>
  )
}

export default SeguirCarrera
