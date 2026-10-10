package com.mapapensum.core.domain.caso

import com.mapapensum.core.domain.repositorio.CatalogoRepositorio
import com.mapapensum.core.domain.repositorio.MarcasRepositorio
import com.mapapensum.core.domain.repositorio.PreferenciasRepositorio
import com.mapapensum.core.model.CarreraResumen
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.emitAll
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.map

/** Arma el inicio: la carrera reciente con su avance y el resto del catalogo. */
class ObtenerInicio(
    private val catalogo: CatalogoRepositorio,
    private val marcas: MarcasRepositorio,
    private val preferencias: PreferenciasRepositorio,
) {
    @OptIn(ExperimentalCoroutinesApi::class)
    operator fun invoke(): Flow<Inicio> = flow {
        // El catalogo no cambia mientras la app vive: se pide una sola vez
        val todas = catalogo.carreras()
        emitAll(preferencias.carreraReciente.flatMapLatest { slug -> inicioDe(todas, slug) })
    }

    private fun inicioDe(todas: List<CarreraResumen>, slug: String?): Flow<Inicio> {
        val reciente = todas.firstOrNull { it.slug == slug }
            ?: return flow { emit(Inicio(continuar = null, grupos = ReglasCatalogo.agrupar(todas, excepto = null))) }
        return continuarDe(reciente).map { Inicio(it, ReglasCatalogo.agrupar(todas, excepto = reciente.slug)) }
    }

    private fun continuarDe(reciente: CarreraResumen): Flow<Continuar> = flow {
        // El pensum se carga una vez por carrera; solo las marcas se reobservan
        val carrera = catalogo.carrera(reciente.slug)
        emitAll(
            marcas.marcas(reciente.slug).map { marcasActuales ->
                val estados = ReglasAvance.estadosDe(carrera.asignaturas, marcasActuales)
                Continuar(reciente, ReglasAvance.progresoDe(carrera, estados))
            },
        )
    }
}
