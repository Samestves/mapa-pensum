package com.mapapensum.feature.inicio

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle

/**
 * Conecta el ViewModel con la pantalla. Se recolecta con el ciclo de vida para no
 * gastar bateria ni CPU mientras la app no esta visible.
 */
@Composable
fun InicioRuta(viewModel: InicioViewModel, alAbrirCarrera: (slug: String) -> Unit) {
    val estado by viewModel.estado.collectAsStateWithLifecycle()
    InicioPantalla(estado = estado, alAbrirCarrera = alAbrirCarrera)
}
