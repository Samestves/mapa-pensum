import { ArrowRight } from 'lucide-react'
import { SITUACION } from '../../layout/situacion'
import { IconoSituacion } from '../IconoSituacion'
import { IconoHorario, IconoMapa } from '../IconosSF'
import { tipoDe } from '../../data/portada'
import MiniMapa from '../MiniMapa'

/* Lo que se encuentra dentro de cualquier carrera, dicho para quien no ha
   entrado nunca */
const DENTRO = [
  {
    icono: <IconoMapa size={21} />,
    titulo: 'El mapa de prelaciones',
    texto: 'Qué materia abre a cuál, semestre por semestre.',
  },
  {
    icono: <IconoSituacion situacion={SITUACION.INSCRIBIBLE} size={21} />,
    titulo: 'Qué puedes inscribir',
    texto: 'Marca lo aprobado y se encienden las que se abren.',
  },
  {
    icono: <IconoHorario size={21} />,
    titulo: 'Tu horario',
    texto: 'Ármalo a mano o súbelo desde una foto.',
  },
]

/**
 * La ficha de una carrera antes de entrar: de que tamaño es, como se reparte
 * por semestres y que hay dentro. Es lo que necesita quien todavia no sabe si
 * es la suya, o no sabe que va a encontrar al abrirla.
 *
 * Las barras son la silueta de la carrera leida de otra forma: cuantas
 * materias tiene cada semestre. Si es la tuya, lo aprobado va encendido.
 */
export function CuerpoFicha({ carrera, color, resumen }) {
  const maximo = Math.max(...carrera.silueta)
  const hechas = resumen?.hechas

  return (
    <div className="ficha-carrera px-5 pb-2" style={{ '--acento': color }}>
      <div className="flex flex-col items-center pt-2 text-center">
        <span className="ficha-silueta">
          <MiniMapa silueta={carrera.silueta} color={color} hechas={hechas} className="size-full" />
        </span>
        <span className="ficha-tipo">
          {resumen ? `Llevas ${resumen.porcentaje}%` : tipoDe(carrera)}
        </span>
        <h2 className="mt-2 max-w-[18ch] font-ui text-[27px] leading-[1.08] font-light tracking-[-0.02em] text-balance text-tinta">
          {carrera.nombre}
        </h2>
      </div>

      <dl className="ficha-cifras">
        {[
          [carrera.semestres, 'semestres'],
          [carrera.asignaturas, 'materias'],
          [carrera.electivas, 'electivas'],
        ].map(([valor, rotulo]) => (
          <div key={rotulo}>
            <dt>{rotulo}</dt>
            <dd className="tabular-nums">{valor}</dd>
          </div>
        ))}
      </dl>

      <figure className="ficha-barras">
        <figcaption>Materias por semestre</figcaption>
        <div aria-hidden="true">
          {carrera.silueta.map((cantidad, i) => (
            <i
              key={i}
              style={{ height: `${(cantidad / maximo) * 100}%` }}
              data-apagada={hechas ? (hechas[i] ?? 0) < cantidad : undefined}
            />
          ))}
        </div>
        <p aria-hidden="true">
          {carrera.silueta.map((_, i) => (
            <span key={i}>{i + 1}</span>
          ))}
        </p>
      </figure>

      <ul className="ficha-dentro">
        {DENTRO.map(({ icono, titulo, texto }) => (
          <li key={titulo}>
            <span>{icono}</span>
            <div>
              <b>{titulo}</b>
              <p>{texto}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Los dos botones que se quedan abajo mientras la ficha se desplaza */
export function PieFicha({ propia, alAbrir, alAbrirLista }) {
  return (
    <div className="flex flex-col gap-2 border-t border-panel-borde px-5 pt-3 pb-4">
      <button type="button" onClick={alAbrir} className="boton-tinta">
        {propia ? 'Seguir donde ibas' : 'Abrir el mapa'}
        <ArrowRight size={18} strokeWidth={2} />
      </button>
      <button type="button" onClick={alAbrirLista} className="boton-sordo">
        Verla como lista
      </button>
    </div>
  )
}
