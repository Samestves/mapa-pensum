package com.mapapensum.core.domain.caso

import com.mapapensum.core.model.Asignatura
import com.mapapensum.core.model.Carrera
import com.mapapensum.core.model.Estado
import com.mapapensum.core.model.Marca
import com.mapapensum.core.model.Progreso

/** Las reglas del avance, las mismas que la web (src/data/avance.js). */
object ReglasAvance {
    private const val PORCENTAJE_MAXIMO = 100.0

    /**
     * Estado de cada materia. Lo que el estudiante marco gana siempre; el resto
     * se deduce de los prerrequisitos.
     */
    fun estadosDe(asignaturas: List<Asignatura>, marcas: Map<String, Marca>): Map<String, Estado> =
        asignaturas.associate { it.codigo to estadoDe(it, marcas) }

    /**
     * Avance en obligatorias. Por UC cuando todas tienen creditos, porque es lo
     * que cuenta para graduarse; si falta alguno, por materias, que es lo unico
     * que se puede saber sin inventar un porcentaje.
     */
    fun progresoDe(carrera: Carrera, estados: Map<String, Estado>): Progreso {
        val obligatorias = carrera.obligatorias
        val aprobadas = obligatorias.filter { estados[it.codigo] == Estado.APROBADA }
        return Progreso(
            porcentaje = porcentajeDe(obligatorias, aprobadas),
            aprobadas = aprobadas.size,
            total = obligatorias.size,
            cursando = obligatorias.count { estados[it.codigo] == Estado.CURSANDO },
            porInscribir = obligatorias.count { estados[it.codigo] == Estado.DISPONIBLE },
        )
    }

    /** Un toque marca y otro desmarca; si ya estaba en la otra marca, la cambia. */
    fun siguienteMarca(actual: Marca?, accion: Accion): Marca? = when (accion) {
        Accion.ALTERNAR_APROBADA -> if (actual == Marca.APROBADA) null else Marca.APROBADA
        Accion.ALTERNAR_CURSANDO -> if (actual == Marca.CURSANDO) null else Marca.CURSANDO
    }

    private fun estadoDe(asignatura: Asignatura, marcas: Map<String, Marca>): Estado {
        marcas[asignatura.codigo]?.let { return it.aEstado() }
        // Sin prerrequisitos, all() da true: la materia nace disponible
        val libre = asignatura.prerrequisitos.all { marcas[it] == Marca.APROBADA }
        return if (libre) Estado.DISPONIBLE else Estado.BLOQUEADA
    }

    private fun Marca.aEstado(): Estado = when (this) {
        Marca.APROBADA -> Estado.APROBADA
        Marca.CURSANDO -> Estado.CURSANDO
    }

    private fun porcentajeDe(obligatorias: List<Asignatura>, aprobadas: List<Asignatura>): Int {
        val ucTotales = obligatorias.sumOf { it.uc ?: 0 }
        val todasTienenUc = obligatorias.all { it.uc != null }
        val fraccion = when {
            todasTienenUc && ucTotales > 0 -> aprobadas.sumOf { it.uc ?: 0 }.toDouble() / ucTotales
            obligatorias.isNotEmpty() -> aprobadas.size.toDouble() / obligatorias.size
            else -> 0.0
        }
        return Math.round(fraccion * PORCENTAJE_MAXIMO).toInt().coerceIn(0, PORCENTAJE_MAXIMO.toInt())
    }
}
