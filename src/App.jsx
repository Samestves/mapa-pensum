import { useEffect, useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import pensum from './data/pensum.json'
import { calcularLayout } from './layout/calcularLayout'
import { usePensum } from './hooks/usePensum'
import { useTema } from './hooks/useTema'
import BarraSuperior from './components/BarraSuperior'
import GrafoPensum from './components/GrafoPensum'
import Leyenda from './components/Leyenda'
import PanelProgreso from './components/PanelProgreso'
import PanelElectivas from './components/PanelElectivas'
import PlanRuta from './components/PlanRuta'
import VistaLista from './components/VistaLista'

const CLAVE_VISTA = 'mapa-pensum:vista'

function App() {
  const { meta, asignaturas, electivas } = pensum

  // El layout es geometria pura y no depende del avance: se calcula una vez
  const layout = useMemo(
    () => calcularLayout(asignaturas, electivas),
    [asignaturas, electivas],
  )

  const {
    marcas,
    estados,
    progreso,
    avanceElectivas,
    descarga,
    toque,
    marcar,
    reiniciar,
    hayMarcas,
  } = usePensum(asignaturas, electivas, meta.creditos)
  const { tema, alternarTema } = useTema()

  // En movil la lista es la vista util: el mapa completo solo cabe a 0.10
  const [vista, setVista] = useState(
    () => localStorage.getItem(CLAVE_VISTA) ?? (window.innerWidth < 768 ? 'lista' : 'mapa'),
  )
  useEffect(() => {
    localStorage.setItem(CLAVE_VISTA, vista)
  }, [vista])

  // El avance ya no ocupa columna: se abre desde el chip de la cabecera
  const [panelAbierto, setPanelAbierto] = useState(false)
  // Modo inmersivo: la cabecera se puede esconder para dejar solo el mapa
  const [barraOculta, setBarraOculta] = useState(false)
  const [leyendaAbierta, setLeyendaAbierta] = useState(() => window.innerWidth >= 640)
  const [planAbierto, setPlanAbierto] = useState(false)
  const [electivasAbiertas, setElectivasAbiertas] = useState(false)
  const [areaFiltrada, setAreaFiltrada] = useState(null)
  const [seleccionado, setSeleccionado] = useState(null)
  const [senalado, setSenalado] = useState(null)

  // Aislar un area y enfocar una cadena son dos formas de mirar el mismo mapa.
  // Si se dejan activas a la vez casi siempre no queda nada visible, asi que
  // cada una apaga la otra.
  const filtrarArea = (area) => {
    setAreaFiltrada(area)
    if (area) setSeleccionado(null)
  }

  const seleccionar = (codigo) => {
    setSeleccionado(codigo)
    if (codigo) setAreaFiltrada(null)
  }

  return (
    <div className="flex h-full flex-col">
      {barraOculta ? (
        <button
          type="button"
          onClick={() => setBarraOculta(false)}
          title="Mostrar la barra"
          aria-label="Mostrar la barra"
          className="transicion-tema absolute top-0 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1.5 rounded-b-xl border border-t-0 border-panel-borde bg-panel/90 px-4 py-1 text-tinta-suave backdrop-blur hover:py-1.5 hover:text-tinta"
        >
          <ChevronDown size={15} />
        </button>
      ) : (
        <BarraSuperior
          meta={meta}
          tema={tema}
          alternarTema={alternarTema}
          resumen={progreso}
          vista={vista}
          alCambiarVista={setVista}
          avanceAbierto={panelAbierto}
          alAlternarAvance={() => setPanelAbierto((v) => !v)}
          alAbrirElectivas={() => setElectivasAbiertas(true)}
          alPlanificar={() => setPlanAbierto(true)}
          alOcultarBarra={() => {
            setBarraOculta(true)
            setPanelAbierto(false)
          }}
        />
      )}

      {planAbierto && (
        <PlanRuta
          asignaturas={asignaturas}
          electivas={electivas}
          marcas={marcas}
          estados={estados}
          progreso={progreso}
          relaciones={layout.relaciones}
          meta={meta}
          alCerrar={() => setPlanAbierto(false)}
        />
      )}

      {electivasAbiertas && (
        <PanelElectivas
          electivas={electivas}
          estados={estados}
          marcas={marcas}
          avance={avanceElectivas}
          alMarcar={marcar}
          alCerrar={() => setElectivasAbiertas(false)}
        />
      )}

      <div className="relative flex flex-1 overflow-hidden">
        {vista === 'mapa' ? (
          <>
            <GrafoPensum
              layout={layout}
              estados={estados}
              descarga={descarga}
              toque={toque}
              areaFiltrada={areaFiltrada}
              seleccionado={seleccionado}
              senalado={senalado}
              alSenalar={setSenalado}
              alSeleccionar={seleccionar}
              alMarcar={marcar}
            />
            <Leyenda
              abierta={leyendaAbierta}
              alAlternar={() => setLeyendaAbierta((v) => !v)}
              areaFiltrada={areaFiltrada}
              alFiltrarArea={filtrarArea}
            />
          </>
        ) : (
          <VistaLista
            layout={layout}
            estados={estados}
            avanceElectivas={avanceElectivas}
            alMarcar={marcar}
          />
        )}

        <PanelProgreso
          progreso={progreso}
          avanceElectivas={avanceElectivas}
          alAbrirElectivas={() => {
            setPanelAbierto(false)
            setElectivasAbiertas(true)
          }}
          reiniciar={reiniciar}
          hayMarcas={hayMarcas}
          abierto={panelAbierto}
          alCerrar={() => setPanelAbierto(false)}
        />
      </div>
    </div>
  )
}

export default App
