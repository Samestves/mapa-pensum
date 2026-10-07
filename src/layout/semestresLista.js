import { ESTADO } from '../data/estados.js'
import { SITUACION, situacionDe } from './situacion.js'

/**
 * Los semestres de la lista: sus materias, sus huecos de electiva y cuanto
 * llevan.
 *
 * Cuanto lleva un semestre sale de su casilla (ver marcasDeSemestres), que
 * cuenta tambien sus electivas, elegidas o no. Es la misma cuenta de la
 * cabecera del mapa: contando aqui solo las obligatorias, un semestre con la
 * electiva sin elegir salia "Completo" en la lista y al 83 % en el mapa.
 */
export function semestresDeLista(columnas, nodos, estados, marcasSemestre) {
  return columnas.map((columna) => {
    const todas = nodos.filter((n) => n.semestre === columna.semestre)
    const materias = todas.filter((n) => !n.esHueco)
    const situaciones = materias.map((m) => situacionDe(m.codigo, m.prerrequisitos, estados))
    const cuenta = marcasSemestre.get(columna.semestre)
    return {
      numero: columna.semestre,
      materias,
      huecos: todas.filter((n) => n.esHueco),
      situaciones,
      total: cuenta?.total ?? materias.length,
      hechas: cuenta?.hechas ?? situaciones.filter((s) => s === SITUACION.HECHA).length,
      cursando: cuenta?.cursando ?? situaciones.filter((s) => s === SITUACION.CURSANDO).length,
    }
  })
}

/** El semestre en que vas: el primero que aun no esta completo */
export const semestreActual = (semestres) => semestres.find((s) => s.hechas < s.total)?.numero

/** Los grupos de electivas con sus opciones y las que ya son tuyas */
export function seccionesDeGrupos(gruposElectivas, electivas, avanceGrupos, estados) {
  return gruposElectivas.map((g) => {
    const items = electivas.filter((e) => e.grupo === g.clave)
    const marcadas = items.filter(
      (e) => estados[e.codigo] === ESTADO.APROBADA || estados[e.codigo] === ESTADO.CURSANDO,
    )
    return { ...g, avance: avanceGrupos[g.clave], items, marcadas }
  })
}

/** El nombre del punto del recorrido que une los semestres */
export const estadoDeSemestre = (s, actual) =>
  s.total > 0 && s.hechas === s.total
    ? 'completo'
    : s.numero === actual
      ? 'actual'
      : s.hechas || s.cursando
        ? 'empezado'
        : 'pendiente'
