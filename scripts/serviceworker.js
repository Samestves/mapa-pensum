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

// El sitemap y el robots son para los buscadores, no para quien usa la app
const FUERA = new Set(['/sitemap.xml', '/robots.txt'])

const recursos = todos
  .map(aUrl)
  .filter((u) => !FUERA.has(u))
  .sort()

// La version sale del contenido: si no cambia nada, el service worker es el
// mismo y el navegador no reinstala la cache.
const huella = createHash('sha256')
for (const ruta of todos.sort()) huella.update(readFileSync(ruta))
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
