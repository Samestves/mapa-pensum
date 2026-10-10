package com.mapapensum.feature.inicio

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.mapapensum.core.designsystem.Colores
import com.mapapensum.core.designsystem.Iconos
import com.mapapensum.core.designsystem.PuntoColor
import com.mapapensum.core.designsystem.Textos
import com.mapapensum.core.model.CarreraResumen

private val ALTO_FILA = 52.dp
private val RADIO_CAJA = 16.dp
private val RELLENO_HORIZONTAL = 16.dp
private val ESPACIO_ENTRE_ELEMENTOS = 14.dp
private val TAMANO_CHEVRON = 14.dp
private val GROSOR_SEPARADOR = 1.dp
// Justo donde empieza el texto: 16dp de relleno + 10dp del punto + 14dp de espacio.
private val INICIO_SEPARADOR = 40.dp

internal const val ACCION_ABRIR = "abrir el mapa de la carrera"

/**
 * Una fila de la caja redondeada del grupo. Cada fila es su propio item de la lista
 * (para poder usar `key` y reciclar), asi que es ella quien redondea las esquinas
 * de la caja si le toca ser la primera o la ultima.
 */
@Composable
internal fun FilaCarrera(
    carrera: CarreraResumen,
    esPrimera: Boolean,
    esUltima: Boolean,
    alAbrirCarrera: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val forma = remember(esPrimera, esUltima) { formaDeFila(esPrimera, esUltima) }
    val colorSeparador = Colores.Separador

    Row(
        modifier = modifier
            .fillMaxWidth()
            .height(ALTO_FILA)
            .clip(forma)
            .background(Colores.Superficie)
            .clickable(role = Role.Button, onClickLabel = ACCION_ABRIR) { alAbrirCarrera(carrera.slug) }
            .clearAndSetSemantics { contentDescription = carrera.nombre }
            .then(if (esUltima) Modifier else Modifier.separadorInferior(colorSeparador))
            .padding(horizontal = RELLENO_HORIZONTAL),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(ESPACIO_ENTRE_ELEMENTOS),
    ) {
        PuntoColor(color = Color(carrera.color.oscuro))
        Text(
            text = carrera.nombreCorto,
            style = Textos.Cuerpo,
            color = Colores.Tinta,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f),
        )
        Icon(
            imageVector = Iconos.Chevron,
            contentDescription = null,
            tint = Colores.TintaTenue,
            modifier = Modifier.size(TAMANO_CHEVRON),
        )
    }
}

private fun formaDeFila(esPrimera: Boolean, esUltima: Boolean): RoundedCornerShape {
    val arriba = if (esPrimera) RADIO_CAJA else 0.dp
    val abajo = if (esUltima) RADIO_CAJA else 0.dp
    return RoundedCornerShape(topStart = arriba, topEnd = arriba, bottomEnd = abajo, bottomStart = abajo)
}

/**
 * Linea fina que arranca bajo el texto, no bajo el punto, y llega al borde derecho.
 * Se dibuja en vez de usar un Divider para no anadir un nodo mas por fila.
 */
private fun Modifier.separadorInferior(color: Color): Modifier = drawBehind {
    val grosor = GROSOR_SEPARADOR.toPx()
    val y = size.height - grosor / 2
    drawLine(
        color = color,
        start = Offset(INICIO_SEPARADOR.toPx(), y),
        end = Offset(size.width, y),
        strokeWidth = grosor,
    )
}
