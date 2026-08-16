/**
 * En que situacion esta una materia para un estudiante.
 *
 * Solo las dos primeras se guardan: son lo que el estudiante marca. Las otras
 * dos se DEDUCEN de los prerrequisitos cada vez, y por eso no se persisten
 * -guardarlas seria tener dos verdades sobre lo mismo y que una envejeciera-.
 *
 * Vivia dentro de usePensum, que es un hook de React, y de ahi la importaban
 * tambien modulos que no tienen nada de React: planificador.js es logica pura
 * -reparte materias por semestres- y aun asi arrastraba React entero por una
 * constante de cuatro cadenas. Una capa pura no puede depender de la capa que
 * la usa; ademas de estar del reves, obligaba a montar React para poder
 * probarla.
 */
export const ESTADO = {
  APROBADA: 'aprobada',
  CURSANDO: 'cursando',
  DISPONIBLE: 'disponible',
  BLOQUEADA: 'bloqueada',
}
