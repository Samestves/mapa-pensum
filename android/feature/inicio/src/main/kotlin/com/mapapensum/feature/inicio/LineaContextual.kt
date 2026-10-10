package com.mapapensum.feature.inicio

import com.mapapensum.core.model.Progreso

private const val PORCENTAJE_COMPLETO = 100

/**
 * Lo mas util de saber al volver: que sigue. Cuando no queda nada por inscribir,
 * distingue entre haber terminado la carrera y estar esperando (por ejemplo, cursando).
 */
internal fun lineaContextual(progreso: Progreso): String = when {
    progreso.porInscribir == 1 -> "1 materia por inscribir"
    progreso.porInscribir > 1 -> "${progreso.porInscribir} materias por inscribir"
    progreso.porcentaje >= PORCENTAJE_COMPLETO -> "Carrera completa"
    else -> "Nada por inscribir ahora"
}
