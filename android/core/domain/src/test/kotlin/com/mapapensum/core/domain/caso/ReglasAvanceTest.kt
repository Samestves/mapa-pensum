package com.mapapensum.core.domain.caso

import com.mapapensum.core.model.Estado
import com.mapapensum.core.model.Marca
import org.junit.Assert.assertEquals
import org.junit.Test

class ReglasAvanceTest {

    @Test
    fun `una materia sin prerrequisitos nace disponible`() {
        val estados = ReglasAvance.estadosDe(listOf(asignatura("A")), emptyMap())

        assertEquals(Estado.DISPONIBLE, estados.getValue("A"))
    }

    @Test
    fun `con prerrequisitos sin aprobar queda bloqueada`() {
        val materias = listOf(asignatura("A"), asignatura("B", prerrequisitos = listOf("A")))

        val estados = ReglasAvance.estadosDe(materias, emptyMap())

        assertEquals(Estado.BLOQUEADA, estados.getValue("B"))
    }

    @Test
    fun `un prerrequisito cursando no libera la materia`() {
        val materias = listOf(asignatura("A"), asignatura("B", prerrequisitos = listOf("A")))

        val estados = ReglasAvance.estadosDe(materias, mapOf("A" to Marca.CURSANDO))

        assertEquals(Estado.CURSANDO, estados.getValue("A"))
        assertEquals(Estado.BLOQUEADA, estados.getValue("B"))
    }

    @Test
    fun `se libera solo cuando todos los prerrequisitos estan aprobados`() {
        val materias = listOf(
            asignatura("A"),
            asignatura("B"),
            asignatura("C", prerrequisitos = listOf("A", "B")),
        )

        val unoAprobado = ReglasAvance.estadosDe(materias, mapOf("A" to Marca.APROBADA))
        val ambosAprobados = ReglasAvance.estadosDe(
            materias,
            mapOf("A" to Marca.APROBADA, "B" to Marca.APROBADA),
        )

        assertEquals(Estado.BLOQUEADA, unoAprobado.getValue("C"))
        assertEquals(Estado.DISPONIBLE, ambosAprobados.getValue("C"))
    }

    @Test
    fun `la marca del estudiante gana aunque los prerrequisitos no esten`() {
        val materias = listOf(asignatura("A"), asignatura("B", prerrequisitos = listOf("A")))

        val estados = ReglasAvance.estadosDe(materias, mapOf("B" to Marca.APROBADA))

        assertEquals(Estado.APROBADA, estados.getValue("B"))
    }

    @Test
    fun `el progreso por UC pesa cada materia por sus creditos`() {
        val carrera = carrera(asignaturas = listOf(asignatura("A", uc = 6), asignatura("B", uc = 2)))
        val estados = mapOf("A" to Estado.APROBADA, "B" to Estado.DISPONIBLE)

        val progreso = ReglasAvance.progresoDe(carrera, estados)

        assertEquals(75, progreso.porcentaje)
        assertEquals(1, progreso.aprobadas)
        assertEquals(2, progreso.total)
        assertEquals(1, progreso.porInscribir)
    }

    @Test
    fun `si alguna obligatoria no tiene UC el progreso es por cantidad`() {
        val carrera = carrera(asignaturas = listOf(asignatura("A", uc = 6), asignatura("B", uc = null)))
        val estados = mapOf("A" to Estado.APROBADA, "B" to Estado.BLOQUEADA)

        assertEquals(50, ReglasAvance.progresoDe(carrera, estados).porcentaje)
    }

    @Test
    fun `si la suma de UC es cero el progreso es por cantidad`() {
        val carrera = carrera(asignaturas = listOf(asignatura("A", uc = 0), asignatura("B", uc = 0)))
        val estados = mapOf("A" to Estado.APROBADA, "B" to Estado.DISPONIBLE)

        assertEquals(50, ReglasAvance.progresoDe(carrera, estados).porcentaje)
    }

    @Test
    fun `las casillas de electiva no cuentan en el progreso`() {
        val carrera = carrera(
            asignaturas = listOf(asignatura("A"), asignatura("HUECO", esHueco = true)),
        )
        val estados = mapOf("A" to Estado.APROBADA, "HUECO" to Estado.CURSANDO)

        val progreso = ReglasAvance.progresoDe(carrera, estados)

        assertEquals(100, progreso.porcentaje)
        assertEquals(1, progreso.total)
        assertEquals(0, progreso.cursando)
    }

    @Test
    fun `el porcentaje se redondea al entero mas cercano`() {
        val carrera = carrera(asignaturas = listOf(asignatura("A"), asignatura("B"), asignatura("C")))
        val unaDeTres = mapOf("A" to Estado.APROBADA, "B" to Estado.BLOQUEADA, "C" to Estado.BLOQUEADA)
        val dosDeTres = mapOf("A" to Estado.APROBADA, "B" to Estado.APROBADA, "C" to Estado.BLOQUEADA)

        assertEquals(33, ReglasAvance.progresoDe(carrera, unaDeTres).porcentaje)
        assertEquals(67, ReglasAvance.progresoDe(carrera, dosDeTres).porcentaje)
    }

    @Test
    fun `cuenta cursando y por inscribir`() {
        val carrera = carrera(
            asignaturas = listOf(asignatura("A"), asignatura("B"), asignatura("C"), asignatura("D")),
        )
        val estados = mapOf(
            "A" to Estado.CURSANDO,
            "B" to Estado.CURSANDO,
            "C" to Estado.DISPONIBLE,
            "D" to Estado.BLOQUEADA,
        )

        val progreso = ReglasAvance.progresoDe(carrera, estados)

        assertEquals(2, progreso.cursando)
        assertEquals(1, progreso.porInscribir)
        assertEquals(0, progreso.porcentaje)
    }

    @Test
    fun `una carrera sin obligatorias tiene progreso cero`() {
        val progreso = ReglasAvance.progresoDe(carrera(asignaturas = emptyList()), emptyMap())

        assertEquals(0, progreso.porcentaje)
        assertEquals(0, progreso.total)
    }

    @Test
    fun `aprobada alterna con sin marca y desde cursando pasa a aprobada`() {
        assertEquals(Marca.APROBADA, ReglasAvance.siguienteMarca(null, Accion.ALTERNAR_APROBADA))
        assertEquals(Marca.APROBADA, ReglasAvance.siguienteMarca(Marca.CURSANDO, Accion.ALTERNAR_APROBADA))
        assertEquals(null, ReglasAvance.siguienteMarca(Marca.APROBADA, Accion.ALTERNAR_APROBADA))
    }

    @Test
    fun `cursando alterna con sin marca y desde aprobada pasa a cursando`() {
        assertEquals(Marca.CURSANDO, ReglasAvance.siguienteMarca(null, Accion.ALTERNAR_CURSANDO))
        assertEquals(Marca.CURSANDO, ReglasAvance.siguienteMarca(Marca.APROBADA, Accion.ALTERNAR_CURSANDO))
        assertEquals(null, ReglasAvance.siguienteMarca(Marca.CURSANDO, Accion.ALTERNAR_CURSANDO))
    }
}
