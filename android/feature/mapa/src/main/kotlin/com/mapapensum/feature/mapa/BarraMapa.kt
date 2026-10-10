package com.mapapensum.feature.mapa

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.WindowInsetsSides
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.only
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.mapapensum.core.designsystem.BarraProgreso
import com.mapapensum.core.designsystem.Colores
import com.mapapensum.core.designsystem.Iconos
import com.mapapensum.core.designsystem.Textos
import com.mapapensum.core.model.Progreso

internal val AltoBarraMapa = 56.dp

private val TamanoBotonAtras = 44.dp
private val AnchoBarraProgreso = 64.dp
private val SeparacionHorizontal = 8.dp
private const val OPACIDAD_FONDO = 0.92f
private const val PORCENTAJE_COMPLETO = 100f
private const val TEXTO_PISTA = "TOCA PARA APROBAR · MANTÉN PARA CURSANDO"

// Translucido pero sin blur: el desenfoque cuesta demasiado en gama baja.
private val FondoSobreMapa = Colores.Fondo.copy(alpha = OPACIDAD_FONDO)

/** Barra flotante sobre el mapa: volver, nombre de la carrera y avance. */
@Composable
internal fun BarraMapa(
    nombreCorto: String,
    progreso: Progreso,
    colorCarrera: Color,
    alVolver: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .absorberToques()
            .background(FondoSobreMapa)
            .windowInsetsPadding(WindowInsets.safeDrawing.only(WindowInsetsSides.Top + WindowInsetsSides.Horizontal))
            .height(AltoBarraMapa)
            .padding(horizontal = SeparacionHorizontal),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        BotonAtras(alVolver)
        Text(
            text = nombreCorto,
            style = Textos.Titulo,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f).padding(horizontal = SeparacionHorizontal),
        )
        AvanceDeCarrera(progreso, colorCarrera)
    }
}

/** Sin esto un toque sobre la barra atravesaria su fondo translucido y marcaria la materia que hay debajo. */
private fun Modifier.absorberToques() = pointerInput(Unit) {}

@Composable
private fun BotonAtras(alVolver: () -> Unit) {
    Box(
        modifier = Modifier
            .size(TamanoBotonAtras)
            .clip(CircleShape)
            .clickable(role = Role.Button, onClick = alVolver),
        contentAlignment = Alignment.Center,
    ) {
        Icon(imageVector = Iconos.Atras, contentDescription = "Volver", tint = Colores.Tinta)
    }
}

@Composable
private fun AvanceDeCarrera(progreso: Progreso, colorCarrera: Color) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Text(text = "${progreso.porcentaje} %", style = Textos.Cifra)
        Spacer(Modifier.width(SeparacionHorizontal))
        BarraProgreso(
            fraccion = progreso.porcentaje / PORCENTAJE_COMPLETO,
            color = colorCarrera,
            modifier = Modifier.width(AnchoBarraProgreso),
        )
        Spacer(Modifier.width(SeparacionHorizontal))
    }
}

/** Recuerda los dos gestos que no se ven: tocar y mantener. */
@Composable
internal fun PistaMapa(modifier: Modifier = Modifier) {
    Text(
        text = TEXTO_PISTA,
        style = Textos.Etiqueta,
        textAlign = TextAlign.Center,
        modifier = modifier
            .windowInsetsPadding(WindowInsets.safeDrawing.only(WindowInsetsSides.Bottom + WindowInsetsSides.Horizontal))
            .padding(horizontal = 16.dp, vertical = 12.dp)
            .absorberToques()
            .background(FondoSobreMapa, RoundedCornerShape(8.dp))
            .padding(horizontal = 12.dp, vertical = 6.dp),
    )
}
