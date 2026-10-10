package com.mapapensum.feature.mapa

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle

/** Conecta el [MapaViewModel] con la pantalla sin estado. */
@Composable
fun MapaRuta(viewModel: MapaViewModel, alVolver: () -> Unit) {
    val estado by viewModel.estado.collectAsStateWithLifecycle()
    MapaPantalla(
        estado = estado,
        alTocar = viewModel::alTocar,
        alMantener = viewModel::alMantener,
        alVolver = alVolver,
    )
}
