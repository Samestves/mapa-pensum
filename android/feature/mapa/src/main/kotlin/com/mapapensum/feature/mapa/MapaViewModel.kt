package com.mapapensum.feature.mapa

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.mapapensum.core.domain.caso.AbrirCarrera
import com.mapapensum.core.domain.caso.Accion
import com.mapapensum.core.domain.caso.MapaCarrera
import com.mapapensum.core.domain.caso.MarcarMateria
import com.mapapensum.core.domain.caso.ObtenerMapa
import com.mapapensum.core.model.Estado
import com.mapapensum.core.model.Marca
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

/** Cuanto sigue vivo el flujo tras salir de pantalla: cubre girar el telefono sin releer el pensum. */
private const val ESPERA_SIN_SUSCRIPTORES_MS = 5_000L

class MapaViewModel(
    private val slug: String,
    obtenerMapa: ObtenerMapa,
    private val marcarMateria: MarcarMateria,
    abrirCarrera: AbrirCarrera,
) : ViewModel() {

    val estado: StateFlow<MapaUiState> = obtenerMapa(slug)
        .map<MapaCarrera, MapaUiState> { MapaUiState.Listo(it) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(ESPERA_SIN_SUSCRIPTORES_MS), MapaUiState.Cargando)

    init {
        // Abrir el mapa es lo que hace "reciente" a la carrera: asi el inicio la ofrece en Continuar.
        viewModelScope.launch { abrirCarrera(slug) }
    }

    fun alTocar(codigo: String) = aplicar(codigo, Accion.ALTERNAR_APROBADA)

    fun alMantener(codigo: String) = aplicar(codigo, Accion.ALTERNAR_CURSANDO)

    private fun aplicar(codigo: String, accion: Accion) {
        val marcaActual = marcaDe(codigo)
        viewModelScope.launch { marcarMateria(slug, codigo, marcaActual, accion) }
    }

    /** DISPONIBLE y BLOQUEADA se deducen: lo unico guardado es APROBADA o CURSANDO. */
    private fun marcaDe(codigo: String): Marca? {
        val listo = estado.value as? MapaUiState.Listo ?: return null
        return when (listo.mapa.estados[codigo]) {
            Estado.APROBADA -> Marca.APROBADA
            Estado.CURSANDO -> Marca.CURSANDO
            else -> null
        }
    }

    companion object {
        fun fabrica(
            slug: String,
            obtenerMapa: ObtenerMapa,
            marcarMateria: MarcarMateria,
            abrirCarrera: AbrirCarrera,
        ): ViewModelProvider.Factory = viewModelFactory {
            initializer { MapaViewModel(slug, obtenerMapa, marcarMateria, abrirCarrera) }
        }
    }
}
