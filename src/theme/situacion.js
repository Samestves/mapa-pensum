import { SITUACION } from '../layout/situacion.js'

/**
 * Como se ve cada situacion. Una sola tabla para las tarjetas, las casillas y
 * las electivas: si cada una decidiera su propio verde, a la tercera ya no
 * serian el mismo verde.
 *
 * Todo apunta a variables --sit-* de estilos/tema.css, que cada tema define con sus
 * propios valores: una mezcla que funciona en oscuro falla en claro, donde un
 * 9 % de verde sobre blanco es blanco.
 *
 * `borde` es el de reposo y `fuerte` el que toma al señalarla o seleccionarla.
 * `icono` es el color del icono de estado (ver IconoSituacion), que es lo que
 * dice el estado en la tarjeta del mapa. `marca` es la palabra y su color,
 * para donde el estado se escribe: la ficha. La lejana no tiene palabra
 * propia -la ficha dice «Bloqueada»- y su icono es el unico rojo.
 * `sombra` es la sombra de papel de la tarjeta: la bloqueada no la lleva,
 * porque esta hundida en el lienzo y no apoyada encima.
 */
export const ASPECTO = {
  [SITUACION.HECHA]: {
    fondo: 'var(--sit-hecha-fondo)',
    borde: 'var(--sit-hecha-borde)',
    fuerte: 'var(--estado-aprobada)',
    grosor: 1,
    sombra: 'var(--sombra-tarjeta)',
    nombre: 'var(--sit-hecha-nombre)',
    icono: 'var(--estado-aprobada)',
    marca: { color: 'var(--estado-aprobada)', texto: 'Aprobada' },
  },
  [SITUACION.CURSANDO]: {
    fondo: 'var(--sit-cursando-fondo)',
    borde: 'var(--sit-cursando-borde)',
    fuerte: 'var(--estado-cursando)',
    grosor: 1.25,
    sombra: 'var(--sombra-tarjeta)',
    nombre: 'var(--tinta)',
    icono: 'var(--sit-cursando-texto)',
    marca: { color: 'var(--sit-cursando-texto)', texto: 'Cursando' },
  },
  /* La inscribible es la tarjeta mas clara del mapa y la unica con un icono
     azul: el candado abierto. La palabra es DISPONIBLE, la misma de la lista. */
  [SITUACION.INSCRIBIBLE]: {
    fondo: 'var(--sit-inscribible-fondo)',
    borde: 'var(--sit-inscribible-borde)',
    fuerte: 'var(--sit-inscribible-luz)',
    grosor: 1.25,
    sombra: 'var(--sombra-tarjeta)',
    nombre: 'var(--tinta)',
    icono: 'var(--sit-inscribible-luz)',
    marca: { color: 'var(--sit-inscribible-luz)', texto: 'Disponible' },
  },
  [SITUACION.PROXIMA]: {
    fondo: 'var(--sit-proxima-fondo)',
    borde: 'var(--sit-proxima-borde)',
    fuerte: 'var(--sit-resalte)',
    grosor: 1,
    sombra: 'var(--sombra-tarjeta)',
    nombre: 'var(--sit-proxima-nombre)',
    icono: 'var(--sit-proxima-nombre)',
    marca: { color: 'var(--sit-proxima-nombre)', texto: 'Próxima' },
  },
  [SITUACION.LEJANA]: {
    fondo: 'var(--sit-lejana-fondo)',
    borde: 'var(--sit-lejana-borde)',
    fuerte: 'var(--sit-resalte)',
    grosor: 1,
    sombra: 'var(--sit-lejana-sombra)',
    nombre: 'var(--sit-lejana-nombre)',
    icono: 'var(--estado-rojo)',
    marca: { color: 'var(--sit-codigo)', texto: null },
  },
}

/* El id del <symbol> del icono de cada situacion en el SVG del mapa: lo
   define DefsGrafo y lo usa cada tarjeta con un <use>. */
export const idIcono = (situacion) => `icono-${situacion}`

export const ETIQUETA_SITUACION = {
  [SITUACION.HECHA]: 'Aprobada',
  [SITUACION.CURSANDO]: 'Cursando',
  [SITUACION.INSCRIBIBLE]: 'Puedes inscribirla',
  [SITUACION.PROXIMA]: 'Se abre el próximo semestre',
  [SITUACION.LEJANA]: 'Aún lejos',
}
