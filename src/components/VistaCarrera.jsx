import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { calcularLayout } from '../layout/calcularLayout'
import { usePensum } from '../hooks/usePensum'
import { useTema } from '../hooks/useTema'
import { variablesDeTono } from '../theme/paleta'
import PanelAvisos from './AvisosCarrera'
import BarraSuperior from './BarraSuperior'
import EsqueletoMapa from './EsqueletoMapa'
import GrafoPensum from './GrafoPensum'
import PanelProgreso from './PanelProgreso'
import PlanRuta from './PlanRuta'
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
  const layout = useMemo(() => calcularLayout(asignaturas, grupos), [asignaturas, grupos])

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
  const { tema, alternarTema } = useTema()

  // Rampa de tonos de la carrera, publicada como --tono-N para que cada nodo
  // la resuelva por su profundidad sin recibir el color por props.
  const tonos = useMemo(() => variablesDeTono(carrera, tema), [carrera, tema])

  // En movil la lista es la vista util: el mapa completo solo cabe a 0.10
  const [vista, setVista] = useState(
    () => localStorage.getItem(CLAVE_VISTA) ?? (window.innerWidth < 768 ? 'lista' : 'mapa'),
  )
  useEffect(() => {
    localStorage.setItem(CLAVE_VISTA, vista)
  }, [vista])

  // El avance ya no ocupa columna: se abre desde el chip de la cabecera
  const [panelAbierto, setPanelAbierto] = useState(false)
  const [avisosAbiertos, setAvisosAbiertos] = useState(false)
  // Modo inmersivo: la cabecera se puede esconder para dejar solo el mapa
  const [barraOculta, setBarraOculta] = useState(false)
  const [planAbierto, setPlanAbierto] = useState(false)
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
  const alternarSeleccion = useCallback((codigo) => {
    setSeleccionado((previo) => (previo === codigo ? null : codigo))
    setAreaFiltrada(null)
  }, [])

  return (
    <div className="relative flex h-full flex-col overflow-hidden" style={tonos}>
      {/* La barra no se desmonta al ocultarse: colapsa su fila del grid de
          1fr a 0fr. Cambiarla por la pestaña de golpe cortaba la animacion. */}
      <div className="barra-colapsable shrink-0" data-oculta={barraOculta}>
        <div>
          <BarraSuperior
            carrera={carrera}
            tema={tema}
            alternarTema={alternarTema}
            resumen={progreso}
            vista={vista}
            alCambiarVista={setVista}
            avanceAbierto={panelAbierto}
            alAlternarAvance={() => {
              setPanelAbierto((v) => !v)
              setAvisosAbiertos(false)
            }}
            avisosAbiertos={avisosAbiertos}
            alAlternarAvisos={() => {
              setAvisosAbiertos((v) => !v)
              setPanelAbierto(false)
            }}
            alPlanificar={() => setPlanAbierto(true)}
            alOcultarBarra={() => {
              setBarraOculta(true)
              setPanelAbierto(false)
            }}
            alVolver={alVolver}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => setBarraOculta(false)}
        title="Mostrar la barra"
        aria-label="Mostrar la barra"
        aria-hidden={!barraOculta}
        tabIndex={barraOculta ? 0 : -1}
        data-visible={barraOculta}
        className="pestana-barra transicion-tema absolute top-0 left-1/2 z-50 flex items-center gap-1.5 rounded-b-xl border border-t-0 border-panel-borde bg-panel/90 px-5 py-1.5 text-tinta-suave backdrop-blur hover:text-tinta"
      >
        <ChevronDown size={15} />
      </button>

      {planAbierto && (
        <PlanRuta
          carrera={carrera}
          marcas={marcas}
          estados={estados}
          progreso={progreso}
          relaciones={layout.relaciones}
          alCerrar={() => setPlanAbierto(false)}
        />
      )}

      {/* La key cambia una sola vez, cuando el mapa releva a la silueta: eso
          rearranca la animacion y el mapa aparece fundiendose encima de ella
          en vez de dando un salto. Es mas corta que la de la ruta porque va
          anidada dentro de ella: dos opacidades que se multiplican. */}
      <div
        key={mapaMontado ? 'mapa' : 'esqueleto'}
        className="entrada-mapa relative flex flex-1 overflow-hidden"
      >
        {!mapaMontado ? (
          <EsqueletoMapa slug={carrera.slug} />
        ) : vista === 'mapa' ? (
          <GrafoPensum
            layout={layout}
            estados={estados}
            descarga={descarga}
            toque={toque}
            areaFiltrada={areaFiltrada}
            seleccionado={seleccionado}
            senalado={senalado}
            alSenalar={setSenalado}
            alSeleccionar={alternarSeleccion}
            alMarcar={marcar}
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
        <PanelAvisos
          avisos={carrera.avisos}
          abierto={avisosAbiertos}
          alCerrar={() => setAvisosAbiertos(false)}
        />

        <PanelProgreso
          progreso={progreso}
          avanceGrupos={avanceGrupos}
          reiniciar={reiniciar}
          hayMarcas={hayMarcas}
          abierto={panelAbierto}
          alCerrar={() => setPanelAbierto(false)}
          areaFiltrada={areaFiltrada}
          alFiltrarArea={filtrarArea}
        />
      </div>
    </div>
  )
}

export default VistaCarrera
