/**
 * Escribe dist/sw.js con la lista de lo que hay que guardar para que la
 * aplicacion abra sin conexion.
 *
 * Se genera aqui y no se escribe a mano porque los nombres de los archivos
 * llevan hash: una lista fija se quedaria vieja en el primer despliegue y el
 * service worker seguiria sirviendo la version anterior para siempre, que es
 * la forma clasica de romper esto.
 *
 * Corre despues de prerenderizar.js: necesita los ocho HTML de carrera ya
 * escritos para poder meterlos en la precarga.
 *
 * Se prefirio esto a vite-plugin-pwa por lo de siempre en este proyecto: son
 * setenta lineas legibles frente a una dependencia con su propio runtime, y
 * la politica de cache aqui hay que entenderla, no heredarla. Un pensum
 * servido viejo sin avisar seria justo lo que el proyecto promete no hacer.
 */
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, posix, relative, sep } from 'node:path'

const DIST = 'dist'

function archivos(dir) {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre)
    return statSync(ruta).isDirectory() ? archivos(ruta) : [ruta]
  })
}

const todos = archivos(DIST)

/**
 * De ruta de disco a URL publica. Los index.html se piden por su carpeta
 * -Vercel tiene cleanUrls activo-, asi que la clave de la cache tiene que
 * ser esa y no la del archivo, o al pedir /ingenieria-de-sistemas no
 * encontraria nada guardado.
 */
function aUrl(ruta) {
  const rel = relative(DIST, ruta).split(sep).join(posix.sep)
  if (rel === 'index.html') return '/'
  if (rel.endsWith('/index.html')) return '/' + rel.slice(0, -'/index.html'.length)
  return '/' + rel
}

/* Cosas que existen para OTROS, no para quien abre la aplicacion.
   El sitemap y el robots los leen los buscadores. Y og.png es la miniatura
   que sale al compartir el enlace por WhatsApp o Twitter: la piden sus
   servidores desde la URL absoluta, nunca el navegador de quien usa la app,
   porque no se dibuja en ninguna pantalla -solo vive en una etiqueta meta-.
   Precachearla eran 59 kB por usuario para una imagen que no va a ver. */
const FUERA = new Set(['/sitemap.xml', '/robots.txt', '/og.png'])

/**
 * De las fuentes solo se precachea el subconjunto que esta aplicacion usa.
 *
 * Las dos fuentes vienen partidas en subconjuntos -latin, latin-ext,
 * cirilico, griego y vietnamita- y cada @font-face declara con unicode-range
 * que caracteres cubre. El navegador solo pide el subconjunto cuando la
 * pagina usa una letra de ese rango, asi que en una aplicacion en español
 * NUNCA descarga los otros: comprobado en el navegador, de los diez archivos
 * solo pide los dos latinos.
 *
 * El service worker no es tan listo: precachea la lista que se le da, y se
 * estaba llevando los diez. Eso son 172 kB de fuentes en vez de 64, y los
 * 108 de mas son alfabetos que no se van a dibujar. En un telefono con datos
 * caros es descarga pagada por nada.
 *
 * Y no solo sobran los otros alfabetos: tampoco hace falta latin-ext, que
 * cubre la Europa del este. Comprobado sobre los nueve pensums enteros: cero
 * caracteres fuera del subconjunto latin en las 481 materias.
 *
 * Se quedan en el build a proposito, y por eso esto es un filtro de precache
 * y no un cambio en el CSS. El @font-face de cada subconjunto declara con
 * unicode-range que caracteres cubre, asi que si algun dia aparece un
 * caracter raro -alguien escribiendo su nombre en el planificador, una
 * materia nueva- el navegador pedira ese archivo y funcionara igual. Lo que
 * se quita es traerselos por adelantado por si acaso.
 *
 * De 172 kB de fuentes a 64. En un telefono con datos caros, 108 kB de
 * alfabetos que no se van a dibujar es descarga pagada por nada.
 */
const SUBCONJUNTO_QUE_USAMOS = /-latin-wght-/

const recursos = todos
  .map(aUrl)
  .filter((u) => !FUERA.has(u))
  .filter((u) => !u.endsWith('.woff2') || SUBCONJUNTO_QUE_USAMOS.test(u))
  .sort()

/* La version sale del contenido: si no cambia nada, el service worker es el
   mismo y el navegador no reinstala la cache.

   La LISTA entra en la huella, y no es un detalle. El nombre de la cache se
   arma con esta version, y el activate solo borra las caches que no se
   llaman asi. Con la huella hecha solo de los archivos, cambiar QUE se
   precachea -sin tocar ningun archivo- dejaba la version igual: el navegador
   instalaba el service worker nuevo, abria la cache vieja porque se llama
   igual, y se quedaba con las entradas que ya no queriamos ahi. La lista
   cambio pero la cache no se entero. */
const huella = createHash('sha256')
for (const ruta of todos.sort()) huella.update(readFileSync(ruta))
huella.update(recursos.join('\n'))
const VERSION = huella.digest('hex').slice(0, 12)

const sw = `/* Generado por scripts/serviceworker.js. No editar a mano. */
const VERSION = ${JSON.stringify(VERSION)}
const CACHE = 'mapa-pensum-' + VERSION
const RECURSOS = ${JSON.stringify(recursos, null, 2)}

self.addEventListener('install', (e) => {
  // No se usa addAll: si un solo recurso falla, addAll tira toda la
  // instalacion y el usuario se queda sin nada guardado.
  e.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      await Promise.all(RECURSOS.map((u) => cache.add(u).catch(() => {})))
      self.skipWaiting()
    }),
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return
  // La telemetria nunca se guarda ni se sirve de cache: o llega o no llega
  if (url.pathname.startsWith('/_vercel/')) return

  // Navegar va primero a la red. Asi, con conexion, siempre se ve el pensum
  // publicado hoy; la copia guardada es la red de emergencia, no la fuente.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copia = res.clone()
          caches.open(CACHE).then((c) => c.put(e.request, copia)).catch(() => {})
          return res
        })
        .catch(() => caches.match(e.request).then((r) => r ?? caches.match('/'))),
    )
    return
  }

  // Todo lo demas lleva hash en el nombre, o sea que un nombre concreto no
  // cambia nunca de contenido: la cache va primero sin riesgo.
  e.respondWith(
    caches.match(e.request).then(
      (guardado) =>
        guardado ??
        fetch(e.request).then((res) => {
          if (res.ok && res.type === 'basic') {
            const copia = res.clone()
            caches.open(CACHE).then((c) => c.put(e.request, copia)).catch(() => {})
          }
          return res
        }),
    ),
  )
})
`

writeFileSync(join(DIST, 'sw.js'), sw)
console.log(`  sw.js   ${recursos.length} recursos  version ${VERSION}`)
