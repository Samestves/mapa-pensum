package com.mapapensum.feature.inicio

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.mapapensum.core.designsystem.Colores
import com.mapapensum.core.domain.caso.Inicio

private val MARGEN_LATERAL = 16.dp
private val MARGEN_INFERIOR = 32.dp
private val SEPARACION_PRIMER_GRUPO = 26.dp
private val SEPARACION_ENTRE_GRUPOS = 22.dp

private const val CLAVE_CABECERA = "cabecera"
private const val CLAVE_CONTINUAR = "continuar"
private const val CLAVE_PRESENTACION = "presentacion"

/** Pantalla sin estado propio: pinta lo que recibe y avisa con [alAbrirCarrera]. */
@Composable
fun InicioPantalla(estado: InicioUiState, alAbrirCarrera: (String) -> Unit) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            // El fondo va antes del padding para que el color llegue bajo las barras del sistema.
            .background(Colores.Fondo)
            .windowInsetsPadding(WindowInsets.safeDrawing),
        contentPadding = PaddingValues(start = MARGEN_LATERAL, end = MARGEN_LATERAL, bottom = MARGEN_INFERIOR),
    ) {
        item(key = CLAVE_CABECERA) { Cabecera() }
        if (estado is InicioUiState.Listo) {
            contenidoDe(estado.inicio, alAbrirCarrera)
        }
    }
}

private fun LazyListScope.contenidoDe(inicio: Inicio, alAbrirCarrera: (String) -> Unit) {
    val continuar = inicio.continuar
    if (continuar != null) {
        item(key = CLAVE_CONTINUAR) { TarjetaContinuar(continuar, alAbrirCarrera) }
    } else {
        item(key = CLAVE_PRESENTACION) { Presentacion() }
    }
    inicio.grupos.forEachIndexed { indice, grupo ->
        grupoCarreras(grupo, separacionSuperior = separacionDelGrupo(indice), alAbrirCarrera = alAbrirCarrera)
    }
}

private fun separacionDelGrupo(indice: Int): Dp =
    if (indice == 0) SEPARACION_PRIMER_GRUPO else SEPARACION_ENTRE_GRUPOS
