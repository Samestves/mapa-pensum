import { readFileSync, statSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/* Las fuentes que pinta la primera pantalla, en el subconjunto latino (el que
   cubre el español). Las demas -cirilico, griego, vietnamita, latin-ext- solo
   se bajan si alguna pagina llega a usar uno de sus caracteres. */
const FUENTES_PRIMERA_PANTALLA = [
  /^assets\/jost-latin-wght-normal-.*\.woff2$/,
  /^assets\/inter-latin-opsz-normal-.*\.woff2$/,
  /^assets\/ibm-plex-mono-latin-(300|400)-normal-.*\.woff2$/,
]

/**
 * Pide las fuentes de la primera pantalla desde el HTML, a la vez que el
 * JavaScript, en vez de esperar a que el CSS las descubra.
 *
 * Sin esto el navegador no sabe que las necesita hasta que React pinta un
 * texto con ellas, y para entonces ya ha pintado ese texto con la fuente de
 * respaldo: se veia una decima de segundo la letra del sistema y luego saltaba
 * a la buena. Con la precarga llegan antes que React y el primer pintado ya
 * sale con su letra.
 *
 * Los nombres llevan el hash del build, por eso se buscan en el bundle en vez
 * de escribirse a mano.
 */
function precargarFuentes() {
  return {
    name: 'precargar-fuentes',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_html, { bundle }) {
        return Object.keys(bundle ?? {})
          .filter((archivo) => FUENTES_PRIMERA_PANTALLA.some((patron) => patron.test(archivo)))
          .map((archivo) => ({
            tag: 'link',
            attrs: {
              rel: 'preload',
              href: `/${archivo}`,
              as: 'font',
              type: 'font/woff2',
              crossorigin: '',
            },
            injectTo: 'head',
          }))
      },
    },
  }
}

/* El modelo de idioma del lector de horarios (src/data/lectorLocal.js), en la
   carpeta de la que sale y en la ruta publica donde se sirve. La version va en
   la ruta: si un dia cambia el modelo, cambia la direccion y nadie se queda
   con el viejo guardado. */
const IDIOMA_LECTOR = {
  origen: 'node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz',
  ruta: 'lector/4.0.0_best_int/eng.traineddata.gz',
}

/* Lo que mide cada archivo del lector, para que la pantalla pueda decir
   cuanto va de la bajada. El servidor los manda comprimidos y sin decir
   cuanto miden ya abiertos, que es lo que se cuenta al bajarlos (ver
   precargar en src/data/lectorLocal.js). */
const PESOS_DEL_LECTOR = 'virtual:pesos-del-lector'
const ARCHIVOS_DEL_LECTOR = {
  trabajador: 'node_modules/tesseract.js/dist/worker.min.js',
  nucleoRapido: 'node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js',
  nucleoLento: 'node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js',
  idioma: IDIOMA_LECTOR.origen,
}

/**
 * Publica el modelo de idioma del lector con su nombre de siempre, y le da a
 * la aplicacion lo que pesa cada archivo del lector.
 *
 * Los demas archivos de tesseract se importan con `?url` y Vite les pone su
 * hash. Este no puede: tesseract arma la direccion el solo, como
 * `<carpeta>/eng.traineddata.gz`, y con un hash en el nombre no lo encuentra.
 * (Pasarle los datos ya bajados, que seria lo limpio, esta roto en
 * tesseract.js 7: al inicializar usa los datos como si fueran el nombre.)
 *
 * Se copia desde node_modules en cada build en vez de vivir en public/: son
 * tres megas de binario que no pintan nada en el repositorio.
 */
function lectorDeHorarios() {
  return {
    name: 'lector-de-horarios',
    resolveId(id) {
      return id === PESOS_DEL_LECTOR ? `\0${id}` : null
    },
    load(id) {
      if (id !== `\0${PESOS_DEL_LECTOR}`) return null
      const pesos = Object.entries(ARCHIVOS_DEL_LECTOR).map(([k, ruta]) => [k, statSync(ruta).size])
      return `export default ${JSON.stringify(Object.fromEntries(pesos))}`
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: IDIOMA_LECTOR.ruta,
        source: readFileSync(IDIOMA_LECTOR.origen),
      })
    },
    // En `npm run dev` no hay bundle: se sirve directo
    configureServer(servidor) {
      servidor.middlewares.use(`/${IDIOMA_LECTOR.ruta}`, (_peticion, respuesta) => {
        respuesta.setHeader('content-type', 'application/gzip')
        respuesta.end(readFileSync(IDIOMA_LECTOR.origen))
      })
    },
  }
}

// Tailwind v4 entra como plugin de Vite: no hace falta postcss.config ni tailwind.config
export default defineConfig({
  plugins: [react(), tailwindcss(), precargarFuentes(), lectorDeHorarios()],
})
