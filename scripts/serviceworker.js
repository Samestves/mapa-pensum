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
   Precachearla eran 59 kB por usuario para una imagen que no va a ver.
   Y sw.js, el propio service worker: si este script corre sobre un dist que
   ya lo tiene, se precacheaba a si mismo.
   El manifiesto de Vite es para los scripts del build (ver trozos.js): el
   navegador no lo pide nunca. */
const FUERA = new Set(['/sitemap.xml', '/robots.txt', '/og.png', '/sw.js', '/.vite/manifest.json'])

/**
 * De las fuentes solo se precachea lo que esta aplicacion dibuja: los cuatro
 * recortes al español que genera scripts/fuentes.js.
 *
 * Las latinas enteras tambien estan en el build, declaradas solo para los
 * caracteres que el recorte no trae. El navegador pide una cuando la pagina
 * usa una letra de esas, y lo que se escribe en español sale de los recortes.
 *
 * El service worker no es tan listo: precachea la lista que se le da. Sin
 * este filtro se llevaba tambien las enteras, casi el triple de lo que hace
 * falta, por letras que no se van a dibujar. En un telefono con datos caros
 * es descarga pagada por nada.
 *
 * Las enteras se quedan en el build a proposito: si algun dia aparece un
 * caracter raro -un nombre en el horario- el navegador pedira ese archivo y
 * funcionara igual; sin conexion, ese caracter sale con la letra del
 * sistema. Lo que se quita es traerselas por adelantado.
 */
const SUBCONJUNTO_QUE_USAMOS = /\/(inter|jost|plex-mono-(300|400))-es-/

/* El panel de uso es para una sola persona y se entra a mano por /panel.
   Precacharlo seria hacer que los nueve mil estudiantes se bajen -y guarden
   sin conexion- una pantalla que no van a abrir nunca. Sigue en el build: si
   alguien entra a /panel, se descarga ahi mismo. */
const SOLO_PARA_MI = /PanelUso-[^/]+\.js$/

/* El lector de horarios que corre en el aparato: tesseract, su nucleo en
   WebAssembly y el modelo del idioma. Son unos cuatro megas y medio que solo
   usa quien sube una foto de su horario, asi que no se precargan: se bajan en
   ese momento.

   Pero una vez bajados no se tiran con cada despliegue. La cache de la
   aplicacion lleva la version en el nombre y se borra entera al publicar; si
   el lector viviera ahi, cada commit le costaria otros cuatro megas de datos
   a quien ya lo tenia, por unos archivos que no cambian mas que cuando se
   actualiza tesseract. Por eso van a una cache aparte, con nombre fijo, de la
   que solo se quita lo que el build de hoy ya no trae. */
const DEL_LECTOR = /^\/(lector\/|assets\/(lectorLocal|worker\.min|tesseract-core)[^/]*$)/
const lector = todos
  .map(aUrl)
  .filter((u) => DEL_LECTOR.test(u))
  .sort()

const recursos = todos
  .map(aUrl)
  .filter((u) => !FUERA.has(u))
  .filter((u) => !DEL_LECTOR.test(u))
  .filter((u) => !u.endsWith('.woff2') || SUBCONJUNTO_QUE_USAMOS.test(u))
  /* IBM Plex Mono trae, ademas de cada woff2, su copia en woff: el formato
     viejo, para navegadores sin woff2. Todo navegador con service worker lee
     woff2, asi que esas copias no se piden nunca; precachearlas eran diez
     archivos y unos 130 kB por usuario para nada. */
  .filter((u) => !u.endsWith('.woff'))
  .filter((u) => !SOLO_PARA_MI.test(u))
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
// El lector de horarios: no se precarga, y lo bajado sobrevive a los despliegues
const CACHE_LECTOR = 'mapa-pensum-lector'
const LECTOR = ${JSON.stringify(lector, null, 2)}

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
      .then((claves) =>
        Promise.all(
          claves.filter((c) => c !== CACHE && c !== CACHE_LECTOR).map((c) => caches.delete(c)),
        ),
      )
      // Del lector solo se tira lo que este build ya no usa
      .then(() => caches.open(CACHE_LECTOR))
      .then((cache) =>
        cache
          .keys()
          .then((guardadas) =>
            Promise.all(
              guardadas
                .filter((p) => !LECTOR.includes(new URL(p.url).pathname))
                .map((p) => cache.delete(p)),
            ),
          ),
      )
      .catch(() => {})
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
  //
  // Pero nunca se guarda HTML bajo el nombre de un archivo: si un archivo ya
  // no existe -de un despliegue anterior-, el servidor puede contestar con
  // la pagina, y guardarla haria que ese nombre devolviera HTML para siempre.
  e.respondWith(
    caches.match(e.request).then(
      (guardado) =>
        guardado ??
        fetch(e.request).then((res) => {
          const esPagina = (res.headers.get('content-type') ?? '').includes('text/html')
          if (res.ok && res.type === 'basic' && !esPagina) {
            const copia = res.clone()
            const donde = LECTOR.includes(url.pathname) ? CACHE_LECTOR : CACHE
            caches.open(donde).then((c) => c.put(e.request, copia)).catch(() => {})
          }
          return res
        }),
    ),
  )
})
`

writeFileSync(join(DIST, 'sw.js'), sw)
console.log(
  `  sw.js   ${recursos.length} recursos  version ${VERSION}  (lector aparte: ${lector.length})`,
)
