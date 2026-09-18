import { useMemo, useState } from 'react'
import { ChevronDown, CircleHelp, MapPin, Monitor, Smartphone, Tablet } from 'lucide-react'
import { CARRERAS } from '../../data/carreras'
import { contarEsteAparato, idDeEsteAparato, seCuentaEsteAparato } from '../../data/latido'
import { Bloque, Cifra, Hueco, Reparto, Segmentos, Tarjeta, Vacio } from './piezas'
import { VERDE, fechaHora, haceCuanto } from './formato'

/* Los estados de Venezuela por su letra ISO 3166-2, que es lo que da Vercel */
const ESTADOS_VE = {
  A: 'Distrito Capital',
  B: 'Anzoátegui',
  C: 'Apure',
  D: 'Aragua',
  E: 'Barinas',
  F: 'Bolívar',
  G: 'Carabobo',
  H: 'Cojedes',
  I: 'Falcón',
  J: 'Guárico',
  K: 'Lara',
  L: 'Mérida',
  M: 'Miranda',
  N: 'Monagas',
  O: 'Nueva Esparta',
  P: 'Portuguesa',
  R: 'Sucre',
  S: 'Táchira',
  T: 'Trujillo',
  U: 'Yaracuy',
  V: 'Zulia',
  W: 'Dependencias Federales',
  X: 'La Guaira',
  Y: 'Delta Amacuro',
  Z: 'Amazonas',
}
const TIPOS = { telefono: 'Teléfono', tablet: 'Tableta', computadora: 'Computadora' }
const AMBAR = 'var(--estado-cursando)'
const POR_PAGINA = 30

const paises = new Intl.DisplayNames(['es'], { type: 'region' })
const idiomas = new Intl.DisplayNames(['es'], { type: 'language' })
const nombrePais = (codigo) => {
  try {
    return paises.of(codigo)
  } catch {
    return codigo
  }
}
const nombreIdioma = (codigo) => {
  try {
    return idiomas.of(codigo)
  } catch {
    return codigo
  }
}

/** Ciudad y estado si es de aqui; ciudad y pais si no */
function lugarDe(a) {
  if (!a.pais) return null
  if (a.pais === 'VE')
    return [a.ciudad, ESTADOS_VE[a.region]].filter(Boolean).join(', ') || 'Venezuela'
  return [a.ciudad, nombrePais(a.pais)].filter(Boolean).join(', ')
}

/** Como llamar a un aparato: por su modelo si se sabe, si no por lo que se sepa */
function nombreDe(a) {
  if (!a.so) return 'Sin ficha todavía'
  if (a.modelo) {
    // "TECNO KI5q" ya dice la marca: no hace falta "Tecno TECNO KI5q"
    const dice = a.marca && a.modelo.toLowerCase().startsWith(a.marca.toLowerCase())
    if (!a.marca || a.marca === 'Apple' || dice) return a.modelo
    return `${a.marca} ${a.modelo}`
  }
  if (a.so === 'Android') return a.tipo === 'tablet' ? 'Tableta Android' : 'Teléfono Android'
  return a.so
}

const lineaTecnica = (a) =>
  [
    a.so && [a.so, a.soVersion].filter(Boolean).join(' '),
    a.navegador && [a.navegador, a.navVersion].filter(Boolean).join(' '),
    a.pantalla?.replace('x', '×'),
  ]
    .filter(Boolean)
    .join(' · ')

/* La primera vez puede venir con "~": el aparato ya existia cuando empezaron
   las fichas, y la fecha es solo desde cuando se sabe de el. */
const deAntes = (a) => typeof a.primera === 'string' && a.primera.startsWith('~')
const primeraVez = (a) => (a.primera ? Date.parse(a.primera.replace(/^~/, '')) : NaN)

const contar = (lista, clave) =>
  lista.reduce((acc, a) => {
    const k = clave(a)
    if (k) acc[k] = (acc[k] ?? 0) + 1
    return acc
  }, {})

const Etiqueta = ({ color, children, titulo }) => (
  <span
    title={titulo}
    className="rounded-full border px-1.5 py-[1px] text-[10px] leading-[14px] whitespace-nowrap"
    style={{ color, borderColor: `color-mix(in oklab, ${color} 45%, transparent)` }}
  >
    {children}
  </span>
)

/**
 * Este aparato: el que tienes en la mano mirando el panel. Desde aqui se le
 * dice al contador que no lo cuente, que es la unica forma fiable de que tus
 * propias visitas no inflen los numeros.
 */
function EsteAparato({ lista }) {
  const id = idDeEsteAparato()
  const [cuenta, setCuenta] = useState(seCuentaEsteAparato)
  const visto = id ? lista.find((a) => a.id === id) : null

  const alternar = () => {
    contarEsteAparato(!cuenta)
    setCuenta(!cuenta)
  }

  return (
    <Tarjeta className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] text-tinta">
          Este aparato{' '}
          <span className="text-tinta-tenue">
            {visto ? `· ${nombreDe(visto)}` : id ? `· ${id.slice(0, 6)}…` : ''}
          </span>
        </p>
        <p className="mt-1 text-[12px] leading-snug text-tinta-tenue">
          {cuenta
            ? 'Se está contando. Si es tuyo, apágalo aquí y en cada teléfono, computadora y navegador que uses.'
            : 'No se cuenta: lo que hagas desde aquí no entra en ningún total. En la lista sale como «Tú».'}
          {!id &&
            ' Todavía no ha abierto el mapa, así que no tiene identificador: la marca se aplicará cuando lo abra.'}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={!cuenta}
        onClick={alternar}
        className="flex shrink-0 items-center gap-2.5 self-start rounded-full border border-panel-borde py-1.5 pr-3 pl-1.5 text-[12.5px] text-tinta-suave sm:self-auto"
      >
        <span
          className="relative h-5 w-9 rounded-full transition-colors"
          style={{
            backgroundColor: cuenta ? 'color-mix(in oklab, var(--tinta) 16%, transparent)' : VERDE,
          }}
        >
          <span
            className="absolute top-0.5 size-4 rounded-full bg-[var(--lienzo)] transition-[left]"
            style={{ left: cuenta ? 2 : 18 }}
          />
        </span>
        No contar este aparato
      </button>
    </Tarjeta>
  )
}

/** Un aparato de la lista. Tocarlo abre todo lo que se sabe de el. */
function Aparato({ a, esEste, nuevo, colorDe, abierto, alAbrir }) {
  const Icono =
    a.tipo === 'computadora'
      ? Monitor
      : a.tipo === 'tablet'
        ? Tablet
        : a.tipo === 'telefono'
          ? Smartphone
          : CircleHelp
  const lugar = lugarDe(a)
  const suyo = a.yo || esEste
  const carreras = Object.entries(a.carreras ?? {}).sort((x, y) => y[1] - x[1])

  const datos = [
    [
      'Primera vez',
      a.primera && (deAntes(a) ? `antes del ${fechaHora(primeraVez(a))}` : fechaHora(a.primera)),
    ],
    ['Última vez', a.ultima && fechaHora(a.ultima)],
    [
      'Modelo',
      a.codigo
        ? `${a.modelo} (${a.codigo})`
        : a.estimado
          ? `${a.modelo}, estimado por la pantalla`
          : a.modelo,
    ],
    ['Idioma', a.idioma && nombreIdioma(a.idioma)],
    ['Reloj del aparato', a.zona],
    ['Huso de la IP', a.zonaIp],
    ['Conexión', a.red?.toUpperCase()],
    ['Memoria', a.memoria && `${a.memoria} GB${a.nucleos ? ` · ${a.nucleos} núcleos` : ''}`],
    [
      'Pantalla',
      a.pantalla && `${a.pantalla.replace('x', '×')} puntos${a.dpr ? ` a ${a.dpr}x` : ''}`,
    ],
    ['Identificador', a.id],
  ].filter(([, v]) => v)

  return (
    <li>
      <button
        type="button"
        onClick={alAbrir}
        aria-expanded={abierto}
        className="flex w-full rounded-xl px-3 py-3 text-left transition-colors hover:bg-panel-suave"
      >
        <div className="flex w-full gap-3">
          <span
            className="grid size-9 shrink-0 place-items-center rounded-full border border-panel-borde"
            style={{ color: suyo ? VERDE : 'var(--tinta-suave)' }}
          >
            <Icono size={16} strokeWidth={1.5} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-baseline gap-2">
              <p className="min-w-0 flex-1 truncate text-[13.5px] text-tinta">{nombreDe(a)}</p>
              <span className="shrink-0 text-[11px] text-tinta-tenue">
                {a.ultima && haceCuanto(a.ultima)}
              </span>
            </div>
            <p className="truncate text-[11.5px] text-tinta-tenue">
              {lineaTecnica(a) || 'Entró con una versión anterior de la app'}
            </p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-tinta-suave">
              {lugar && (
                <span className="flex min-w-0 items-center gap-1">
                  <MapPin size={11} className="shrink-0 text-tinta-tenue" />
                  <span className="truncate">{lugar}</span>
                </span>
              )}
              {a.vpn && (
                <Etiqueta
                  color={AMBAR}
                  titulo={`La IP sale por ${nombrePais(a.pais) ?? 'otro sitio'} pero el reloj está en ${a.zona}`}
                >
                  VPN probable
                </Etiqueta>
              )}
              {suyo && <Etiqueta color={VERDE}>Tú</Etiqueta>}
              {nuevo && !suyo && <Etiqueta color="var(--sit-inscribible-luz)">Nuevo</Etiqueta>}
              {a.pwa && <Etiqueta color="var(--tinta-suave)">App instalada</Etiqueta>}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-tinta-tenue tabular-nums">
              <span>
                <span className="text-tinta-suave">{a.visitas}</span>{' '}
                {a.visitas === 1 ? 'visita' : 'visitas'}
              </span>
              {a.minutos > 0 && <span>{a.minutos} min</span>}
              {a.marcas > 0 && <span>{a.marcas} marcas</span>}
              {carreras.map(([slug, n]) => {
                const c = CARRERAS.find((x) => x.slug === slug)
                if (!c) return null
                return (
                  <span key={slug} className="flex items-center gap-1">
                    <span
                      className="size-1.5 rounded-full"
                      style={{ backgroundColor: colorDe(c) }}
                    />
                    {c.nombreCorto}
                    {n > 1 && <span>×{n}</span>}
                  </span>
                )
              })}
            </div>
          </div>
          <ChevronDown
            size={14}
            className="mt-1 shrink-0 text-tinta-tenue transition-transform"
            style={{ transform: abierto ? 'rotate(180deg)' : undefined }}
          />
        </div>
      </button>

      {/* Fuera del boton, para poder seleccionar y copiar el identificador */}
      {abierto && (
        <div className="px-3 pb-3">
          <dl className="grid gap-x-6 sm:ml-12 gap-y-1.5 border-t border-panel-borde pt-3 text-[11.5px] sm:grid-cols-2">
            {datos.map(([rotulo, valor]) => (
              <div key={rotulo} className="flex min-w-0 gap-2">
                <dt className="w-[108px] shrink-0 text-tinta-tenue">{rotulo}</dt>
                <dd className="min-w-0 break-words text-tinta-suave">{valor}</dd>
              </div>
            ))}
            {a.vpn && (
              <p className="text-[11.5px] leading-snug sm:col-span-2" style={{ color: AMBAR }}>
                La conexión sale por {nombrePais(a.pais)}, pero el reloj del aparato está en{' '}
                {a.zona}. Casi seguro es alguien usando una VPN.
              </p>
            )}
          </dl>
        </div>
      )}
    </li>
  )
}

const FILTROS = [
  ['todos', 'Todos'],
  ['venezuela', 'En Venezuela'],
  ['fuera', 'Fuera'],
  ['vpn', 'VPN probable'],
  ['nuevos', 'Nuevos'],
  ['app', 'Con la app'],
  ['tuyos', 'Tuyos'],
]

export default function PanelAparatos({ datos, cargando, ventana, alCambiarVentana, colorDe }) {
  const [filtro, setFiltro] = useState('todos')
  const [abierto, setAbierto] = useState(null)
  const [cuantos, setCuantos] = useState(POR_PAGINA)
  const miId = idDeEsteAparato()

  const lista = useMemo(() => datos?.aparatos ?? [], [datos])
  const desde = Date.now() - ventana * 86400000
  const esNuevo = (a) => !deAntes(a) && primeraVez(a) >= desde
  const esTuyo = (a) => a.yo || a.id === miId
  // Los tuyos se ven en la lista, pero no entran en ninguna cuenta
  const ajenos = useMemo(() => lista.filter((a) => !a.yo && a.id !== miId), [lista, miId])

  const pasa = {
    todos: () => true,
    venezuela: (a) => a.venezuela,
    fuera: (a) => a.pais && !a.venezuela,
    vpn: (a) => a.vpn,
    nuevos: esNuevo,
    app: (a) => a.pwa,
    tuyos: esTuyo,
  }
  const filtrados = lista.filter(pasa[filtro])

  const repartos = useMemo(
    () => ({
      tipo: contar(ajenos, (a) => TIPOS[a.tipo]),
      sistema: contar(ajenos, (a) => a.so),
      navegador: contar(ajenos, (a) => a.navegador),
      marca: contar(
        ajenos.filter((a) => a.tipo !== 'computadora' && a.so),
        (a) => a.marca ?? 'Sin identificar',
      ),
      ciudad: contar(
        ajenos.filter((a) => a.venezuela && !a.vpn),
        (a) => lugarDe(a),
      ),
      pais: contar(ajenos, (a) => a.pais && nombrePais(a.pais)),
    }),
    [ajenos],
  )

  const enVenezuela = ajenos.filter((a) => a.venezuela).length
  const conVpn = ajenos.filter((a) => a.vpn).length
  const nuevos = ajenos.filter(esNuevo).length
  const truncado = datos && datos.total > lista.length

  return (
    <div className="flex flex-col gap-8">
      <EsteAparato lista={lista} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12px] text-tinta-tenue">Aparatos que entraron en los últimos</p>
        <Segmentos
          etiqueta="Ventana de tiempo"
          valor={ventana}
          alCambiar={alCambiarVentana}
          opciones={[
            [7, '7 días'],
            [30, '30 días'],
            [90, '90 días'],
          ]}
        />
      </div>

      {cargando || !datos ? (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[0, 1, 2, 3].map((n) => (
              <Hueco key={n} alto={104} />
            ))}
          </div>
          <Hueco alto={380} />
        </div>
      ) : !lista.length ? (
        <Vacio>
          Todavía no hay fichas de aparatos en esta ventana. Empiezan a llenarse con la primera
          visita después de publicar esta versión.
        </Vacio>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Cifra
              valor={ajenos.length}
              rotulo="Aparatos"
              nota={
                truncado
                  ? `se detallan los ${lista.length} más recientes de ${datos.total}`
                  : 'sin contar los tuyos'
              }
            />
            <Cifra
              valor={enVenezuela}
              rotulo="En Venezuela"
              nota={`${ajenos.length ? Math.round((enVenezuela / ajenos.length) * 100) : 0}%, por la IP o por el reloj`}
              acento={VERDE}
            />
            <Cifra
              valor={conVpn}
              rotulo="VPN probable"
              nota="la IP y el reloj no coinciden"
              acento={conVpn ? AMBAR : undefined}
            />
            <Cifra
              valor={nuevos}
              rotulo="Nuevos"
              nota={`su primera vez fue en estos ${ventana} días`}
            />
          </section>

          <div className="grid gap-8 sm:grid-cols-2">
            <Bloque titulo="Tipo de aparato">
              <Reparto datos={repartos.tipo} />
            </Bloque>
            <Bloque titulo="Sistema">
              <Reparto datos={repartos.sistema} tope={6} />
            </Bloque>
            <Bloque
              titulo="Marca del teléfono"
              explica="Android con Chrome dice el modelo; el iPhone no."
            >
              <Reparto datos={repartos.marca} tope={6} />
            </Bloque>
            <Bloque titulo="Navegador">
              <Reparto datos={repartos.navegador} tope={6} />
            </Bloque>
            <Bloque
              titulo="Ciudades de Venezuela"
              explica="Sin los que usan VPN. Aproximada: sale de la IP."
            >
              <Reparto
                datos={repartos.ciudad}
                tope={8}
                vacio="Nadie desde Venezuela sin VPN todavía."
              />
            </Bloque>
            <Bloque
              titulo="País de la conexión"
              explica="Con VPN sale el país de la VPN, no el de la persona."
            >
              <Reparto datos={repartos.pais} tope={6} />
            </Bloque>
          </div>

          <Bloque
            titulo="Cada aparato"
            explica="Del más reciente al más antiguo. Tócalo para ver todo lo que se sabe de él."
          >
            <div className="-mx-5 overflow-x-auto px-5 [scrollbar-width:none]">
              <div className="flex w-max gap-1.5">
                {FILTROS.map(([clave, nombre]) => {
                  const n = lista.filter(pasa[clave]).length
                  return (
                    <button
                      key={clave}
                      type="button"
                      aria-pressed={filtro === clave}
                      onClick={() => {
                        setFiltro(clave)
                        setCuantos(POR_PAGINA)
                      }}
                      className={`rounded-full border px-3 py-1.5 text-[12px] whitespace-nowrap transition-colors ${
                        filtro === clave
                          ? 'border-[color-mix(in_oklab,var(--tinta)_30%,transparent)] bg-panel-suave text-tinta'
                          : 'border-panel-borde bg-panel text-tinta-tenue'
                      }`}
                    >
                      {nombre} <span className="tabular-nums opacity-70">{n}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {filtrados.length ? (
              <Tarjeta className="p-1.5">
                <ul className="flex flex-col divide-y divide-panel-borde">
                  {filtrados.slice(0, cuantos).map((a) => (
                    <Aparato
                      key={a.id}
                      a={a}
                      esEste={a.id === miId}
                      nuevo={esNuevo(a)}
                      colorDe={colorDe}
                      abierto={abierto === a.id}
                      alAbrir={() => setAbierto(abierto === a.id ? null : a.id)}
                    />
                  ))}
                </ul>
                {filtrados.length > cuantos && (
                  <button
                    type="button"
                    onClick={() => setCuantos((n) => n + POR_PAGINA)}
                    className="mt-1 w-full rounded-xl py-2.5 text-[12.5px] text-tinta-suave hover:bg-panel-suave"
                  >
                    Ver {Math.min(POR_PAGINA, filtrados.length - cuantos)} más
                  </button>
                )}
              </Tarjeta>
            ) : (
              <Vacio>Ningún aparato con ese filtro.</Vacio>
            )}
          </Bloque>
        </>
      )}
    </div>
  )
}
