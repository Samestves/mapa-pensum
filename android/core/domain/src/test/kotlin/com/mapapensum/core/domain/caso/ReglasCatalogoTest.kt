package com.mapapensum.core.domain.caso

import com.mapapensum.core.model.TipoCarrera
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ReglasCatalogoTest {

    @Test
    fun `los slugs de ingenieria son ingenieria y el resto licenciatura`() {
        assertEquals(TipoCarrera.INGENIERIA, ReglasCatalogo.tipoDe("ingenieria-civil"))
        assertEquals(TipoCarrera.LICENCIATURA, ReglasCatalogo.tipoDe("psicologia"))
        assertEquals(TipoCarrera.LICENCIATURA, ReglasCatalogo.tipoDe("tecnico-ingenieria-civil"))
    }

    @Test
    fun `agrupa ingenierias primero y licenciaturas despues`() {
        val carreras = listOf(resumen("derecho"), resumen("ingenieria-civil"))

        val grupos = ReglasCatalogo.agrupar(carreras, excepto = null)

        assertEquals(listOf(TipoCarrera.INGENIERIA, TipoCarrera.LICENCIATURA), grupos.map { it.tipo })
    }

    @Test
    fun `ordena alfabeticamente sin mandar las tildes al final`() {
        val carreras = listOf(
            resumen("psicologia", nombreCorto = "Psicologia"),
            resumen("administracion", nombreCorto = "Administración"),
            resumen("educacion", nombreCorto = "Educación"),
            resumen("arquitectura", nombreCorto = "Arquitectura"),
        )

        val nombres = ReglasCatalogo.agrupar(carreras, excepto = null).single().carreras.map { it.nombreCorto }

        assertEquals(listOf("Administración", "Arquitectura", "Educación", "Psicologia"), nombres)
    }

    @Test
    fun `la A con tilde va junto a la A y no despues de la Z`() {
        val carreras = listOf(resumen("zoologia", "Zoología"), resumen("area", "Árbol"), resumen("banca", "Banca"))

        val nombres = ReglasCatalogo.agrupar(carreras, excepto = null).single().carreras.map { it.nombreCorto }

        assertEquals(listOf("Árbol", "Banca", "Zoología"), nombres)
    }

    @Test
    fun `excluye la carrera reciente`() {
        val carreras = listOf(resumen("derecho"), resumen("psicologia"))

        val slugs = ReglasCatalogo.agrupar(carreras, excepto = "derecho").flatMap { g -> g.carreras.map { it.slug } }

        assertEquals(listOf("psicologia"), slugs)
    }

    @Test
    fun `no devuelve grupos vacios`() {
        val soloIngenierias = listOf(resumen("ingenieria-civil"), resumen("derecho"))

        val grupos = ReglasCatalogo.agrupar(soloIngenierias, excepto = "derecho")

        assertEquals(listOf(TipoCarrera.INGENIERIA), grupos.map { it.tipo })
    }

    @Test
    fun `sin carreras no hay grupos`() {
        assertTrue(ReglasCatalogo.agrupar(emptyList(), excepto = null).isEmpty())
    }

    @Test
    fun `una reciente que no esta en el catalogo no excluye nada`() {
        val carreras = listOf(resumen("derecho"))

        val grupos = ReglasCatalogo.agrupar(carreras, excepto = "fantasma")

        assertEquals(1, grupos.single().carreras.size)
    }
}
