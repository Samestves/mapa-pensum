package com.mapapensum.core.domain.caso

import com.mapapensum.core.domain.repositorio.PreferenciasRepositorio

/** Recuerda la carrera abierta para ofrecerla en Continuar la proxima vez. */
class AbrirCarrera(private val preferencias: PreferenciasRepositorio) {
    suspend operator fun invoke(slug: String) {
        preferencias.recordarCarrera(slug)
    }
}
