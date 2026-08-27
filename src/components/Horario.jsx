import { useCallback, useMemo, useState } from 'react'
import { Copy, Download, Loader2, Pencil, Trash2 } from 'lucide-react'
import { ESTADO } from '../data/estados'
import { useEsTelefono } from '../hooks/useEsTelefono'
import { useHorario } from '../hooks/useHorario'
import { leer } from '../data/almacen'
import { descargarHorario } from '../data/exportarHorario'
import RejillaHorario from './RejillaHorario'
import HorarioMovil from './HorarioMovil'
import PopoverClase from './PopoverClase'
import MenuClase from './MenuClase'
import HorarioVacio from './HorarioVacio'
import ImportarHorario from './ImportarHorario'

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
  const { porDia, sesiones, guardar, guardarVarias, quitar, duplicar } = useHorario(carrera.slug)
  const esTelefono = useEsTelefono()

  /* Que hay abierto. Un solo valor por cosa en vez de booleanos sueltos, para
     que no exista el estado imposible de tener el menu y la ficha a la vez. */
  const [enEdicion, setEnEdicion] = useState(null)
  const [menu, setMenu] = useState(null)
  const [bajando, setBajando] = useState(false)

  /* La imagen que se esta leyendo, si hay alguna. */
  const [aLeer, setALeer] = useState(null)

  /* Si ya se eligio empezar a mano. No se guarda entre visitas a proposito:
     un horario vacio SIGUE siendo un horario vacio la proxima vez que se
     entre, y volver a ofrecer las dos salidas es mas util que devolver a una
     rejilla en blanco a quien no llego a poner nada. Dentro de la misma
     visita, en cambio, se recuerda: borrar la ultima clase no puede hacer que
     la pantalla de bienvenida salte encima de lo que estabas haciendo. */
  const [empezado, setEmpezado] = useState(false)

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

  /* El menu cuelga del boton de los tres puntos, no del bloque: es de donde
     sale, y anclarlo ahi es lo que permite que se coloque solo hacia el lado
     que tenga sitio sin taparle la clase al de al lado. */
  const abrirMenu = useCallback((sesion, boton) => {
    setMenu({ sesion, boton, ancla: boton.getBoundingClientRect() })
  }, [])

  /* Soltar una clase en otro sitio. Llega ya validada por el arrastre, asi
     que aqui solo se persiste: el hueco legal se resolvio mientras se movia. */
  const mover = useCallback((sesion) => guardar(sesion), [guardar])

  const bajar = async () => {
    setBajando(true)
    try {
      // Sin nombre guardado la imagen sale igual, solo que sin firmar
      await descargarHorario({ carrera, sesiones, porCodigo, nombre: leer(CLAVE_NOMBRE, '') })
    } finally {
      setBajando(false)
    }
  }

  return (
    <div className="transicion-tema relative flex min-h-0 flex-1 flex-col overflow-hidden bg-panel-suave">
      {/* Dos formas del mismo horario. En el telefono la semana de cinco
          columnas dejaria cada dia en unos sesenta pixeles, menos que el
          nombre de cualquier materia, asi que se apila y se pasa de dia
          deslizando. Los datos, el formulario y el menu son los mismos: lo
          unico que cambia es cuantos dias se ven a la vez.
          La rejilla de escritorio es su propio contenedor de desplazamiento
          porque necesita medir la altura para repartirla entre las horas, y
          esa altura solo la conoce quien tiene el overflow. */}
      {sesiones.length === 0 && !empezado ? (
        <HorarioVacio alSubir={setALeer} alCrear={() => setEmpezado(true)} />
      ) : esTelefono ? (
        <HorarioMovil
          porDia={porDia}
          porCodigo={porCodigo}
          idMenuAbierto={menu?.sesion.id}
          alPulsarHueco={abrirEnHueco}
          alAbrirMenu={abrirMenu}
        />
      ) : (
        <RejillaHorario
          porDia={porDia}
          porCodigo={porCodigo}
          alPulsarHueco={abrirEnHueco}
          idMenuAbierto={menu?.sesion.id}
          alMoverClase={mover}
          alAbrirMenu={abrirMenu}
        />
      )}

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
          Descargar Horario
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
                setEnEdicion({
                  inicial: menu.sesion,
                  // La ficha si cuelga del bloque entero: es grande y quiere
                  // colocarse a su lado, no a la de un boton de 24 px.
                  ancla: cajaDe(document.getElementById(`clase-${menu.sesion.id}`)),
                }),
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

      {aLeer && (
        <ImportarHorario
          /* La key hace que elegir otra imagen sin cerrar el modal vuelva a
             empezar de cero. Sin ella se reaprovecharia el estado de la
             lectura anterior y se veria la lista vieja bajo la foto nueva. */
          key={`${aLeer.name}-${aLeer.lastModified}`}
          archivo={aLeer}
          materias={todas}
          sesiones={sesiones}
          alImportar={(nuevas) => {
            guardarVarias(nuevas)
            setEmpezado(true)
            setALeer(null)
          }}
          alCambiarImagen={setALeer}
          alCerrar={() => setALeer(null)}
        />
      )}
    </div>
  )
}

export default Horario
