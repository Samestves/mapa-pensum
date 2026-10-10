package com.mapapensum.feature.inicio

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.mapapensum.core.designsystem.BarraProgreso
import com.mapapensum.core.designsystem.Colores
import com.mapapensum.core.designsystem.Iconos
import com.mapapensum.core.designsystem.PuntoColor
import com.mapapensum.core.designsystem.Textos
import com.mapapensum.core.domain.caso.Continuar

private val RADIO = 22.dp
private val GROSOR_BORDE = 1.dp
private val SEPARACION_SUPERIOR = 22.dp
private val RELLENO_HORIZONTAL = 18.dp
private val RELLENO_SUPERIOR = 16.dp
private val RELLENO_INFERIOR = 18.dp
private val SEPARACION_ENCABEZADO = 10.dp
private val SEPARACION_PROGRESO = 14.dp
private val SEPARACION_LINEA = 12.dp
private val ESPACIO_NOMBRE = 10.dp
private val ESPACIO_PROGRESO = 12.dp
private val ESPACIO_LINEA = 8.dp
private val TAMANO_ICONO = 16.dp

private const val ROTULO = "CONTINUAR"

/**
 * Toda la tarjeta es el toque: un solo objetivo grande es mas facil de acertar
 * que un boton pequeno dentro de ella, y para TalkBack es un unico elemento.
 */
@Composable
internal fun TarjetaContinuar(
    continuar: Continuar,
    alAbrirCarrera: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val carrera = continuar.carrera
    val linea = lineaContextual(continuar.progreso)
    val forma = RoundedCornerShape(RADIO)

    Column(
        modifier = modifier
            .padding(top = SEPARACION_SUPERIOR)
            .fillMaxWidth()
            .clip(forma)
            .background(Colores.Superficie)
            .border(GROSOR_BORDE, Colores.Borde, forma)
            .clickable(role = Role.Button, onClickLabel = ACCION_ABRIR) { alAbrirCarrera(carrera.slug) }
            // Se lee como una frase en vez de cuatro fragmentos sueltos.
            .clearAndSetSemantics {
                contentDescription = "Continuar con ${carrera.nombre}. " +
                    "${continuar.progreso.porcentaje} por ciento completado. $linea"
            }
            .padding(
                start = RELLENO_HORIZONTAL,
                end = RELLENO_HORIZONTAL,
                top = RELLENO_SUPERIOR,
                bottom = RELLENO_INFERIOR,
            ),
    ) {
        val color = Color(carrera.color.oscuro)
        Text(text = ROTULO, style = Textos.Etiqueta)
        EncabezadoCarrera(nombre = carrera.nombreCorto, color = color)
        ProgresoCarrera(porcentaje = continuar.progreso.porcentaje, color = color)
        LineaConIcono(texto = linea)
    }
}

@Composable
private fun EncabezadoCarrera(nombre: String, color: Color) {
    Row(
        modifier = Modifier.padding(top = SEPARACION_ENCABEZADO),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(ESPACIO_NOMBRE),
    ) {
        PuntoColor(color = color)
        Text(
            text = nombre,
            style = Textos.Titulo,
            color = Colores.Tinta,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f),
        )
        Icon(
            imageVector = Iconos.Chevron,
            contentDescription = null,
            tint = Colores.TintaTenue,
            modifier = Modifier.size(TAMANO_ICONO),
        )
    }
}

@Composable
private fun ProgresoCarrera(porcentaje: Int, color: Color) {
    Row(
        modifier = Modifier.padding(top = SEPARACION_PROGRESO),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(ESPACIO_PROGRESO),
    ) {
        BarraProgreso(
            fraccion = fraccionDe(porcentaje),
            color = color,
            modifier = Modifier.weight(1f),
        )
        // Espacio duro: el simbolo % nunca se queda solo en la linea siguiente.
        Text(text = "$porcentaje %", style = Textos.Cifra)
    }
}

@Composable
private fun LineaConIcono(texto: String) {
    Row(
        modifier = Modifier.padding(top = SEPARACION_LINEA),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(ESPACIO_LINEA),
    ) {
        Icon(
            imageVector = Iconos.Lista,
            contentDescription = null,
            tint = Colores.TintaSecundaria,
            modifier = Modifier.size(TAMANO_ICONO),
        )
        Text(text = texto, style = Textos.CuerpoSuave)
    }
}

private const val PORCENTAJE_MAXIMO = 100f

private fun fraccionDe(porcentaje: Int): Float = (porcentaje / PORCENTAJE_MAXIMO).coerceIn(0f, 1f)
