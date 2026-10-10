package com.mapapensum.core.model

enum class TipoCarrera { INGENIERIA, LICENCIATURA }

/** Lo que el inicio necesita de una carrera sin cargar su pensum entero. */
data class CarreraResumen(
    val slug: String,
    val nombre: String,
    val nombreCorto: String,
    val color: ColorCarrera,
    val tipo: TipoCarrera,
    val semestres: Int,
    val asignaturas: Int,
    /** Obligatorias por semestre: dibuja el glifo de puntos de la carrera. */
    val silueta: List<Int>,
)
