package com.mapapensum.core.domain.caso

import com.mapapensum.core.model.CarreraResumen
import com.mapapensum.core.model.TipoCarrera
import java.text.Collator
import java.util.Locale

/** Como se ordena y agrupa el catalogo en el inicio. */
object ReglasCatalogo {
    private const val PREFIJO_INGENIERIA = "ingenieria-"

    // Collator y no compareTo: con el orden de caracteres, la A acentuada iria al final
    private val ordenAlfabetico: Comparator<Any> = Collator.getInstance(Locale("es"))

    /** El tipo no viene en el pensum: se deduce del slug, como en la web. */
    fun tipoDe(slug: String): TipoCarrera =
        if (slug.startsWith(PREFIJO_INGENIERIA)) TipoCarrera.INGENIERIA else TipoCarrera.LICENCIATURA

    /**
     * Ingenierias primero y licenciaturas despues, cada grupo en orden
     * alfabetico. [excepto] es la carrera que ya se muestra en Continuar: no
     * se repite en la lista. Un grupo sin carreras no se devuelve.
     */
    fun agrupar(carreras: List<CarreraResumen>, excepto: String?): List<GrupoCarreras> {
        val restantes = carreras.filter { it.slug != excepto }
        return TipoCarrera.entries.mapNotNull { tipo ->
            val delTipo = restantes.filter { it.tipo == tipo }.sortedWith(compareBy<CarreraResumen, Any>(ordenAlfabetico) { it.nombreCorto })
            delTipo.takeIf { it.isNotEmpty() }?.let { GrupoCarreras(tipo, it) }
        }
    }
}
