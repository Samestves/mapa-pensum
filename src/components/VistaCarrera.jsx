import {
  Activity,
  Suspense,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { ArrowLeft, GraduationCap, Moon, Sun } from 'lucide-react'
import { anotarMarca, anotarMateria, anotarVista } from '../data/latido'
import { calcularLayout } from '../layout/calcularLayout'
import { FRANJA } from '../layout/constantes'
import { calcularFranja } from '../layout/franjaElectivas'
import { CARRERAS } from '../data/carreras'
import { ESTADO } from '../data/estados'
import { accionDeSemestre, marcasDeSemestres } from '../data/semestre'
import { recordarVista, vistaInicial } from '../data/vistaInicial'
import { VISTAS } from '../data/vistas'
import { usePaneles } from '../hooks/usePaneles'
import { useCasillas } from '../hooks/useCasillas'
import { useEsTelefono } from '../hooks/useEsTelefono'
import { usePensum } from '../hooks/usePensum'
import { useTema } from '../hooks/useTema'
import { variablesDeTono } from '../theme/paleta'
import AlPedirlo from './AlPedirlo'
import PanelAvisos from './AvisosCarrera'
import BarraInferior from './BarraInferior'
import BarraSuperior from './BarraSuperior'
import {
  GrafoPensum,
  Horario,
  PaletaComandos,
  PedirElResto,
  PlanRuta,
  VistaLista,
  pedirVista,
} from './carreraPorTrozos'
import EsqueletoMapa from './EsqueletoMapa'
import HojaAvance from './HojaAvance'
import PanelProgreso from './PanelProgreso'
import Precalentar from './Precalentar'
import ContenidoAvance from './ContenidoAvance'
import SelectorElectiva, { PrecalentarSelector } from './SelectorElectiva'

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

  const [vista, setVista] = useState(vistaInicial)
  /* La vista que se ve va un paso por detras de la elegida. El selector
     responde en el acto; la vista nueva se prepara despues, por tramos que
     dejan pasar cualquier toque, y se cambia cuando esta lista. La primera
     visita al mapa son mil seiscientos elementos: preparados de un golpe en
     el mismo toque, el telefono se quedaba medio segundo sin responder y sin
     enseñar siquiera que el toque habia llegado.

     Por lo mismo, si el codigo de la vista nueva aun no ha bajado -cada una
     es un trozo aparte, ver carreraPorTrozos.js- la que hay sigue en pantalla
     hasta que llega: no se cambia una vista hecha por una silueta. */
  const vistaEnPantalla = useDeferredValue(vista)
  /* Las vistas que ya se abrieron: siguen montadas, ocultas, al dejarlas */
  const [visitadas, setVisitadas] = useState(() => new Set([vista]))
  if (!visitadas.has(vistaEnPantalla)) setVisitadas(new Set(visitadas).add(vistaEnPantalla))
  useEffect(() => {
    recordarVista(vista)
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
  const [seleccionado, setSeleccionado] = useState(null)

  /* Elegir la electiva de una casilla abre su panel, y en escritorio ese
     panel sale donde el del avance: abrir uno cierra el otro. La ficha de la
     materia tambien se cierra, que ya estas en otra cosa.

     `aprobar` lo pide la casilla del semestre cuando lo unico que le falta
     es esta electiva (ver alternarSemestre): lo que se elija queda aprobado. */
  const [aprobarAlElegir, setAprobarAlElegir] = useState(false)
  const abrirCasilla = useCallback(
    (codigo, { aprobar = false } = {}) => {
      cerrar()
      setSeleccionado(null)
      setCasillaAbierta(codigo)
      setAprobarAlElegir(aprobar)
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
  //
  // Y espera tambien al codigo de la vista, que es un trozo aparte (ver
  // carreraPorTrozos.js) y puede tardar mas que el cascaron. La silueta sigue
  // en pantalla, la misma, hasta que hay con que sustituirla: montando antes,
  // React la cambiaria por la de reserva del Suspense, que es igual, y serian
  // dos siluetas montadas para no ver nada distinto.
  const [mapaMontado, setMapaMontado] = useState(false)
  useEffect(() => {
    if (mapaMontado) return
    let vigente = true
    const fotograma = new Promise((seguir) => {
      requestAnimationFrame(seguir)
      // Red de seguridad: en una pestaña oculta requestAnimationFrame no se
      // dispara NUNCA. Sin esto, abrir una carrera en una pestaña de fondo la
      // dejaria en la silueta para siempre. Se comprobo de verdad, no es una
      // precaucion teorica.
      setTimeout(seguir, 200)
    })
    /* Tambien si el codigo no llega: montada, la vista lo vuelve a pedir y
       el fallo sale por el limite de error, en vez de quedarse en la silueta. */
    Promise.allSettled([fotograma, pedirVista(vista)]).then(() => vigente && setMapaMontado(true))
    return () => {
      vigente = false
    }
  }, [mapaMontado, vista])

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

  /* La casilla de cada semestre -cuanto llevas de el y que le falta-, la
     misma en la cabecera del mapa y en la de la lista. */
  const marcasSemestre = useMemo(
    () => marcasDeSemestres(layout.nodos, enCasilla, estados),
    [layout.nodos, enCasilla, estados],
  )

  /* Pulsar la casilla de un semestre, en el mapa o en la lista (ver
     accionDeSemestre): aprueba lo que le falta, sus obligatorias y la
     electiva de cada casilla, en un solo cambio; si ya esta todo, lo desmarca.
     Sin confirmar antes: la misma casilla lo devuelve de un toque, y
     preguntar seria pedir dos toques para lo que casi siempre se quiere a la
     primera.

     Y si lo unico que falta es una electiva sin elegir, abre su selector. Lo
     que se elija ahi queda aprobado: quien pulso la casilla queria el
     semestre completo, y dejarle la electiva puesta y sin aprobar seria
     pedirle otro toque para acabar lo que ya pidio. */
  const alternarSemestre = useCallback(
    (semestre) => {
      const accion = accionDeSemestre(layout.nodos, semestre, enCasilla, estados)
      if (!accion) return
      if (accion.tipo === 'elegir') {
        abrirCasilla(accion.casilla, { aprobar: true })
        return
      }
      const marca = accion.tipo === 'aprobar' ? ESTADO.APROBADA : null
      marcarVariasYContar(Object.fromEntries(accion.codigos.map((c) => [c, marca])))
    },
    [layout, enCasilla, estados, marcarVariasYContar, abrirCasilla],
  )

  const alternarSeleccion = useCallback(
    (codigo) => {
      setSeleccionado((previo) => {
        if (previo === codigo) return null
        mirar(codigo)
        return codigo
      })
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

      <AlPedirlo cuando={paletaAbierta}>
        <PaletaComandos
          abierta={paletaAbierta}
          alCerrar={() => setPaletaAbierta(false)}
          acciones={accionesPaleta}
          materias={layout.nodos}
          estados={estados}
          carreras={CARRERAS.filter((c) => c.slug !== carrera.slug)}
          alIrAMateria={(codigo) => {
            setVista('mapa')
            setSeleccionado(codigo)
          }}
          alIrACarrera={alVolver}
        />
      </AlPedirlo>

      <AlPedirlo cuando={planAbierto}>
        <PlanRuta
          abierto={planAbierto}
          carrera={carrera}
          marcas={marcas}
          progreso={progreso}
          elegidas={elegidas}
          alCerrar={() => setPlanAbierto(false)}
        />
      </AlPedirlo>

      {/* Elegir que va en una casilla. Vive aqui y no dentro del mapa, que
          se remonta al cambiar de vista y lleva el transform del pan y el
          zoom: el panel saldria movido, a escala o cortado a media salida. */}
      <SelectorElectiva
        codigo={casillaAbierta}
        porCodigo={layout.porCodigo}
        grupos={grupos}
        estados={estados}
        casillaDe={casillaDe}
        aprobarAlElegir={aprobarAlElegir}
        alColocar={(casilla, codigo) => {
          colocar(casilla, codigo)
          if (aprobarAlElegir && codigo && estados[codigo] !== ESTADO.APROBADA) {
            marcarYContar(codigo, ESTADO.APROBADA)
          }
          setCasillaAbierta(null)
        }}
        alCerrar={cerrarCasilla}
      />

      {/* Las vistas no se desmontan al cambiar de una a otra: la que se deja
          queda oculta con su estado -la camara del mapa, lo desplegado de la
          lista- en un Activity, y volver a ella es enseñarla, no construirla.
          Montar el mapa son mil seiscientos elementos: medido a CPU x6,
          volver de la lista al mapa costaba una tarea de 430 ms. Oculta, React
          la sigue poniendo al dia cuando le sobra tiempo -si marcas en la
          lista, el mapa ya llega con la marca-, sin quitarselo a lo que se ve.
          Cada vista se monta la primera vez que se visita, no antes.

          Al enseñarse de nuevo, la vista vuelve a entrar fundiendose: un
          elemento que pasa de display:none a verse reinicia su animacion. La
          silueta NO entra animada: es la misma que ya estaba en pantalla
          mientras bajaba el codigo (el fallback de App), y fundirla desde
          cero la hacia parpadear justo al llegar.

          Y es tambien lo que se ve si el codigo de la primera vista tarda mas
          que el del cascaron: la misma silueta, sin relevo. */}
      <div className="relative flex flex-1 overflow-hidden">
        <Suspense fallback={<EsqueletoMapa slug={carrera.slug} />}>
          {!mapaMontado ? (
            <EsqueletoMapa slug={carrera.slug} />
          ) : (
            <>
              {VISTAS.filter((v) => visitadas.has(v.id)).map(({ id }) => (
                <Activity key={id} mode={id === vistaEnPantalla ? 'visible' : 'hidden'}>
                  <div className="entrada-panel relative flex min-w-0 flex-1 overflow-hidden">
                    {id === 'horario' ? (
                      <Horario carrera={carrera} estados={estados} />
                    ) : id === 'mapa' ? (
                      <GrafoPensum
                        clave={carrera.slug}
                        layout={layout}
                        porCodigo={porCodigo}
                        estados={estados}
                        descarga={descarga}
                        toque={toque}
                        seleccionado={seleccionado}
                        alSeleccionar={alternarSeleccion}
                        alMarcar={marcarYContar}
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
                  </div>
                </Activity>
              ))}

              {/* Lo que se deja para cuando el aparato quede en reposo va
                  AQUI DENTRO, y no es por orden. Lo que cuelga de un Suspense
                  no corre sus efectos hasta que todo lo de dentro esta en
                  pantalla: asi nada de esto empieza antes de que se vea la
                  primera vista. Fuera, con la red lenta el reposo llegaba
                  antes que el codigo de la vista, y lo de adelantar le quitaba
                  la red y el procesador a lo unico que se estaba esperando. */}
              <PedirElResto />
              {esTelefono && (
                <>
                  {/* La primera vez que se abren el avance y una electiva,
                      antes de que nadie los abra: ver Precalentar. */}
                  <Precalentar>
                    <div className="px-5">
                      <ContenidoAvance {...avance} />
                    </div>
                  </Precalentar>
                  <PrecalentarSelector
                    nodos={layout.nodos}
                    grupos={grupos}
                    estados={estados}
                    casillaDe={casillaDe}
                    alColocar={colocar}
                    alCerrar={cerrarCasilla}
                  />
                </>
              )}
            </>
          )}
        </Suspense>

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
        <PanelProgreso {...avance} abierto={abierto === 'avance'} alCerrar={cerrar} />
      )}
    </div>
  )
}

export default VistaCarrera
