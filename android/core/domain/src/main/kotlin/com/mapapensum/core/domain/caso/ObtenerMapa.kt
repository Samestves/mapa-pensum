package com.mapapensum.core.domain.caso

import com.mapapensum.core.domain.repositorio.CatalogoRepositorio
import com.mapapensum.core.domain.repositorio.MarcasRepositorio
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.emitAll
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.map

/** Arma el mapa de una carrera y lo recalcula cada vez que cambian las marcas. */
class ObtenerMapa(
    private val catalogo: CatalogoRepositorio,
    private val marcas: MarcasRepositorio,
) {
    operator fun invoke(slug: String): Flow<MapaCarrera> = flow {
        // El pensum no cambia: se carga una vez y solo las marcas se reobservan
        val carrera = catalogo.carrera(slug)
        emitAll(
            marcas.marcas(slug).map { marcasActuales ->
                val estados = ReglasAvance.estadosDe(carrera.asignaturas, marcasActuales)
                MapaCarrera(carrera, estados, ReglasAvance.progresoDe(carrera, estados))
            },
        )
    }
}
