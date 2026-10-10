package com.mapapensum.core.domain.caso

import com.mapapensum.core.model.Marca
import com.mapapensum.core.model.TipoCarrera
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.take
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class ObtenerInicioTest {
    private val civil = carrera("ingenieria-civil", listOf(asignatura("A"), asignatura("B")))
    private val derecho = carrera("derecho", listOf(asignatura("D1")))
    private val catalogo = CatalogoFalso(
        resumenes = listOf(resumen("ingenieria-civil", "Civil"), resumen("derecho", "Derecho")),
        pensums = listOf(civil, derecho),
    )
    private val marcas = MarcasFalsas()

    private fun casoDeUso(preferencias: PreferenciasFalsas) = ObtenerInicio(catalogo, marcas, preferencias)

    @Test
    fun `sin reciente no hay continuar y salen todas las carreras`() = runTest {
        val inicio = casoDeUso(PreferenciasFalsas(reciente = null))().first()

        assertNull(inicio.continuar)
        assertEquals(listOf(TipoCarrera.INGENIERIA, TipoCarrera.LICENCIATURA), inicio.grupos.map { it.tipo })
        assertEquals(2, inicio.grupos.sumOf { it.carreras.size })
    }

    @Test
    fun `una reciente que no esta en el catalogo se trata como si no hubiera`() = runTest {
        val inicio = casoDeUso(PreferenciasFalsas(reciente = "fantasma"))().first()

        assertNull(inicio.continuar)
        assertEquals(2, inicio.grupos.sumOf { it.carreras.size })
        assertEquals(emptyList<String>(), catalogo.pedidosPorSlug)
    }

    @Test
    fun `con reciente muestra su avance y la saca de la lista`() = runTest {
        marcas.fijar("ingenieria-civil", "A", Marca.APROBADA)

        val inicio = casoDeUso(PreferenciasFalsas(reciente = "ingenieria-civil"))().first()

        assertEquals("ingenieria-civil", inicio.continuar?.carrera?.slug)
        assertEquals(50, inicio.continuar?.progreso?.porcentaje)
        assertEquals(listOf("derecho"), inicio.grupos.flatMap { g -> g.carreras.map { it.slug } })
    }

    @Test
    fun `recalcula el avance cuando cambian las marcas sin recargar la carrera`() = runTest {
        val emitidos = mutableListOf<Inicio>()
        val trabajo = launch(UnconfinedTestDispatcher(testScheduler)) {
            casoDeUso(PreferenciasFalsas(reciente = "ingenieria-civil"))().take(2).toList(emitidos)
        }

        marcas.fijar("ingenieria-civil", "A", Marca.APROBADA)
        trabajo.join()

        assertEquals(0, emitidos[0].continuar?.progreso?.porcentaje)
        assertEquals(50, emitidos[1].continuar?.progreso?.porcentaje)
        assertEquals(listOf("ingenieria-civil"), catalogo.pedidosPorSlug)
        assertEquals(1, catalogo.pedidosDeCarreras)
    }

    @Test
    fun `al cambiar la reciente cambia el continuar y el catalogo se pide una vez`() = runTest {
        val preferencias = PreferenciasFalsas(reciente = "ingenieria-civil")
        val emitidos = mutableListOf<Inicio>()
        val trabajo = launch(UnconfinedTestDispatcher(testScheduler)) {
            casoDeUso(preferencias)().take(2).toList(emitidos)
        }

        preferencias.recordarCarrera("derecho")
        trabajo.join()

        assertEquals("ingenieria-civil", emitidos[0].continuar?.carrera?.slug)
        assertEquals("derecho", emitidos[1].continuar?.carrera?.slug)
        assertEquals(listOf("ingenieria-civil"), emitidos[1].grupos.flatMap { g -> g.carreras.map { it.slug } })
        assertEquals(1, catalogo.pedidosDeCarreras)
    }
}
