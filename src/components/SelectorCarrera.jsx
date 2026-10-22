import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import { CARRERAS, precargarCarrera } from '../data/carreras'
import { ultimaCarrera } from '../data/ultimaCarrera'
import { recordarVista } from '../data/vistaInicial'
import { bienvenidaVista, recordarBienvenida } from '../data/bienvenida'
import { HOJA, TODAS, carreraPropia } from '../data/portada'
import { useTema } from '../hooks/useTema'
import { tieneMarcas, useAvancePortada } from '../hooks/useAvancePortada'
import { precargarVista } from './vistaDiferida'
import AvisoInstalar from './AvisoInstalar'
import Cabecera from './portada/Cabecera'
import Presentacion from './portada/Presentacion'
import SeguirCarrera from './portada/SeguirCarrera'
import ListaCarreras from './portada/ListaCarreras'
import PiePortada from './portada/PiePortada'
import BotonBuscar from './portada/BotonBuscar'

/* Lo que se abre encima y la guia de la primera visita van en sus propios
   trozos: la portada se pinta sin ellos. */
const cargarHojas = () => import('./portada/HojasPortada')
const HojasPortada = lazy(cargarHojas)
const Bienvenida = lazy(() => import('./bienvenida/Bienvenida'))

/* Lo que tarda en bajarse el trozo de las hojas despues de pintar: para
   cuando alguien toca una carrera ya esta, y no compite con la entrada. */
const HOJAS_EN_REPOSO_MS = 1500

/**
 * La portada: lo primero que ve quien abre la aplicacion.
 *
 * Contesta lo que pregunta cada uno. Quien llega por primera vez no sabe que
 * es esto: le recibe una guia de tres pasos y, despues, una frase que lo
 * dice y la lista de carreras. Quien vuelve -casi todos- viene a seguir con
 * la suya: su carrera va arriba, en su color, con lo que lleva y un toque
 * para entrar; las demas quedan debajo.
 *
 * Tocar una carrera abre su ficha en vez de entrar de golpe: quien no la
 * conoce ve de que tamaño es y que hay dentro, y el pensum se va bajando
 * mientras tanto. La carrera vista por ultima vez NO se abre sola: dejaria
 * la portada inalcanzable, y esta pantalla es tambien la que posiciona en
 * buscadores.
 *
 * Este componente solo conecta las piezas; cada una vive en portada/.
 */
function SelectorCarrera({ alElegir }) {
  const { tema, alternarTema } = useTema()
  const avances = useAvancePortada(CARRERAS)
  const [propia] = useState(() => carreraPropia(CARRERAS, ultimaCarrera(), tieneMarcas))
  const [guia, setGuia] = useState(() => !propia && !bienvenidaVista())
  const [hoja, setHoja] = useState(null)
  const [hojasPedidas, setHojasPedidas] = useState(false)
  const [tipo, setTipo] = useState(TODAS)
  const [texto, setTexto] = useState('')

  const colorDe = useCallback(
    (carrera) =>
      (tema === 'oscuro' ? carrera.color?.oscuro : carrera.color?.claro) ?? 'var(--tinta-suave)',
    [tema],
  )
  const suya = CARRERAS.find((c) => c.slug === propia)
  const otras = useMemo(() => CARRERAS.filter((c) => c.slug !== propia), [propia])

  useEffect(() => {
    const t = setTimeout(cargarHojas, HOJAS_EN_REPOSO_MS)
    return () => clearTimeout(t)
  }, [])

  /* Se calientan las dos cosas a la vez: los datos del pensum y el codigo
     que los dibuja. Precargar solo una cambiaria una espera por otra. */
  const precargar = useCallback((slug) => {
    precargarCarrera(slug)
    precargarVista()
  }, [])

  const abrir = (nueva) => {
    setHojasPedidas(true)
    setHoja(nueva)
  }
  const abrirFicha = (slug) => abrir({ tipo: HOJA.CARRERA, slug })

  /* Entrar a una carrera, con la vista pedida o, sin ella, con la ultima que
     se uso (ver vistaInicial). */
  const entrar = (slug, vista) => {
    if (vista) recordarVista(vista)
    precargar(slug)
    alElegir(slug)
  }

  const terminarGuia = () => {
    recordarBienvenida()
    setGuia(false)
  }

  return (
    <div className="relative h-full overflow-y-auto">
      {/* Veladura de color arriba. Va aqui fuera y no dentro del contenedor
          centrado para que cruce todo el ancho de la pantalla. */}
      <div className="ambiente-portada" aria-hidden="true">
        <span className="velo-oscuro" />
        <span className="velo-claro" />
      </div>

      <div className="portada">
        <Cabecera
          menuAbierto={hoja?.tipo === HOJA.MENU}
          alAbrirMenu={() => abrir({ tipo: HOJA.MENU })}
        />

        <div className="portada-cuerpo">
          <div className="portada-lado">
            {suya ? (
              <SeguirCarrera
                carrera={suya}
                color={colorDe(suya)}
                resumen={avances[suya.slug]}
                conMarcas={tieneMarcas(suya.slug)}
                alSeguir={() => entrar(suya.slug)}
                alHorario={() => entrar(suya.slug, 'horario')}
              />
            ) : (
              <Presentacion carreras={CARRERAS} colorDe={colorDe} />
            )}
          </div>

          <ListaCarreras
            titulo={suya ? 'Otras carreras' : 'Elige tu carrera'}
            carreras={otras}
            tipo={tipo}
            texto={texto}
            colorDe={colorDe}
            avances={avances}
            alCambiarTipo={setTipo}
            alCambiarTexto={setTexto}
            alElegir={abrirFicha}
            alPrecargar={precargar}
          />
        </div>

        <PiePortada />
      </div>

      <BotonBuscar
        abierto={hoja?.tipo === HOJA.BUSCAR}
        alAbrir={() => abrir({ tipo: HOJA.BUSCAR })}
      />

      {/* Solo aqui y no dentro de una carrera: quien esta leyendo su mapa
          esta haciendo algo, y no es el momento de interrumpirlo. */}
      {!guia && <AvisoInstalar />}

      {hojasPedidas && (
        <Suspense fallback={null}>
          <HojasPortada
            hoja={hoja}
            carreras={CARRERAS}
            propia={propia}
            tema={tema}
            colorDe={colorDe}
            avances={avances}
            alCerrar={() => setHoja(null)}
            alAbrirFicha={abrirFicha}
            alEntrar={entrar}
            alPrecargar={precargar}
            alternarTema={alternarTema}
            alVerGuia={() => {
              setHoja(null)
              setGuia(true)
            }}
          />
        </Suspense>
      )}

      {guia && (
        <Suspense fallback={<div className="fixed inset-0 z-[60] bg-lienzo" />}>
          <Bienvenida alTerminar={terminarGuia} />
        </Suspense>
      )}
    </div>
  )
}

export default SelectorCarrera
