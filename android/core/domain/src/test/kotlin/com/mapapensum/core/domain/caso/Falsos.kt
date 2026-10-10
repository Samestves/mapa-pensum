package com.mapapensum.core.domain.caso

import com.mapapensum.core.domain.repositorio.CatalogoRepositorio
import com.mapapensum.core.domain.repositorio.MarcasRepositorio
import com.mapapensum.core.domain.repositorio.PreferenciasRepositorio
import com.mapapensum.core.model.Carrera
import com.mapapensum.core.model.CarreraResumen
import com.mapapensum.core.model.Marca
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.map

class CatalogoFalso(
    private val resumenes: List<CarreraResumen>,
    private val pensums: List<Carrera> = emptyList(),
) : CatalogoRepositorio {
    var pedidosDeCarreras = 0
        private set
    val pedidosPorSlug = mutableListOf<String>()

    override suspend fun carreras(): List<CarreraResumen> {
        pedidosDeCarreras++
        return resumenes
    }

    override suspend fun carrera(slug: String): Carrera {
        pedidosPorSlug += slug
        return pensums.first { it.slug == slug }
    }
}

class MarcasFalsas : MarcasRepositorio {
    private val porCarrera = MutableStateFlow<Map<String, Map<String, Marca>>>(emptyMap())
    val fijadas = mutableListOf<Triple<String, String, Marca?>>()

    override fun marcas(slug: String): Flow<Map<String, Marca>> = porCarrera.map { it[slug].orEmpty() }

    override suspend fun fijar(slug: String, codigo: String, marca: Marca?) {
        fijadas += Triple(slug, codigo, marca)
        porCarrera.value = porCarrera.value + (slug to actualizada(porCarrera.value[slug].orEmpty(), codigo, marca))
    }

    private fun actualizada(marcas: Map<String, Marca>, codigo: String, marca: Marca?) =
        if (marca == null) marcas - codigo else marcas + (codigo to marca)
}

class PreferenciasFalsas(reciente: String? = null) : PreferenciasRepositorio {
    private val recienteActual = MutableStateFlow(reciente)
    override val carreraReciente: Flow<String?> = recienteActual

    override suspend fun recordarCarrera(slug: String) {
        recienteActual.value = slug
    }
}
