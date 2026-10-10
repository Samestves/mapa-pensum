package com.mapapensum.core.designsystem

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

private val TamanoPuntoPorDefecto = 10.dp

/** Marca el color de una carrera junto a su nombre. */
@Composable
fun PuntoColor(
    color: Color,
    modifier: Modifier = Modifier,
    tamano: Dp = TamanoPuntoPorDefecto,
) {
    Box(modifier = modifier.size(tamano).background(color, CircleShape))
}
