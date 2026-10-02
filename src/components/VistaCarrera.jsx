import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, GraduationCap, Moon, Sun } from 'lucide-react'
import { guardar, leer } from '../data/almacen'
import { anotarMarca, anotarMateria, anotarVista } from '../data/latido'
import { calcularLayout } from '../layout/calcularLayout'
import { FRANJA } from '../layout/constantes'
import { calcularFranja } from '../layout/franjaElectivas'
import { CARRERAS } from '../data/carreras'
import { ESTADO } from '../data/estados'
import { desbloqueadasPor, marcasDeSemestres, materiasDeSemestre } from '../data/semestre'
import { VISTAS } from '../data/vistas'
import { useAvisos } from '../hooks/useAvisos'
import { usePaneles } from '../hooks/usePaneles'
import { useCasillas } from '../hooks/useCasillas'
import { useEsTelefono } from '../hooks/useEsTelefono'
import { usePensum } from '../hooks/usePensum'
import { useTema } from '../hooks/useTema'
import { variablesDeTono } from '../theme/paleta'
import PanelAvisos from './AvisosCarrera'
import AvisoRecogida from './AvisoRecogida'
import BarraInferior from './BarraInferior'
import BarraSuperior from './BarraSuperior'
import EsqueletoMapa from './EsqueletoMapa'
import GrafoPensum from './GrafoPensum'
import HojaAvance from './HojaAvance'
import PanelProgreso from './PanelProgreso'
import Horario from './Horario'
import PlanRuta from './PlanRuta'
import PaletaComandos from './PaletaComandos'
import SelectorElectiva from './SelectorElectiva'
import VistaLista from './VistaLista'

const CLAVE_VISTA = 'mapa-pensum:vista'

/**
 * El mapa de una carrera. Recibe el pensum ya normalizado y no sabe de donde
 * salio: es lo que permite que la misma vista sirva para las nueve.
 *
 * La clave de React debe ser el slug. Al cambiar de carrera se remonta entero
 * y el estado de vista (zoom, seleccion, paneles abiertos) arranca limpio, que
 * es lo correcto: la posicion del mapa de una carrera no significa nada en otra.
 */
function VistaCarrera({ carrera, alVolver }) {
  const { asignaturas, grupos } = carrera

  // El layout es geometria pura y no depende del avance: se calcula una vez
  const layoutBase = useMemo(() => calcularLayout(asignaturas, grupos), [asignaturas, grupos])

  const {
    marcas,
    estados,
    progreso,
    avanceGrupos,
    descarga,
    toque,
    marcar,
    marcarVarias,
    reiniciar,
  } = usePensum(carrera)
  /* Que electiva has puesto en cada casilla del pensum. Es una decision de
     planificacion, no de avance: aprobarla la sigue llevando usePensum. */
  const { elegidas, casillaDe, colocar, adoptar } = useCasillas(carrera)
  const [casillaAbierta, setCasillaAbierta] = useState(null)

  /* Las electivas que marcas -desde la lista, o de antes de la franja- entran
     solas en ella. Depende tambien de `elegidas` a proposito: vaciar la
     casilla de una electiva aprobada la devuelve, porque aprobada sigue
     siendo parte de tu pensum. */
  useEffect(() => {
    adoptar(marcas)
  }, [adoptar, marcas, elegidas])

  /* La franja de electivas de las carreras sin ruta oficial completa. Es lo unico del
     mapa que depende de lo que eligio el estudiante, asi que va aparte del
     layout: elegir una electiva recoloca la franja y nada mas. Sus casillas
     entran en porCodigo, que es de donde el selector y la ficha las leen. */
  const rutaCompleta = Boolean(carrera.electivasEnCasillas)
  const layout = useMemo(() => {
    if (rutaCompleta) return layoutBase
    const yInicio = layoutBase.finSemestres + FRANJA.corredor
    const franja = calcularFranja(
      grupos,
      elegidas,
      layoutBase.columnas.map((c) => c.x),
      yInicio,
    )
    const porCodigo = new Map(layoutBase.porCodigo)
    for (const casilla of franja.nodos) porCodigo.set(casilla.codigo, casilla)
    return {
      ...layoutBase,
      casillasFranja: franja.nodos,
      filasFranja: franja.filas,
      porCodigo,
      alto: yInicio + franja.alto,
    }
  }, [rutaCompleta, layoutBase, grupos, elegidas])

  /* La materia que hay en una casilla, o null si sigue vacia. Va con
     useCallback porque baja hasta el contenido memoizado del mapa: si
     cambiara de identidad en cada render, mover el mapa volveria a dibujar
     los ciento y pico hijos. */
  const enCasilla = useCallback(
    (codigoCasilla) => {
      const codigo = elegidas[codigoCasilla]
      return codigo ? (layout.porCodigo.get(codigo) ?? null) : null
    },
    [elegidas, layout],
  )

  /* Una electiva colocada hereda las coordenadas de su casilla.
     El layout es geometria pura y se calcula una vez, asi que no sabe -ni
     debe saber- que has puesto tu en cada casilla: las electivas del catalogo
     salen de ahi sin x ni y. Pero la ficha flotante se coloca al lado de la
     materia usando justo esas coordenadas, asi que al abrir una electiva le
     salian NaN y acababa situada en cualquier parte.
     Se resuelve aqui, que es el unico sitio donde se saben las dos cosas: el
     dibujo del mapa y lo que el estudiante eligio. */
  const porCodigo = useMemo(() => {
    if (!Object.keys(elegidas).length) return layout.porCodigo
    const mapa = new Map(layout.porCodigo)
    for (const [casilla, codigo] of Object.entries(elegidas)) {
      const hueco = layout.porCodigo.get(casilla)
      const electiva = layout.porCodigo.get(codigo)
      if (hueco && electiva) mapa.set(codigo, { ...electiva, x: hueco.x, y: hueco.y })
    }
    return mapa
  }, [layout, elegidas])

  const { tema, alternarTema } = useTema()

  // Rampa de tonos de la carrera, publicada como --tono-N para que cada nodo
  // la resuelva por su profundidad sin recibir el color por props.
  const tonos = useMemo(() => variablesDeTono(carrera, tema), [carrera, tema])

  // En movil la lista es la vista util: el mapa completo solo cabe a 0.10
  const [vista, setVista] = useState(
    () => leer(CLAVE_VISTA) ?? (window.innerWidth < 768 ? 'lista' : 'mapa'),
  )
  /* Lo que acabas de aprobar, en la esquina y con Deshacer. Viven aqui y no
     en el mapa porque un semestre se aprueba tambien desde la lista. Cambiar
     de vista los quita sin animar: la vista nueva entra, y con ella no
     vienen los avisos de la otra. */
  const { avisos, avisar, cerrarAviso, retirarAvisos, vaciarAvisos } = useAvisos()
  const [vistaAvisos, setVistaAvisos] = useState(vista)
  if (vistaAvisos !== vista) {
    setVistaAvisos(vista)
    vaciarAvisos()
  }
  useEffect(() => {
    guardar(CLAVE_VISTA, vista)
    anotarVista(vista)
  }, [vista])

  // Avance y avisos se abren desde la cabecera y se solapan en pantalla:
  // un solo valor en vez de un booleano por panel, y no hay que apagar nada.
  const { abierto, alternar, cerrar } = usePaneles()
  /* Lo abren dos botones, el de la cabecera en escritorio y la isla de abajo
     en el telefono: uno solo se ve a la vez, y los dos hacen lo mismo. Lo
     que se abre si cambia: en escritorio el panel lateral, en el telefono
     una hoja desde abajo. */
  const esTelefono = useEsTelefono()
  const alternarAvance = () => {
    setCasillaAbierta(null)
    alternar('avance')
  }
  const [planAbierto, setPlanAbierto] = useState(false)
  const abrirPlan = () => {
    cerrar()
    setPlanAbierto(true)
  }
  const [paletaAbierta, setPaletaAbierta] = useState(false)

  /* Ctrl+K, o ⌘K en un Mac. Se escucha en captura para adelantarse a
     cualquier campo de texto que tenga el foco: si no, escribir en el
     buscador del horario y pulsar el atajo no habria hecho nada.
     preventDefault porque en Chrome y Firefox ⌘K abre la barra de
     direcciones, y sin eso el atajo se lo lleva el navegador. */
  useEffect(() => {
    const tecla = (e) => {
      if (e.key?.toLowerCase() !== 'k' || !(e.metaKey || e.ctrlKey)) return
      e.preventDefault()
      setPaletaAbierta((v) => !v)
    }
    document.addEventListener('keydown', tecla, true)
    return () => document.removeEventListener('keydown', tecla, true)
  }, [])
  const [areaFiltrada, setAreaFiltrada] = useState(null)
  const [seleccionado, setSeleccionado] = useState(null)
  /* Abrir otra ficha retira el aviso: ya estas en otra cosa, y en el
     telefono la ficha abre justo debajo de donde el aviso se ve. */
  useEffect(() => {
    if (seleccionado != null) retirarAvisos()
  }, [seleccionado, retirarAvisos])

  /* Elegir la electiva de una casilla abre su panel, y en escritorio ese
     panel sale donde el del avance: abrir uno cierra el otro. La ficha de la
     materia tambien se cierra, que ya estas en otra cosa. */
  const abrirCasilla = useCallback(
    (codigo) => {
      cerrar()
      setSeleccionado(null)
      setCasillaAbierta(codigo)
    },
    [cerrar],
  )
  const cerrarCasilla = useCallback(() => setCasillaAbierta(null), [])

  // El mapa se monta un fotograma DESPUES de que aparece la vista. Son mil
  // seiscientos elementos SVG: aqui cuestan unas decimas, en un telefono de
  // los que de verdad usa la gente pasan del medio segundo. Si eso ocurriera
  // en el mismo fotograma del click, el click no enseñaria nada durante todo
  // ese rato. Asi la cabecera con el nombre de la carrera sale de inmediato y
  // el mapa entra encima de su propia silueta.
  const [mapaMontado, setMapaMontado] = useState(false)
  useEffect(() => {
    const cuadro = requestAnimationFrame(() => setMapaMontado(true))
    // Red de seguridad: en una pestaña oculta requestAnimationFrame no se
    // dispara NUNCA. Sin esto, abrir una carrera en una pestaña de fondo la
    // dejaria en la silueta para siempre. Se comprobo de verdad, no es una
    // precaucion teorica.
    const red = setTimeout(() => setMapaMontado(true), 200)
    return () => {
      cancelAnimationFrame(cuadro)
      clearTimeout(red)
    }
  }, [])

  // Aislar un area y enfocar una cadena son dos formas de mirar el mismo mapa.
  // Si se dejan activas a la vez casi siempre no queda nada visible, asi que
  // cada una apaga la otra.
  //
  // Los dos van en useCallback y sin dependencias, y eso no es adorno: son las
  // funciones que acaban en manos de los mil seiscientos elementos del grafo.
  // Si cambiaran de identidad en cada render, el memo de los nodos no serviria
  // de nada porque siempre verian una prop distinta.
  const filtrarArea = useCallback((area) => {
    setAreaFiltrada(area)
    setSeleccionado(null)
  }, [])

  // El alternar vive aqui y no en el nodo para que la funcion no dependa de
  // que hay seleccionado: con la forma de actualizacion, React le pasa el
  // valor previo y la identidad se mantiene estable para siempre.
  /* Lo que la paleta sabe hacer. Se arma aqui y no dentro de ella porque
     todas estas acciones son estado de ESTA pantalla; la paleta solo las
     pinta y las ejecuta.
     `pista` son las palabras por las que tambien se encuentra una accion:
     nadie escribe "planificar" cuando lo que quiere es saber cuando se
     gradua. */
  const accionesPaleta = useMemo(
    () => [
      ...VISTAS.filter((v) => v.id !== vista).map((v) => ({
        id: 'vista-' + v.id,
        etiqueta: v.titulo,
        icono: v.icono,
        pista: v.etiqueta,
        ejecutar: () => setVista(v.id),
      })),
      {
        id: 'planificar',
        etiqueta: 'Planificar mi ruta hasta el grado',
        icono: GraduationCap,
        pista: 'graduarme semestres que faltan imprimir pdf',
        ejecutar: () => setPlanAbierto(true),
      },
      {
        id: 'tema',
        etiqueta: tema === 'oscuro' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro',
        icono: tema === 'oscuro' ? Sun : Moon,
        pista: 'tema modo oscuro claro',
        ejecutar: alternarTema,
      },
      {
        id: 'carreras',
        etiqueta: 'Ver todas las carreras',
        icono: ArrowLeft,
        pista: 'volver inicio portada',
        ejecutar: () => alVolver(),
      },
    ],
    [vista, tema, alternarTema, alVolver],
  )

  /* Mirar una materia es lo unico que se anota del uso del mapa, y solo
     para el mapa de calor: cuantas veces se abrio cada una, sumado entre
     todo el mundo. Ver data/latido.js. */
  const mirar = useCallback((codigo) => anotarMateria(carrera.slug, codigo), [carrera.slug])

  /* Marcar es la accion que convierte esto en algo que se usa y no solo se
     mira, asi que se cuenta. Cuantas y en que carrera, no cuales: ver
     data/latido.js. */
  const marcarYContar = useCallback(
    (codigo, estado) => {
      anotarMarca(carrera.slug)
      marcar(codigo, estado)
    },
    [marcar, carrera.slug],
  )
  const marcarVariasYContar = useCallback(
    (cambios) => {
      anotarMarca(carrera.slug)
      marcarVarias(cambios)
    },
    [marcarVarias, carrera.slug],
  )

  /* La casilla de cada semestre -marcada, mixta o vacia-, la misma en la
     cabecera del mapa y en la de la lista. */
  const marcasSemestre = useMemo(
    () => marcasDeSemestres(layout.nodos, enCasilla, estados),
    [layout.nodos, enCasilla, estados],
  )

  /* Marcar o desmarcar un semestre entero desde su casilla, en el mapa o en
     la lista: sus obligatorias y la electiva de cada casilla, en un solo
     cambio. Si le falta algo, aprueba lo que falta; si ya esta todo, lo
     desmarca todo. Despues sale el aviso -con lo que se abrio, si se
     aprobo- y Deshacer, que devuelve cada materia a la marca que tenia.
     Sin confirmar antes: se deshace de un toque, y preguntar seria pedir
     dos toques para lo que casi siempre se quiere a la primera. */
  const alternarSemestre = useCallback(
    (semestre) => {
      const codigos = materiasDeSemestre(layout.nodos, semestre, enCasilla)
      const pendientes = codigos.filter((c) => estados[c] !== ESTADO.APROBADA)
      const aprobar = pendientes.length > 0
      const cambian = aprobar ? pendientes : codigos
      if (!cambian.length) return

      const antes = Object.fromEntries(cambian.map((c) => [c, marcas[c] ?? null]))
      const marca = aprobar ? ESTADO.APROBADA : null
      marcarVariasYContar(Object.fromEntries(cambian.map((c) => [c, marca])))

      const nombre = `Semestre ${semestre} · ${cambian.length} ${cambian.length === 1 ? 'materia' : 'materias'}`
      avisar(
        aprobar
          ? {
              antes,
              nombre,
              etiqueta: 'Aprobado',
              inmediato: true,
              desbloqueadas: desbloqueadasPor(
                cambian,
                estados,
                layout.relaciones,
                layout.porCodigo,
              ).map((a) => a.nombre),
            }
          : {
              antes,
              nombre,
              etiqueta: 'Desmarcado',
              inmediato: true,
              neutro: true,
              detalle: 'Vuelven a quedar sin cursar.',
              desbloqueadas: [],
            },
      )
    },
    [layout, enCasilla, estados, marcas, marcarVariasYContar, avisar],
  )

  const alternarSeleccion = useCallback(
    (codigo) => {
      setSeleccionado((previo) => {
        if (previo === codigo) return null
        mirar(codigo)
        return codigo
      })
      setAreaFiltrada(null)
    },
    [mirar],
  )

  /* Lo que enseña el avance, igual en el panel de escritorio y en la hoja del
     telefono (ver ContenidoAvance). */
  const avance = {
    carrera,
    progreso,
    avanceGrupos,
    marcas,
    estados,
    relaciones: layout.relaciones,
    elegidas,
    reiniciar,
    alPlanificar: abrirPlan,
    tema,
    alternarTema,
  }

  return (
    <div
      className="vista-carrera relative flex h-full flex-col overflow-hidden"
      style={tonos}
      data-con-avisos={(carrera.avisos?.length ?? 0) > 0}
    >
      {/* Las islas flotan sobre la vista: este envoltorio no ocupa sitio ni
          captura el puntero, solo lo hacen las islas que lleva dentro. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-40">
        <BarraSuperior
          carrera={carrera}
          resumen={progreso}
          vista={vista}
          alCambiarVista={setVista}
          avanceAbierto={abierto === 'avance'}
          alAlternarAvance={alternarAvance}
          avisosAbiertos={abierto === 'avisos'}
          alAlternarAvisos={() => alternar('avisos')}
          alBuscar={() => setPaletaAbierta(true)}
          alVolver={alVolver}
        />
      </div>

      <PaletaComandos
        abierta={paletaAbierta}
        alCerrar={() => setPaletaAbierta(false)}
        acciones={accionesPaleta}
        materias={layout.nodos}
        estados={estados}
        carreras={CARRERAS.filter((c) => c.slug !== carrera.slug)}
        alIrAMateria={(codigo) => {
          setVista('mapa')
          setAreaFiltrada(null)
          setSeleccionado(codigo)
        }}
        alIrACarrera={alVolver}
      />

      {planAbierto && (
        <PlanRuta
          carrera={carrera}
          marcas={marcas}
          estados={estados}
          progreso={progreso}
          relaciones={layout.relaciones}
          elegidas={elegidas}
          alCerrar={() => setPlanAbierto(false)}
        />
      )}

      {/* Elegir que va en una casilla. Vive aqui y no dentro del mapa, que
          se remonta al cambiar de vista y lleva el transform del pan y el
          zoom: el panel saldria movido, a escala o cortado a media salida. */}
      <SelectorElectiva
        codigo={casillaAbierta}
        porCodigo={layout.porCodigo}
        grupos={grupos}
        estados={estados}
        casillaDe={casillaDe}
        alColocar={(casilla, codigo) => {
          colocar(casilla, codigo)
          setCasillaAbierta(null)
        }}
        alCerrar={cerrarCasilla}
      />

      {/* La key incluye la vista, no solo si el mapa ya monto: asi cambiar
          entre mapa, lista y horario rearranca la animacion y la vista nueva
          entra fundiendose en vez de aparecer de golpe. Antes la key solo
          cambiaba una vez -cuando el mapa relevaba a la silueta- y los
          cambios de vista posteriores eran un corte seco.
          La silueta NO entra animada: es la misma que ya estaba en pantalla
          mientras bajaba el codigo (el fallback de App), y fundirla desde
          cero la hacia parpadear -visible, invisible, visible- justo al
          llegar. */}
      <div
        key={mapaMontado ? vista : 'esqueleto'}
        className={`relative flex flex-1 overflow-hidden ${mapaMontado ? 'entrada-panel' : ''}`}
      >
        {!mapaMontado ? (
          <EsqueletoMapa slug={carrera.slug} />
        ) : vista === 'horario' ? (
          <Horario carrera={carrera} estados={estados} />
        ) : vista === 'mapa' ? (
          <GrafoPensum
            clave={carrera.slug}
            layout={layout}
            porCodigo={porCodigo}
            estados={estados}
            descarga={descarga}
            toque={toque}
            areaFiltrada={areaFiltrada}
            seleccionado={seleccionado}
            alSeleccionar={alternarSeleccion}
            alMarcar={marcarYContar}
            alAvisar={avisar}
            marcasSemestre={marcasSemestre}
            alAlternarSemestre={alternarSemestre}
            enCasilla={enCasilla}
            alAbrirCasilla={abrirCasilla}
            casillaDe={casillaDe}
          />
        ) : (
          <VistaLista
            layout={layout}
            estados={estados}
            progreso={progreso}
            avanceGrupos={avanceGrupos}
            toque={toque}
            descarga={descarga}
            alMirar={mirar}
            alMarcar={marcarYContar}
            marcasSemestre={marcasSemestre}
            alAlternarSemestre={alternarSemestre}
          />
        )}

        {/* Deshacer solo devuelve las marcas: el aviso se va solo, con su
            salida, y al acabar se quita de la lista. Sin caja solo cuando el
            mapa se corrio para dejarle la esquina libre, que es al aprobar
            una materia desde su ficha; en la lista, o tras un semestre
            entero, cae sobre texto y va en su tarjeta. */}
        {avisos.map((a) => (
          <AvisoRecogida
            key={a.n}
            aviso={a}
            conCaja={vista !== 'mapa' || a.inmediato}
            retirar={a.retirar}
            alDeshacer={() => marcarVariasYContar(a.antes)}
            alCerrar={() => cerrarAviso(a.n)}
          />
        ))}

        {/* Cuelga de aqui y no de la cabecera: sus hijos llevan
            overflow:hidden para la animacion de plegado y recortarian
            cualquier cosa que asomara por debajo. */}
        <PanelAvisos avisos={carrera.avisos} abierto={abierto === 'avisos'} alCerrar={cerrar} />
      </div>

      {/* La navegacion del telefono va al final del arbol y fuera del
          contenedor de la vista: es hermana suya, no algo flotando encima.
          Asi se lleva su alto del reparto en vez de taparle los ultimos
          pixeles al mapa o a la ultima hora del horario. */}
      <BarraInferior
        vista={vista}
        alCambiar={setVista}
        resumen={progreso}
        avanceAbierto={abierto === 'avance'}
        alAlternarAvance={alternarAvance}
        alVolver={alVolver}
      />

      {/* Fuera del contenedor de la vista, que se remonta al cambiar de vista:
          la hoja y el panel tienen animacion de salida y no pueden
          desmontarse a medias. */}
      {esTelefono ? (
        <HojaAvance {...avance} abierta={abierto === 'avance'} alCerrar={cerrar} />
      ) : (
        <PanelProgreso
          {...avance}
          abierto={abierto === 'avance'}
          alCerrar={cerrar}
          areaFiltrada={areaFiltrada}
          alFiltrarArea={filtrarArea}
        />
      )}
    </div>
  )
}

export default VistaCarrera
