package com.mapapensum.feature.inicio

import com.mapapensum.core.model.Progreso
import org.junit.Assert.assertEquals
import org.junit.Test

class LineaContextualTest {

    private fun progreso(porcentaje: Int, porInscribir: Int) =
        Progreso(porcentaje = porcentaje, aprobadas = 0, total = 0, cursando = 0, porInscribir = porInscribir)

    @Test
    fun `una sola materia va en singular`() {
        assertEquals("1 materia por inscribir", lineaContextual(progreso(porcentaje = 48, porInscribir = 1)))
    }

    @Test
    fun `varias materias van en plural`() {
        assertEquals("6 materias por inscribir", lineaContextual(progreso(porcentaje = 48, porInscribir = 6)))
    }

    @Test
    fun `sin materias y al cien por ciento la carrera esta completa`() {
        assertEquals("Carrera completa", lineaContextual(progreso(porcentaje = 100, porInscribir = 0)))
    }

    @Test
    fun `sin materias y sin terminar no hay nada por inscribir`() {
        assertEquals("Nada por inscribir ahora", lineaContextual(progreso(porcentaje = 60, porInscribir = 0)))
    }
}
