import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, CircleHelp, KeyRound, LogOut, RefreshCw, TriangleAlert } from 'lucide-react'
import { CARRERAS } from '../data/carreras'
import ComoSeCuenta from './panel/ComoSeCuenta'
import PanelAparatos from './panel/PanelAparatos'
import PanelCarreras from './panel/PanelCarreras'
import PanelGeneral from './panel/PanelGeneral'
import { diaCorto } from './panel/formato'
import { Hueco } from './panel/piezas'

/**
 * El panel de uso. Privado: es la unica pantalla de la aplicacion que no es
 * para el estudiante.
 *
 * Vive dentro de la misma web -en /panel- y se baja en su propio trozo de
 * codigo: quien entra a mirar su pensum no descarga nada de esto.
 *
 * Va en cuatro pestañas que se cargan cada una por su lado: lo general al
 * entrar, y cada carrera o la lista de aparatos cuando se abren. Antes todo
 * venia en una sola peticion, y elegir otra carrera en el mapa de calor
 * volvia a pedir el panel entero: todos los numeros se movian a la vez y no
 * se sabia que habia cambiado por que.
 */
const CLAVE_GUARDADA = 'mapa-pensum:panel'
const PESTANA_GUARDADA = 'mapa-pensum:panel-pestana'

/* La ultima, en un telefono, es solo el icono: con el nombre entero las
   cuatro no caben en 375 px y la barra se cortaba. */
const PESTANAS = [
  ['general', 'General'],
  ['carreras', 'Carreras'],
  ['aparatos', 'Dispositivos'],
  ['como', 'Cómo se cuenta', CircleHelp],
]

const sesion = {
  leer: (clave) => {
    try {
      return sessionStorage.getItem(clave)
    } catch {
      return null
    }
  },
  guardar: (clave, valor) => {
    try {
      if (valor == null) sessionStorage.removeItem(clave)
      else sessionStorage.setItem(clave, valor)
    } catch {
      // Sin almacenamiento de sesion se pedira la clave cada vez, y ya
    }
  },
}

/** El color de cada carrera en el tema que este puesto */
const colorDe = (carrera) => {
  const tema = document.documentElement.dataset.tema === 'claro' ? 'claro' : 'oscuro'
  return carrera?.color?.[tema] ?? 'var(--tinta-suave)'
}

class ErrorPanel extends Error {
  constructor(mensaje, codigo) {
    super(mensaje)
    this.codigo = codigo
  }
}

async function consultar(clave, parametros) {
  const url = `/api/panel?clave=${encodeURIComponent(clave)}&${new URLSearchParams(parametros)}`
  const respuesta = await fetch(url)
  if (respuesta.status === 401) throw new ErrorPanel('Esa clave no es', 401)
  if (respuesta.status === 503)
    throw new ErrorPanel('Falta configurar PANEL_CLAVE o la base de datos', 503)
  if (!respuesta.ok)
    throw new ErrorPanel(`El servidor respondió ${respuesta.status}`, respuesta.status)
  return respuesta.json()
}

function PanelUso({ alVolver }) {
  const [clave, setClave] = useState(() => sesion.leer(CLAVE_GUARDADA) ?? '')
  const [dentro, setDentro] = useState(false)
  const [entrando, setEntrando] = useState(false)
  const [errorEntrada, setErrorEntrada] = useState(null)
  const [aviso, setAviso] = useState(null)
  const [actualizado, setActualizado] = useState(null)
  const [pestana, setPestana] = useState(() => sesion.leer(PESTANA_GUARDADA) ?? 'general')

  const [general, setGeneral] = useState(null)
  const [slug, setSlug] = useState(null)
  const [porCarrera, setPorCarrera] = useState({})
  const [ventana, setVentana] = useState(30)
  const [porVentana, setPorVentana] = useState({})
  const [cargando, setCargando] = useState({})
  const [vuelta, setVuelta] = useState(0)
  const contenedor = useRef(null)
  // La clave con la que se entro, para las peticiones que vienen despues
  const claveBuena = useRef('')
  /* Lo que ya se pidio en esta vuelta. Sin esto, una seccion que falla se
     volveria a pedir sola en bucle; asi espera a que se pulse Actualizar. */
  const pedidos = useRef(new Set())

  const salir = useCallback((mensaje) => {
    sesion.guardar(CLAVE_GUARDADA, null)
    claveBuena.current = ''
    pedidos.current.clear()
    setDentro(false)
    setGeneral(null)
    setPorCarrera({})
    setPorVentana({})
    setErrorEntrada(mensaje ?? null)
  }, [])

  /** Pide una seccion y la deja en su sitio. Un fallo no borra lo que ya habia. */
  const cargar = useCallback(
    async (nombre, parametros, poner) => {
      setCargando((c) => ({ ...c, [nombre]: true }))
      try {
        poner(await consultar(claveBuena.current, parametros))
        setAviso(null)
        setActualizado(new Date())
      } catch (e) {
        if (e.codigo === 401) salir('La clave cambió: vuelve a escribirla')
        else setAviso(e.message)
      } finally {
        setCargando((c) => ({ ...c, [nombre]: false }))
      }
    },
    [salir],
  )

  const entrar = useCallback(async (valor) => {
    if (!valor) return
    setEntrando(true)
    setErrorEntrada(null)
    try {
      const datos = await consultar(valor, { seccion: 'general', dias: 30 })
      claveBuena.current = valor
      sesion.guardar(CLAVE_GUARDADA, valor)
      setGeneral(datos)
      setActualizado(new Date())
      setDentro(true)
      // La carrera con la que abre su pestaña: la mas usada del mes
      const primera = Object.entries(datos.carreras ?? {}).sort(
        (a, b) => b[1].mes - a[1].mes,
      )[0]?.[0]
      setSlug((actual) => actual ?? primera ?? CARRERAS[0].slug)
    } catch (e) {
      setErrorEntrada(e.message)
    } finally {
      setEntrando(false)
    }
  }, [])

  // Con la clave ya guardada en esta pestaña, entrar no vuelve a preguntarla
  useEffect(() => {
    if (clave) entrar(clave)
    // Solo al montar: a partir de ahi manda el formulario
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cada pestaña pide lo suyo la primera vez que se abre, y lo guarda
  useEffect(() => {
    if (!dentro) return
    const pedirUnaVez = (nombre, parametros, poner) => {
      if (pedidos.current.has(nombre)) return
      pedidos.current.add(nombre)
      cargar(nombre, parametros, poner)
    }
    if (pestana === 'carreras' && slug) {
      pedirUnaVez(`carrera:${slug}`, { seccion: 'carrera', slug, dias: 30 }, (d) =>
        setPorCarrera((p) => ({ ...p, [slug]: d })),
      )
    }
    if (pestana === 'aparatos') {
      pedirUnaVez(`aparatos:${ventana}`, { seccion: 'aparatos', dias: ventana }, (d) =>
        setPorVentana((p) => ({ ...p, [ventana]: d })),
      )
    }
  }, [dentro, pestana, slug, ventana, vuelta, cargar])

  const irA = (nueva) => {
    setPestana(nueva)
    sesion.guardar(PESTANA_GUARDADA, nueva)
    contenedor.current?.scrollTo({ top: 0 })
  }

  /* Actualizar trae de nuevo lo general y lo de la pestaña abierta; lo demas
     se olvida, para que al volver a otra pestaña tampoco quede viejo. */
  const actualizar = () => {
    pedidos.current.clear()
    setPorCarrera({})
    setPorVentana({})
    setVuelta((n) => n + 1)
    cargar('general', { seccion: 'general', dias: 30 }, setGeneral)
  }

  const ocupado = Object.values(cargando).some(Boolean)

  return (
    <div
      ref={contenedor}
      className="transicion-tema h-full overflow-y-auto bg-lienzo px-5 pb-10 text-tinta"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <header className="flex items-start justify-between gap-3 pt-8">
          <div className="min-w-0">
            <p className="text-[10.5px] tracking-[0.24em] text-tinta-tenue uppercase">
              Mapa de Pensum
            </p>
            <h1 className="mt-1 text-[28px] leading-tight font-light tracking-[-0.03em]">Uso</h1>
            {general && (
              <p className="mt-1 text-[12px] text-tinta-tenue">
                {general.desde && `Midiendo desde el ${diaCorto(general.desde)}`}
                {actualizado &&
                  ` · al día a las ${actualizado.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: false })}`}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {dentro && (
              <>
                <button
                  type="button"
                  onClick={actualizar}
                  aria-label="Actualizar"
                  className="grid size-9 place-items-center rounded-full border border-panel-borde text-tinta-suave transition-colors hover:text-tinta"
                >
                  <RefreshCw size={15} className={ocupado ? 'animate-spin' : ''} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setClave('')
                    salir()
                  }}
                  aria-label="Olvidar la clave"
                  className="grid size-9 place-items-center rounded-full border border-panel-borde text-tinta-suave transition-colors hover:text-tinta"
                >
                  <LogOut size={15} />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={alVolver}
              aria-label="Salir del panel"
              className="flex h-9 items-center gap-2 rounded-full border border-panel-borde px-2.5 text-[12.5px] text-tinta-suave transition-colors hover:text-tinta sm:px-3.5"
            >
              <ArrowLeft size={14} />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </header>

        {!dentro && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              entrar(clave)
            }}
            className="flex flex-col gap-3 rounded-2xl border border-panel-borde bg-panel p-5"
          >
            <label htmlFor="clave-panel" className="text-[13px] text-tinta-suave">
              Clave del panel
            </label>
            <div className="flex gap-2">
              <div className="flex flex-1 items-center gap-2 rounded-xl border border-panel-borde bg-panel-suave px-3">
                <KeyRound size={14} className="shrink-0 text-tinta-tenue" />
                <input
                  id="clave-panel"
                  type="password"
                  value={clave}
                  onChange={(e) => setClave(e.target.value)}
                  autoComplete="current-password"
                  className="min-w-0 flex-1 bg-transparent py-2.5 text-[13px] text-tinta outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={!clave || entrando}
                className="rounded-xl bg-aprobada px-4 text-[12.5px] font-medium text-[var(--lienzo)] disabled:opacity-50"
              >
                {entrando ? 'Entrando…' : 'Entrar'}
              </button>
            </div>
            {errorEntrada && (
              <p className="text-[12.5px] text-[var(--estado-rojo)]">{errorEntrada}</p>
            )}
          </form>
        )}

        {dentro && general && (
          <>
            {/* Las pestañas se quedan arriba al bajar: cambiar de seccion desde
                el fondo de la lista de aparatos no deberia obligar a subir. */}
            <nav
              aria-label="Secciones del panel"
              className="sticky top-0 z-10 -mx-5 overflow-x-auto bg-[color-mix(in_oklab,var(--lienzo)_86%,transparent)] px-5 py-3 backdrop-blur-md [scrollbar-width:none]"
            >
              <div className="flex w-max rounded-full border border-panel-borde bg-panel p-1">
                {PESTANAS.map(([clave, nombre, Icono]) => (
                  <button
                    key={clave}
                    type="button"
                    aria-current={pestana === clave ? 'page' : undefined}
                    aria-label={Icono ? nombre : undefined}
                    onClick={() => irA(clave)}
                    className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] whitespace-nowrap transition-colors ${
                      pestana === clave
                        ? 'bg-panel-suave text-tinta'
                        : 'text-tinta-tenue hover:text-tinta-suave'
                    }`}
                  >
                    {Icono && <Icono size={14} strokeWidth={1.6} className="sm:hidden" />}
                    <span className={Icono ? 'hidden sm:inline' : undefined}>{nombre}</span>
                  </button>
                ))}
              </div>
            </nav>

            {aviso && (
              <p className="flex items-center gap-2 rounded-xl border border-[color-mix(in_oklab,var(--estado-rojo)_40%,transparent)] px-4 py-3 text-[12.5px] text-[var(--estado-rojo)]">
                <TriangleAlert size={14} className="shrink-0" />
                No pude actualizar: {aviso}. Lo que ves es de la última consulta.
              </p>
            )}

            {pestana === 'general' &&
              (cargando.general && !general ? (
                <Hueco alto={400} />
              ) : (
                <PanelGeneral
                  datos={general}
                  colorDe={colorDe}
                  alAbrirCarrera={(s) => {
                    setSlug(s)
                    irA('carreras')
                  }}
                />
              ))}

            {pestana === 'carreras' && (
              <PanelCarreras
                slug={slug}
                alElegir={setSlug}
                datos={porCarrera[slug]}
                cargando={!!cargando[`carrera:${slug}`] && !porCarrera[slug]}
                resumen={general.carreras}
                colorDe={colorDe}
              />
            )}

            {pestana === 'aparatos' && (
              <PanelAparatos
                datos={porVentana[ventana]}
                cargando={!!cargando[`aparatos:${ventana}`] && !porVentana[ventana]}
                ventana={ventana}
                alCambiarVentana={setVentana}
                colorDe={colorDe}
              />
            )}

            {pestana === 'como' && <ComoSeCuenta desde={general.desde} />}
          </>
        )}
      </div>
    </div>
  )
}

export default PanelUso
