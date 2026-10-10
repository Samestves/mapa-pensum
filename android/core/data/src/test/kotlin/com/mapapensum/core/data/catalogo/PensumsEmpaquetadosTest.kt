package com.mapapensum.core.data.catalogo

import com.mapapensum.core.data.jsonDatos
import com.mapapensum.core.model.Carrera
import com.mapapensum.core.model.TipoCarrera
import java.io.File
import kotlinx.serialization.builtins.ListSerializer
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Lee los JSON reales que Gradle copia a los assets (los mismos de la web). Si
 * alguien cambia un campo en la web de forma que la app ya no lo entienda,
 * este test falla aqui y no en el telefono del estudiante.
 */
class PensumsEmpaquetadosTest {

    private val carpeta = File("build/generated/pensums/carreras")

    private fun texto(nombre: String): String = File(carpeta, nombre).readText()

    private val resumenes by lazy {
        jsonDatos.decodeFromString(ListSerializer(ResumenCarreraDto.serializer()), texto("indice.json"))
            .map { it.aModelo() }
    }

    private fun carrera(slug: String): Carrera =
        jsonDatos.decodeFromString(CarreraDto.serializer(), texto("$slug.json")).aModelo()

    @Test
    fun `el indice no esta vacio`() {
        assertTrue(resumenes.isNotEmpty())
    }

    @Test
    fun `cada carrera del indice se decodifica y coincide con su resumen`() {
        resumenes.forEach { resumen ->
            val carrera = carrera(resumen.slug)

            assertEquals(resumen.slug, carrera.slug)
            assertEquals(resumen.color, carrera.color)
            assertEquals(resumen.semestres, carrera.semestres.size)
            assertEquals(resumen.asignaturas, carrera.obligatorias.size)
            assertEquals(resumen.silueta, siluetaDe(carrera))
        }
    }

    @Test
    fun `las obligatorias siempre tienen semestre dentro de la carrera`() {
        resumenes.forEach { resumen ->
            val carrera = carrera(resumen.slug)
            val rango = 1..carrera.semestres.size

            carrera.asignaturas.forEach { asignatura ->
                assertTrue("${resumen.slug}/${asignatura.codigo} sin semestre valido", (asignatura.semestre ?: 0) in rango)
            }
        }
    }

    @Test
    fun `todo prerrequisito apunta a una materia que existe`() {
        resumenes.forEach { resumen ->
            val carrera = carrera(resumen.slug)
            val conocidos = (carrera.asignaturas + carrera.gruposElectivas.flatMap { it.asignaturas })
                .map { it.codigo }
                .toSet()

            carrera.asignaturas.flatMap { it.prerrequisitos }.forEach { codigo ->
                assertTrue("${resumen.slug}: prerrequisito huerfano $codigo", codigo in conocidos)
            }
        }
    }

    @Test
    fun `hay carreras de ambos tipos`() {
        assertEquals(TipoCarrera.entries.toSet(), resumenes.map { it.tipo }.toSet())
    }

    private fun siluetaDe(carrera: Carrera): List<Int> =
        carrera.semestres.map { semestre -> carrera.obligatorias.count { it.semestre == semestre.numero } }
}
