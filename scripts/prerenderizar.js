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
    `<main id="contenido-seo">` +
    `<h1>Pensum de ${escapar(carrera.nombre)}</h1>` +
    `<p>${escapar(carrera.nucleo)} · ${carrera.asignaturas.length} materias · ` +
    `${carrera.semestres.length} semestres</p>` +
    secciones +
    grupos +
    `<p>Fuente: pensum publicado por la DACE del Núcleo de Monagas. ` +
    `Confirma siempre con control de estudios.</p>` +
    `</main>`

  return html.replace(
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

writeFileSync(
  join(DIST, 'sitemap.xml'),
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n') +
    '\n</urlset>\n',
)

writeFileSync(
  join(DIST, 'robots.txt'),
  `User-agent: *\nAllow: /\n\nSitemap: ${SITIO}/sitemap.xml\n`,
)

console.log(`  sitemap.xml y robots.txt con ${urls.length} URLs`)
