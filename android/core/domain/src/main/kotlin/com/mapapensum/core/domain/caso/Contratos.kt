package com.mapapensum.core.domain.caso

import com.mapapensum.core.model.Carrera
import com.mapapensum.core.model.CarreraResumen
import com.mapapensum.core.model.Estado
import com.mapapensum.core.model.Progreso
import com.mapapensum.core.model.TipoCarrera

/** Lo que pinta el inicio. */
data class Inicio(
    /** La carrera reciente con su avance; null la primera vez. */
    val continuar: Continuar?,
    /** Ingenierias y licenciaturas, cada una en orden alfabetico, sin la de [continuar]. */
    val grupos: List<GrupoCarreras>,
)

data class Continuar(val carrera: CarreraResumen, val progreso: Progreso)

data class GrupoCarreras(val tipo: TipoCarrera, val carreras: List<CarreraResumen>)

/** Lo que pinta el mapa de una carrera. */
data class MapaCarrera(
    val carrera: Carrera,
    /** Estado de cada asignatura de [Carrera.asignaturas], por codigo. */
    val estados: Map<String, Estado>,
    val progreso: Progreso,
)

/** Lo que hace un toque sobre una materia. */
enum class Accion {
    /** Toque: aprobada <-> sin marca (si estaba cursando, pasa a aprobada). */
    ALTERNAR_APROBADA,
    /** Toque largo: cursando <-> sin marca. */
    ALTERNAR_CURSANDO,
}
