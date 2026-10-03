import { useState } from 'react'
import { Maximize2, Minimize2 } from 'lucide-react'
import FilaLeida from './FilaLeida'

/* La imagen se queda a la vista durante toda la revision, pegada arriba
   mientras la lista se desplaza. Repasar catorce filas de texto sin poder
   mirar el original al lado es repasar a ciegas, y entonces nadie repasa: se
   confirma y ya. */
function FotoSubida({ imagen }) {
  const [ampliada, setAmpliada] = useState(false)

  return (
    <div className="sticky top-0 z-[1] border-y border-panel-borde bg-panel-suave">
      <img
        src={imagen.vistaPrevia}
        alt="El horario que subiste"
        className={`mx-auto w-full object-contain transition-[max-height] duration-300 ${
          ampliada ? 'max-h-[58vh]' : 'max-h-[124px]'
        }`}
      />
      <button
        type="button"
        onClick={() => setAmpliada((v) => !v)}
        aria-label={ampliada ? 'Reducir la imagen' : 'Ampliar la imagen'}
        className="absolute right-2.5 bottom-2.5 grid size-8 place-items-center rounded-full bg-[color-mix(in_oklab,var(--panel)_82%,transparent)] text-tinta-suave transition-colors hover:text-tinta"
      >
        {ampliada ? (
          <Minimize2 size={14} strokeWidth={1.5} />
        ) : (
          <Maximize2 size={14} strokeWidth={1.5} />
        )}
      </button>
    </div>
  )
}

/**
 * Lo leido, fila a fila, con la foto delante y cuantas entran.
 *
 * El paso de revision no es una cortesia ni un adorno: es la diferencia entre
 * una herramienta y una apuesta. Lo que vuelve de la lectura es lo que un
 * modelo CREYO ver en una foto que puede estar torcida, con reflejos o a
 * medio enfocar, y una materia mal leida no se nota al importarla -se nota el
 * dia del parcial-. Asi que nada entra sin que alguien lo mire, y lo que no
 * cuadra se enseña roto en vez de arreglarse por dentro.
 */
function LectorRevision({ imagen, candidatas, listas, materias, alCambiar, alAlternar }) {
  /* Que fila tiene los ajustes abiertos. null es "todavia no se toco nada",
     y entonces las rotas nacen abiertas: si hay algo que arreglar, que se vea
     con que se arregla sin tener que descubrir que la fila se despliega. */
  const [abierta, setAbierta] = useState(null)
  const conProblema = candidatas.filter((c) => c.avisos.length).length

  return (
    <div className="lector-cara">
      {imagen && <FotoSubida imagen={imagen} />}

      <p className="px-5 pt-3 pb-1 text-[11.5px] text-tinta-tenue sm:px-6">
        {listas === candidatas.length
          ? `Las ${candidatas.length} entran`
          : `Entran ${listas} de ${candidatas.length}`}
        {conProblema > 0 &&
          ` · ${conProblema} ${conProblema === 1 ? 'necesita' : 'necesitan'} un ajuste`}
      </p>

      <ul>
        {candidatas.map((c) => (
          <FilaLeida
            key={c.id}
            candidata={c}
            materias={materias}
            abierta={abierta === c.id || (abierta == null && c.avisos.length > 0)}
            alAbrir={() => setAbierta(abierta === c.id ? '' : c.id)}
            alCambiar={(cambios) => alCambiar(c.id, cambios)}
            alAlternar={() => alAlternar(c.id)}
          />
        ))}
      </ul>
    </div>
  )
}

export default LectorRevision
