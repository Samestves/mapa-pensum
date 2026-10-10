package com.mapapensum.feature.mapa

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.text.TextLayoutResult
import androidx.compose.ui.text.TextMeasurer
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Constraints
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.sp
import com.mapapensum.core.designsystem.Textos
import com.mapapensum.core.model.Asignatura
import com.mapapensum.core.model.Carrera

private const val RELLENO_HORIZONTAL = 10f
private const val RELLENO_VERTICAL = 8f
private const val ESPACIO_ENTRE_TEXTOS = 4f
private const val ANCHO_TEXTO_NODO = MedidasMapa.ANCHO_NODO - 2 * RELLENO_HORIZONTAL
private const val LINEAS_NOMBRE = 2
private const val ETIQUETA_HUECO = "Electiva"

// El nombre usa el cuerpo suave pero mas pequeno: en 156 dp caben dos lineas legibles.
private val EstiloNombre = Textos.CuerpoSuave.copy(fontSize = 12.sp, lineHeight = 15.sp)

/**
 * Las medidas se toman con densidad 1 y sin escala de fuente: el lienzo dibuja en unidades de mundo (dp)
 * y la densidad se aplica una sola vez al pintar. Asi el mapa es un diagrama de tamano fijo,
 * que no se desborda cuando el usuario agranda la fuente del sistema.
 */
private val DensidadDelMundo = Density(density = 1f, fontScale = 1f)

/** Un texto ya medido y la posicion (en el mundo) donde se dibuja. */
internal class TextoUbicado(val medida: TextLayoutResult, val posicion: Offset)

internal class NodoPintable(
    val codigo: String,
    val esHueco: Boolean,
    val origen: Offset,
    val etiqueta: TextoUbicado,
    val creditos: TextoUbicado?,
    val nombre: TextoUbicado,
)

internal class AristaPintable(val hasta: String, val trazado: Path)

/**
 * Todo lo que el lienzo necesita de una carrera y que no cambia al marcar materias:
 * geometria, curvas y textos ya medidos. Se calcula una vez por carrera, no por cuadro.
 */
internal class EscenaMapa(
    val distribucion: DistribucionMapa,
    val cabeceras: List<TextoUbicado>,
    val aristas: List<AristaPintable>,
    val nodos: List<NodoPintable>,
) {
    private val huecos: Set<String> = nodos.filter { it.esHueco }.mapTo(HashSet()) { it.codigo }

    /** Las casillas de electiva no se tocan: no son una materia que marcar. */
    fun materiaEn(x: Float, y: Float): String? = distribucion.nodoEn(x, y)?.takeUnless { it in huecos }

    companion object {
        fun crear(carrera: Carrera, medidor: TextMeasurer): EscenaMapa {
            val distribucion = DistribucionMapa.de(carrera)
            val asignaturaPorCodigo = carrera.asignaturas.associateBy { it.codigo }
            return EscenaMapa(
                distribucion = distribucion,
                cabeceras = distribucion.cabeceras.map { cabeceraPintable(it, medidor) },
                aristas = distribucion.aristas.map(::aristaPintable),
                nodos = distribucion.nodos.map { nodoPintable(it, asignaturaPorCodigo.getValue(it.codigo), medidor) },
            )
        }
    }
}

/**
 * La escena depende de [carrera] por igualdad (es una data class): si el flujo vuelve a emitir el mismo
 * pensum tras marcar una materia, no se vuelve a medir ningun texto.
 */
@Composable
internal fun rememberEscenaMapa(carrera: Carrera): EscenaMapa {
    val medidor = rememberTextMeasurer()
    return remember(carrera) { EscenaMapa.crear(carrera, medidor) }
}

private fun cabeceraPintable(cabecera: CabeceraMapa, medidor: TextMeasurer): TextoUbicado {
    val medida = medidor.medirEnMundo("SEMESTRE ${cabecera.numero.toString().padStart(2, '0')}", Textos.Etiqueta)
    val centradoVertical = cabecera.y + (MedidasMapa.ALTO_CABECERA - medida.size.height) / 2
    return TextoUbicado(medida, Offset(cabecera.x, centradoVertical))
}

private fun aristaPintable(arista: AristaMapa): AristaPintable {
    val trazado = Path().apply {
        moveTo(arista.inicio.x, arista.inicio.y)
        cubicTo(
            arista.controlInicio.x, arista.controlInicio.y,
            arista.controlFin.x, arista.controlFin.y,
            arista.fin.x, arista.fin.y,
        )
    }
    return AristaPintable(arista.hasta, trazado)
}

private fun nodoPintable(nodo: NodoMapa, asignatura: Asignatura, medidor: TextMeasurer): NodoPintable {
    val izquierda = nodo.x + RELLENO_HORIZONTAL
    val arriba = nodo.y + RELLENO_VERTICAL
    // El codigo de una casilla es un identificador interno: se muestra «Electiva» en su lugar.
    val etiqueta = medidor.medirEnMundo(if (asignatura.esHueco) ETIQUETA_HUECO else asignatura.codigo, Textos.Codigo)
    val creditos = asignatura.uc?.let { medidor.medirEnMundo("$it UC", Textos.Codigo) }
    val nombre = medidor.medirEnMundo(asignatura.nombre, EstiloNombre, ANCHO_TEXTO_NODO.toInt(), LINEAS_NOMBRE)
    return NodoPintable(
        codigo = nodo.codigo,
        esHueco = asignatura.esHueco,
        origen = Offset(nodo.x, nodo.y),
        etiqueta = TextoUbicado(etiqueta, Offset(izquierda, arriba)),
        creditos = creditos?.let {
            TextoUbicado(it, Offset(nodo.x + MedidasMapa.ANCHO_NODO - RELLENO_HORIZONTAL - it.size.width, arriba))
        },
        nombre = TextoUbicado(nombre, Offset(izquierda, arriba + etiqueta.size.height + ESPACIO_ENTRE_TEXTOS)),
    )
}

private fun TextMeasurer.medirEnMundo(
    texto: String,
    estilo: TextStyle,
    anchoMaximo: Int = Constraints.Infinity,
    lineasMaximas: Int = 1,
): TextLayoutResult = measure(
    text = texto,
    style = estilo,
    overflow = TextOverflow.Ellipsis,
    maxLines = lineasMaximas,
    constraints = Constraints(maxWidth = anchoMaximo),
    density = DensidadDelMundo,
)
