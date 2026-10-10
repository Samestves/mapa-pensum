package com.mapapensum.core.data.catalogo

import kotlinx.serialization.Serializable

/**
 * Forma exacta de `carreras/<slug>.json`. Solo declara lo que la app usa; el
 * resto de campos del archivo se ignora (ver `jsonDatos`).
 */
@Serializable
internal data class CarreraDto(
    val slug: String,
    val nombre: String,
    val nombreCorto: String,
    val color: ColorDto,
    val semestres: List<SemestreDto>,
    val asignaturas: List<AsignaturaDto>,
    val grupos: List<GrupoDto> = emptyList(),
)

@Serializable
internal data class ColorDto(
    /** Hexadecimal "#rrggbb". */
    val oscuro: String,
    val claro: String,
)

@Serializable
internal data class SemestreDto(
    val numero: Int,
    val cantidad: Int,
    val uc: Int? = null,
)

@Serializable
internal data class AsignaturaDto(
    val codigo: String,
    val nombre: String,
    /** Ausente en las electivas que viven dentro de un grupo. */
    val semestre: Int? = null,
    /** Hay materias sin creditos conocidos. */
    val uc: Int? = null,
    val prerrequisitos: List<String> = emptyList(),
    val esHueco: Boolean = false,
    val grupo: String? = null,
)

@Serializable
internal data class GrupoDto(
    val clave: String,
    val titulo: String,
    val asignaturas: List<AsignaturaDto> = emptyList(),
)
