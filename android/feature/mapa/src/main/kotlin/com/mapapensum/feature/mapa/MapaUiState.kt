package com.mapapensum.feature.mapa

import com.mapapensum.core.domain.caso.MapaCarrera

sealed interface MapaUiState {
    data object Cargando : MapaUiState
    data class Listo(val mapa: MapaCarrera) : MapaUiState
}
