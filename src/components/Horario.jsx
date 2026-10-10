import { Suspense, memo, useCallback, useMemo, useRef, useState } from 'react'
import { Copy, ImagePlus, Pencil, Trash2 } from 'lucide-react'
import { ESTADO } from '../data/estados'
import { useEstados } from '../hooks/useAvance'
import { useConsulta } from '../hooks/useConsulta'
import { useHorario } from '../hooks/useHorario'
import { leer } from '../data/almacen'
import {
  compartirArchivo,
  copiarImagen,
  descargarArchivo,
  puedeCompartir,
  puedeCopiarImagen,
} from '../data/compartir'
import { imagenDelHorario, MENSAJE_DEL_HORARIO } from '../data/exportarHorario'
import { FORMATOS } from '../data/subirHorario'
import { avisarHorarioCreado } from '../data/latido'
import { colorClase, coloresDelHorario } from '../theme/areas'
import HorarioSemana from './HorarioSemana'
import HorarioAgenda from './HorarioAgenda'
import AccionesHorario from './AccionesHorario'
import PopoverClase from './PopoverClase'
import MenuClase from './MenuClase'
import HorarioVacio from './HorarioVacio'
import { ImportarHorario, prepararLector } from './carreraPorTrozos'
import ConfirmarBorrado from './ConfirmarBorrado'

/* El nombre que el estudiante puso al exportar su plan de ruta. Se reutiliza
   para firmar la imagen en vez de volver a preguntarlo. */
const CLAVE_NOMBRE = 'mapa-pensum:nombre'

/* Desde que ancho cabe la semana en rejilla al lado del panel de hoy. Por
   debajo, cinco columnas se quedan en menos de lo que mide el nombre de una
   materia, y el horario cambia de forma: una columna, un dia a la vez. Es el
   corte lg de Tailwind, no el de telefono: una ventana de 900 px tiene raton
   y cabecera de escritorio, pero no sitio para la semana. */
const CABE_LA_SEMANA = '(min-width: 1024px)'

const ANCHO_MENU_HORARIO = 226

/* La caja en pantalla de un elemento, que es de donde cuelga la ficha */
const cajaDe = (elemento) => {
  const c = elemento?.getBoundingClientRect()
  return c
    ? { izquierda: c.left, derecha: c.right, arriba: c.top, abajo: c.bottom }
    : { izquierda: 0, derecha: window.innerWidth, arriba: 0, abajo: window.innerHeight }
}

/* Como manda el horario a otra persona ESTE aparato: la hoja de compartir en
   el telefono, el portapapeles en el ordenador. Una de las dos, o ninguna. */
const medioDeEnvio = () => {
  const compartir = puedeCompartir()
  return { compartir, copiar: !compartir && puedeCopiarImagen() }
}

/**
 * Mi horario.
 *
 * Es una vista mas de la carrera, como el mapa y la lista: la cabecera de la
 * aplicacion se queda arriba y esto ocupa lo que queda. Armar un horario es
 * sentarse a hacerlo, no una consulta de paso, y una capa flotante obliga a
 * cerrarla para volver a cualquier otra cosa.
 *
 * Este componente es el unico que sabe de las piezas a la vez -los datos del
 * horario, el pensum, la ficha, los menus y el lector-, y su unico trabajo es
 * conectarlas. Ni dibuja la semana ni valida nada.
 */
function Horario({ carrera }) {
  const estados = useEstados()
  const { porDia, sesiones, guardar, guardarVarias, quitar, vaciar, duplicar } = useHorario(
    carrera.slug,
  )
  const cabeLaSemana = useConsulta(CABE_LA_SEMANA)
  const [envio] = useState(medioDeEnvio)

  /* Que hay abierto. Un solo valor por cosa en vez de booleanos sueltos, para
     que no exista el estado imposible de tener el menu y la ficha a la vez.
     El menu es uno: con `sesion` es el de esa clase, sin ella el del horario. */
  const [enEdicion, setEnEdicion] = useState(null)
  const [menu, setMenu] = useState(null)
  const [borrando, setBorrando] = useState(false)

  /* La imagen que se esta leyendo, si hay alguna. */
  const [aLeer, setALeer] = useState(null)
  const refArchivo = useRef(null)

  /* Si ya se eligio empezar a mano. No se guarda entre visitas a proposito:
     un horario vacio SIGUE siendo un horario vacio la proxima vez que se
     entre, y volver a ofrecer las dos salidas es mas util que devolver a una
     semana en blanco a quien no llego a poner nada. Dentro de la misma
     visita, en cambio, se recuerda: borrar la ultima clase no puede hacer que
     la pantalla de bienvenida salte encima de lo que estabas haciendo. */
  const [empezado, setEmpezado] = useState(false)

  const todas = useMemo(
    () => [...carrera.asignaturas, ...carrera.grupos.flatMap((g) => g.asignaturas)],
    [carrera],
  )
  const porCodigo = useMemo(() => new Map(todas.map((a) => [a.codigo, a])), [todas])
  /* El color de cada materia, uno distinto por materia (ver
     coloresDelHorario): el mismo en la semana, en la lista y en la ficha. */
  const colores = useMemo(() => coloresDelHorario(sesiones), [sesiones])

  /* Como se ve una clase: el nombre de su materia y su color. Lo preguntan
     todas las piezas que pintan una, y asi ninguna tiene que saber del pensum
     ni de la paleta. */
  const aspectoDe = useCallback(
    (sesion) => ({
      nombre: porCodigo.get(sesion.codigo)?.nombre ?? sesion.codigo,
      color: colorClase(sesion, colores),
    }),
    [porCodigo, colores],
  )

  /* Las que el pensum ya desbloqueo: es lo que el estudiante puede inscribir
     de verdad este semestre, y por eso son las que el buscador ofrece antes
     de escribir nada. La busqueda libre sigue llegando a cualquier otra. */
  const sugeridas = useMemo(
    () => todas.filter((a) => estados[a.codigo] === ESTADO.DISPONIBLE),
    [todas, estados],
  )

  /* Tres formas de llegar a la ficha, las tres con lo mismo: que clase -o que
     hueco- y de que caja de la pantalla cuelga. */
  const abrirEnHueco = useCallback((celda, ancla) => {
    setEnEdicion({ inicial: celda, ancla })
  }, [])

  const anadirEn = useCallback((dia, franja, elemento) => {
    setEnEdicion({ inicial: { dia, ...franja }, ancla: cajaDe(elemento) })
  }, [])

  /* La ficha de una clase cuelga de la clase, este donde este pintada: el
     bloque de la semana o su fila en la lista. Las dos llevan el mismo id. */
  const editar = useCallback((sesion) => {
    setEnEdicion({
      inicial: sesion,
      ancla: cajaDe(document.getElementById(`clase-${sesion.id}`)),
    })
  }, [])

  /* Los menus cuelgan del boton de los tres puntos: es de donde salen, y
     anclarlos ahi es lo que permite que se coloquen solos hacia el lado que
     tenga sitio. */
  const abrirMenu = useCallback((sesion, boton) => {
    setMenu({ sesion, ancla: boton.getBoundingClientRect() })
  }, [])

  const abrirMas = useCallback((boton) => {
    setMenu({ ancla: boton.getBoundingClientRect() })
  }, [])

  /* Soltar una clase en otro sitio. Llega ya validada por el arrastre, asi
     que aqui solo se persiste: el hueco legal se resolvio mientras se movia. */
  const mover = useCallback((sesion) => guardar(sesion), [guardar])

  /* La imagen del horario. Sin nombre guardado sale igual, solo que sin
     firmar. Es una promesa: se dibuja la primera vez que se pide. */
  const imagen = () =>
    imagenDelHorario({ carrera, sesiones, porCodigo, nombre: leer(CLAVE_NOMBRE, '') })
  const descargar = async () => descargarArchivo(await imagen())
  const compartir = async () => compartirArchivo(await imagen(), MENSAJE_DEL_HORARIO)
  const copiar = () => copiarImagen(imagen())

  const borrarTodo = () => {
    vaciar()
    /* De vuelta al inicio: las dos salidas de un horario por empezar */
    setEmpezado(false)
    setBorrando(false)
  }

  const hayClases = sesiones.length > 0

  const opcionesDeClase = (sesion) => [
    { id: 'editar', etiqueta: 'Editar', icono: Pencil, alPulsar: () => editar(sesion) },
    { id: 'duplicar', etiqueta: 'Duplicar', icono: Copy, alPulsar: () => duplicar(sesion.id) },
    {
      id: 'quitar',
      etiqueta: 'Eliminar',
      icono: Trash2,
      peligro: true,
      alPulsar: () => quitar(sesion.id),
    },
  ]

  const opcionesDelHorario = [
    {
      id: 'foto',
      etiqueta: 'Añadir desde una foto',
      icono: ImagePlus,
      alPulsar: () => {
        prepararLector()
        refArchivo.current?.click()
      },
    },
    hayClases && {
      id: 'borrar',
      etiqueta: 'Borrar todo el horario',
      icono: Trash2,
      peligro: true,
      alPulsar: () => setBorrando(true),
    },
  ].filter(Boolean)

  /* Sin clases no hay nada que sacar: queda solo el menu, para subir una foto */
  const acciones = (
    <AccionesHorario
      conTexto={cabeLaSemana}
      masAbierto={menu != null && !menu.sesion}
      alCompartir={hayClases && envio.compartir ? compartir : null}
      alCopiar={hayClases && envio.copiar ? copiar : null}
      alDescargar={hayClases ? descargar : null}
      alAbrirMas={abrirMas}
    />
  )

  /* Lo que comparten las dos formas del horario */
  const comun = {
    porDia,
    idMenuAbierto: menu?.sesion?.id,
    aspectoDe,
    acciones,
    alEditar: editar,
    alAbrirMenu: abrirMenu,
    alAnadir: anadirEn,
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-panel-suave">
      {/* Dos formas del mismo horario, segun quepa o no la semana (ver
          CABE_LA_SEMANA). Los datos, la ficha y los menus son los mismos: lo
          unico que cambia es como se lee. */}
      {!hayClases && !empezado ? (
        <HorarioVacio
          alSubir={setALeer}
          alCrear={() => {
            setEmpezado(true)
            avisarHorarioCreado({ carrera: carrera.slug, clases: 0, origen: 'mano' })
          }}
        />
      ) : cabeLaSemana ? (
        <HorarioSemana
          {...comun}
          sesiones={sesiones}
          porCodigo={porCodigo}
          colores={colores}
          alPulsarHueco={abrirEnHueco}
          alMoverClase={mover}
        />
      ) : (
        <HorarioAgenda {...comun} />
      )}

      {menu && (
        <MenuClase
          ancla={menu.ancla}
          alCerrar={() => setMenu(null)}
          {...(menu.sesion
            ? { opciones: opcionesDeClase(menu.sesion) }
            : {
                opciones: opcionesDelHorario,
                ancho: ANCHO_MENU_HORARIO,
                etiqueta: 'Acciones del horario',
              })}
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
          colores={colores}
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

      {borrando && (
        <ConfirmarBorrado
          clases={sesiones.length}
          alBorrar={borrarTodo}
          alCerrar={() => setBorrando(false)}
        />
      )}

      {/* La hoja que lee la foto vive en su propio trozo (ver
          carreraPorTrozos.js), que empieza a bajar al tocar "Subir una foto".
          Con su propio Suspense, y vacio: sin el, esperar ese trozo
          cambiaria el horario entero por la silueta de carga. */}
      {aLeer && (
        <Suspense fallback={null}>
          <ImportarHorario
            /* Sin key: elegir otra imagen cambia el archivo y la lectura
               empieza de cero ella sola (ver useLecturaHorario). Con una key
               la hoja se desmontaba y volvia a subir entre una foto y otra. */
            archivo={aLeer}
            materias={todas}
            sesiones={sesiones}
            alImportar={(nuevas) => {
              guardarVarias(nuevas)
              avisarHorarioCreado({ carrera: carrera.slug, clases: nuevas.length, origen: 'foto' })
              setEmpezado(true)
              setALeer(null)
            }}
            alCambiarImagen={setALeer}
            /* La otra salida de la bienvenida, sin volver a ella: cuando el
               lector no puede -hay cola, o se acabo por hoy- lo que queda es
               armarlo, y se entra directo a la semana vacia. */
            alCrearAMano={() => {
              avisarHorarioCreado({ carrera: carrera.slug, clases: 0, origen: 'mano' })
              setEmpezado(true)
              setALeer(null)
            }}
            alCerrar={() => setALeer(null)}
          />
        </Suspense>
      )}

      {/* La foto que se sube con el horario ya empezado, desde su menu */}
      <input
        ref={refArchivo}
        type="file"
        accept={FORMATOS}
        className="hidden"
        onChange={(e) => {
          const archivo = e.target.files?.[0]
          if (archivo) setALeer(archivo)
          /* Se limpia para que elegir dos veces el mismo archivo vuelva a
             disparar el cambio */
          e.target.value = ''
        }}
      />
    </div>
  )
}

/* memo: VistaCarrera se repinta por cosas que a esta vista no le tocan -abrir
   el avance, cambiar el tema, la paleta-, y sin esto cada una repintaba la
   vista entera. Sus props son estables (useCallback/useMemo arriba). */
export default memo(Horario)
