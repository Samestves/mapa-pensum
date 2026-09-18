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
 * `marca` es el color del estado y la palabra de la esquina de la tarjeta.
 * La lejana no lleva palabra: es la mayoria del mapa y la que menos atencion
 * necesita, y rotularla llenaba el mapa de ruido.
 */
export const ASPECTO = {
  [SITUACION.HECHA]: {
    fondo: 'var(--sit-hecha-fondo)',
    borde: 'var(--sit-hecha-borde)',
    fuerte: 'var(--estado-aprobada)',
    grosor: 1,
    nombre: 'var(--sit-hecha-nombre)',
    icono: 'var(--sit-icono)',
    marca: { color: 'var(--estado-aprobada)', texto: 'Aprobada' },
  },
  [SITUACION.CURSANDO]: {
    fondo: 'var(--sit-cursando-fondo)',
    borde: 'var(--sit-cursando-borde)',
    fuerte: 'var(--estado-cursando)',
    grosor: 1.25,
    nombre: 'var(--tinta)',
    icono: 'var(--sit-icono)',
    marca: { color: 'var(--sit-cursando-texto)', texto: 'Cursando' },
  },
  /* La inscribible se distingue por el borde mas claro del mapa y la
     palabra DISPONIBLE, la misma que usa la lista. Antes decia «Inscribible»
     en el mapa y «Disponible» en la lista: dos nombres para lo mismo. */
  [SITUACION.INSCRIBIBLE]: {
    fondo: 'var(--sit-inscribible-fondo)',
    borde: 'var(--sit-inscribible-borde)',
    fuerte: 'var(--sit-inscribible-luz)',
    grosor: 1.25,
    nombre: 'var(--tinta)',
    icono: 'var(--sit-icono)',
    marca: { color: 'var(--sit-inscribible-luz)', texto: 'Disponible' },
  },
  [SITUACION.PROXIMA]: {
    fondo: 'var(--sit-proxima-fondo)',
    borde: 'var(--sit-proxima-borde)',
    fuerte: 'var(--sit-resalte)',
    grosor: 1,
    nombre: 'var(--sit-proxima-nombre)',
    icono: 'var(--sit-icono)',
    marca: { color: 'var(--sit-proxima-nombre)', texto: 'Próxima' },
  },
  [SITUACION.LEJANA]: {
    fondo: 'var(--sit-lejana-fondo)',
    borde: 'var(--sit-lejana-borde)',
    fuerte: 'var(--sit-resalte)',
    grosor: 1,
    nombre: 'var(--sit-lejana-nombre)',
    icono: 'var(--sit-icono-lejana)',
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
