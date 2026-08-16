import { lazy } from 'react'

/* Un solo sitio sabe donde se parte el codigo, y por eso existe este archivo
   en vez de dos lineas sueltas dentro de App.

   Lo necesitan dos que no se conocen: App, para pintar la vista cuando llega,
   y la tarjeta del selector, para empezar a bajarla al rozarla. Con el lazy
   declarado en App, la tarjeta tenia que importar de App y App importa -por
   la cadena del selector- a la tarjeta: un ciclo. Los ciclos en ESM a veces
   funcionan y a veces te dejan un undefined a medio inicializar, y depurar
   eso cuesta mucho mas que este archivo.

   La misma funcion sirve para las dos cosas porque import() ya cachea: la
   primera llamada baja el chunk y las siguientes devuelven la promesa que ya
   existe. Precargar mil veces baja una. */
const importar = () => import('./VistaCarrera')

/**
 * La vista de una carrera, bajada aparte.
 *
 * Con ella dentro del chunk principal, quien abria la portada se bajaba la
 * aplicacion entera: el mapa, el horario, el planificador, el exportador a
 * PNG y la ficha de cada clase. Medido sobre el codigo fuente, 247 de los
 * 334 KB propios -tres cuartas partes- no hacen falta hasta elegir carrera, y
 * la portada es justo donde peor duele: es la primera pantalla y la que mide
 * el First Contentful Paint.
 *
 * Se parte AQUI y no en veinte sitios porque VistaCarrera es la raiz de todo
 * lo de dentro: cortar por la raiz se lleva el arbol entero.
 */
export const VistaCarreraDiferida = lazy(importar)

/**
 * Se empieza a bajar al ROZAR la tarjeta, no al pulsarla.
 *
 * El pensum ya se precargaba asi. Si el codigo no siguiera el mismo camino,
 * partirlo habria cambiado una espera por otra: los datos llegarian calientes
 * y el componente que los dibuja, no.
 */
export const precargarVista = importar
