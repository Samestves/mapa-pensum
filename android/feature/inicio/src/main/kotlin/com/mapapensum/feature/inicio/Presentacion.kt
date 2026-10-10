package com.mapapensum.feature.inicio

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.mapapensum.core.designsystem.Colores
import com.mapapensum.core.designsystem.Textos

private val SEPARACION_SUPERIOR = 14.dp
private val SANGRIA = 4.dp
private const val LINEAS_MAXIMAS = 2

private const val FRASE = "Tu carrera como un mapa: qué abre cada materia y cuánto te falta."

/** Lo que se ve la primera vez, cuando todavia no hay una carrera que continuar. */
@Composable
internal fun Presentacion(modifier: Modifier = Modifier) {
    Text(
        text = FRASE,
        style = Textos.CuerpoSuave,
        color = Colores.TintaSecundaria,
        maxLines = LINEAS_MAXIMAS,
        overflow = TextOverflow.Ellipsis,
        modifier = modifier.padding(start = SANGRIA, end = SANGRIA, top = SEPARACION_SUPERIOR),
    )
}
