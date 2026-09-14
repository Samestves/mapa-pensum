import { ESTADO } from '../data/estados.js'

/**
 * Lo que una materia significa HOY para quien mira el mapa.
 *
 * Los estados de usePensum responden a otra pregunta: que marco el estudiante
 * y que se deduce de eso. Sirven para guardar y para contar, pero se quedan
 * cortos para leer el mapa, porque BLOQUEADA mete en el mismo saco dos cosas
 * muy distintas: la materia que te abre el semestre que viene si apruebas lo
 * que estas cursando, y la que queda a tres semestres. Para planificar la
 * inscripcion la primera es la mas importante del mapa y la segunda casi no
 * importa, y con BLOQUEADA se dibujaban igual.
 *
 * De ahi cinco situaciones, ordenadas de lo que ya quedo atras a lo que queda
 * lejos. Es solo lectura: no se guarda, no cuenta UC y no toca los estados.
 */
export const SITUACION = {
  HECHA: 'hecha',
  CURSANDO: 'cursando',
  INSCRIBIBLE: 'inscribible',
  PROXIMA: 'proxima',
  LEJANA: 'lejana',
}

/**
 * @param codigo          la materia
 * @param prerrequisitos  sus prelaciones directas
 * @param estados         el mapa de estados de usePensum
 */
export function situacionDe(codigo, prerrequisitos, estados) {
  const estado = estados[codigo]
  if (estado === ESTADO.APROBADA) return SITUACION.HECHA
  if (estado === ESTADO.CURSANDO) return SITUACION.CURSANDO
  if (estado === ESTADO.DISPONIBLE) return SITUACION.INSCRIBIBLE

  /* Bloqueada. Queda a un semestre si todo lo que le falta lo estas cursando
     ahora: al aprobarlo se abre. Basta con que falte UNA prelacion sin
     empezar para que ya no sea el semestre que viene.
     Una materia sin prelaciones nunca llega aqui -nace disponible-, pero el
     every() de una lista vacia daria true, asi que se descarta a mano. */
  const lista = prerrequisitos ?? []
  const seAbre =
    lista.length > 0 &&
    lista.every((p) => estados[p] === ESTADO.APROBADA || estados[p] === ESTADO.CURSANDO)
  return seAbre ? SITUACION.PROXIMA : SITUACION.LEJANA
}

/**
 * Lo que dice un cable, a partir de sus dos extremos.
 *
 *   frontera   de algo aprobado a algo que ya puedes inscribir: por aqui
 *              sigue tu carrera. Es el unico cable que se enciende de verdad.
 *   recorrido  de algo aprobado a algo aprobado o en curso: camino hecho.
 *   proxima    hacia lo que te abre el semestre que viene.
 *   lejana     todo lo demas. Se dibuja, pero apenas.
 */
export const TRAMO = {
  FRONTERA: 'frontera',
  RECORRIDO: 'recorrido',
  PROXIMA: 'proxima',
  LEJANA: 'lejana',
}

export function tramoDe(origen, destino) {
  if (origen === SITUACION.HECHA && destino === SITUACION.INSCRIBIBLE) return TRAMO.FRONTERA
  if (origen === SITUACION.HECHA && (destino === SITUACION.HECHA || destino === SITUACION.CURSANDO))
    return TRAMO.RECORRIDO
  if (
    (origen === SITUACION.HECHA || origen === SITUACION.CURSANDO) &&
    destino === SITUACION.PROXIMA
  )
    return TRAMO.PROXIMA
  return TRAMO.LEJANA
}
