package com.mapapensum.feature.inicio

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.mapapensum.core.domain.caso.Inicio
import com.mapapensum.core.domain.caso.ObtenerInicio
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn

/**
 * Mantiene vivo el flujo durante este margen tras salir de la pantalla: un giro de
 * pantalla no reinicia la carga, pero una app en segundo plano si deja de consultar.
 */
private const val ESPERA_SIN_SUSCRIPTORES_MS = 5_000L

class InicioViewModel(obtenerInicio: ObtenerInicio) : ViewModel() {

    val estado: StateFlow<InicioUiState> = obtenerInicio()
        .map<Inicio, InicioUiState> { InicioUiState.Listo(it) }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(ESPERA_SIN_SUSCRIPTORES_MS),
            initialValue = InicioUiState.Cargando,
        )

    companion object {
        fun fabrica(obtenerInicio: ObtenerInicio): ViewModelProvider.Factory = viewModelFactory {
            initializer { InicioViewModel(obtenerInicio) }
        }
    }
}
