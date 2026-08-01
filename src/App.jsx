import { useMemo, useState } from 'react'
import { ChevronsLeft } from 'lucide-react'
import pensum from './data/pensum.json'
import { calcularLayout } from './layout/calcularLayout'
import { usePensum } from './hooks/usePensum'
import { useTema } from './hooks/useTema'
import BarraSuperior from './components/BarraSuperior'
import GrafoPensum from './components/GrafoPensum'
import Leyenda from './components/Leyenda'
import PanelProgreso from './components/PanelProgreso'

function App() {
  const { meta, asignaturas } = pensum

  // El layout es geometria pura y no depende del avance: se calcula una vez
  const layout = useMemo(() => calcularLayout(asignaturas), [asignaturas])

  const { estados, progreso, descarga, toque, marcar, alternarAprobada, reiniciar, hayMarcas } =
    usePensum(asignaturas)
  const { tema, alternarTema } = useTema()

  // El panel arranca abierto solo si hay sitio; la leyenda, plegada en movil
  const [panelAbierto, setPanelAbierto] = useState(() => window.innerWidth >= 1024)
  const [leyendaAbierta, setLeyendaAbierta] = useState(() => window.innerWidth >= 640)
  const [areaFiltrada, setAreaFiltrada] = useState(null)
  const [seleccionado, setSeleccionado] = useState(null)
  const [senalado, setSenalado] = useState(null)

  const totales = useMemo(
    () => ({
      asignaturas: asignaturas.length,
      uc: asignaturas.reduce((s, a) => s + a.uc, 0),
    }),
    [asignaturas],
  )

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
      <BarraSuperior
        meta={meta}
        totales={totales}
        tema={tema}
        alternarTema={alternarTema}
        reiniciar={() => {
          reiniciar()
          setSeleccionado(null)
        }}
        hayMarcas={hayMarcas}
        resumen={progreso}
        panelAbierto={panelAbierto}
        alAlternarPanel={() => setPanelAbierto((v) => !v)}
      />

      <div className="relative flex flex-1 overflow-hidden">
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
          alAlternarAprobada={alternarAprobada}
          alMarcar={marcar}
        />

        <Leyenda
          abierta={leyendaAbierta}
          alAlternar={() => setLeyendaAbierta((v) => !v)}
          areaFiltrada={areaFiltrada}
          alFiltrarArea={filtrarArea}
        />

        {/* Pestana en el borde: deja claro de donde sale el panel */}
        {!panelAbierto && (
          <button
            type="button"
            onClick={() => setPanelAbierto(true)}
            title="Mostrar mi avance"
            className="transicion-tema group absolute top-1/2 right-0 z-30 flex -translate-y-1/2 items-center gap-1.5 rounded-l-xl border border-r-0 border-panel-borde bg-panel/90 py-4 pr-1.5 pl-2 backdrop-blur hover:pr-2.5"
          >
            <ChevronsLeft
              size={15}
              className="text-tinta-suave transition-transform duration-200 group-hover:-translate-x-0.5"
            />
            <span
              className="text-[10px] font-bold tracking-wide text-tinta-suave"
              style={{ writingMode: 'vertical-rl' }}
            >
              MI AVANCE
            </span>
          </button>
        )}

        <PanelProgreso
          progreso={progreso}
          areaFiltrada={areaFiltrada}
          alFiltrarArea={filtrarArea}
          abierto={panelAbierto}
          alCerrar={() => setPanelAbierto(false)}
        />
      </div>
    </div>
  )
}

export default App
