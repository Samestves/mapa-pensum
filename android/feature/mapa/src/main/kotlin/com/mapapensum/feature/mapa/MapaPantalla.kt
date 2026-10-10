package com.mapapensum.feature.mapa

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import com.mapapensum.core.designsystem.Colores
import com.mapapensum.core.domain.caso.MapaCarrera

/** El mapa de una carrera, sin estado propio: pinta lo que recibe y avisa de lo que pasa. */
@Composable
fun MapaPantalla(
    estado: MapaUiState,
    alTocar: (codigo: String) -> Unit,
    alMantener: (codigo: String) -> Unit,
    alVolver: () -> Unit,
) {
    Box(Modifier.fillMaxSize().background(Colores.Fondo)) {
        when (estado) {
            MapaUiState.Cargando -> Unit
            is MapaUiState.Listo -> MapaListo(estado.mapa, alTocar, alMantener, alVolver)
        }
    }
}

@Composable
private fun MapaListo(
    mapa: MapaCarrera,
    alTocar: (String) -> Unit,
    alMantener: (String) -> Unit,
    alVolver: () -> Unit,
) {
    val colorCarrera = remember(mapa.carrera.color) { Color(mapa.carrera.color.oscuro) }
    // El mapa se abre justo debajo de la barra, no escondido detras de ella.
    val margenSuperior = WindowInsets.safeDrawing.asPaddingValues().calculateTopPadding() + AltoBarraMapa

    Box(Modifier.fillMaxSize()) {
        LienzoMapa(mapa, margenSuperior, alTocar, alMantener)
        BarraMapa(
            nombreCorto = mapa.carrera.nombreCorto,
            progreso = mapa.progreso,
            colorCarrera = colorCarrera,
            alVolver = alVolver,
            modifier = Modifier.align(Alignment.TopCenter),
        )
        PistaMapa(Modifier.align(Alignment.BottomCenter))
    }
}
