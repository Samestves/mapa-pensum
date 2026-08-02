import { useEffect, useMemo, useState } from 'react'
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

  // El avance ya no ocupa columna: se abre desde la cabecera y flota
  const [panelAbierto, setPanelAbierto] = useState(false)
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
      <BarraSuperior
        meta={meta}
        tema={tema}
        alternarTema={alternarTema}
        resumen={progreso}
        vista={vista}
        alCambiarVista={setVista}
        panelAbierto={panelAbierto}
        alAlternarPanel={() => setPanelAbierto((v) => !v)}
        alPlanificar={() => setPlanAbierto(true)}
      />

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
          <VistaLista layout={layout} estados={estados} alMarcar={marcar} />
        )}

        <PanelProgreso
          progreso={progreso}
          avanceElectivas={avanceElectivas}
          areaFiltrada={areaFiltrada}
          alFiltrarArea={filtrarArea}
          alAbrirElectivas={() => setElectivasAbiertas(true)}
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
