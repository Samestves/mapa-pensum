package com.mapapensum.feature.inicio

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import com.mapapensum.core.designsystem.MapaPensumTema
import com.mapapensum.core.domain.caso.Continuar
import com.mapapensum.core.domain.caso.GrupoCarreras
import com.mapapensum.core.domain.caso.Inicio
import com.mapapensum.core.model.CarreraResumen
import com.mapapensum.core.model.ColorCarrera
import com.mapapensum.core.model.Progreso
import com.mapapensum.core.model.TipoCarrera

private const val ALTO_TELEFONO = 844
private const val ANCHO_TELEFONO = 390

private fun carreraFalsa(
    slug: String,
    nombreCorto: String,
    color: Long,
    tipo: TipoCarrera,
) = CarreraResumen(
    slug = slug,
    nombre = nombreCorto,
    nombreCorto = nombreCorto,
    color = ColorCarrera(oscuro = color, claro = color),
    tipo = tipo,
    semestres = 10,
    asignaturas = 50,
    silueta = listOf(5, 5, 5, 5, 5, 5, 5, 5, 5, 5),
)

private val sistemas = carreraFalsa("ingenieria-de-sistemas", "Sistemas", 0xFF6094FF, TipoCarrera.INGENIERIA)

private val ingenierias = listOf(
    carreraFalsa("ingenieria-agronomica", "Agronómica", 0xFF3FCB74, TipoCarrera.INGENIERIA),
    carreraFalsa("ingenieria-ambiental", "Ambiental", 0xFF34C6EA, TipoCarrera.INGENIERIA),
    carreraFalsa("ingenieria-de-petroleo", "Petróleo", 0xFFE8A33D, TipoCarrera.INGENIERIA),
    carreraFalsa("ingenieria-de-produccion-animal", "Producción Animal", 0xFFA9C23F, TipoCarrera.INGENIERIA),
)

private val licenciaturas = listOf(
    carreraFalsa("administracion", "Administración", 0xFF8A7CF0, TipoCarrera.LICENCIATURA),
    carreraFalsa("contaduria-publica", "Contaduría", 0xFF2FD3C0, TipoCarrera.LICENCIATURA),
    carreraFalsa("recursos-humanos", "Recursos Humanos", 0xFFF072B0, TipoCarrera.LICENCIATURA),
    carreraFalsa("tecnologia-de-alimentos", "Tecnología de Alimentos", 0xFFFF7A6B, TipoCarrera.LICENCIATURA),
)

private fun progresoFalso(porcentaje: Int, porInscribir: Int) = Progreso(
    porcentaje = porcentaje,
    aprobadas = porcentaje / 2,
    total = 50,
    cursando = 0,
    porInscribir = porInscribir,
)

private fun inicioConContinuar(progreso: Progreso) = Inicio(
    continuar = Continuar(sistemas, progreso),
    grupos = listOf(
        GrupoCarreras(TipoCarrera.INGENIERIA, ingenierias),
        GrupoCarreras(TipoCarrera.LICENCIATURA, licenciaturas),
    ),
)

private val inicioPrimeraVez = Inicio(
    continuar = null,
    grupos = listOf(
        GrupoCarreras(TipoCarrera.INGENIERIA, listOf(sistemas) + ingenierias),
        GrupoCarreras(TipoCarrera.LICENCIATURA, licenciaturas),
    ),
)

@Composable
private fun PrevisualizacionDe(estado: InicioUiState) {
    MapaPensumTema { InicioPantalla(estado = estado, alAbrirCarrera = {}) }
}

@Preview(widthDp = ANCHO_TELEFONO, heightDp = ALTO_TELEFONO)
@Composable
private fun InicioVuelve() = PrevisualizacionDe(
    InicioUiState.Listo(inicioConContinuar(progresoFalso(porcentaje = 48, porInscribir = 6))),
)

@Preview(widthDp = ANCHO_TELEFONO, heightDp = ALTO_TELEFONO)
@Composable
private fun InicioUnaMateriaPorInscribir() = PrevisualizacionDe(
    InicioUiState.Listo(inicioConContinuar(progresoFalso(porcentaje = 92, porInscribir = 1))),
)

@Preview(widthDp = ANCHO_TELEFONO, heightDp = ALTO_TELEFONO)
@Composable
private fun InicioCarreraCompleta() = PrevisualizacionDe(
    InicioUiState.Listo(inicioConContinuar(progresoFalso(porcentaje = 100, porInscribir = 0))),
)

@Preview(widthDp = ANCHO_TELEFONO, heightDp = ALTO_TELEFONO)
@Composable
private fun InicioPrimeraVez() = PrevisualizacionDe(InicioUiState.Listo(inicioPrimeraVez))

@Preview(widthDp = ANCHO_TELEFONO, heightDp = ALTO_TELEFONO)
@Composable
private fun InicioCargando() = PrevisualizacionDe(InicioUiState.Cargando)
