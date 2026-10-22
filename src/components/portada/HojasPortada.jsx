import { useState } from 'react'
import { X } from 'lucide-react'
import { useEsTelefono } from '../../hooks/useEsTelefono'
import HojaInferior from '../HojaInferior'
import Ventana from '../Ventana'
import BuscadorCarreras from './BuscadorCarreras'
import { CuerpoFicha, PieFicha } from './FichaCarrera'
import MenuPortada from './MenuPortada'
import { HOJA } from '../../data/portada'
import '../../estilos/hojas-portada.css'

const ETIQUETA = {
  [HOJA.CARRERA]: 'Ficha de la carrera',
  [HOJA.BUSCAR]: 'Buscar tu carrera',
  [HOJA.MENU]: 'Ajustes y ayuda',
}

function Cerrar({ alCerrar }) {
  return (
    <button
      type="button"
      onClick={alCerrar}
      aria-label="Cerrar"
      className="boton-cerrar grid size-9 shrink-0 place-items-center rounded-full"
    >
      <X size={17} strokeWidth={1.75} />
    </button>
  )
}

/**
 * Lo que se abre encima de la portada: la ficha de una carrera, el buscador
 * del telefono y el menu. En el telefono sube como una hoja y en escritorio
 * es una ventana en medio, como todo lo que se abre encima en la aplicacion.
 *
 * Vive en su propio trozo de codigo: la portada se pinta sin el, y se baja en
 * cuanto la pagina queda quieta (ver SelectorCarrera).
 *
 * `hoja` es lo que hay abierto -{ tipo, slug }- o null. Al cerrarse, la hoja
 * del telefono sigue montada con lo ultimo que enseño mientras baja.
 */
function HojasPortada({
  hoja,
  carreras,
  propia,
  tema,
  colorDe,
  avances,
  alCerrar,
  alAbrirFicha,
  alEntrar,
  alPrecargar,
  alternarTema,
  alVerGuia,
}) {
  const telefono = useEsTelefono()
  const [visible, setVisible] = useState(hoja)
  if (hoja && hoja !== visible) setVisible(hoja)
  const actual = hoja ?? visible
  if (!actual || (!telefono && !hoja)) return null

  const carrera = actual.tipo === HOJA.CARRERA && carreras.find((c) => c.slug === actual.slug)
  const esPropia = carrera && carrera.slug === propia

  let cuerpo
  let pie = null
  let titulo = null
  if (carrera) {
    cuerpo = (
      <CuerpoFicha
        carrera={carrera}
        color={colorDe(carrera)}
        resumen={esPropia ? avances[carrera.slug] : null}
      />
    )
    pie = (
      <PieFicha
        propia={esPropia}
        alAbrir={() => alEntrar(carrera.slug, esPropia ? null : 'mapa')}
        alAbrirLista={() => alEntrar(carrera.slug, 'lista')}
      />
    )
  } else if (actual.tipo === HOJA.BUSCAR) {
    cuerpo = (
      <BuscadorCarreras
        carreras={carreras}
        colorDe={colorDe}
        avances={avances}
        alElegir={alAbrirFicha}
        alPrecargar={alPrecargar}
      />
    )
  } else {
    titulo = 'Ajustes y ayuda'
    cuerpo = <MenuPortada tema={tema} alternarTema={alternarTema} alVerGuia={alVerGuia} />
  }

  const cabecera = (
    <div className="flex items-center justify-between gap-3 px-5 pt-1 pb-2 md:pt-4">
      <p className="font-ui text-[19px] font-normal tracking-[-0.01em] text-tinta">{titulo}</p>
      {actual.tipo !== HOJA.BUSCAR && <Cerrar alCerrar={alCerrar} />}
    </div>
  )

  return telefono ? (
    <HojaInferior
      abierta={Boolean(hoja)}
      alCerrar={alCerrar}
      alIrse={() => setVisible(null)}
      etiqueta={ETIQUETA[actual.tipo]}
      cabecera={cabecera}
      pie={pie}
    >
      {cuerpo}
    </HojaInferior>
  ) : (
    <Ventana
      etiqueta={ETIQUETA[actual.tipo]}
      ancho={carrera ? 460 : 420}
      alCerrar={alCerrar}
      cabecera={cabecera}
      pie={pie}
    >
      {cuerpo}
    </Ventana>
  )
}

export default HojasPortada
