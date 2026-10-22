import { SITUACION } from '../../layout/situacion'
import { IconoSituacion } from '../IconoSituacion'
import { IconoHorario, IconoMapa } from '../IconosSF'

/* Los colores de cada estado, los mismos de la tarjeta del mapa */
const COLOR = {
  [SITUACION.HECHA]: 'var(--estado-aprobada)',
  [SITUACION.INSCRIBIBLE]: 'var(--sit-inscribible-luz)',
  [SITUACION.LEJANA]: 'var(--estado-rojo)',
}

const ROTULO = {
  [SITUACION.HECHA]: 'Aprobada',
  [SITUACION.INSCRIBIBLE]: 'Puedes inscribirla',
  [SITUACION.LEJANA]: 'Todavía no',
}

/* Lo que una tarjeta enseña en un estado: su icono y su rotulo */
function Estado({ situacion, cuando }) {
  return (
    <span className={`estado-materia ${cuando}`} style={{ color: COLOR[situacion] }}>
      <IconoSituacion situacion={situacion} size={22} />
      <small>{ROTULO[situacion]}</small>
    </span>
  )
}

/**
 * Una materia como en el mapa, que puede cambiar de estado a mitad de la
 * escena: `antes` es como empieza y `despues` como acaba. Sin `despues` no
 * cambia. Ver .materia-escena en bienvenida.css.
 */
function Materia({ nombre, antes, despues, orden }) {
  return (
    <div
      className="materia-escena"
      data-antes={antes}
      data-despues={despues ?? antes}
      style={{ '--orden': orden }}
    >
      <span className="estados">
        <Estado situacion={antes} cuando="antes" />
        {despues && <Estado situacion={despues} cuando="despues" />}
      </span>
      <b>{nombre}</b>
    </div>
  )
}

/** Uno: aprobar una materia abre la siguiente. La idea entera de la app. */
export function EscenaMapa() {
  return (
    <div className="escena-mapa">
      <Materia
        nombre="Matemáticas I"
        antes={SITUACION.INSCRIBIBLE}
        despues={SITUACION.HECHA}
        orden={0}
      />
      <span className="enlace-escena e1" />
      <Materia
        nombre="Matemáticas II"
        antes={SITUACION.LEJANA}
        despues={SITUACION.INSCRIBIBLE}
        orden={1}
      />
      <span className="enlace-escena e2" />
      <Materia nombre="Matemáticas III" antes={SITUACION.LEJANA} orden={2} />
    </div>
  )
}

/** Dos: marcar, renglon a renglon, como en la lista */
export function EscenaMarcar() {
  return (
    <div className="escena-marcar">
      {['Matemáticas I', 'Física I', 'Química General'].map((nombre, i) => (
        <div key={nombre} className="renglon-escena" style={{ '--orden': i }}>
          <b>{nombre}</b>
          <span className="marca-escena">
            <IconoSituacion situacion={SITUACION.HECHA} size={28} />
          </span>
        </div>
      ))}
      <p className="nota-escena">Se guarda en este teléfono</p>
    </div>
  )
}

/** Tres: lo que se gana. El aro de avance y lo que se ve al entrar. */
export function EscenaAvance() {
  const filas = [
    {
      icono: <IconoSituacion situacion={SITUACION.INSCRIBIBLE} size={22} />,
      color: COLOR[SITUACION.INSCRIBIBLE],
      titulo: '8 para inscribir',
      texto: 'las que ya se abrieron',
    },
    {
      icono: <IconoHorario size={22} />,
      color: 'var(--estado-cursando)',
      titulo: 'Tu horario',
      texto: 'a mano o con una foto',
    },
    {
      icono: <IconoMapa size={22} />,
      color: 'var(--tinta)',
      titulo: 'Tu mapa',
      texto: 'siempre a mano',
    },
  ]
  return (
    <div className="escena-avance">
      <div className="aro-escena">
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle cx="60" cy="60" r="52" className="pista" />
          <circle cx="60" cy="60" r="52" className="arco" pathLength="100" />
        </svg>
        <p className="tabular-nums">
          34<small>%</small>
        </p>
      </div>
      <ul>
        {filas.map(({ icono, color, titulo, texto }, i) => (
          <li key={titulo} style={{ '--orden': i }}>
            <span style={{ color }}>{icono}</span>
            <div>
              <b>{titulo}</b>
              <small>{texto}</small>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
