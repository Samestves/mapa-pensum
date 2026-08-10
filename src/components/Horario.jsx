import { useCallback, useMemo, useState } from 'react'
import { ESTADO } from '../hooks/usePensum'
import { useHorario } from '../hooks/useHorario'
import RejillaHorario from './RejillaHorario'
import PopoverClase from './PopoverClase'

/**
 * Mi horario.
 *
 * Es una vista mas de la carrera, como el mapa y la lista: la cabecera de la
 * aplicacion se queda arriba y esto ocupa lo que queda. Armar un horario es
 * sentarse a hacerlo, no una consulta de paso, y una capa flotante obliga a
 * cerrarla para volver a cualquier otra cosa.
 *
 * El fondo va en el gris suave del tema y no en el blanco de la cabecera: sin
 * ese escalon, la rejilla y la barra se leerian como una sola superficie.
 *
 * Este componente es el unico que sabe de las tres piezas a la vez -los datos
 * del horario, el pensum y el formulario-, y su unico trabajo es conectarlas.
 * Ni dibuja la rejilla ni valida nada: eso vive en RejillaHorario y en
 * PopoverClase.
 */
function Horario({ carrera, estados }) {
  const { porDia, sesiones, guardar, quitar } = useHorario(carrera.slug)

  /* Que hay abierto: null, o la clase que se esta creando o editando junto al
     punto de la pantalla del que cuelga su popover. Un solo valor en vez de
     un booleano de "abierto" mas otro de "editando": asi no existe el estado
     imposible de estar abierto sin clase. */
  const [enEdicion, setEnEdicion] = useState(null)

  const todas = useMemo(
    () => [...carrera.asignaturas, ...carrera.grupos.flatMap((g) => g.asignaturas)],
    [carrera],
  )
  const porCodigo = useMemo(() => new Map(todas.map((a) => [a.codigo, a])), [todas])

  /* Las que el pensum ya desbloqueo: es lo que el estudiante puede inscribir
     de verdad este semestre, y por eso son las que el buscador ofrece antes
     de escribir nada. La busqueda libre sigue llegando a cualquier otra. */
  const sugeridas = useMemo(
    () => todas.filter((a) => estados[a.codigo] === ESTADO.DISPONIBLE),
    [todas, estados],
  )

  const abrirEnHueco = useCallback((celda, ancla) => {
    setEnEdicion({ inicial: celda, ancla })
  }, [])

  const editar = useCallback((sesion) => {
    // La ficha se coloca al lado del bloque, asi que necesita su caja entera
    // y no un punto: centrada sobre el, y sin taparlo.
    const c = document.getElementById(`clase-${sesion.id}`)?.getBoundingClientRect()
    setEnEdicion({
      inicial: sesion,
      ancla: c
        ? { izquierda: c.left, derecha: c.right, arriba: c.top, abajo: c.bottom }
        : { izquierda: 0, derecha: window.innerWidth, arriba: 0, abajo: window.innerHeight },
    })
  }, [])

  return (
    <div className="transicion-tema flex min-h-0 flex-1 flex-col overflow-hidden bg-panel-suave">
      {/* La rejilla es su propio contenedor de desplazamiento: necesita medir
          la altura que le queda para repartirla entre las horas, y esa altura
          solo la conoce quien tiene el overflow. */}
      <RejillaHorario
        porDia={porDia}
        porCodigo={porCodigo}
        alPulsarHueco={abrirEnHueco}
        alEditar={editar}
      />

      {enEdicion && (
        <PopoverClase
          /* La key rearranca el formulario al pasar de una clase a otra: sin
             ella, abrir una segunda clase reaprovecharia el estado interno de
             la primera y saldrian sus horas. */
          key={enEdicion.inicial.id ?? `${enEdicion.inicial.dia}-${enEdicion.inicial.inicio}`}
          inicial={enEdicion.inicial}
          ancla={enEdicion.ancla}
          materias={todas}
          sugeridas={sugeridas}
          porCodigo={porCodigo}
          sesiones={sesiones}
          alGuardar={(s) => {
            guardar(s)
            setEnEdicion(null)
          }}
          alQuitar={(id) => {
            quitar(id)
            setEnEdicion(null)
          }}
          alCerrar={() => setEnEdicion(null)}
        />
      )}
    </div>
  )
}

export default Horario
