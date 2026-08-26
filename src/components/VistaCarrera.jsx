import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ChevronDown, ChevronUp, GraduationCap, Moon, Sun } from 'lucide-react'
import { guardar, leer } from '../data/almacen'
import { calcularLayout } from '../layout/calcularLayout'
import { CARRERAS } from '../data/carreras'
import { VISTAS } from '../data/vistas'
import { useCercaDelBorde } from '../hooks/useCercaDelBorde'
import { usePaneles } from '../hooks/usePaneles'
import { useCasillas } from '../hooks/useCasillas'
import { usePensum } from '../hooks/usePensum'
import { useTema } from '../hooks/useTema'
import { variablesDeTono } from '../theme/paleta'
import PanelAvisos from './AvisosCarrera'
import BarraInferior from './BarraInferior'
import BarraSuperior from './BarraSuperior'
import EsqueletoMapa from './EsqueletoMapa'
import GrafoPensum from './GrafoPensum'
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
  const layout = useMemo(
    () => calcularLayout(asignaturas, grupos, carrera.electivasEnCasillas),
    [asignaturas, grupos, carrera.electivasEnCasillas],
  )

  const {
    marcas,
    estados,
    progreso,
    avanceGrupos,
    descarga,
    toque,
    marcar,
    reiniciar,
    hayMarcas,
  } = usePensum(carrera)
  /* Que electiva has puesto en cada casilla del pensum. Es una decision de
     planificacion, no de avance: aprobarla la sigue llevando usePensum. */
  const { elegidas, casillaDe, colocar } = useCasillas(carrera)
  const [casillaAbierta, setCasillaAbierta] = useState(null)

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
  const abrirCasilla = useCallback((codigo) => setCasillaAbierta(codigo), [])

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
  useEffect(() => {
    guardar(CLAVE_VISTA, vista)
  }, [vista])

  // Avance y avisos se abren desde la cabecera y se solapan en pantalla:
  // un solo valor en vez de un booleano por panel, y no hay que apagar nada.
  const { abierto, alternar, cerrar } = usePaneles()
  /* De que boton cuelga el avance. Se guarda su caja al abrirlo y no una ref
     al elemento: el popover solo necesita saber donde estaba en ese momento,
     y una caja es un valor muerto que no puede quedarse apuntando a un nodo
     que ya no existe. */
  const [anclaAvance, setAnclaAvance] = useState(null)
  // Modo inmersivo: la cabecera se puede esconder para dejar solo el mapa
  const [barraOculta, setBarraOculta] = useState(false)
  /* Si el raton esta sobre la cabecera. La zona sensible es la cabecera y
     nada mas: una franja invisible extra por debajo haria aparecer el
     circulo antes, pero a cambio robaria los clicks de esa franja al
     horario, y el control no puede estorbar a lo que hay debajo. */
  const [cercaCabecera, setCercaCabecera] = useState(false)
  /* Con la barra plegada no queda cabecera sobre la que hacer hover, asi que
     ahi la señal es la cercania al borde de arriba de la ventana. Antes el
     circulo se quedaba encendido permanentemente en ese caso -era el unico
     camino de vuelta- y estorbaba justo encima del horario. */
  const cercaDelBorde = useCercaDelBorde(barraOculta)
  const visiblePestana = barraOculta ? cercaDelBorde : cercaCabecera
  const [planAbierto, setPlanAbierto] = useState(false)
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
  const [senalado, setSenalado] = useState(null)

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

  const alternarSeleccion = useCallback((codigo) => {
    setSeleccionado((previo) => (previo === codigo ? null : codigo))
    setAreaFiltrada(null)
  }, [])

  return (
    <div className="relative flex h-full flex-col overflow-hidden" style={tonos}>
      {/* Barra y pestaña van juntas en un envoltorio relativo: la pestaña se
          ancla a su borde inferior con top-full, asi que al plegarse la barra
          sube pegada a ella sin animar nada aparte. */}
      <div
        className="relative z-40 shrink-0"
        onPointerEnter={() => setCercaCabecera(true)}
        onPointerLeave={() => setCercaCabecera(false)}
      >
        {/* La barra no se desmonta al ocultarse: colapsa su fila del grid de
            1fr a 0fr. Cambiarla por la pestaña de golpe cortaba la animacion. */}
        <div className="barra-colapsable" data-oculta={barraOculta}>
          <div>
          <BarraSuperior
            carrera={carrera}
            tema={tema}
            alternarTema={alternarTema}
            resumen={progreso}
            vista={vista}
            alCambiarVista={setVista}
            avanceAbierto={abierto === 'avance'}
            alAlternarAvance={(boton) => {
              setAnclaAvance(boton.getBoundingClientRect())
              alternar('avance')
            }}
            avisosAbiertos={abierto === 'avisos'}
            alAlternarAvisos={() => alternar('avisos')}
            alBuscar={() => setPaletaAbierta(true)}
            alVolver={alVolver}
          />
          </div>
        </div>

        {/* Un circulo montado justo encima de la linea que separa la barra
            del contenido, no una pestaña colgando de ella. Va invisible y
            aparece al acercar el raton a la cabecera: es un control que se
            usa una vez cada mucho, y teniendolo siempre encendido en el
            centro de la pantalla competia con el mapa.
            Con la barra plegada tampoco se queda encendido: ahi la señal es
            acercar el raton al borde de arriba de la ventana. */}
        {/* El envoltorio solo coloca; la animacion va en el boton, para que
            escalar no pelee con el translate.
            pointer-events-none mientras esta oculto: si no, seria un blanco
            de click invisible plantado encima del horario.

            El desplazamiento vertical NO es el mismo en los dos estados, y
            ahi estaba el fallo. Iba siempre centrado sobre el borde inferior
            de la barra -medio boton arriba, medio abajo-, que es justo lo que
            se quiere mientras hay una linea que montar. Pero plegada, esa
            linea es el borde de arriba de la ventana: el boton quedaba de -14
            a 14 y el contenedor, que recorta, empieza en 0. Medido: catorce
            pixeles cortados, la mitad exacta. De ahi que saliera "a medias".
            Plegada baja entero por debajo de la linea, que es el unico sitio
            donde hay pantalla. */}
        <div
          className={`pointer-events-none absolute top-full left-1/2 z-50 -translate-x-1/2 transition-transform duration-[420ms] ease-[cubic-bezier(0.32,0.72,0,1)] ${
            barraOculta ? 'translate-y-1.5' : '-translate-y-1/2'
          }`}
        >
          <button
            type="button"
            onClick={() => {
              setBarraOculta((v) => !v)
              cerrar()
            }}
            title={barraOculta ? 'Mostrar la barra' : 'Ocultar la barra'}
            aria-label={barraOculta ? 'Mostrar la barra' : 'Ocultar la barra'}
            aria-expanded={!barraOculta}
            className={`pestana-barra grid size-7 place-items-center rounded-full border border-panel-borde bg-panel text-tinta-tenue shadow-sm transition-[opacity,transform] duration-200 ease-out hover:text-tinta focus-visible:pointer-events-auto focus-visible:scale-100 focus-visible:opacity-100 ${
              visiblePestana
                ? 'pointer-events-auto scale-100 opacity-100'
                : 'pointer-events-none scale-75 opacity-0'
            }`}
          >
            {barraOculta ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
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

      {/* Elegir que va en una casilla. Vive aqui y no dentro del mapa porque
          el mapa es un SVG: un modal ahi dentro heredaria su transform de
          pan y zoom y saldria movido y a escala. */}
      {casillaAbierta && (
        <SelectorElectiva
          casilla={layout.porCodigo.get(casillaAbierta)}
          grupo={grupos.find((g) => g.clave === layout.porCodigo.get(casillaAbierta)?.grupo)}
          opciones={
            grupos.find((g) => g.clave === layout.porCodigo.get(casillaAbierta)?.grupo)
              ?.asignaturas ?? []
          }
          estados={estados}
          casillaDe={casillaDe}
          alColocar={(casilla, codigo) => {
            colocar(casilla, codigo)
            setCasillaAbierta(null)
          }}
          alCerrar={() => setCasillaAbierta(null)}
        />
      )}

      {/* La key incluye la vista, no solo si el mapa ya monto: asi cambiar
          entre mapa, lista y horario rearranca la animacion y la vista nueva
          entra fundiendose en vez de aparecer de golpe. Antes la key solo
          cambiaba una vez -cuando el mapa relevaba a la silueta- y los
          cambios de vista posteriores eran un corte seco. */}
      <div
        key={mapaMontado ? vista : 'esqueleto'}
        className="entrada-panel relative flex flex-1 overflow-hidden"
      >
        {!mapaMontado ? (
          <EsqueletoMapa slug={carrera.slug} />
        ) : vista === 'horario' ? (
          <Horario carrera={carrera} estados={estados} />
        ) : vista === 'mapa' ? (
          <GrafoPensum
            layout={layout}
            porCodigo={porCodigo}
            estados={estados}
            descarga={descarga}
            toque={toque}
            areaFiltrada={areaFiltrada}
            seleccionado={seleccionado}
            senalado={senalado}
            alSenalar={setSenalado}
            alSeleccionar={alternarSeleccion}
            alMarcar={marcar}
            enCasilla={enCasilla}
            alAbrirCasilla={abrirCasilla}
            casillaDe={casillaDe}
          />
        ) : (
          <VistaLista
            layout={layout}
            estados={estados}
            avanceGrupos={avanceGrupos}
            alMarcar={marcar}
          />
        )}

        {/* Los dos paneles cuelgan de aqui y no de la cabecera: sus hijos
            llevan overflow:hidden para la animacion de plegado y recortarian
            cualquier cosa que asomara por debajo. */}
        <PanelAvisos avisos={carrera.avisos} abierto={abierto === 'avisos'} alCerrar={cerrar} />

        {/* Dentro del mismo contenedor que la vista y no fuera: los paneles
            que se apoyan en el borde de abajo -la ficha del horario en
            telefono- tienen que apoyarse en el borde de la barra, no en el de
            la ventana, o quedan por debajo de ella. */}
        <PanelProgreso
          progreso={progreso}
          avanceGrupos={avanceGrupos}
          reiniciar={reiniciar}
          hayMarcas={hayMarcas}
          abierto={abierto === 'avance'}
          ancla={anclaAvance}
          alCerrar={cerrar}
          areaFiltrada={areaFiltrada}
          alFiltrarArea={filtrarArea}
          alPlanificar={() => {
            cerrar()
            setPlanAbierto(true)
          }}
        />
      </div>

      {/* La navegacion del telefono va al final del arbol y fuera del
          contenedor de la vista: es hermana suya, no algo flotando encima.
          Asi se lleva su alto del reparto en vez de taparle los ultimos
          pixeles al mapa o a la ultima hora del horario. */}
      <BarraInferior
        vista={vista}
        alCambiar={setVista}
        alPlanificar={() => setPlanAbierto(true)}
      />
    </div>
  )
}

export default VistaCarrera
