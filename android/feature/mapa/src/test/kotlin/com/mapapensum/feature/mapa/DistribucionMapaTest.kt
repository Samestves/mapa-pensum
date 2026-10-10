package com.mapapensum.feature.mapa

import com.mapapensum.core.model.Asignatura
import com.mapapensum.core.model.Carrera
import com.mapapensum.core.model.ColorCarrera
import com.mapapensum.core.model.Semestre
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class DistribucionMapaTest {

    // Con las medidas del contrato: columna n en x = 24 + 212 n, fila m en y = 64 + 78 m.

    @Test
    fun `cada semestre tiene su columna`() {
        val distribucion = DistribucionMapa.de(carrera(3, materia("A", 1), materia("B", 2), materia("C", 3)))

        assertEquals(listOf(24f, 236f, 448f), distribucion.nodos.map { it.x })
        assertEquals(listOf(24f, 236f, 448f), distribucion.cabeceras.map { it.x })
    }

    @Test
    fun `dentro de un semestre las filas siguen el orden de los datos`() {
        val distribucion = DistribucionMapa.de(carrera(1, materia("B", 1), materia("A", 1), materia("C", 1)))

        assertEquals(listOf("B", "A", "C"), distribucion.nodos.map { it.codigo })
        assertEquals(listOf(64f, 142f, 220f), distribucion.nodos.map { it.y })
    }

    @Test
    fun `las casillas de electiva son nodos y las materias sin semestre no`() {
        val distribucion = DistribucionMapa.de(
            carrera(1, materia("A", 1), materia("casilla", 1, esHueco = true), materia("libre", null)),
        )

        assertEquals(listOf("A", "casilla"), distribucion.nodos.map { it.codigo })
    }

    @Test
    fun `el tamano total suma margenes columnas y la columna mas alta`() {
        val distribucion = DistribucionMapa.de(
            carrera(3, materia("A", 1), materia("B", 1), materia("C", 2), materia("D", 3)),
        )

        // 2 * 24 + 3 * 156 + 2 * 56
        assertEquals(628f, distribucion.ancho, DELTA)
        // 24 + 40 + 2 * 64 + 1 * 14 + 24
        assertEquals(230f, distribucion.alto, DELTA)
    }

    @Test
    fun `una carrera sin semestres solo tiene margenes y cabecera`() {
        val distribucion = DistribucionMapa.de(carrera(0))

        assertEquals(48f, distribucion.ancho, DELTA)
        assertEquals(88f, distribucion.alto, DELTA)
        assertTrue(distribucion.nodos.isEmpty())
    }

    @Test
    fun `la arista une el centro derecho del prerrequisito con el centro izquierdo de la materia`() {
        val distribucion = DistribucionMapa.de(
            carrera(2, materia("A", 1), materia("B", 1), materia("C", 2, prerrequisitos = listOf("B"))),
        )

        val arista = distribucion.aristas.single()
        assertEquals("B", arista.desde)
        assertEquals("C", arista.hasta)
        assertEquals(PuntoMapa(180f, 174f), arista.inicio)
        assertEquals(PuntoMapa(236f, 96f), arista.fin)
    }

    @Test
    fun `no hay arista si el prerrequisito o la materia no son nodos`() {
        val distribucion = DistribucionMapa.de(
            carrera(
                2,
                materia("A", 1),
                materia("B", 2, prerrequisitos = listOf("fantasma")),
                materia("libre", null, prerrequisitos = listOf("A")),
                materia("C", 2, prerrequisitos = listOf("libre")),
            ),
        )

        assertTrue(distribucion.aristas.isEmpty())
    }

    @Test
    fun `los controles de la curva estan a mitad de dx y en horizontal`() {
        val arista = AristaMapa("A", "B", PuntoMapa(180f, 96f), PuntoMapa(236f, 174f))

        assertEquals(PuntoMapa(208f, 96f), arista.controlInicio)
        assertEquals(PuntoMapa(208f, 174f), arista.controlFin)
    }

    @Test
    fun `nodoEn encuentra la materia bajo el toque`() {
        val distribucion = DistribucionMapa.de(carrera(2, materia("A", 1), materia("B", 1), materia("C", 2)))

        assertEquals("A", distribucion.nodoEn(30f, 70f))
        assertEquals("B", distribucion.nodoEn(100f, 150f))
        assertEquals("C", distribucion.nodoEn(300f, 100f))
    }

    @Test
    fun `nodoEn devuelve null entre columnas, entre filas y fuera del mapa`() {
        val distribucion = DistribucionMapa.de(carrera(2, materia("A", 1), materia("B", 1), materia("C", 2)))

        assertNull(distribucion.nodoEn(190f, 90f))
        assertNull(distribucion.nodoEn(100f, 135f))
        assertNull(distribucion.nodoEn(100f, 10f))
        assertNull(distribucion.nodoEn(-5f, -5f))
    }

    @Test
    fun `nodoEn incluye el borde superior izquierdo y excluye el inferior derecho`() {
        val distribucion = DistribucionMapa.de(carrera(1, materia("A", 1)))

        assertEquals("A", distribucion.nodoEn(24f, 64f))
        assertNull(distribucion.nodoEn(180f, 90f))
        assertNull(distribucion.nodoEn(100f, 128f))
    }

    private fun materia(
        codigo: String,
        semestre: Int?,
        prerrequisitos: List<String> = emptyList(),
        esHueco: Boolean = false,
    ) = Asignatura(
        codigo = codigo,
        nombre = codigo,
        semestre = semestre,
        uc = 3,
        prerrequisitos = prerrequisitos,
        esHueco = esHueco,
    )

    private fun carrera(semestres: Int, vararg asignaturas: Asignatura) = Carrera(
        slug = "prueba",
        nombre = "Carrera de prueba",
        nombreCorto = "Prueba",
        color = ColorCarrera(oscuro = 0xFF3FCB74, claro = 0xFF1B8A47),
        semestres = (1..semestres).map { Semestre(numero = it, cantidad = 0, uc = null) },
        asignaturas = asignaturas.toList(),
        gruposElectivas = emptyList(),
    )

    private companion object {
        const val DELTA = 0.001f
    }
}
