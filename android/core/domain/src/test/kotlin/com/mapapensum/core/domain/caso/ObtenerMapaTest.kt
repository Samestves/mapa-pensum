package com.mapapensum.core.domain.caso

import com.mapapensum.core.model.Estado
import com.mapapensum.core.model.Marca
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.take
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Test

class ObtenerMapaTest {
    private val pensum = carrera(
        slug = "ingenieria-prueba",
        asignaturas = listOf(asignatura("A"), asignatura("B", prerrequisitos = listOf("A"))),
    )
    private val catalogo = CatalogoFalso(resumenes = emptyList(), pensums = listOf(pensum))
    private val marcas = MarcasFalsas()

    @Test
    fun `emite estados y progreso de la carrera`() = runTest {
        val mapa = ObtenerMapa(catalogo, marcas)("ingenieria-prueba").first()

        assertEquals(pensum, mapa.carrera)
        assertEquals(Estado.DISPONIBLE, mapa.estados.getValue("A"))
        assertEquals(Estado.BLOQUEADA, mapa.estados.getValue("B"))
        assertEquals(0, mapa.progreso.porcentaje)
    }

    @Test
    fun `recalcula en cada cambio de marcas sin volver a cargar la carrera`() = runTest {
        val emitidos = mutableListOf<MapaCarrera>()
        val trabajo = launch(UnconfinedTestDispatcher(testScheduler)) {
            ObtenerMapa(catalogo, marcas)("ingenieria-prueba").take(2).toList(emitidos)
        }

        marcas.fijar("ingenieria-prueba", "A", Marca.APROBADA)
        trabajo.join()

        assertEquals(Estado.DISPONIBLE, emitidos[0].estados.getValue("A"))
        assertEquals(Estado.APROBADA, emitidos[1].estados.getValue("A"))
        assertEquals(Estado.DISPONIBLE, emitidos[1].estados.getValue("B"))
        assertEquals(50, emitidos[1].progreso.porcentaje)
        assertEquals(listOf("ingenieria-prueba"), catalogo.pedidosPorSlug)
    }
}
