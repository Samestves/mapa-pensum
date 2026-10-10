package com.mapapensum.navegacion

import androidx.compose.runtime.Composable
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.mapapensum.ContenedorApp
import com.mapapensum.feature.inicio.InicioRuta
import com.mapapensum.feature.inicio.InicioViewModel
import com.mapapensum.feature.mapa.MapaRuta
import com.mapapensum.feature.mapa.MapaViewModel

/**
 * Las pantallas no se conocen entre si: el inicio solo avisa que se eligio una
 * carrera y aqui se decide adonde lleva eso.
 */
@Composable
fun NavegacionApp(contenedor: ContenedorApp) {
    val nav = rememberNavController()
    NavHost(navController = nav, startDestination = Destino.INICIO) {
        composable(Destino.INICIO) {
            val viewModel: InicioViewModel = viewModel(
                factory = InicioViewModel.fabrica(contenedor.obtenerInicio),
            )
            InicioRuta(
                viewModel = viewModel,
                alAbrirCarrera = { slug -> nav.navigate(Destino.mapa(slug)) },
            )
        }
        composable(
            route = Destino.MAPA,
            arguments = listOf(navArgument(Destino.ARG_SLUG) { type = NavType.StringType }),
        ) { entrada ->
            val slug = requireNotNull(entrada.arguments?.getString(Destino.ARG_SLUG))
            val viewModel: MapaViewModel = viewModel(
                factory = MapaViewModel.fabrica(
                    slug = slug,
                    obtenerMapa = contenedor.obtenerMapa,
                    marcarMateria = contenedor.marcarMateria,
                    abrirCarrera = contenedor.abrirCarrera,
                ),
            )
            MapaRuta(viewModel = viewModel, alVolver = { nav.popBackStack() })
        }
    }
}
