import { readFileSync, statSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/* Las fuentes que se piden desde el HTML, ya recortadas al español (ver
   scripts/fuentes.js). Las latinas enteras solo se bajan si alguna pagina
   llega a usar un caracter de fuera del recorte.

   Inter y Jost las pinta cualquier pantalla. Plex Mono solo la usa el mapa:
   en pantallas anchas, donde el mapa es lo primero que se ve, se pide igual
   que las otras; en un telefono, donde se entra por la lista, con prioridad
   baja, para que no le quite datos a lo primero que se pinta. El corte es el
   de la vista inicial, en VistaCarrera.

   Se pide desde el HTML tambien en el telefono, y no al ir al mapa, porque es
   lo unico que funciona. Probado en Chrome con datos lentos: un enlace de
   precarga creado por script despues de cargar la pagina no se reutiliza -el
   mapa vuelve a pedir la letra, se pinta con la del sistema y se maqueta dos
   veces, 3 350 objetos en vez de 2 000-, y document.fonts.load la activa, que
   obliga a maquetar de nuevo todo lo que haya en pantalla aunque no la use. */
const FUENTES_QUE_SE_PIDEN = [
  { patron: /^assets\/inter-es-.*\.woff2$/ },
  { patron: /^assets\/jost-es-.*\.woff2$/ },
  { patron: /^assets\/plex-mono-(300|400)-es-.*\.woff2$/, media: '(min-width: 768px)' },
  {
    patron: /^assets\/plex-mono-(300|400)-es-.*\.woff2$/,
    media: '(max-width: 767.98px)',
    fetchpriority: 'low',
  },
]

/**
 * Pide las fuentes desde el HTML, a la vez que el JavaScript, en vez de
 * esperar a que el CSS las descubra.
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
        return Object.keys(bundle ?? {}).flatMap((archivo) =>
          FUENTES_QUE_SE_PIDEN.filter(({ patron }) => patron.test(archivo)).map(
            ({ patron: _patron, ...cuando }) => ({
              tag: 'link',
              attrs: {
                rel: 'preload',
                href: `/${archivo}`,
                as: 'font',
                type: 'font/woff2',
                crossorigin: '',
                ...cuando,
              },
              injectTo: 'head',
            }),
          ),
        )
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

/* Lo que solo comparten trozos que se piden a mano, y que no debe viajar con
   lo comun de la carrera (ver TROZOS): el lienzo de las imagenes que se
   comparten -lo usan el exportador del horario y el de la ruta- y la lectura
   de horarios -la hoja que lee la foto y el lector del aparato-. Cada uno va
   en su trozo, que solo baja quien exporta o quien lee. */
const SOLO_A_MANO = /[\\/]src[\\/]data[\\/](lienzo|leerHorario)\.js$/

/**
 * Como se reparte el JavaScript en archivos.
 *
 * Por su cuenta, el empaquetador hace un archivo por cada modulo que comparten
 * dos trozos: con las vistas de la carrera partidas (ver
 * src/components/carreraPorTrozos.js) salian veintitantos archivos de cien
 * bytes -un icono, un hook- y el cascaron de la carrera eran diecisiete
 * peticiones. Dos grupos lo dejan en lo que se quiere:
 *
 *   inicio   lo que alcanza la entrada. Se queda en el archivo principal:
 *            sin este grupo, el siguiente se llevaria tambien React, que lo
 *            comparten todos.
 *   carrera  lo que comparten dos o mas trozos de dentro de una carrera -el
 *            cascaron y las vistas-, en un solo archivo que llega con el
 *            cascaron.
 *
 * Lo que usa un solo trozo va en el suyo, como siempre. El resultado lo
 * vigila scripts/peso.js en cada build.
 */
const TROZOS = {
  groups: [
    { name: 'inicio', tags: ['$initial'], priority: 2 },
    { name: 'carrera', minShareCount: 2, priority: 1, test: (id) => !SOLO_A_MANO.test(id) },
  ],
}

// Tailwind v4 entra como plugin de Vite: no hace falta postcss.config ni tailwind.config
export default defineConfig({
  plugins: [react(), tailwindcss(), precargarFuentes(), lectorDeHorarios()],
  build: {
    manifest: true,
    rolldownOptions: { output: { codeSplitting: TROZOS } },
  },
})
