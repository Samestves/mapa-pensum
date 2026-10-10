package com.mapapensum.core.domain.caso

import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Test

class AbrirCarreraTest {

    @Test
    fun `recuerda la carrera abierta como la reciente`() = runTest {
        val preferencias = PreferenciasFalsas(reciente = null)

        AbrirCarrera(preferencias)("derecho")

        assertEquals("derecho", preferencias.carreraReciente.first())
    }
}
