import { useMemo, useState } from 'react'
import {
  CircleHelp,
  Cpu,
  Fingerprint,
  Globe,
  MapPin,
  Monitor,
  Search,
  ShieldAlert,
  Smartphone,
  Tablet,
  UserPlus,
  Users,
} from 'lucide-react'
import { CARRERAS } from '../../data/carreras'
import { contarEsteAparato, idDeEsteAparato, seCuentaEsteAparato } from '../../data/latido'
import { Hueco, Segmentos, Vacio, Widget } from './piezas'
import { Anillo, Barras } from './graficas'
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

/* Un reparto en filas para Barras: las mas frecuentes primero y, con `tope`,
   las que no caben se dicen aparte en vez de alargar la lista */
function repartir(conteo, tope = 6) {
  const todas = Object.entries(conteo)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
  const filas = todas.slice(0, tope).map(([nombre, valor]) => ({ clave: nombre, nombre, valor }))
  return { filas, resto: todas.length - filas.length }
}

/** Un reparto en su widget: el titulo, las barras y cuantas quedaron fuera */
function Reparto({ icono, titulo, nota, conteo, tope, vacio = 'Todavía no hay datos.' }) {
  const { filas, resto } = repartir(conteo, tope)
  return (
    <Widget icono={icono} titulo={titulo} className="ocupa-2">
      {nota && <p className="widget-nota">{nota}</p>}
      <div className="mt-4">
        {filas.length ? (
          <Barras filas={filas} porcentaje />
        ) : (
          <p className="widget-nota">{vacio}</p>
        )}
      </div>
      {resto > 0 && <p className="widget-nota mt-3">y {resto} más</p>}
    </Widget>
  )
}

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
    <Widget icono={Fingerprint} titulo="Este aparato" className="ocupa-2">
      <p className="mt-2 text-[14px] font-medium text-tinta">
        {visto ? nombreDe(visto) : id ? `${id.slice(0, 6)}…` : 'Sin identificador todavía'}
      </p>
      <p className="widget-nota">
        {cuenta
          ? 'Se está contando. Si es tuyo, apágalo aquí y en cada teléfono, computadora y navegador que uses.'
          : 'No se cuenta: lo que hagas desde aquí no entra en ningún total. En la lista sale como «Tú».'}
        {!id && ' La marca se aplicará cuando abra el mapa.'}
      </p>
      <button
        type="button"
        role="switch"
        aria-checked={!cuenta}
        onClick={alternar}
        className="mt-auto flex items-center gap-2.5 self-start pt-3 text-[13px] font-medium text-tinta-suave"
      >
        <span
          className="relative h-[26px] w-[44px] rounded-full transition-colors"
          style={{
            backgroundColor: cuenta ? 'color-mix(in oklab, var(--tinta) 16%, transparent)' : VERDE,
          }}
        >
          <span
            className="absolute top-[3px] size-5 rounded-full bg-white shadow transition-[left]"
            style={{ left: cuenta ? 3 : 21 }}
          />
        </span>
        No contar este aparato
      </button>
    </Widget>
  )
}

const ICONOS = { computadora: Monitor, tablet: Tablet, telefono: Smartphone }
/* Visto en el ultimo dia: lleva el punto verde de activo */
const deHoy = (a) => a.ultima && Date.now() - Date.parse(a.ultima) < 86400000

/** Un aparato. Tocarlo despliega todo lo que se sabe de el. */
function Aparato({ a, suyo, nuevo, colorDe, abierto, alAbrir }) {
  const Icono = ICONOS[a.tipo] ?? CircleHelp
  const lugar = lugarDe(a)
  const carreras = Object.entries(a.carreras ?? {})
    .sort((x, y) => y[1] - x[1])
    .map(([slug, n]) => ({ c: CARRERAS.find((x) => x.slug === slug), n }))
    .filter(({ c }) => c)

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
    ['Carreras', carreras.map(({ c, n }) => `${c.nombreCorto}${n > 1 ? ` ×${n}` : ''}`).join(', ')],
    ['Identificador', a.id],
  ].filter(([, v]) => v)

  return (
    <article className="equipo">
      <button type="button" onClick={alAbrir} aria-expanded={abierto}>
        <span className="icono" data-tuyo={suyo || undefined}>
          <Icono size={20} strokeWidth={1.6} />
        </span>
        <span className="min-w-0">
          <span className="nombre">
            {nombreDe(a)}
            {suyo && (
              <span className="etiqueta-panel" style={{ '--c': VERDE }}>
                Tú
              </span>
            )}
            {a.vpn && (
              <span className="etiqueta-panel" style={{ '--c': AMBAR }}>
                VPN
              </span>
            )}
            {nuevo && !suyo && (
              <span className="etiqueta-panel" style={{ '--c': 'var(--sit-inscribible-luz)' }}>
                Nuevo
              </span>
            )}
            {a.pwa && <span className="etiqueta-panel">App</span>}
          </span>
          <span className="tecnica truncate">
            {lineaTecnica(a) || 'Entró con una versión anterior de la app'}
          </span>
        </span>
        <span className="datos">
          <span>
            <i className="punto-activo" data-hoy={deHoy(a) || undefined} />
            {a.ultima ? haceCuanto(a.ultima) : 'sin fecha'}
          </span>
          {lugar && (
            <span>
              <MapPin size={13} />
              <span className="truncate">{lugar}</span>
            </span>
          )}
          {carreras[0] && (
            <span>
              <i
                className="size-2 rounded-full"
                style={{ backgroundColor: colorDe(carreras[0].c) }}
              />
              {carreras[0].c.nombreCorto}
              {carreras.length > 1 && ` +${carreras.length - 1}`}
            </span>
          )}
          <span className="ml-auto tabular-nums">
            {a.visitas} {a.visitas === 1 ? 'visita' : 'visitas'}
            {a.minutos > 0 && ` · ${a.minutos} min`}
          </span>
        </span>
      </button>

      {/* Fuera del boton, para poder seleccionar y copiar el identificador */}
      {abierto && (
        <dl>
          {datos.map(([rotulo, valor]) => (
            <div key={rotulo}>
              <dt>{rotulo}</dt>
              <dd>{valor}</dd>
            </div>
          ))}
          {a.vpn && (
            <p className="leading-snug" style={{ color: AMBAR }}>
              La conexión sale por {nombrePais(a.pais)}, pero el reloj del aparato está en {a.zona}.
              Casi seguro es alguien usando una VPN.
            </p>
          )}
        </dl>
      )}
    </article>
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

/* Lo que se busca: el nombre, el lugar y lo tecnico, sin tildes */
const sinTildes = (texto) =>
  texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
const textoDe = (a) => sinTildes([nombreDe(a), lugarDe(a), lineaTecnica(a)].join(' '))

export default function PanelAparatos({ datos, cargando, ventana, alCambiarVentana, colorDe }) {
  const [filtro, setFiltro] = useState('todos')
  const [busca, setBusca] = useState('')
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
  const palabras = sinTildes(busca).split(/\s+/).filter(Boolean)
  const filtrados = lista
    .filter(pasa[filtro])
    .filter((a) => palabras.every((p) => textoDe(a).includes(p)))

  const repartos = useMemo(
    () => ({
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
  const telefonos = ajenos.filter((a) => a.tipo === 'telefono' || a.tipo === 'tablet').length
  const conApp = ajenos.filter((a) => a.pwa).length
  const truncado = datos && datos.total > lista.length
  const porcentaje = (n) => (ajenos.length ? Math.round((n / ajenos.length) * 100) : 0)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-tinta-tenue">Dispositivos que entraron en los últimos</p>
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
        <div className="bento">
          {[0, 1, 2, 3].map((n) => (
            <Hueco key={n} alto={130} />
          ))}
          <Hueco alto={130} className="ocupa-2" />
          <Hueco alto={380} className="ocupa-6" />
        </div>
      ) : !lista.length ? (
        <Vacio>
          Todavía no hay fichas de dispositivos en esta ventana. Empiezan a llenarse con la primera
          visita después de publicar esta versión.
        </Vacio>
      ) : (
        <div className="bento">
          <Widget icono={Users} titulo="Dispositivos">
            <p className="cifra-grande tabular-nums">{ajenos.length}</p>
            <p className="widget-nota">
              {truncado
                ? `los ${lista.length} más recientes de ${datos.total}`
                : 'sin contar los tuyos'}
            </p>
          </Widget>
          <Widget icono={UserPlus} titulo="Nuevos">
            <p className="cifra-grande tabular-nums">{nuevos}</p>
            <p className="widget-nota">su primera vez fue en estos {ventana} días</p>
          </Widget>
          <Widget icono={MapPin} titulo="En Venezuela">
            <p className="cifra-grande tabular-nums">
              {porcentaje(enVenezuela)}
              <small>%</small>
            </p>
            <p className="widget-nota">{enVenezuela} por la IP o por el reloj</p>
          </Widget>
          <Widget icono={ShieldAlert} titulo="VPN probable">
            <p className="cifra-grande tabular-nums" style={{ color: conVpn ? AMBAR : undefined }}>
              {conVpn}
            </p>
            <p className="widget-nota">la IP y el reloj no coinciden</p>
          </Widget>
          <EsteAparato lista={lista} />

          <Widget icono={Smartphone} titulo="Tipo" className="ocupa-2">
            <div className="mt-3 flex items-center gap-5">
              <Anillo valor={porcentaje(telefonos)} tam={92} />
              <div>
                <p className="text-[15px] font-semibold text-tinta">Teléfonos y tabletas</p>
                <p className="widget-nota">
                  {ajenos.length - telefonos} computadoras · {conApp} con la app instalada
                </p>
              </div>
            </div>
          </Widget>
          <Reparto icono={Cpu} titulo="Sistema" conteo={repartos.sistema} />
          <Reparto icono={Globe} titulo="Navegador" conteo={repartos.navegador} />
          <Reparto
            icono={Smartphone}
            titulo="Marca del teléfono"
            nota="Android con Chrome dice el modelo; el iPhone no."
            conteo={repartos.marca}
          />
          <Reparto
            icono={MapPin}
            titulo="Ciudades de Venezuela"
            nota="Sin los que usan VPN. Aproximada: sale de la IP."
            conteo={repartos.ciudad}
            tope={8}
            vacio="Nadie desde Venezuela sin VPN todavía."
          />
          <Reparto
            icono={Globe}
            titulo="País de la conexión"
            nota="Con VPN sale el país de la VPN, no el de la persona."
            conteo={repartos.pais}
          />

          <Widget
            icono={Search}
            titulo="Cada dispositivo"
            className="ocupa-6"
            extra={`${filtrados.length} de ${lista.length}`}
          >
            <label className="buscador-panel mt-3">
              <Search size={17} aria-hidden="true" />
              <input
                type="search"
                value={busca}
                onChange={(e) => {
                  setBusca(e.target.value)
                  setCuantos(POR_PAGINA)
                }}
                placeholder="Buscar por modelo, ciudad o sistema"
                aria-label="Buscar dispositivo"
                autoComplete="off"
              />
            </label>
            <div className="filtros-panel mt-2.5" role="group" aria-label="Filtro">
              {FILTROS.map(([clave, nombre]) => (
                <button
                  key={clave}
                  type="button"
                  aria-pressed={filtro === clave}
                  onClick={() => {
                    setFiltro(clave)
                    setCuantos(POR_PAGINA)
                  }}
                >
                  {nombre}
                  <span className="tabular-nums">{lista.filter(pasa[clave]).length}</span>
                </button>
              ))}
            </div>

            {filtrados.length ? (
              <>
                <div className="equipos mt-4">
                  {filtrados.slice(0, cuantos).map((a) => (
                    <Aparato
                      key={a.id}
                      a={a}
                      suyo={esTuyo(a)}
                      nuevo={esNuevo(a)}
                      colorDe={colorDe}
                      abierto={abierto === a.id}
                      alAbrir={() => setAbierto(abierto === a.id ? null : a.id)}
                    />
                  ))}
                </div>
                {filtrados.length > cuantos && (
                  <button
                    type="button"
                    onClick={() => setCuantos((n) => n + POR_PAGINA)}
                    className="boton-mas mt-3"
                  >
                    Ver {Math.min(POR_PAGINA, filtrados.length - cuantos)} más
                  </button>
                )}
              </>
            ) : (
              <p className="py-8 text-center text-[13px] text-tinta-tenue">
                Ningún dispositivo coincide.
              </p>
            )}
          </Widget>
        </div>
      )}
    </div>
  )
}
