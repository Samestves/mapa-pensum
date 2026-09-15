import { SITUACION } from '../layout/situacion'

/**
 * Como se ve cada situacion. Una sola tabla para las tarjetas, las casillas y
 * las electivas: si cada una decidiera su propio verde, a la tercera ya no
 * serian el mismo verde.
 *
 * Todo apunta a variables --sit-* de index.css, que cada tema define con sus
 * propios valores: una mezcla que funciona en oscuro falla en claro, donde un
 * 9 % de verde sobre blanco es blanco.
 *
 * `borde` es el de reposo y `fuerte` el que toma al señalarla o seleccionarla.
 * `marca` es el icono de estado de la esquina y la palabra que lo acompaña:
 * la aprobada y la lejana no llevan palabra, porque un check y un candado se
 * explican solos y son las dos que menos atencion necesitan.
 */
export const ASPECTO = {
  [SITUACION.HECHA]: {
    fondo: 'var(--sit-hecha-fondo)',
    borde: 'var(--sit-hecha-borde)',
    fuerte: 'var(--estado-aprobada)',
    grosor: 1,
    nombre: 'var(--sit-hecha-nombre)',
    marca: { color: 'var(--estado-aprobada)', texto: null },
  },
  [SITUACION.CURSANDO]: {
    fondo: 'var(--sit-cursando-fondo)',
    borde: 'var(--sit-cursando-borde)',
    fuerte: 'var(--estado-cursando)',
    grosor: 1.25,
    nombre: 'var(--tinta)',
    marca: { color: 'var(--sit-cursando-texto)', texto: 'Cursando' },
  },
  /* La inscribible lleva el filo de luz de la marca -el mismo borde que
     tienen la cajita del logo y el aviso de instalar- y una luz fria que
     recorre su contorno. Ver CaraTarjeta. */
  [SITUACION.INSCRIBIBLE]: {
    fondo: 'var(--sit-inscribible-fondo)',
    borde: 'var(--sit-inscribible-borde)',
    fuerte: 'var(--sit-inscribible-luz)',
    grosor: 1.25,
    nombre: 'var(--tinta)',
    brilla: true,
    marca: { color: 'var(--sit-inscribible-luz)', texto: 'Inscribible' },
  },
  [SITUACION.PROXIMA]: {
    fondo: 'var(--sit-proxima-fondo)',
    borde: 'var(--sit-proxima-borde)',
    fuerte: 'var(--sit-resalte)',
    grosor: 1,
    nombre: 'var(--sit-proxima-nombre)',
    marca: { color: 'var(--sit-proxima-nombre)', texto: 'Próximo' },
  },
  [SITUACION.LEJANA]: {
    fondo: 'var(--sit-lejana-fondo)',
    borde: 'var(--sit-lejana-borde)',
    fuerte: 'var(--sit-resalte)',
    grosor: 1,
    nombre: 'var(--sit-lejana-nombre)',
    marca: { color: 'var(--sit-codigo)', texto: null },
  },
}

export const ETIQUETA_SITUACION = {
  [SITUACION.HECHA]: 'Aprobada',
  [SITUACION.CURSANDO]: 'Cursando',
  [SITUACION.INSCRIBIBLE]: 'Puedes inscribirla',
  [SITUACION.PROXIMA]: 'Se abre el próximo semestre',
  [SITUACION.LEJANA]: 'Aún lejos',
}
