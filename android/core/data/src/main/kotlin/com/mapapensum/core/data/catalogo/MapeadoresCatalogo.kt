package com.mapapensum.core.data.catalogo

import com.mapapensum.core.domain.caso.ReglasCatalogo
import com.mapapensum.core.model.Asignatura
import com.mapapensum.core.model.Carrera
import com.mapapensum.core.model.CarreraResumen
import com.mapapensum.core.model.ColorCarrera
import com.mapapensum.core.model.GrupoElectivas
import com.mapapensum.core.model.Semestre

// Archivo sin imports de Android a proposito: asi el mapeo se prueba en la JVM.

private const val OPACO: Long = 0xFF000000L
private const val LARGO_HEXADECIMAL = 6
private const val RADIX_HEXADECIMAL = 16
private val formatoColor = Regex("#[0-9a-fA-F]{$LARGO_HEXADECIMAL}")

/** "#6094ff" -> 0xFF6094FF. Falla fuerte: un color roto es un JSON roto, no un caso a tapar. */
internal fun String.aColorArgb(): Long {
    require(formatoColor.matches(this)) { "Color invalido: '$this' (se esperaba #rrggbb)" }
    return OPACO or removePrefix("#").toLong(RADIX_HEXADECIMAL)
}

internal fun ColorDto.aModelo(): ColorCarrera =
    ColorCarrera(oscuro = oscuro.aColorArgb(), claro = claro.aColorArgb())

internal fun ResumenCarreraDto.aModelo(): CarreraResumen = CarreraResumen(
    slug = slug,
    nombre = nombre,
    nombreCorto = nombreCorto,
    color = color.aModelo(),
    // El tipo no viene en el JSON: se deduce del slug con la misma regla del dominio.
    tipo = ReglasCatalogo.tipoDe(slug),
    semestres = semestres,
    asignaturas = asignaturas,
    silueta = silueta,
)

internal fun SemestreDto.aModelo(): Semestre = Semestre(numero = numero, cantidad = cantidad, uc = uc)

/**
 * [claveGrupoContenedor] cubre las electivas listadas dentro de un grupo: en el
 * JSON no repiten su grupo, pero el modelo si lo necesita.
 */
internal fun AsignaturaDto.aModelo(claveGrupoContenedor: String? = null): Asignatura = Asignatura(
    codigo = codigo,
    nombre = nombre,
    semestre = semestre,
    uc = uc,
    prerrequisitos = prerrequisitos,
    esHueco = esHueco,
    grupo = grupo ?: claveGrupoContenedor,
)

internal fun GrupoDto.aModelo(): GrupoElectivas = GrupoElectivas(
    clave = clave,
    titulo = titulo,
    asignaturas = asignaturas.map { it.aModelo(claveGrupoContenedor = clave) },
)

internal fun CarreraDto.aModelo(): Carrera = Carrera(
    slug = slug,
    nombre = nombre,
    nombreCorto = nombreCorto,
    color = color.aModelo(),
    semestres = semestres.map { it.aModelo() },
    asignaturas = asignaturas.map { it.aModelo() },
    gruposElectivas = grupos.map { it.aModelo() },
)
