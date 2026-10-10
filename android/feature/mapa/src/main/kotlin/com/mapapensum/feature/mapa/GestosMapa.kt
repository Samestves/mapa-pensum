package com.mapapensum.feature.mapa

import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalHapticFeedback

/**
 * Pan + pellizco mueven la camara; toque y toque largo actuan sobre la materia bajo el dedo.
 * Los gestos se leen en pantalla y se pasan al mundo con la camara, que es lo que cambia al moverse el mapa.
 */
@Composable
internal fun Modifier.gestosDelMapa(
    escena: EscenaMapa,
    camara: Camara,
    alTocar: (String) -> Unit,
    alMantener: (String) -> Unit,
): Modifier {
    // Los gestos no deben reiniciarse cuando cambian las lambdas: se lee siempre la mas reciente.
    val alTocarActual by rememberUpdatedState(alTocar)
    val alMantenerActual by rememberUpdatedState(alMantener)
    val respuestaHaptica = LocalHapticFeedback.current

    // El toque va primero (modificador exterior) para ver el evento ya consumido por el arrastre
    // y no disparar un toque falso al terminar de mover el mapa.
    return this
        .pointerInput(escena, camara) {
            detectTapGestures(
                onTap = { punto -> escena.materiaBajo(punto, camara, density)?.let { alTocarActual(it) } },
                onLongPress = { punto ->
                    escena.materiaBajo(punto, camara, density)?.let {
                        respuestaHaptica.performHapticFeedback(HapticFeedbackType.LongPress)
                        alMantenerActual(it)
                    }
                },
            )
        }
        .pointerInput(camara) {
            detectTransformGestures { centroide, desplazamiento, zoom, _ ->
                camara.transformar(centroide, desplazamiento, zoom)
            }
        }
}

private fun EscenaMapa.materiaBajo(pantalla: Offset, camara: Camara, densidad: Float): String? {
    val mundo = camara.aMundo(pantalla, densidad)
    return materiaEn(mundo.x, mundo.y)
}
