/**
 * Que aparato es, dicho por el propio aparato. Lo usa latido.js para la ficha
 * de cada dispositivo del panel.
 *
 * El guion bajo del nombre es para Vercel: todo archivo de api/ se publica
 * como una funcion, salvo los que empiezan por "_". Esto es una libreria.
 *
 * De donde sale cada cosa, porque no todo es igual de fiable:
 *   - sistema y navegador: de la cabecera User-Agent, que manda cualquier
 *     navegador en cualquier peticion;
 *   - el modelo del telefono: en Android con Chrome, del propio navegador
 *     (userAgentData), que lo da si se le pide. El User-Agent ya no lo trae
 *     -Chrome lo congelo en "Android 10; K"-, asi que sin eso no se sabe;
 *   - en iPhone el modelo NO existe en ningun sitio: Apple no lo deja ver. Se
 *     estima por el tamaño de pantalla, que agrupa a dos o tres modelos;
 *   - pais, region y ciudad: de la IP, que Vercel geolocaliza y pasa en sus
 *     cabeceras. La IP en si no se guarda. Y la ciudad es aproximada: en
 *     Venezuela muchas lineas moviles salen a internet por Caracas;
 *   - la zona horaria del reloj del aparato: la manda el navegador. Es lo que
 *     delata una VPN, porque la VPN cambia la IP pero no el reloj.
 *
 * La direccion MAC no aparece porque ningun navegador la entrega: es un dato
 * de la red local y la web no tiene forma de leerlo.
 */

/** Deja solo texto corriente y corto. Todo lo de aqui lo escribe un cliente. */
export const limpio = (valor, largo = 60) =>
  typeof valor === 'string'
    ? valor
        .replace(/[^\p{L}\p{N} .,;:()/_+\-|]/gu, '')
        .trim()
        .slice(0, largo)
    : ''

const numero = (valor, min, max) => {
  const n = Number(valor)
  return Number.isFinite(n) && n >= min && n <= max ? n : null
}

/**
 * Los tamaños de pantalla de cada iPhone, en puntos y con su densidad. Es lo
 * mas cerca que se puede llegar del modelo: Safari no dice cual es.
 */
const IPHONES = {
  '320x568@2': 'iPhone SE (1.ª) o 5s',
  '375x667@2': 'iPhone 6–8 o SE (2.ª/3.ª)',
  '414x736@3': 'iPhone 6–8 Plus',
  '375x812@3': 'iPhone X, XS, 11 Pro o mini',
  '360x780@3': 'iPhone 12 mini o 13 mini',
  '414x896@2': 'iPhone XR u 11',
  '414x896@3': 'iPhone XS Max u 11 Pro Max',
  '390x844@3': 'iPhone 12, 13 o 14',
  '428x926@3': 'iPhone 12/13 Pro Max o 14 Plus',
  '393x852@3': 'iPhone 14 Pro, 15 o 16',
  '430x932@3': 'iPhone 14 Pro Max, 15 Plus o 16 Plus',
  '402x874@3': 'iPhone 16 Pro o 17',
  '440x956@3': 'iPhone 16 Pro Max o 17 Pro Max',
  '420x912@3': 'iPhone Air',
}

/* De que fabricante es un codigo de modelo de Android. Los de Xiaomi son
   numeros sueltos (23053RN02L), por eso la regla de los digitos va al final. */
const FABRICANTES = [
  [/^(SM-|GT-|SAMSUNG|Galaxy)/i, 'Samsung'],
  [/^(Redmi|POCO|Mi |Xiaomi)/i, 'Xiaomi'],
  [/^(moto|motorola|XT\d{4})/i, 'Motorola'],
  [/^RMX\d/, 'realme'],
  [/^CPH\d/, 'OPPO'],
  [/^(vivo|V2\d{3})/i, 'vivo'],
  [/^Infinix/i, 'Infinix'],
  [/^TECNO/i, 'Tecno'],
  [/^itel/i, 'itel'],
  [/^Pixel/, 'Google'],
  [/^(HUAWEI|HONOR|[A-Z]{3}-(L|AL|TL|LX|NX)\d)/i, 'Huawei'],
  [/^(LM-|LG-)/, 'LG'],
  [/^(ZTE|Blade)/i, 'ZTE'],
  [/^Nokia/i, 'Nokia'],
  [/^(Lenovo|TB-)/i, 'Lenovo'],
  [/^BLU/i, 'BLU'],
  [/^(M2\d{3}|2\d{5,}|\d{5}[A-Z0-9]{3,})/, 'Xiaomi'],
]

/**
 * El nombre comercial de un Samsung a partir de su codigo. Solo las familias
 * con una regla que no falla; lo demas se deja en codigo, que es mejor que
 * un nombre equivocado.
 */
export function nombreSamsung(codigo) {
  let m = /^SM-([AM])(\d{2})(\d)/.exec(codigo)
  if (m) return `Galaxy ${m[1]}${m[2]}${m[3] === '7' ? 's' : ''}`
  m = /^SM-S9([0-3])([168])/.exec(codigo)
  if (m) return `Galaxy S${22 + Number(m[1])}${{ 1: '', 6: '+', 8: ' Ultra' }[m[2]]}`
  m = /^SM-S7([1-2])1/.exec(codigo)
  if (m) return `Galaxy S${22 + Number(m[1])} FE`
  m = /^SM-G99([0168])/.exec(codigo)
  if (m) return `Galaxy S21${{ 0: ' FE', 1: '', 6: '+', 8: ' Ultra' }[m[1]]}`
  m = /^SM-F9([2-6])6/.exec(codigo)
  if (m) return `Galaxy Z Fold${Number(m[1]) + 1}`
  m = /^SM-F7([1-4])1/.exec(codigo)
  if (m) return `Galaxy Z Flip${Number(m[1]) + 2}`
  if (/^SM-[TXP]/.test(codigo)) return 'Galaxy Tab'
  return null
}

const fabricanteDe = (codigo) => FABRICANTES.find(([patron]) => patron.test(codigo))?.[1] ?? null

/** Sistema operativo y su version */
function sistemaDe(ua, ficha) {
  const version = limpio(ficha.versionSO, 20)
  const mayor = Number(version.split('.')[0]) || 0

  if (/iPhone|iPod/.test(ua)) {
    const m = /OS (\d+)[_.](\d+)/.exec(ua)
    return { so: 'iOS', soVersion: m ? `${m[1]}.${m[2]}` : null }
  }
  /* El iPad con iPadOS 13 o mas se hace pasar por un Mac para que le den la
     web de escritorio. Lo que lo delata es la pantalla tactil: ningun Mac
     tiene. */
  if (/iPad/.test(ua) || (/Macintosh/.test(ua) && ficha.tactil)) {
    const m = /(?:OS |Version\/)(\d+)[_.](\d+)/.exec(ua)
    return { so: 'iPadOS', soVersion: m ? `${m[1]}.${m[2]}` : null }
  }
  if (/Android/.test(ua)) {
    /* El "Android 10" del User-Agent de Chrome es falso -esta congelado-. La
       version buena solo llega por userAgentData. */
    const delUa = /Android (\d+(?:\.\d+)?)/.exec(ua)?.[1]
    const congelado = /Android 10; K\)/.test(ua)
    return { so: 'Android', soVersion: mayor ? String(mayor) : congelado ? null : (delUa ?? null) }
  }
  if (/Windows NT/.test(ua)) {
    /* Windows 11 dice "Windows NT 10.0" igual que el 10. Solo userAgentData
       los distingue: su version de plataforma empieza en 13 en el 11. */
    return { so: 'Windows', soVersion: mayor >= 13 ? '11' : mayor > 0 ? '10' : null }
  }
  if (/CrOS/.test(ua)) return { so: 'ChromeOS', soVersion: null }
  if (/Mac OS X|Macintosh/.test(ua)) {
    return { so: 'macOS', soVersion: mayor ? version.split('.').slice(0, 2).join('.') : null }
  }
  if (/Linux/.test(ua)) return { so: 'Linux', soVersion: null }
  return { so: 'Otro', soVersion: null }
}

/* En orden: las apps que abren la web por dentro se anuncian encima de
   Chrome o Safari, y Edge u Opera tambien dicen "Chrome". Lo especifico va
   primero. */
const NAVEGADORES = [
  [/FBAN|FBAV|FB_IAB/, 'Facebook (dentro de la app)', null],
  [/Instagram/, 'Instagram (dentro de la app)', null],
  [/musical_ly|TikTok|BytedanceWebview/, 'TikTok (dentro de la app)', null],
  [/WhatsApp/, 'WhatsApp (dentro de la app)', null],
  [/SamsungBrowser\/(\d+)/, 'Samsung Internet', 1],
  [/Edg(?:A|iOS)?\/(\d+)/, 'Edge', 1],
  [/OPR\/(\d+)|OPT\/(\d+)/, 'Opera', 1],
  [/YaBrowser\/(\d+)/, 'Yandex', 1],
  [/CriOS\/(\d+)/, 'Chrome', 1],
  [/FxiOS\/(\d+)/, 'Firefox', 1],
  [/Firefox\/(\d+)/, 'Firefox', 1],
  [/; wv\)/, 'Navegador dentro de una app', null],
  [/Chrome\/(\d+)/, 'Chrome', 1],
  [/Version\/(\d+)(?:\.\d+)*.*Safari/, 'Safari', 1],
]

function navegadorDe(ua, ficha) {
  // Brave se disfraza de Chrome en el User-Agent y solo se nombra aqui
  const marcas = Array.isArray(ficha.navegadores) ? ficha.navegadores : []
  const brave = marcas.find((m) => /^Brave\//.test(m))
  if (brave) return { navegador: 'Brave', navVersion: brave.split('/')[1] ?? null }

  for (const [patron, nombre, grupo] of NAVEGADORES) {
    const m = patron.exec(ua)
    if (m) {
      const version = grupo ? (m[grupo] ?? m[grupo + 1] ?? null) : null
      return { navegador: nombre, navVersion: version }
    }
  }
  return { navegador: 'Otro', navVersion: null }
}

/** Marca, modelo y tipo de aparato */
function modeloDe(ua, ficha, so) {
  const pantalla = /^\d{3,4}x\d{3,4}$/.test(ficha.pantalla ?? '') ? ficha.pantalla : null
  const dpr = numero(ficha.dpr, 0.5, 5)

  if (so === 'iOS') {
    const estimado = pantalla && dpr ? IPHONES[`${pantalla}@${Math.round(dpr)}`] : null
    return {
      tipo: 'telefono',
      marca: 'Apple',
      modelo: estimado ?? 'iPhone',
      codigo: null,
      estimado: !!estimado,
    }
  }
  if (so === 'iPadOS')
    return { tipo: 'tablet', marca: 'Apple', modelo: 'iPad', codigo: null, estimado: false }

  if (so === 'Android') {
    let codigo = limpio(ficha.modelo, 40)
    if (!codigo) {
      // Los navegadores que no congelan el User-Agent todavia lo traen. "K"
      // es el relleno de Chrome y "Mobile" el hueco que deja Firefox.
      const m = /Android [\d.]+; (?:[a-z]{2}[-_][a-zA-Z]{2}; )?([^;)]+?)(?: Build\/|;|\))/.exec(ua)
      if (m && !/^(K|Mobile|Tablet|wv)$/.test(m[1])) codigo = limpio(m[1], 40)
    }
    // Samsung Internet lo antepone al codigo: "SAMSUNG SM-A546E"
    codigo = codigo.replace(/^SAMSUNG[- ]/i, '')
    const marca = codigo ? fabricanteDe(codigo) : null
    const comercial = marca === 'Samsung' ? nombreSamsung(codigo) : null
    // Chrome en tableta Android no pone "Mobile"; en telefono si
    const tablet = /^SM-[TXP]/.test(codigo) || (!/Mobile/.test(ua) && ficha.movil !== true)
    return {
      tipo: tablet ? 'tablet' : 'telefono',
      marca,
      modelo: comercial ?? (codigo || null),
      codigo: comercial ? codigo : null,
      estimado: false,
    }
  }

  const escritorio = {
    Windows: 'PC con Windows',
    macOS: 'Mac',
    Linux: 'PC con Linux',
    ChromeOS: 'Chromebook',
  }
  return {
    tipo: escritorio[so] ? 'computadora' : ficha.movil ? 'telefono' : 'computadora',
    marca: so === 'macOS' ? 'Apple' : null,
    modelo: escritorio[so] ?? null,
    codigo: null,
    estimado: false,
  }
}

/**
 * Minutos que una zona horaria va por delante de UTC ahora mismo: -240 para
 * Caracas. Se comparan desfases y no nombres porque America/La_Paz y
 * America/Caracas son la misma hora con distinto nombre, y eso no es VPN.
 */
export function desfaseDe(zona, instante = new Date()) {
  if (!zona) return null
  try {
    const texto = new Intl.DateTimeFormat('en-US', { timeZone: zona, timeZoneName: 'longOffset' })
      .formatToParts(instante)
      .find((p) => p.type === 'timeZoneName')?.value
    if (texto === 'GMT') return 0
    const m = /GMT([+-])(\d{2}):(\d{2})/.exec(texto ?? '')
    return m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : null
  } catch {
    return null
  }
}

/* Los nombres con que un reloj puede estar en hora de Venezuela. Windows con
   la zona generica "UTC-04:00" no dice Caracas sino Etc/GMT+4 (el signo va al
   reves en esos nombres). Otros paises usan UTC-4, pero para quien abre un
   pensum de la UDO la apuesta es clara. */
const RELOJ_VE = new Set(['America/Caracas', 'Etc/GMT+4'])

const cabecera = (cabeceras, nombre) => {
  const valor = cabeceras?.[nombre]
  return typeof valor === 'string' ? valor : Array.isArray(valor) ? String(valor[0] ?? '') : ''
}

/** Donde esta, segun la IP. Vercel ya la geolocaliza: aqui solo se lee. */
export function lugarDe(cabeceras) {
  const pais = cabecera(cabeceras, 'x-vercel-ip-country').toUpperCase()
  let ciudad = cabecera(cabeceras, 'x-vercel-ip-city')
  try {
    ciudad = decodeURIComponent(ciudad)
  } catch {
    // Mal codificada: mejor sin ciudad que con basura
    ciudad = ''
  }
  return {
    pais: /^[A-Z]{2}$/.test(pais) ? pais : null,
    region: limpio(cabecera(cabeceras, 'x-vercel-ip-country-region'), 6) || null,
    ciudad: limpio(ciudad, 48) || null,
    zonaIp: limpio(cabecera(cabeceras, 'x-vercel-ip-timezone'), 48) || null,
  }
}

/**
 * La ficha entera de un aparato: lo que manda el navegador en `ficha` mas lo
 * que dicen las cabeceras de la peticion. Funcion pura, para poder probarla
 * con cualquier combinacion sin montar un servidor.
 */
export function leerAparato(ficha = {}, cabeceras = {}, instante = new Date()) {
  const ua = cabecera(cabeceras, 'user-agent').slice(0, 400)
  const { so, soVersion } = sistemaDe(ua, ficha)
  const { navegador, navVersion } = navegadorDe(ua, ficha)
  const { tipo, marca, modelo, codigo, estimado } = modeloDe(ua, ficha, so)
  const lugar = lugarDe(cabeceras)

  const zona = limpio(ficha.zona, 48) || null
  const propio = desfaseDe(zona, instante)
  const deIp = desfaseDe(lugar.zonaIp, instante)
  /* VPN probable, por dos caminos:
       - la IP esta en un huso y el reloj del aparato en otro;
       - el reloj esta en hora de Caracas y la IP en otro pais. Hace falta
         aparte porque Miami o Nueva York van a UTC-4 medio año, igual que
         Caracas: una VPN por EE. UU. no se notaria comparando husos. Y un
         telefono que de verdad esta en Miami pone la hora de alli solo.
     No es prueba -un viajero con el reloj sin cambiar da lo mismo-, por eso
     el panel dice "probable". */
  const vpn =
    (propio != null && deIp != null && propio !== deIp) ||
    (RELOJ_VE.has(zona) && lugar.pais != null && lugar.pais !== 'VE')

  return {
    tipo,
    so,
    soVersion,
    navegador,
    navVersion,
    marca,
    modelo,
    codigo,
    estimado,
    pantalla: /^\d{3,4}x\d{3,4}$/.test(ficha.pantalla ?? '') ? ficha.pantalla : null,
    dpr: numero(ficha.dpr, 0.5, 5),
    idioma: limpio(ficha.idioma, 16) || null,
    zona,
    memoria: numero(ficha.memoria, 0.25, 64),
    nucleos: numero(ficha.nucleos, 1, 128),
    red: /^(slow-2g|2g|3g|4g)$/.test(ficha.red ?? '') ? ficha.red : null,
    ...lugar,
    vpn,
    // En Venezuela si la IP lo dice, o si el reloj esta en hora de aqui aunque
    // la IP salga por otro pais: eso es alguien de aqui con VPN.
    venezuela: lugar.pais === 'VE' || RELOJ_VE.has(zona),
  }
}
