import { useCallback, useMemo, useState } from 'react'
import { Copy, Download, Loader2, Pencil, Trash2 } from 'lucide-react'
import { ESTADO } from '../hooks/usePensum'
import { useHorario } from '../hooks/useHorario'
import { descargarHorario } from '../data/exportarHorario'
import RejillaHorario from './RejillaHorario'
import PopoverClase from './PopoverClase'
import MenuClase from './MenuClase'

/* El nombre que el estudiante puso al exportar su plan de ruta. Se reutiliza
   para firmar la imagen en vez de volver a preguntarlo. */
const CLAVE_NOMBRE = 'mapa-pensum:nombre'

/**
 * Mi horario.
 *
 * Es una vista mas de la carrera, como el mapa y la lista: la cabecera de la
 * aplicacion se queda arriba y esto ocupa lo que queda. Armar un horario es
 * sentarse a hacerlo, no una consulta de paso, y una capa flotante obliga a
 * cerrarla para volver a cualquier otra cosa.
 *
 * Este componente es el unico que sabe de las piezas a la vez -los datos del
 * horario, el pensum, el formulario y el menu-, y su unico trabajo es
 * conectarlas. Ni dibuja la rejilla ni valida nada.
 */
function Horario({ carrera, estados }) {
  const { porDia, sesiones, guardar, quitar, duplicar } = useHorario(carrera.slug)

  /* Que hay abierto. Un solo valor por cosa en vez de booleanos sueltos, para
     que no exista el estado imposible de tener el menu y la ficha a la vez. */
  const [enEdicion, setEnEdicion] = useState(null)
  const [menu, setMenu] = useState(null)
  const [bajando, setBajando] = useState(false)

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

  const cajaDe = (elemento) => {
    const c = elemento?.getBoundingClientRect()
    return c
      ? { izquierda: c.left, derecha: c.right, arriba: c.top, abajo: c.bottom }
      : { izquierda: 0, derecha: window.innerWidth, arriba: 0, abajo: window.innerHeight }
  }

  const abrirEnHueco = useCallback((celda, ancla) => {
    setEnEdicion({ inicial: celda, ancla })
  }, [])

  /* Pulsar una clase abre su menu, no el formulario. Editar es una de tres
     cosas que se le pueden hacer, y de las tres la que menos se usa. */
  const abrirMenu = useCallback((sesion, elemento) => {
    const c = elemento.getBoundingClientRect()
    setMenu({ sesion, elemento, ancla: { x: c.left + c.width / 2, y: c.bottom } })
  }, [])

  /* Soltar una clase en otro sitio. Llega ya validada por el arrastre, asi
     que aqui solo se persiste: el hueco legal se resolvio mientras se movia. */
  const mover = useCallback((sesion) => guardar(sesion), [guardar])

  const bajar = async () => {
    setBajando(true)
    try {
      let nombre = ''
      try {
        nombre = localStorage.getItem(CLAVE_NOMBRE) ?? ''
      } catch {
        // Sin nombre guardado la imagen sale igual, solo que sin firmar
      }
      await descargarHorario({ carrera, sesiones, porCodigo, nombre })
    } finally {
      setBajando(false)
    }
  }

  return (
    <div className="transicion-tema relative flex min-h-0 flex-1 flex-col overflow-hidden bg-panel-suave">
      {/* La rejilla es su propio contenedor de desplazamiento: necesita medir
          la altura que le queda para repartirla entre las horas, y esa altura
          solo la conoce quien tiene el overflow. */}
      <RejillaHorario
        porDia={porDia}
        porCodigo={porCodigo}
        alPulsarHueco={abrirEnHueco}
        alMoverClase={mover}
        alEditar={abrirMenu}
      />

      {/* Descargar vive dentro del horario y flotando sobre su esquina, no en
          la barra de la aplicacion: es una accion de esta vista y solo de
          esta. Flotando no le quita alto a la semana. Aparece solo si hay
          algo que bajar. */}
      {sesiones.length > 0 && (
        <button
          type="button"
          onClick={bajar}
          disabled={bajando}
          title="Descargar el horario como imagen PNG"
          className="transicion-tema absolute right-5 bottom-5 z-30 flex items-center gap-2 rounded-full border border-panel-borde bg-panel/90 py-2.5 pr-4 pl-3.5 text-[12.5px] font-bold text-tinta-suave shadow-lg backdrop-blur transition-[color,transform] duration-200 hover:-translate-y-0.5 hover:text-tinta disabled:opacity-60"
        >
          {bajando ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
          Descargar PNG
        </button>
      )}

      {menu && (
        <MenuClase
          ancla={menu.ancla}
          alCerrar={() => setMenu(null)}
          opciones={[
            {
              id: 'editar',
              etiqueta: 'Editar',
              icono: Pencil,
              alPulsar: () =>
                setEnEdicion({ inicial: menu.sesion, ancla: cajaDe(menu.elemento) }),
            },
            {
              id: 'duplicar',
              etiqueta: 'Duplicar',
              icono: Copy,
              alPulsar: () => duplicar(menu.sesion.id),
            },
            {
              id: 'quitar',
              etiqueta: 'Eliminar',
              icono: Trash2,
              peligro: true,
              alPulsar: () => quitar(menu.sesion.id),
            },
          ]}
        />
      )}

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
