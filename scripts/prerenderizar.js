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

  /* Misma idea que en la portada: lo que se pinta va donde la aplicacion lo
     va a poner. Aqui es la barra de arriba, con el nombre de la carrera a la
     izquierda, de modo que al montar el mapa nada se mueve de sitio. */
  const barra =
    `<div class="flex items-center gap-1 border-b border-panel-borde bg-panel ` +
    `px-2.5 py-2.5 sm:gap-2 sm:px-5">` +
    /* La flecha de volver va tambien, y no por adorno: ocupa 34 px y empuja
       al titulo. Sin ella el nombre de la carrera se pintaba 37 px a la
       izquierda de donde la aplicacion lo iba a dejar, y ese desplazamiento
       lateral es exactamente el parpadeo que se venia a quitar. */
    `<span class="flex h-9 shrink-0 items-center justify-center rounded-lg px-2 ` +
    `text-tinta-suave">` +
    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" ` +
    `stroke-width="2" stroke-linecap="round" stroke-linejoin="round">` +
    `<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>` +
    `</span>` +
    `<div class="min-w-0 flex-1 pl-1">` +
    `<h1 class="truncate text-base leading-tight font-extrabold tracking-tight ` +
    `text-tinta">${escapar(carrera.nombreCorto ?? carrera.nombre)}</h1>` +
    `<p class="mt-0.5 truncate text-[11px] leading-tight font-medium text-tinta-tenue">` +
    `${escapar(carrera.nombre)}</p>` +
    `</div>` +
    `</div>`

  const contenido =
    `<main id="contenido-seo">` +
    barra +
    `<div class="seo-solo-lectura">` +
    `<h2>Pensum de ${escapar(carrera.nombre)}</h2>` +
    `<p>${escapar(carrera.nucleo)} · ${carrera.asignaturas.length} materias · ` +
    `${carrera.semestres.length} semestres</p>` +
    secciones +
    grupos +
    `<p>Fuente: pensum publicado por la DACE del Núcleo de Monagas. ` +
    `Confirma siempre con control de estudios.</p>` +
    `</div>` +
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
 * La portada, que era la unica pagina sin contenido que pintar.
 *
 * Las nueve carreras ya salian prerenderizadas y el inicio no, y eso costaba
 * dos cosas a la vez.
 *
 * En velocidad: el movil recibia un <div id="root"> vacio, asi que no se
 * pintaba NADA hasta bajar 320 KB de JavaScript, parsearlos y montar React.
 * Medido sobre el build servido en local, sin latencia de red: la portada
 * tardaba 780 ms en pintar el primer pixel y una pagina de carrera 84. Nueve
 * veces, con el mismo JS y el mismo CSS; lo unico distinto era tener algo que
 * pintar. En un telefono con datos de verdad esa espera eran los 4,28 s de
 * First Contentful Paint que marcaba el panel.
 *
 * Y en SEO: la portada no tenia un solo enlace rastreable a las carreras. Un
 * buscador que aterrizara en la raiz no encontraba camino a ninguna de las
 * nueve salvo ejecutando la aplicacion.
 *
 * Esto NO es una copia de las tarjetas. Es la misma clase de contenido
 * semantico que ya llevan las paginas de carrera: una lista con enlaces y
 * cifras. Copiar el diseño de la tarjeta habria creado dos versiones de la
 * misma interfaz que divergen en cuanto una se toque; una lista no compite
 * con nada porque no pretende parecerse.
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

  /* El primer fotograma es la CABECERA REAL de la portada, en su sitio, no
     un rotulo centrado en mitad de la pantalla.

     Esa es toda la diferencia entre que se lea como "la web esta cargando" o
     como un destello. Un titulo en el centro que un instante despues salta a
     la esquina superior izquierda es un cambio de sitio, y el ojo lo ve como
     un parpadeo aunque dure una decima. Escrito donde React lo va a poner, lo
     que ocurre despues es que las tarjetas RELLENAN lo que faltaba: nada se
     mueve de donde estaba.

     Si, esto duplica el marcado de la cabecera. Es una duplicacion pequeña y
     consciente -un logotipo, un titulo y una linea, que no cambian nunca- y
     se paga a cambio de que la entrada no de un salto. Si algun dia la
     cabecera cambia, lo peor que pasa es que durante una decima de segundo
     se vea la anterior. */
  const cabecera =
    `<div class="mx-auto flex min-h-full max-w-5xl flex-col px-4 py-8 sm:px-6 sm:py-12 ` +
    `xl:max-w-[min(85rem,94vw)] xl:px-10 xl:py-14 2xl:px-16">` +
    `<header class="flex items-start gap-3">` +
    `<span class="grid size-10 shrink-0 place-items-center rounded-xl xl:size-12" ` +
    `style="background-color:color-mix(in oklab, var(--estado-aprobada) 16%, transparent);` +
    `color:var(--estado-aprobada)">` +
    `<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" ` +
    `stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">` +
    `<path d="m10.586 5.414-5.172 5.172"/><path d="m18.586 13.414-5.172 5.172"/>` +
    `<path d="M6 12h12"/><circle cx="12" cy="20" r="2"/><circle cx="12" cy="4" r="2"/>` +
    `<circle cx="20" cy="12" r="2"/><circle cx="4" cy="12" r="2"/></svg>` +
    `</span>` +
    `<div>` +
    `<h1 class="text-xl leading-tight font-extrabold tracking-tight text-tinta ` +
    `sm:text-2xl xl:text-3xl">Mapa de Pensum</h1>` +
    `<p class="mt-0.5 text-[12px] leading-snug font-medium text-tinta-suave xl:text-sm">` +
    `Universidad de Oriente · Núcleo de Monagas</p>` +
    `</div>` +
    `</header>` +
    `</div>`

  const contenido =
    `<main id="contenido-seo">` +
    cabecera +
    `<div class="seo-solo-lectura">` +
    `<p>Tu carrera como un mapa: qué materia desbloquea cuál, qué puedes ` +
    `inscribir ahora y cuánto te falta.</p>` +
    `<ul>${items}</ul>` +
    `<p>Datos tomados de los pensums publicados por la DACE del Núcleo de ` +
    `Monagas. Confirma siempre con control de estudios.</p>` +
    `</div>` +
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

writeFileSync(
  join(DIST, 'robots.txt'),
  `User-agent: *\nAllow: /\n\nSitemap: ${SITIO}/sitemap.xml\n`,
)

console.log(`  sitemap.xml y robots.txt con ${urls.length} URLs`)
