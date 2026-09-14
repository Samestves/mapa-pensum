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
 *   inscribible  es lo unico que brilla: fondo levantado, borde en tinta
 *                plena y la etiqueta en negativo. Es donde sigue tu carrera.
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
  [SITUACION.INSCRIBIBLE]: {
    fondo: 'var(--inscribible-fondo)',
    borde: 'var(--tinta)',
    opacidadBorde: 0.82,
    grosor: 1.5,
    nombre: 'var(--tinta)',
    etiqueta: { texto: 'Inscribible', ancho: 66, fondo: 'var(--tinta)', tinta: 'var(--nodo)' },
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
      contorno: true,
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

/** Color del segmento que cada materia ocupa en la barra de su semestre */
export const SEGMENTO = {
  [SITUACION.HECHA]: { color: 'var(--estado-aprobada)', opacidad: 1 },
  [SITUACION.CURSANDO]: { color: 'var(--estado-cursando)', opacidad: 1 },
  [SITUACION.INSCRIBIBLE]: { color: 'var(--tinta)', opacidad: 0.9 },
  [SITUACION.PROXIMA]: { color: 'var(--tinta)', opacidad: 0.3 },
  [SITUACION.LEJANA]: { color: 'var(--tinta)', opacidad: 0.12 },
}
