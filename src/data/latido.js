/**
 * El latido: lo unico que esta aplicacion cuenta de quien la usa.
 *
 * Existe para responder una pregunta que ninguna otra cosa responde: cuanta
 * gente la usa de verdad, y para que. Vercel ya da visitantes y paginas
 * vistas, pero en el plan gratuito guarda un mes y no deja medir nada de lo
 * que pasa DENTRO del mapa.
 *
 * Que se envia, y nada mas que esto:
 *   - un identificador aleatorio guardado en este telefono, para no contar
 *     dos veces a la misma persona el mismo dia. No dice quien eres: es un
 *     numero al azar, no viaja a ningun otro sitio y se borra al borrar los
 *     datos del navegador;
 *   - que aparato es: el tamaño de pantalla, el idioma, la zona horaria y, en
 *     Android con Chrome, el modelo. Sistema, navegador y ciudad no los manda
 *     esto: salen de la propia peticion (ver api/_aparato.js);
 *   - si la app esta instalada;
 *   - que carreras y que vistas se abrieron en esta visita;
 *   - que materias se miraron, para el mapa de calor;
 *   - cuantas veces se marco una materia en cada carrera, sin decir cual;
 *   - cuanto duro la visita, si fue desde un telefono y a que hora.
 *
 * No se envia nada escrito por el estudiante, ni sus marcas, ni su horario,
 * ni su nombre ni nada con que ponerle cara al identificador.
 *
 * Como se envia, para que no cueste nada:
 *   - dos peticiones por visita como mucho -una al entrar y otra al salir-,
 *     de unos doscientos bytes;
 *   - con sendBeacon, que el navegador manda en segundo plano y no bloquea
 *     ni el pintado ni el cierre de la pestaña;
 *   - en local no se envia nada.
 */
const CLAVE_ID = 'mapa-pensum:anonimo'
/* Los aparatos del dueño. Se activa desde el panel, en cada telefono y
   computadora suyos: desde entonces sus visitas no entran en los totales. */
const CLAVE_NO_CONTAR = 'mapa-pensum:no-contar'
const DESTINO = '/api/latido'

/* Topes de lo que se acumula en una visita. No es por el tamaño del envio
   -son cadenas cortas- sino por el gasto en el almacen: cada materia es una
   escritura, y el plan gratuito tiene 500.000 al mes. Con doce por visita,
   una persona que abra media carrera sigue cabiendo de sobra. */
const TOPE_MATERIAS = 12
const TOPE_CARRERAS = 4

const enProduccion = () =>
  import.meta.env.PROD &&
  typeof window !== 'undefined' &&
  !['localhost', '127.0.0.1'].includes(window.location.hostname)

/** Id anonimo de este navegador. Se crea la primera vez y se queda. */
function identificador() {
  try {
    const guardado = localStorage.getItem(CLAVE_ID)
    if (guardado) return { id: guardado, nuevo: false }
    const id = crypto.randomUUID().replace(/-/g, '').slice(0, 24)
    localStorage.setItem(CLAVE_ID, id)
    return { id, nuevo: true }
  } catch {
    // Sin almacenamiento -modo privado, permisos- se cuenta como visita
    // suelta: un id de usar y tirar. Mejor un numero algo alto que ninguno.
    return { id: `x${Math.random().toString(36).slice(2, 14)}`, nuevo: true }
  }
}

/** El identificador de este navegador, si ya tiene uno. Lo lee el panel. */
export function idDeEsteAparato() {
  try {
    return localStorage.getItem(CLAVE_ID)
  } catch {
    return null
  }
}

export function seCuentaEsteAparato() {
  try {
    return localStorage.getItem(CLAVE_NO_CONTAR) !== '1'
  } catch {
    return true
  }
}

export function contarEsteAparato(contar) {
  try {
    if (contar) localStorage.removeItem(CLAVE_NO_CONTAR)
    else localStorage.setItem(CLAVE_NO_CONTAR, '1')
  } catch {
    // Sin almacenamiento no hay donde recordarlo; se seguira contando
  }
}

/**
 * Lo que el aparato dice de si mismo. El modelo solo lo da Chrome y solo si
 * se le pide -getHighEntropyValues-, que es asincrono; se le dan 800 ms y si
 * no contesta, el latido sale sin el.
 */
async function ficha() {
  const n = navigator
  const ancho = Math.round(screen.width)
  const alto = Math.round(screen.height)
  const datos = {
    pantalla: `${Math.min(ancho, alto)}x${Math.max(ancho, alto)}`,
    dpr: Math.round((window.devicePixelRatio || 1) * 100) / 100,
    idioma: n.language,
    zona: Intl.DateTimeFormat().resolvedOptions().timeZone,
    memoria: n.deviceMemory,
    nucleos: n.hardwareConcurrency,
    red: n.connection?.effectiveType,
    tactil: n.maxTouchPoints > 1,
  }
  try {
    const pedido = n.userAgentData?.getHighEntropyValues?.(['model', 'platformVersion'])
    const ch = pedido && (await Promise.race([pedido, new Promise((r) => setTimeout(r, 800))]))
    if (ch) {
      datos.modelo = ch.model
      datos.versionSO = ch.platformVersion
      datos.movil = ch.mobile
      datos.navegadores = ch.brands?.map((b) => `${b.brand}/${b.version}`)
    }
  } catch {
    // Sin permiso o sin soporte: el servidor se arregla con el User-Agent
  }
  return datos
}

const enTelefono = () => window.matchMedia?.('(hover: none) and (pointer: coarse)').matches === true

const instalada = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true

function enviar(cuerpo) {
  const datos = JSON.stringify(cuerpo)
  try {
    const bulto = new Blob([datos], { type: 'application/json' })
    if (navigator.sendBeacon?.(DESTINO, bulto)) return
  } catch {
    // sendBeacon puede fallar por tamaño o por politica; abajo esta el plan B
  }
  // keepalive: la peticion sobrevive al cierre de la pestaña
  fetch(DESTINO, {
    method: 'POST',
    body: datos,
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
  }).catch(() => {})
}

/* Lo que se ha visto en esta visita. Conjuntos y no listas: mirar diez veces
   la misma materia es una sola cosa que contar. */
const carreras = new Set()
const vistas = new Set()
const materias = new Set()
const marcas = new Map()
let arrancado = false
let cerrado = false
let desde = 0
let yo = null

/** Se llama una vez al abrir la aplicacion */
export function empezarLatido() {
  if (arrancado || !enProduccion()) return
  // Mirar el panel no es usar la aplicacion
  if (window.location.pathname.startsWith('/panel')) return
  arrancado = true
  desde = Date.now()
  yo = identificador()
  const base = {
    tipo: 'inicio',
    id: yo.id,
    nuevo: yo.nuevo,
    pwa: instalada(),
    movil: enTelefono(),
  }
  if (!seCuentaEsteAparato()) base.yo = true
  ficha()
    .then((datos) => enviar({ ...base, ficha: datos }))
    .catch(() => enviar(base))

  /* El cierre se manda cuando la pestaña se oculta, no en beforeunload: en
     un telefono, cambiar de aplicacion o bloquear la pantalla no dispara
     beforeunload, y esa es la forma normal de terminar una visita. */
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') cerrarLatido()
  })
  window.addEventListener('pagehide', cerrarLatido)
}

/** Manda lo acumulado. Una sola vez por visita: lo que venga despues, se queda. */
function cerrarLatido() {
  if (cerrado || !arrancado || !yo) return
  if (!carreras.size && !vistas.size && !materias.size && !marcas.size) return
  cerrado = true
  enviar({
    tipo: 'cierre',
    id: yo.id,
    carreras: [...carreras].slice(0, TOPE_CARRERAS),
    vistas: [...vistas],
    materias: [...materias].slice(0, TOPE_MATERIAS),
    marcas: Object.fromEntries(marcas),
    minutos: Math.round((Date.now() - desde) / 60000),
    ...(seCuentaEsteAparato() ? {} : { yo: true }),
  })
}

export const anotarCarrera = (slug) => slug && carreras.add(slug)
/* Cuantas veces se marco una materia en cada carrera. El numero y nada mas:
   ni cual, ni con que estado. Sirve para saber si la aplicacion se usa para
   llevar el avance o solo para mirar el mapa. */
export const anotarMarca = (slug) => {
  if (slug) marcas.set(slug, (marcas.get(slug) ?? 0) + 1)
}
export const anotarVista = (vista) => vista && vistas.add(vista)
/* El mapa de calor: que materias mira la gente. Se guarda con la carrera
   delante porque el mismo codigo no existe en dos pensums, pero el mapa se
   dibuja por carrera y asi no hay que cruzarlo despues. */
export const anotarMateria = (slug, codigo) => {
  if (slug && codigo && materias.size < TOPE_MATERIAS) materias.add(`${slug}/${codigo}`)
}
