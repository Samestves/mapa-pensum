package com.mapapensum.core.domain.caso

import com.mapapensum.core.model.Asignatura
import com.mapapensum.core.model.Carrera
import com.mapapensum.core.model.CarreraResumen
import com.mapapensum.core.model.ColorCarrera
import com.mapapensum.core.model.Semestre
import com.mapapensum.core.model.TipoCarrera

private val colorCualquiera = ColorCarrera(oscuro = 0xFF3FCB74, claro = 0xFF1B7F43)

fun asignatura(
    codigo: String,
    uc: Int? = 3,
    prerrequisitos: List<String> = emptyList(),
    esHueco: Boolean = false,
) = Asignatura(
    codigo = codigo,
    nombre = "Materia $codigo",
    semestre = 1,
    uc = uc,
    prerrequisitos = prerrequisitos,
    esHueco = esHueco,
)

fun carrera(slug: String = "ingenieria-prueba", asignaturas: List<Asignatura>) = Carrera(
    slug = slug,
    nombre = "Carrera $slug",
    nombreCorto = slug,
    color = colorCualquiera,
    semestres = listOf(Semestre(numero = 1, cantidad = asignaturas.size, uc = null)),
    asignaturas = asignaturas,
    gruposElectivas = emptyList(),
)

fun resumen(slug: String, nombreCorto: String = slug) = CarreraResumen(
    slug = slug,
    nombre = nombreCorto,
    nombreCorto = nombreCorto,
    color = colorCualquiera,
    tipo = ReglasCatalogo.tipoDe(slug),
    semestres = 1,
    asignaturas = 1,
    silueta = listOf(1),
)
