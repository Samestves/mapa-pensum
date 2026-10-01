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

// Tailwind v4 entra como plugin de Vite: no hace falta postcss.config ni tailwind.config
export default defineConfig({
  plugins: [react(), tailwindcss(), precargarFuentes()],
})
