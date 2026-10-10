package com.mapapensum.core.data.catalogo

import kotlinx.serialization.Serializable

/**
 * Una entrada de `carreras/indice.json`: lo justo para pintar el inicio sin
 * parsear el pensum completo de cada carrera.
 */
@Serializable
internal data class ResumenCarreraDto(
    val slug: String,
    val nombre: String,
    val nombreCorto: String,
    val color: ColorDto,
    val semestres: Int,
    val asignaturas: Int,
    val silueta: List<Int> = emptyList(),
)
