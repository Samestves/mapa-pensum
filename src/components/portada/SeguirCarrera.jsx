import { ArrowRight } from 'lucide-react'
import { IconoHorario } from '../IconosSF'

/* El anillo, en las unidades de su dibujo */
const LADO = 104
const GROSOR = 11
const RADIO = (LADO - GROSOR) / 2
const VUELTA = 2 * Math.PI * RADIO

/**
 * El anillo del avance, como los de Apple Fitness: pista apagada, arco en
 * degradado del verde de aprobada con la punta redonda, y la cifra dentro.
 * Nace vacio y se llena con transicion cuando llega el avance.
 */
function AnilloAvance({ porcentaje }) {
  return (
    <div className="anillo-portada">
      <svg viewBox={`0 0 ${LADO} ${LADO}`} aria-hidden="true">
        <defs>
          <linearGradient id="degradado-anillo" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" style={{ stopColor: 'var(--anillo-claro)' }} />
            <stop offset="1" style={{ stopColor: 'var(--estado-aprobada)' }} />
          </linearGradient>
        </defs>
        <circle cx={LADO / 2} cy={LADO / 2} r={RADIO} className="pista" strokeWidth={GROSOR} />
        <circle
          cx={LADO / 2}
          cy={LADO / 2}
          r={RADIO}
          className="arco"
          strokeWidth={GROSOR}
          strokeDasharray={VUELTA}
          strokeDashoffset={VUELTA * (1 - (porcentaje ?? 0) / 100)}
        />
      </svg>
      <p className="tabular-nums">
        {porcentaje ?? 0}
        <small>%</small>
      </p>
    </div>
  )
}

/* El primer semestre que te queda a medias: por donde vas */
const semestreActual = (silueta, hechas) => {
  const i = silueta.findIndex((cantidad, s) => (hechas[s] ?? 0) < cantidad)
  return i < 0 ? null : i + 1
}

/**
 * La carrera de quien vuelve, lo primero de la portada: lo que llevas, lo que
 * puedes inscribir y un toque para seguir.
 *
 * Es lo que viene a hacer casi todo el que abre la portada. La superficie es
 * sobria y el color de la carrera va de acento -su luz en la esquina y su
 * punto junto al nombre-; el avance va en el verde de aprobada, el mismo del
 * anillo de dentro de la carrera, para que se lea igual en los dos sitios.
 * Debajo, los semestres: cada uno lleno en lo que llevas de el.
 *
 * Las esquinas son concentricas: el radio de los botones es el de la tarjeta
 * menos su margen (ver .tarjeta-seguir).
 *
 * El avance llega un instante despues de pintar (ver useAvancePortada).
 * Hasta entonces las cifras se reservan su sitio, para no enseñar un cero
 * que luego salta.
 *
 * @param {object} [props.resumen]  lo de resumenParaPortada, si ya llego
 * @param {boolean} props.conMarcas  si hay algo que esperar
 */
function SeguirCarrera({ carrera, color, resumen, conMarcas, alSeguir, alHorario }) {
  const listo = Boolean(resumen) || !conMarcas
  const hechas = resumen?.hechas ?? []
  const actual = semestreActual(carrera.silueta, hechas)

  return (
    <section
      aria-label={`Tu carrera: ${carrera.nombre}`}
      className="tarjeta-seguir"
      style={{ '--acento': color }}
    >
      <p className="seguir-etiqueta">Tu carrera</p>
      <h2 className="mt-1 font-ui text-[22px] leading-tight font-normal tracking-[-0.015em] text-balance text-tinta">
        {carrera.nombre}
      </h2>

      <div className="seguir-cuerpo" data-listo={listo}>
        <AnilloAvance porcentaje={resumen?.porcentaje} />
        {resumen ? (
          <dl className="seguir-datos">
            <div>
              <dt>{resumen.unidad === 'UC' ? 'UC aprobadas' : 'Aprobadas'}</dt>
              <dd className="tabular-nums">
                {resumen.llevas}
                <small> / {resumen.de}</small>
              </dd>
            </div>
            <div>
              <dt>Para inscribir</dt>
              <dd className="tabular-nums">{resumen.disponibles}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-[14px] leading-snug text-tinta-tenue">
            {conMarcas ? '' : 'Marca las materias que ya aprobaste y aquí verás tu avance.'}
          </p>
        )}
      </div>

      <div className="seguir-semestres">
        <p>
          <span>Semestres</span>
          {resumen && actual && <span>Vas por el {actual}.º</span>}
        </p>
        <div aria-hidden="true">
          {carrera.silueta.map((cantidad, i) => (
            <i key={i} style={{ '--lleno': Math.min(1, (hechas[i] ?? 0) / cantidad) }} />
          ))}
        </div>
      </div>

      <div className="seguir-acciones">
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
