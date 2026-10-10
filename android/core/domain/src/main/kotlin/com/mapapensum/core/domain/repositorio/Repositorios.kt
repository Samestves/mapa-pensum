package com.mapapensum.core.domain.repositorio

import com.mapapensum.core.model.Carrera
import com.mapapensum.core.model.CarreraResumen
import com.mapapensum.core.model.Marca
import kotlinx.coroutines.flow.Flow

/** Los pensums. Son de solo lectura: vienen con la app. */
interface CatalogoRepositorio {
    suspend fun carreras(): List<CarreraResumen>
    suspend fun carrera(slug: String): Carrera
}

/** Lo que el estudiante marco en cada carrera, por codigo de materia. */
interface MarcasRepositorio {
    fun marcas(slug: String): Flow<Map<String, Marca>>

    /** [marca] null quita la marca. */
    suspend fun fijar(slug: String, codigo: String, marca: Marca?)
}

interface PreferenciasRepositorio {
    /** La ultima carrera que abrio el estudiante; null si nunca abrio una. */
    val carreraReciente: Flow<String?>
    suspend fun recordarCarrera(slug: String)
}
