import { SITUACION } from '../layout/situacion'

const BRILLO = 'url(#brillo-inscribible)'

/**
 * Como se ve cada situacion. Una sola tabla para las tarjetas, las casillas y
 * las electivas: si cada una decidiera su propio verde, a la tercera ya no
 * serian el mismo verde.
 *
 * Todo apunta a variables --sit-* de index.css, que cada tema define con sus
 * propios valores. Hasta ahora eran mezclas calculadas aqui, y una mezcla que
 * funciona en oscuro falla en claro: un 9 % de verde sobre blanco es blanco.
 *
 *   hecha        se retira. Tinte verde, texto apagado y un check.
 *   cursando     se marca en ambar, con su etiqueta.
 *   inscribible  lo unico que brilla: un degradado recorre su borde y su
 *                etiqueta, y un halo del mismo color la despega del resto.
 *   proxima      contorno fino y una etiqueta sin relleno: se ve que viene.
 *   lejana       casi fundida con el lienzo.
 *
 * `borde` es el de reposo y `fuerte` el que toma al señalarla o seleccionarla.
 * Van separados porque en reposo el borde de una aprobada es un verde muy
 * tenue, y resaltarla subiendo solo la opacidad de ESE verde no llegaba a
 * verse en claro.
 */
export const ASPECTO = {
  [SITUACION.HECHA]: {
    fondo: 'var(--sit-hecha-fondo)',
    borde: 'var(--sit-hecha-borde)',
    fuerte: 'var(--estado-aprobada)',
    grosor: 1,
    nombre: 'var(--sit-hecha-nombre)',
    etiqueta: null,
  },
  [SITUACION.CURSANDO]: {
    fondo: 'var(--sit-cursando-fondo)',
    borde: 'var(--sit-cursando-borde)',
    fuerte: 'var(--estado-cursando)',
    grosor: 1.25,
    nombre: 'var(--tinta)',
    etiqueta: {
      texto: 'Cursando',
      ancho: 56,
      fondo: 'var(--sit-cursando-pastilla)',
      tinta: 'var(--sit-cursando-texto)',
    },
  },
  /* El borde es el degradado que gira, definido en DefsGrafo. No es tinta
     plena: con blanco a secas la tarjeta se leia como "seleccionada", que es
     otra cosa, y con tres inscribibles parecia que habias pulsado tres. */
  [SITUACION.INSCRIBIBLE]: {
    fondo: 'var(--sit-inscribible-fondo)',
    borde: BRILLO,
    fuerte: BRILLO,
    grosor: 1.5,
    nombre: 'var(--tinta)',
    brilla: true,
    etiqueta: {
      texto: 'Inscribible',
      ancho: 66,
      fondo: 'var(--sit-inscribible-pastilla)',
      tinta: 'var(--tinta)',
      contorno: BRILLO,
    },
  },
  [SITUACION.PROXIMA]: {
    fondo: 'var(--sit-proxima-fondo)',
    borde: 'var(--sit-proxima-borde)',
    fuerte: 'var(--sit-resalte)',
    grosor: 1,
    nombre: 'var(--sit-proxima-nombre)',
    etiqueta: {
      texto: 'Próximo',
      ancho: 52,
      fondo: 'none',
      tinta: 'var(--sit-proxima-nombre)',
      contorno: 'var(--sit-proxima-pastilla)',
    },
  },
  [SITUACION.LEJANA]: {
    fondo: 'var(--sit-lejana-fondo)',
    borde: 'var(--sit-lejana-borde)',
    fuerte: 'var(--sit-resalte)',
    grosor: 1,
    nombre: 'var(--sit-lejana-nombre)',
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
