import { SITUACION } from '../layout/situacion'

const mezcla = (color, pct, base = 'var(--nodo)') => `color-mix(in oklab, ${color} ${pct}%, ${base})`

/**
 * Como se ve cada situacion. Una sola tabla para las tarjetas, las casillas,
 * las electivas y la cabecera de semestre: si cada una decidiera su propio
 * verde, a la tercera ya no serian el mismo verde.
 *
 * La jerarquia va AL REVES de como iba. Antes lo aprobado era lo mas vistoso
 * -relleno fuerte, borde grueso y resplandor- y lo que podias inscribir era
 * una tarjeta mas con el borde del color de su area. O sea que el mapa
 * gritaba lo que ya habias terminado y susurraba lo unico que viniste a
 * mirar. Ahora:
 *
 *   hecha        se retira. Un tinte verde apenas, texto apagado y un check.
 *                Ya paso; sirve de suelo, no de protagonista.
 *   cursando     se marca en ambar, sin llamar mas que eso.
 *   inscribible  es lo unico que brilla: un degradado recorre su borde y su
 *                etiqueta, y un halo del mismo color la despega del resto.
 *                Es donde sigue tu carrera.
 *   proxima      contorno fino y una etiqueta sin relleno: se ve que viene.
 *   lejana       casi fundida con el lienzo.
 *
 * El area deja de ser un borde y una barra de color y pasa a ser un punto.
 * Con dos sistemas de color compitiendo -area y estado- el ojo no sabia cual
 * leer, y el que importa para inscribir es el estado.
 */
export const ASPECTO = {
  [SITUACION.HECHA]: {
    fondo: mezcla('var(--estado-aprobada)', 9),
    borde: 'var(--estado-aprobada)',
    opacidadBorde: 0.3,
    grosor: 1,
    nombre: 'var(--tinta-suave)',
    etiqueta: null,
  },
  [SITUACION.CURSANDO]: {
    fondo: mezcla('var(--estado-cursando)', 9),
    borde: 'var(--estado-cursando)',
    opacidadBorde: 0.72,
    grosor: 1.25,
    nombre: 'var(--tinta)',
    etiqueta: {
      texto: 'Cursando',
      ancho: 56,
      fondo: mezcla('var(--estado-cursando)', 18),
      tinta: 'var(--estado-cursando)',
    },
  },
  /* El borde es el degradado que gira, definido en DefsGrafo. No es tinta
     plena: con blanco a secas la tarjeta se leia como "seleccionada", que es
     otra cosa, y con tres tarjetas inscribibles parecia que habias pulsado
     tres. El brillo que recorre el contorno dice "esta viva" sin confundirse
     con el foco. */
  [SITUACION.INSCRIBIBLE]: {
    fondo: 'var(--inscribible-fondo)',
    borde: 'url(#brillo-inscribible)',
    opacidadBorde: 1,
    grosor: 1.5,
    nombre: 'var(--tinta)',
    brilla: true,
    etiqueta: {
      texto: 'Inscribible',
      ancho: 66,
      fondo: mezcla('var(--tinta)', 9),
      tinta: 'var(--tinta)',
      contorno: 'url(#brillo-inscribible)',
    },
  },
  [SITUACION.PROXIMA]: {
    fondo: 'var(--nodo)',
    borde: 'var(--tinta)',
    opacidadBorde: 0.24,
    grosor: 1,
    nombre: 'var(--tinta-suave)',
    etiqueta: {
      texto: 'Próximo',
      ancho: 52,
      fondo: 'none',
      tinta: 'var(--tinta-suave)',
      contorno: 'color-mix(in oklab, var(--tinta) 26%, transparent)',
    },
  },
  [SITUACION.LEJANA]: {
    fondo: mezcla('var(--lienzo)', 40),
    borde: 'var(--tinta)',
    opacidadBorde: 0.08,
    grosor: 1,
    nombre: 'var(--tinta-tenue)',
    etiqueta: null,
  },
}

export const ETIQUETA_SITUACION = {
  [SITUACION.HECHA]: 'Aprobada',
  [SITUACION.CURSANDO]: 'Cursando',
  [SITUACION.INSCRIBIBLE]: 'Puedes inscribirla',
  [SITUACION.PROXIMA]: 'Se abre el próximo semestre',
  [SITUACION.LEJANA]: 'Aún lejos',
}
