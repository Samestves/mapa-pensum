package com.mapapensum.feature.mapa

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.wrapContentSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.GraphicsLayerScope
import androidx.compose.ui.graphics.TransformOrigin
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.drawText
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.mapapensum.core.designsystem.Colores
import com.mapapensum.core.domain.caso.MapaCarrera
import com.mapapensum.core.model.Estado

private const val RADIO_NODO = 14f
private const val GROSOR_ARISTA = 1.5f

private val TamanoNodo = Size(MedidasMapa.ANCHO_NODO, MedidasMapa.ALTO_NODO)
private val EsquinaNodo = CornerRadius(RADIO_NODO)
private val TrazoArista = Stroke(width = GROSOR_ARISTA)

/**
 * El mapa entero en UN solo Canvas. Mover o hacer zoom solo cambia la transformacion de su capa
 * (`graphicsLayer` lee la camara dentro de su lambda), asi que el dibujo no se recompone ni se
 * vuelve a grabar mientras el dedo se desliza: lo que mantiene fluido el mapa en gama baja.
 * Solo se vuelve a dibujar cuando cambian los estados de las materias.
 */
@Composable
internal fun LienzoMapa(
    mapa: MapaCarrera,
    margenSuperior: Dp,
    alTocar: (String) -> Unit,
    alMantener: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val carrera = mapa.carrera
    val escena = rememberEscenaMapa(carrera)
    val camara = rememberCamara(carrera.slug, margenSuperior)
    val colorCarrera = remember(carrera.color) { Color(carrera.color.oscuro) }

    Box(modifier.fillMaxSize().gestosDelMapa(escena, camara, alTocar, alMantener)) {
        Canvas(
            // Sin limite de tamano: el mapa es mas grande que la pantalla y la camara lo recorre.
            Modifier
                .wrapContentSize(Alignment.TopStart, unbounded = true)
                .size(escena.distribucion.ancho.dp, escena.distribucion.alto.dp)
                .graphicsLayer { aplicarCamara(camara) },
        ) {
            dibujarEscena(escena, mapa.estados, colorCarrera)
        }
    }
}

/** Origen arriba a la izquierda: pantalla = mundo * escala + desplazamiento. */
private fun GraphicsLayerScope.aplicarCamara(camara: Camara) {
    transformOrigin = TransformOrigin(0f, 0f)
    scaleX = camara.escala
    scaleY = camara.escala
    translationX = camara.desplazamientoX
    translationY = camara.desplazamientoY
}

/** Las medidas del mundo estan en dp: se escala por la densidad una sola vez, aqui. */
private fun DrawScope.dibujarEscena(escena: EscenaMapa, estados: Map<String, Estado>, colorCarrera: Color) {
    scale(scale = density, pivot = Offset.Zero) {
        escena.cabeceras.forEach { dibujarTexto(it) }
        dibujarAristas(escena, estados, colorCarrera)
        dibujarNodos(escena, estados, colorCarrera)
    }
}

private fun DrawScope.dibujarAristas(escena: EscenaMapa, estados: Map<String, Estado>, colorCarrera: Color) {
    escena.aristas.forEach { arista ->
        val color = colorDeArista(estadoDe(estados, arista.hasta), colorCarrera)
        drawPath(arista.trazado, color, style = TrazoArista)
    }
}

private fun DrawScope.dibujarNodos(escena: EscenaMapa, estados: Map<String, Estado>, colorCarrera: Color) {
    escena.nodos.forEach { nodo ->
        dibujarNodo(nodo, estiloDe(nodo, estados, colorCarrera))
    }
}

private fun estiloDe(nodo: NodoPintable, estados: Map<String, Estado>, colorCarrera: Color): EstiloNodo =
    if (nodo.esHueco) estiloDeHueco() else estiloDeMateria(estadoDe(estados, nodo.codigo), colorCarrera)

private fun DrawScope.dibujarNodo(nodo: NodoPintable, estilo: EstiloNodo) {
    // Base opaca: los rellenos son translucidos y, sin ella, se verian las aristas que pasan por detras.
    drawRoundRect(color = Colores.Fondo, topLeft = nodo.origen, size = TamanoNodo, cornerRadius = EsquinaNodo)
    drawRoundRect(color = estilo.relleno, topLeft = nodo.origen, size = TamanoNodo, cornerRadius = EsquinaNodo)
    drawRoundRect(
        color = estilo.borde,
        topLeft = nodo.origen,
        size = TamanoNodo,
        cornerRadius = EsquinaNodo,
        style = estilo.trazoBorde,
    )
    dibujarTexto(nodo.etiqueta)
    nodo.creditos?.let { dibujarTexto(it) }
    dibujarTexto(nodo.nombre, estilo.colorNombre)
}

/**
 * Solo pinta el texto ya medido. El color se pasa al dibujar (no al medir) para que cambiar
 * el estado de una materia no obligue a medir otra vez.
 */
private fun DrawScope.dibujarTexto(texto: TextoUbicado, color: Color = Color.Unspecified) {
    drawText(texto.medida, color = color, topLeft = texto.posicion)
}

/** Una materia sin dato de estado no se puede cursar todavia: es lo mas prudente. */
private fun estadoDe(estados: Map<String, Estado>, codigo: String): Estado = estados[codigo] ?: Estado.BLOQUEADA
