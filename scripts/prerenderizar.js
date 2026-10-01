/**
 * Genera un HTML estatico por carrera dentro de dist/.
 *
 * Se prerenderiza el CONTENIDO, no la app. La alternativa habitual seria
 * renderizar React en el servidor, pero varios hooks leen window y
 * localStorage al inicializar y habria que blindarlos todos para ganar algo
 * que aqui no hace falta: el estado es 100% del cliente, asi que el SSR no
 * aportaria nada en tiempo de ejecucion. Lo unico que se necesita es que un
 * buscador encuentre texto real al pedir /ingenieria-agronomica.
 *
 * Cada pagina lleva su <title>, su descripcion, canonical, Open Graph y
 * JSON-LD, mas la lista completa de materias dentro de <main>. React vacia
 * ese <main> y monta la app encima al arrancar.
 *
 * Ese <main> es SOLO legible (.seo-solo-lectura): esta en el documento para
 * los buscadores y los lectores de pantalla, pero no se dibuja. Antes llevaba
 * ademas una copia a mano de la cabecera -de la portada y de la barra de cada
 * carrera- para tener algo que pintar antes que React, y esa copia se quedaba
 * atras cada vez que la interfaz cambiaba: al entrar se veia una decima de
 * segundo el logo, las letras y la barra de la version anterior, y luego
 * saltaban a las nuevas. Lo primero que se ve ahora es el fondo del tema -que
 * pone el script de index.html antes de pintar- y despues la aplicacion con
 * su propia entrada. Ninguna copia que pueda envejecer.
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const DIST = 'dist'
const DATOS = 'src/data/carreras'
const SITIO = 'https://mapa-pensum.vercel.app'

const escapar = (t) =>
  String(t)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const plantilla = readFileSync(join(DIST, 'index.html'), 'utf8')

/**
 * El chunk de la vista de carrera, que se baja aparte del principal.
 *
 * Se busca por nombre en vez de fijarlo porque Vite le pone un hash distinto
 * en cada build; si se escribiera a mano, el preload apuntaria a un archivo
 * que ya no existe en cuanto cambie una linea.
 */
const chunkVista = readdirSync(join(DIST, 'assets')).find(
  (f) => f.startsWith('VistaCarrera-') && f.endsWith('.js'),
)

/** Sustituye una etiqueta ya presente en la plantilla, o la deja igual */
function reemplazar(html, patron, reemplazo) {
  if (!patron.test(html)) {
    console.warn(`  aviso: no encontre ${patron} en la plantilla`)
    return html
  }
  return html.replace(patron, reemplazo)
}

function paginaDe(carrera) {
  const titulo = `Pensum de ${carrera.nombre} — UDO Núcleo de Monagas`
  const descripcion =
    `Mapa interactivo del pensum de ${carrera.nombre} en la UDO Núcleo de Monagas: ` +
    `${carrera.asignaturas.length} materias en ${carrera.semestres.length} semestres, ` +
    'con todas sus prelaciones.'
  const url = `${SITIO}/${carrera.slug}`

  let html = plantilla
  html = reemplazar(html, /<title>[^<]*<\/title>/, `<title>${escapar(titulo)}</title>`)
  html = reemplazar(
    html,
    /<meta\s+name="description"\s+content="[^"]*"\s*\/>/,
    `<meta name="description" content="${escapar(descripcion)}" />`,
  )
  html = reemplazar(
    html,
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/>/,
    `<link rel="canonical" href="${url}" />`,
  )
  html = reemplazar(
    html,
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/>/,
    `<meta property="og:title" content="${escapar(titulo)}" />`,
  )
  html = reemplazar(
    html,
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/>/,
    `<meta property="og:description" content="${escapar(descripcion)}" />`,
  )
  // og:url tiene que apuntar a ESTA carrera: si todas comparten la del
  // inicio, quien comparta el enlace de Agronomica vera el titulo del inicio.
  html = reemplazar(
    html,
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/>/,
    `<meta property="og:url" content="${url}" />`,
  )

  // JSON-LD: le dice al buscador que esto es un plan de estudios y de quien
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: carrera.nombre,
    description: descripcion,
    url,
    provider: {
      '@type': 'CollegeOrUniversity',
      name: 'Universidad de Oriente',
      department: { '@type': 'Organization', name: carrera.nucleo },
    },
    numberOfCredits: carrera.creditos?.titulo ?? undefined,
  }

  // Contenido rastreable. React lo reemplaza al montar, pero el buscador
  // (y quien tenga el JS desactivado) ve el pensum entero.
  const secciones = carrera.semestres
    .map((s) => {
      const materias = carrera.asignaturas
        .filter((a) => a.semestre === s.numero)
        .map((a) => {
          const pre = a.prerrequisitos
            .map((p) => carrera.asignaturas.find((x) => x.codigo === p)?.nombre)
            .filter(Boolean)
          return (
            `<li><strong>${escapar(a.codigo)}</strong> ${escapar(a.nombre)}` +
            (a.uc != null ? ` (${a.uc} UC)` : '') +
            (pre.length ? ` — requiere ${escapar(pre.join(', '))}` : '') +
            '</li>'
          )
        })
        .join('')
      return `<section><h2>Semestre ${s.numero}</h2><ul>${materias}</ul></section>`
    })
    .join('')

  const grupos = carrera.grupos
    .map(
      (g) =>
        `<section><h2>${escapar(g.titulo)}</h2><ul>` +
        g.asignaturas
          .map(
            (a) =>
              `<li><strong>${escapar(a.codigo)}</strong> ${escapar(a.nombre)}` +
              (a.uc != null ? ` (${a.uc} UC)` : '') +
              '</li>',
          )
          .join('') +
        '</ul></section>',
    )
    .join('')

  const contenido =
    `<main id="contenido-seo" class="seo-solo-lectura">` +
    `<h1>Pensum de ${escapar(carrera.nombre)}</h1>` +
    `<p>${escapar(carrera.nucleo)} · ${carrera.asignaturas.length} materias · ` +
    `${carrera.semestres.length} semestres</p>` +
    secciones +
    grupos +
    `<p>Fuente: pensum publicado por la DACE del Núcleo de Monagas. ` +
    `Confirma siempre con control de estudios.</p>` +
    `</main>`

  /* Una pagina de carrera SABE que va a necesitar el chunk de la vista, asi
     que se pide desde el HTML en vez de esperar a que el JavaScript principal
     lo descubra al ejecutarse.

     Sin esto los dos chunks van en serie: medido en local, el de la vista no
     empezaba a bajar hasta 52 ms despues de que terminara el principal, y en
     una red movil ese hueco es una ida y vuelta entera. Declarandolo aqui,
     el navegador los pide a la vez.

     Solo en las paginas de carrera. En la portada seria contraproducente:
     ahi el chunk no hace falta hasta que se elige una, que es justo lo que se
     buscaba al partirlo. */
  const preload = chunkVista
    ? `<link rel="modulepreload" href="/assets/${chunkVista}" />\n    `
    : ''

  return html.replace(
    '<div id="root"></div>',
    `${preload}<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>\n` +
      `    <div id="root">${contenido}</div>`,
  )
}

/**
 * La portada: la lista de las nueve carreras con sus enlaces, para que un
 * buscador que aterrice en la raiz encuentre camino a cada una sin ejecutar
 * la aplicacion.
 */
function paginaInicio(indice) {
  const items = indice
    .map(
      (c) =>
        `<li><a href="/${c.slug}/">${escapar(c.nombre)}</a> — ` +
        `${c.asignaturas} materias obligatorias, ${c.electivas} electivas, ` +
        `${c.semestres} semestres</li>`,
    )
    .join('')

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Pensums de la UDO Núcleo de Monagas',
    itemListElement: indice.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.nombre,
      url: `${SITIO}/${c.slug}`,
    })),
  }

  const contenido =
    `<main id="contenido-seo" class="seo-solo-lectura">` +
    `<h1>Mapa de Pensum — UDO Núcleo de Monagas</h1>` +
    `<p>Tu carrera como un mapa: qué materia desbloquea cuál, qué puedes ` +
    `inscribir ahora y cuánto te falta.</p>` +
    `<ul>${items}</ul>` +
    `<p>Datos tomados de los pensums publicados por la DACE del Núcleo de ` +
    `Monagas. Confirma siempre con control de estudios.</p>` +
    `</main>`

  return plantilla.replace(
    '<div id="root"></div>',
    `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>\n` +
      `    <div id="root">${contenido}</div>`,
  )
}

const archivos = readdirSync(DATOS).filter((f) => f.endsWith('.json') && f !== 'indice.json')
const urls = [SITIO + '/']

for (const archivo of archivos) {
  const carrera = JSON.parse(readFileSync(join(DATOS, archivo), 'utf8'))
  const dir = join(DIST, carrera.slug)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'index.html'), paginaDe(carrera))
  urls.push(`${SITIO}/${carrera.slug}`)
  console.log(`  ${carrera.slug}/index.html`)
}

/* La portada se escribe AL FINAL, y el orden importa: `plantilla` se leyo de
   este mismo archivo al arrancar el script, asi que sobrescribirlo antes de
   generar las carreras les habria metido dentro el contenido del inicio. */
const indice = JSON.parse(readFileSync(join(DATOS, 'indice.json'), 'utf8'))
writeFileSync(join(DIST, 'index.html'), paginaInicio(indice))
console.log(`  index.html con las ${indice.length} carreras`)

writeFileSync(
  join(DIST, 'sitemap.xml'),
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n') +
    '\n</urlset>\n',
)

/* /panel es el panel de uso: privado. Pedir que no se indexe no lo protege
   -eso lo hace la clave del servidor- pero evita que salga en los resultados
   de un buscador. */
writeFileSync(
  join(DIST, 'robots.txt'),
  `User-agent: *\nAllow: /\nDisallow: /panel\n\nSitemap: ${SITIO}/sitemap.xml\n`,
)

console.log(`  sitemap.xml y robots.txt con ${urls.length} URLs`)
