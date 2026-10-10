package com.mapapensum.core.model

/** Lo unico que se guarda: lo que el estudiante marco. */
enum class Marca { APROBADA, CURSANDO }

/**
 * La situacion de una materia. APROBADA y CURSANDO salen de la [Marca];
 * DISPONIBLE y BLOQUEADA se deducen de los prerrequisitos y nunca se guardan.
 */
enum class Estado { APROBADA, CURSANDO, DISPONIBLE, BLOQUEADA }

/** El avance en obligatorias, ya contado. */
data class Progreso(
    /** 0..100, por UC si todas las obligatorias tienen UC; si no, por materias. */
    val porcentaje: Int,
    val aprobadas: Int,
    val total: Int,
    val cursando: Int,
    /** Obligatorias disponibles para inscribir ahora. */
    val porInscribir: Int,
)
