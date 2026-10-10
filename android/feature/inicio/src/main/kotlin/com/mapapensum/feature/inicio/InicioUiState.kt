package com.mapapensum.feature.inicio

import com.mapapensum.core.domain.caso.Inicio

/** Lo que la pantalla de inicio puede estar mostrando. */
sealed interface InicioUiState {
    /** Aun no llega el primer valor: se pinta la cabecera sola, sin parpadeos de contenido. */
    data object Cargando : InicioUiState

    data class Listo(val inicio: Inicio) : InicioUiState
}
