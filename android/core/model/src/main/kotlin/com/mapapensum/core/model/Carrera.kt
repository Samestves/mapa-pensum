package com.mapapensum.core.model

/** Un pensum completo, tal como viene de los JSON que comparte con la web. */
data class Carrera(
    val slug: String,
    val nombre: String,
    val nombreCorto: String,
    val color: ColorCarrera,
    val semestres: List<Semestre>,
    /** Obligatorias y casillas de electiva (las que tienen [Asignatura.esHueco]). */
    val asignaturas: List<Asignatura>,
    val gruposElectivas: List<GrupoElectivas>,
) {
    /** Las que cuentan para el avance: las casillas de electiva no son materias. */
    val obligatorias: List<Asignatura> get() = asignaturas.filterNot { it.esHueco }
}

/** Colores ARGB (0xFFRRGGBB) de la carrera para cada tema. */
data class ColorCarrera(val oscuro: Long, val claro: Long)

data class Semestre(val numero: Int, val cantidad: Int, val uc: Int?)

data class Asignatura(
    val codigo: String,
    val nombre: String,
    /** Null en las electivas de un grupo: no tienen semestre fijo. */
    val semestre: Int?,
    val uc: Int?,
    val prerrequisitos: List<String>,
    /** Casilla de electiva: un hueco a llenar, no una materia concreta. */
    val esHueco: Boolean = false,
    /** Clave del grupo de electivas al que pertenece, si alguno. */
    val grupo: String? = null,
)

data class GrupoElectivas(
    val clave: String,
    val titulo: String,
    val asignaturas: List<Asignatura>,
)
