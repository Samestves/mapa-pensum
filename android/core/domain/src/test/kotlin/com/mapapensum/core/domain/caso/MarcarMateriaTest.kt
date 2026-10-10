package com.mapapensum.core.domain.caso

import com.mapapensum.core.model.Marca
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Test

class MarcarMateriaTest {
    private val marcas = MarcasFalsas()
    private val marcarMateria = MarcarMateria(marcas)

    @Test
    fun `guarda la marca que resulta de la accion`() = runTest {
        marcarMateria("civil", "A", actual = null, accion = Accion.ALTERNAR_APROBADA)

        assertEquals(listOf(Triple("civil", "A", Marca.APROBADA)), marcas.fijadas)
    }

    @Test
    fun `repetir la accion quita la marca`() = runTest {
        marcarMateria("civil", "A", actual = Marca.CURSANDO, accion = Accion.ALTERNAR_CURSANDO)

        assertEquals(listOf(Triple("civil", "A", null)), marcas.fijadas)
    }
}
