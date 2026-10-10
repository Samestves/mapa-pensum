package com.mapapensum.core.designsystem

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

private val AlturaBarra = 4.dp

/**
 * La fraccion se acota porque `fillMaxWidth` falla fuera de 0..1 y un dato
 * inconsistente no debe tumbar la pantalla.
 */
@Composable
fun BarraProgreso(fraccion: Float, color: Color, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(AlturaBarra)
            .clip(CircleShape)
            .background(Colores.Borde),
    ) {
        Box(
            modifier = Modifier
                .fillMaxHeight()
                .fillMaxWidth(fraccion.coerceIn(0f, 1f))
                .background(color),
        )
    }
}
