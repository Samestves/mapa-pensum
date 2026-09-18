import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { desfaseDe, leerAparato, lugarDe, nombreSamsung } from './_aparato.js'

const CHROME_ANDROID =
  'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36'
const SAFARI_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
const CHROME_WINDOWS =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
const MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15'

const conUa = (ua, extra = {}) => ({ 'user-agent': ua, ...extra })

describe('el modelo', () => {
  test('los Samsung se nombran por su familia, y lo que no tiene regla se queda en codigo', () => {
    assert.equal(nombreSamsung('SM-A546E'), 'Galaxy A54')
    assert.equal(nombreSamsung('SM-A057M'), 'Galaxy A05s')
    assert.equal(nombreSamsung('SM-S928B'), 'Galaxy S24 Ultra')
    assert.equal(nombreSamsung('SM-S911B'), 'Galaxy S23')
    assert.equal(nombreSamsung('SM-F946B'), 'Galaxy Z Fold5')
    assert.equal(nombreSamsung('SM-X200'), 'Galaxy Tab')
    assert.equal(nombreSamsung('SM-Q999'), null)
  })

  test('Chrome en Android da el modelo por userAgentData, no por el User-Agent congelado', () => {
    const a = leerAparato({ modelo: 'SM-A546E', versionSO: '14.0.0' }, conUa(CHROME_ANDROID))
    assert.equal(a.marca, 'Samsung')
    assert.equal(a.modelo, 'Galaxy A54')
    assert.equal(a.codigo, 'SM-A546E')
    assert.equal(a.so, 'Android')
    assert.equal(a.soVersion, '14', 'no el 10 falso del User-Agent')
    assert.equal(a.tipo, 'telefono')
    assert.equal(a.navegador, 'Chrome')
    assert.equal(a.navVersion, '128')
  })

  test('sin userAgentData, un Android de Chrome no dice ni modelo ni version', () => {
    const a = leerAparato({}, conUa(CHROME_ANDROID))
    assert.equal(a.modelo, null)
    assert.equal(a.soVersion, null)
  })

  test('los codigos de otros fabricantes se reconocen por su forma', () => {
    const marca = (modelo) => leerAparato({ modelo }, conUa(CHROME_ANDROID)).marca
    assert.equal(marca('23053RN02L'), 'Xiaomi')
    assert.equal(marca('Redmi Note 12'), 'Xiaomi')
    assert.equal(marca('moto g54 5G'), 'Motorola')
    assert.equal(marca('TECNO KI5q'), 'Tecno')
    assert.equal(marca('Infinix X6816'), 'Infinix')
    assert.equal(marca('RMX3710'), 'realme')
  })

  test('Firefox en Android no se confunde: "Mobile" no es un modelo', () => {
    const ua = 'Mozilla/5.0 (Android 14; Mobile; rv:128.0) Gecko/128.0 Firefox/128.0'
    const a = leerAparato({}, conUa(ua))
    assert.equal(a.modelo, null)
    assert.equal(a.navegador, 'Firefox')
  })

  test('Samsung Internet viejo trae el modelo en el User-Agent', () => {
    const ua =
      'Mozilla/5.0 (Linux; Android 13; SAMSUNG SM-A145M) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36'
    const a = leerAparato({}, conUa(ua))
    assert.equal(a.modelo, 'Galaxy A14')
    assert.equal(a.navegador, 'Samsung Internet')
    assert.equal(a.navVersion, '23')
  })

  test('el iPhone se estima por su pantalla, y lo dice', () => {
    const a = leerAparato({ pantalla: '390x844', dpr: 3 }, conUa(SAFARI_IPHONE))
    assert.equal(a.marca, 'Apple')
    assert.equal(a.modelo, 'iPhone 12, 13 o 14')
    assert.equal(a.estimado, true)
    assert.equal(a.so, 'iOS')
    assert.equal(a.soVersion, '17.5')
    assert.equal(a.navegador, 'Safari')
  })

  test('un iPad que se hace pasar por Mac se delata por la pantalla tactil', () => {
    assert.equal(leerAparato({ tactil: true }, conUa(MAC)).so, 'iPadOS')
    assert.equal(leerAparato({ tactil: true }, conUa(MAC)).tipo, 'tablet')
    assert.equal(leerAparato({}, conUa(MAC)).so, 'macOS')
  })

  test('Windows 11 solo se distingue con userAgentData', () => {
    assert.equal(leerAparato({ versionSO: '15.0.0' }, conUa(CHROME_WINDOWS)).soVersion, '11')
    assert.equal(leerAparato({ versionSO: '10.0.0' }, conUa(CHROME_WINDOWS)).soVersion, '10')
    assert.equal(leerAparato({}, conUa(CHROME_WINDOWS)).soVersion, null)
    assert.equal(leerAparato({}, conUa(CHROME_WINDOWS)).tipo, 'computadora')
  })

  test('los navegadores de dentro de una app se nombran por la app', () => {
    const ig = `${SAFARI_IPHONE} Instagram 340.0.0.22.109`
    assert.equal(leerAparato({}, conUa(ig)).navegador, 'Instagram (dentro de la app)')
    assert.equal(
      leerAparato({ navegadores: ['Brave/128', 'Chromium/128'] }, conUa(CHROME_WINDOWS)).navegador,
      'Brave',
    )
  })
})

describe('el lugar', () => {
  test('pais, region, ciudad y huso salen de las cabeceras de Vercel', () => {
    assert.deepEqual(
      lugarDe({
        'x-vercel-ip-country': 've',
        'x-vercel-ip-country-region': 'N',
        'x-vercel-ip-city': 'Matur%C3%ADn',
        'x-vercel-ip-timezone': 'America/Caracas',
      }),
      { pais: 'VE', region: 'N', ciudad: 'Maturín', zonaIp: 'America/Caracas' },
    )
  })

  test('sin cabeceras no se inventa nada', () => {
    assert.deepEqual(lugarDe({}), { pais: null, region: null, ciudad: null, zonaIp: null })
  })

  test('el desfase compara horas, no nombres', () => {
    const instante = new Date('2026-09-15T12:00:00Z')
    assert.equal(desfaseDe('America/Caracas', instante), -240)
    assert.equal(desfaseDe('America/La_Paz', instante), -240)
    assert.equal(
      desfaseDe('America/New_York', instante),
      -240,
      'en septiembre Nueva York tambien va a -4',
    )
    assert.equal(desfaseDe('Europe/Madrid', instante), 120)
    assert.equal(desfaseDe('No/Existe', instante), null)
  })

  test('VPN probable: la IP en un huso y el reloj en otro', () => {
    const instante = new Date('2026-01-15T12:00:00Z')
    const vpn = leerAparato(
      { zona: 'America/Caracas' },
      conUa(CHROME_ANDROID, {
        'x-vercel-ip-country': 'DE',
        'x-vercel-ip-timezone': 'Europe/Berlin',
      }),
      instante,
    )
    assert.equal(vpn.vpn, true)
    assert.equal(vpn.venezuela, true, 'el reloj en hora de Caracas dice que es de aqui')

    const directo = leerAparato(
      { zona: 'America/Caracas' },
      conUa(CHROME_ANDROID, {
        'x-vercel-ip-country': 'VE',
        'x-vercel-ip-timezone': 'America/Caracas',
      }),
      instante,
    )
    assert.equal(directo.vpn, false)
    assert.equal(directo.venezuela, true)

    // Nueva York en septiembre va a la misma hora que Caracas: el huso no
    // basta, pero un reloj de Caracas con IP de EE. UU. si delata la VPN
    const miami = leerAparato(
      { zona: 'America/Caracas' },
      conUa(CHROME_ANDROID, {
        'x-vercel-ip-country': 'US',
        'x-vercel-ip-timezone': 'America/New_York',
      }),
      new Date('2026-09-15T12:00:00Z'),
    )
    assert.equal(miami.vpn, true)

    // Windows con la zona generica UTC-4 no dice Caracas, y es igual de aqui
    const generico = leerAparato(
      { zona: 'Etc/GMT+4' },
      conUa(CHROME_WINDOWS, {
        'x-vercel-ip-country': 'US',
        'x-vercel-ip-timezone': 'America/New_York',
      }),
      new Date('2026-09-15T12:00:00Z'),
    )
    assert.equal(generico.vpn, true)
    assert.equal(generico.venezuela, true)

    const fuera = leerAparato(
      { zona: 'America/Santiago' },
      conUa(CHROME_ANDROID, {
        'x-vercel-ip-country': 'CL',
        'x-vercel-ip-timezone': 'America/Santiago',
      }),
      instante,
    )
    assert.equal(fuera.vpn, false)
    assert.equal(fuera.venezuela, false)
  })

  test('lo que manda el cliente se limpia y se acota', () => {
    const a = leerAparato(
      {
        pantalla: '<script>',
        dpr: 99,
        memoria: 8,
        nucleos: 'muchos',
        red: 'fibra',
        idioma: 'es-VE',
      },
      conUa(CHROME_ANDROID),
    )
    assert.equal(a.pantalla, null)
    assert.equal(a.dpr, null)
    assert.equal(a.memoria, 8)
    assert.equal(a.nucleos, null)
    assert.equal(a.red, null)
    assert.equal(a.idioma, 'es-VE')
  })
})
