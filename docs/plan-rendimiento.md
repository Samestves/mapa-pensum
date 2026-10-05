# Plan de rendimiento y clean code

Objetivo: que Mapa de Pensum vaya fluido en un teléfono Android de gama baja con datos lentos, y que el código quede en un estado que se pueda mantener. Se ejecuta por fases; cada fase tiene una meta medible y no se da por hecha hasta que el banco lo confirma.

| Fase | Estado |
| --- | --- |
| 0 · Instrumentos | Hecha el 2026-10-05 |
| 1 · Arranque: peso | Hecha el 2026-10-05. El CSS por pantalla pasó a la fase 2 |
| 2 · Un módulo por vista | Siguiente |
| 3 a 8 | Pendientes |

## 1. Cómo está hecho hoy

- **Arranque.** `index` (React, portada, analítica) → al elegir carrera baja el pensum de esa carrera (2-3 kB) y el trozo `VistaCarrera`.
- **Vistas.** `VistaCarrera` guarda todo el estado (marcas, electivas, vista, paneles) y monta mapa, lista y horario dentro de `<Activity>` de React 19: cada vista se monta la primera vez que se visita y después queda viva pero oculta.
- **Mapa.** SVG en planos memoizados; los gestos estiran una capa ya pintada en la GPU y repintan una vez al acabar (`layout/vistaViva.js`).
- **Modo ligero.** Todo aparato táctil va sin luces animadas ni cristal (`data/ligero.js`).
- **Lógica.** Reglas puras en `src/layout` y `src/data`, con 456 pruebas.
- **Lector de horario.** OCR en el aparato, cargado solo cuando se usa; el servidor es respaldo.

No es código espagueti: la base es buena y ya tiene mucho trabajo de rendimiento encima. Lo que queda es estructural y está medido abajo.

## 2. Cómo se mide

Dos instrumentos, los dos en el repo:

- **`npm run rendimiento`** — Chrome real simulando un teléfono modesto (360×740 a 2x, CPU ×6, 4G lenta de 1,6 Mbps y 150 ms) y un portátil (CPU ×4). Tres medidas en `scripts/banco/`: `arranque`, `uso` y `gestos`. Enseña la mediana de tres pasadas y sale con código 1 si algo se pasa de su tope. Hay que correrlo antes de pasar nada a `main`. El servidor del banco entrega la página prerenderizada de la carrera y las cabeceras de caché de `vercel.json`, como producción.
- **`scripts/peso.js`** — al final de cada `npm run build`. Tumba el build si lo que se descarga para arrancar pasa de su tope.

### Qué se juzga y qué no

El 2026-10-05 se midió lo mismo dos veces con una hora de diferencia y los tiempos salieron entre 1,4 y 3 veces más altos: había un juego en streaming abierto en el equipo. Un tope en milisegundos de reloj habría fallado sin que el código cambiara, así que el banco juzga solo lo que sale igual con el equipo ocupado:

- **Veces** (se juzgan, margen del 3-15 %): peticiones, nodos del documento, elementos a los que se les recalcula el estilo (`restilados`), objetos que se maquetan (`objetos`), repintados del mapa. Entre corridas, los objetos salen idénticos y los restilados varían un 1-3 %.
- **CPU** (se juzga con el doble de lo medido): ms de procesador del hilo principal. Se mueve menos que el reloj, pero se mueve.
- **Reloj** (se enseña, no se juzga): primer pintado, tiempo hasta ver la pantalla, respuesta al toque, bloqueo.

Para afirmar que una fase bajó un **tiempo**, se comparan los dos builds seguidos en la misma sesión (`DIST=ruta/al/otro/build npm run rendimiento -- uso`), sin nada más abierto.

## 3. Línea base

Ingeniería de Sistemas con 8 marcas. «Al empezar» es el commit `ad907f0`; «hoy», tras la fase 1.

### Lo que el banco juzga

| Qué | Al empezar | Hoy | Meta | Fase |
| --- | --- | --- | --- | --- |
| Portada: peso que compite por el primer pintado | 228 kB (76 JS + 26 CSS + 126 fuentes) | 161 kB (76 + 25 + 60) | ≤ 150 kB | 1 y 2 |
| Portada: peso en segundo plano | 0 | 17 kB (letra del mapa) | — | — |
| Carrera: peticiones en cadena tras el HTML | 1 (el pensum) | 0 | 0 | 1 |
| Carrera: JS de la vista | 75,7 kB | igual | ≤ 40 kB hasta la primera vista | 2 |
| Carrera por la lista: objetos maquetados | 3 581 | igual | ≤ 1 500 | 3 |
| Carrera por la lista: elementos restilados | 2 603 | igual | ≤ 1 200 | 3 |
| Carrera por la lista: nodos | 4 330 | igual | se decide en la fase 3 | 3 |
| Volver a la lista ya montada: objetos | 2 072 | igual | ≤ 100 | 4 |
| Volver al mapa ya montado: objetos | 1 994 | igual | ≤ 100 | 4 |
| Volver a una vista montada: restilados | 1 595-1 695 | igual | ≤ 150 | 4 |
| Marcar una materia: restilados / objetos | 325 / 829 | igual | la mitad | 5 |
| Marcar una materia: CPU | 141 ms | igual | ≤ 70 ms | 5 |
| Lista → mapa, primera vez: CPU | 144 ms | igual | ≤ 100 ms | 6 |
| Mapa quieto en portátil: recálculos de estilo | 203 en 2 s (uno por cuadro) | igual | 0 con las luces en otra capa | 6 |
| Gestos del mapa: repintados | rueda 3, arrastre 1, pellizco 6, dedo 1 | igual | mantener | — |
| Desplazar la lista: maquetados | 0 | igual | mantener | — |

Los objetos, restilados y nodos de la carrera salen más altos que en la primera versión de esta tabla (2 791, 2 183, 3 930) sin que la aplicación haya cambiado: el banco abría la portada genérica y no la página prerenderizada de la carrera, que trae además el texto para buscadores. Se corrigió en la fase 1.

### Tiempos de referencia

Con el freno puesto, medianas de tres pasadas con el equipo tranquilo. Orientan; no son topes. Los de arranque son de una comparación seguida entre el build de antes y el de después de la fase 1.

| Qué | Al empezar | Hoy | Meta |
| --- | --- | --- | --- |
| Portada: primer pintado | 2,15 s | 1,97 s | ≤ 1,5 s |
| Portada: pantalla visible | 2,25 s | 2,05 s | ≤ 1,7 s |
| Carrera por la lista: pantalla visible | 3,5 s | 3,2 s | ≤ 2,5 s |
| Carrera por el mapa: pantalla visible | 3,6 s | 3,2 s | ≤ 2,5 s |
| Carrera: bloqueo del hilo | 660-730 ms | igual | ≤ 300 ms |
| Lista → mapa, primera vez | 710-810 ms | igual | ≤ 400 ms |
| Volver a una vista ya montada | 145-330 ms | igual | ≤ 100 ms |
| Lista → horario, primera vez | 370 ms | igual | ≤ 250 ms |
| Marcar una materia | 145-170 ms | igual | ≤ 100 ms |
| Desplazar la lista | p95 11-20 ms, 0 cuadros perdidos | igual | mantener |

Uso real (Vercel Speed Insights, dicho por Sam el 2026-10-05): puntuación 95-100 en escritorio y 91-95 en móvil.

### En qué se va el tiempo

- **Arranque por la lista** (traza, ms propios): JavaScript ejecutando ~890, **maquetado ~850**, analizar y compilar JS ~720, estilos ~310. La lista monta sus 50 filas y ~2 800 elementos aunque solo se vean 12.
- **Volver a una vista montada:** `<Activity>` la oculta con `display:none`, que descarta el maquetado. Al volver, Chrome recalcula estilos y maqueta la vista entera.
- **Marcar:** el JS propio es poco (decenas de ms); el costo es estilo, maquetado y capas de lo que cambia, más el mapa oculto poniéndose al día.
- **Peso:** las fuentes eran el 55 % de la portada (resuelto en la fase 1). Lo que queda es React: `react-dom` es el 62 % del JS de entrada, y el código propio de la portada, un 25 %.
- **Texto para buscadores:** la página de cada carrera trae el pensum en HTML legible, que el navegador maqueta (unos 790 objetos) antes de que React lo sustituya.
- **Un solo trozo:** `VistaCarrera` lleva mapa, lista, horario, plan, paleta y exportadores. Quien solo usa la lista descarga y compila todo.
- **CSS en un solo archivo:** 690 reglas para todas las pantallas. Cada recálculo de estilo las recorre: el mapa quieto restila lo mismo que el 2026-10-01 (4 elementos por cuadro) pero cada recálculo cuesta un ~23 % más, porque entonces había 403 reglas.

### Deuda de código

- `VistaCarrera.jsx` concentra todo el estado y lo reparte por props (el mapa recibe 14). Cualquier marca la vuelve a ejecutar entera.
- Cinco archivos pasan de 580 líneas: `useVistaGrafo.js` (898), `VistaLista.jsx` (898), `PlanRuta.jsx` (613), `DetalleAsignatura.jsx` (604), `GrafoPensum.jsx` (583).
- Hooks y componentes no tienen ninguna prueba (0 de 22 y 0 de 78); layout tiene 18 de 24 módulos probados.
- Sin tipos: la forma de una asignatura, una sesión o el layout solo está en comentarios.
- Las comprobaciones de navegador de cada pantalla viven en carpetas temporales de cada sesión y se pierden.

## 4. Fases

Orden por impacto para quien entra desde un enlace con un teléfono modesto: primero el arranque, después las interacciones, después la estructura. Al cerrar cada fase, los topes del banco y de `peso.js` bajan a lo nuevo medido, para que lo ganado no se pierda.

### Fase 0 — Instrumentos (hecha)

1. ✅ El banco mide arranque, uso y gestos, en `scripts/banco/`, con topes sobre medidas que no dependen de la carga del equipo.
2. ✅ `scripts/peso.js` falla el build si una partida de peso pasa de su tope (lo de hoy + 3 %).
3. ✅ Los dos presupuestos que fallaban no eran una regresión. Comparado con el commit en que nació el banco (`54df5e7`): el mapa quieto restila exactamente lo mismo, y el pellizco repinta menos (6 veces contra 10) con la mitad de recálculos. Fallaban porque juzgaban milisegundos y cuadros perdidos, que dependen del equipo. Queda un dato útil: el costo por recálculo subió ~23 % con el tamaño de la hoja de estilos (entra en la fase 1).
4. ✅ Uso real, de Speed Insights: 95-100 en escritorio y 91-95 en móvil.
5. ✅ Sam repitió el banco en su equipo: los conteos salieron idénticos.

### Fase 1 — Arranque: peso (hecha)

Lo que cambió, sin tocar un píxel (20 pantallas comparadas antes y después, idénticas):

1. ✅ **Fuentes recortadas al español** (`scripts/fuentes.js`, se generan en cada build). 126 → 76 kB entre las cuatro. Se quitan los caracteres que el español no usa y los rasgos tipográficos que la app no enciende. Los ejes no se tocan: Inter conserva el de tamaño óptico, que es una decisión de diseño, y por eso no baja a los 45 kB que se apuntaron.
2. ✅ **La letra del mapa deja de competir.** Plex Mono solo la usa el mapa: en un teléfono se pide con prioridad baja, detrás de lo que pinta la primera pantalla. Lo que compite por el primer pintado baja de 126 a 60 kB.
3. ✅ **Caché permanente** para `/assets/*` y el modelo del lector en `vercel.json`.
4. ✅ **El pensum se pide desde el HTML** de su carrera, a la vez que el código. Antes esperaba a que el JS principal se ejecutara: una ida y vuelta de más (~200 ms con 4G lenta).
5. ✅ **El banco mide lo que sirve producción**: la página prerenderizada y las cabeceras de caché.

Resultado medido seguido, antes contra después: la portada se pinta ~0,2 s antes y una carrera está en pantalla ~0,3-0,4 s antes, con 50 kB menos.

Lo que se probó y no se hizo:

- **Pedir la letra del mapa solo al ir al mapa.** No funciona en Chrome: un `<link rel="preload">` creado por script después de cargar la página no se reutiliza (el mapa la vuelve a pedir, se pinta con la letra del sistema y se maqueta dos veces, 3 350 objetos en vez de 2 000), y `document.fonts.load` la activa, lo que obliga a maquetar de nuevo todo lo que haya en pantalla (7 700 objetos en la lista en vez de 3 600). Lo único fiable es pedirla desde el HTML.
- **Aligerar el JS de entrada.** No hay de dónde: el 62 % es `react-dom`. La analítica de Vercel es el 2 % y ya se inyecta después del primer pintado; diferirla más arriesga perder visitas cortas a cambio de 1,6 kB. La meta de 65 kB se retira.
- **CSS por pantalla.** Pasa a la fase 2: la frontera de cada hoja es la del trozo de código que la usa, y partirla dos veces es el doble de riesgo. Además hay clases compartidas (`.boton-aro` vive en `mapa.css` y la usa la portada) que hay que reubicar con cuidado.

### Fase 2 — Un módulo por vista

Partir `VistaCarrera` en un cascarón (estado, barras) y un trozo por vista: lista, mapa, horario, plan, paleta, selector de electiva. Cada uno se descarga al necesitarse y se precalienta en reposo o al tocar su pestaña, para que el primer cambio no enseñe una espera.

Y con cada trozo, su CSS: la portada deja de cargar las reglas del mapa, la agenda, el lector y el plan (hoy 690 reglas en una sola hoja que bloquea el primer pintado).

Metas: JS hasta la primera vista 152 → ≤ 105 kB; CSS de la portada 25 → ≤ 13 kB; analizar y compilar −40 %; que el recálculo del mapa quieto vuelva a costar lo que el 2026-10-01.

Riesgos: parpadeo al cambiar por primera vez (el banco ya mide ese primer cambio con red lenta) y reglas que cambian de orden al repartirse (se comprueba con la comparación de pantallas píxel a píxel, incluida la silueta de carga).

### Fase 3 — La lista pinta lo que se ve

1. `content-visibility: auto` con tamaño reservado por sección de semestre.
2. Montaje por tramos: los primeros semestres en el primer cuadro y el resto en una transición.
3. Que el texto para buscadores de la página de carrera no se maquete (unos 790 objetos antes de que React arranque).

Meta: objetos maquetados al entrar 3 581 → ≤ 1 500; pantalla visible 3,2 → ≤ 2,5 s.

Hay que comprobar que siguen funcionando: saltar a un semestre, buscar desde la paleta, plegar secciones, la posición al volver y «buscar en la página».

### Fase 4 — Cambiar de vista sin rehacer

Experimento A/B antes de tocar nada: mantener el maquetado de la vista oculta (`content-visibility: hidden` o apilar con `visibility`) en lugar de `display:none`, conservando que React no trabaje en lo oculto.

Meta: objetos maquetados al volver ~2 000 → ≤ 100.

Se vigila la memoria con las tres vistas vivas. Si el A/B no da la mejora, la fase se cierra con el dato y sin cambio.

### Fase 5 — Estado granular

Sacar el avance (marcas, estados, electivas) de `VistaCarrera` a un almacén pequeño con `useSyncExternalStore`. Cada fila y cada tarjeta se suscribe solo a su materia; las vistas ocultas no se suscriben y se ponen al día al mostrarse.

Meta: marcar con la mitad de trabajo, y que cueste lo mismo con vistas ocultas que sin ellas.

Es también el principal arreglo de clean code: `VistaCarrera` deja de ser el componente que lo sabe todo y desaparece el reparto de props en cadena.

### Fase 6 — Mapa

1. Primera visita al mapa: montar formas y textos en cuadros separados; revisar la medición inicial de `useVistaGrafo`, que fuerza un maquetado de ~200 ms con el freno.
2. Mapa quieto en portátil: que la luz de los cables no obligue a recalcular estilos en cada cuadro.
3. Pendiente anterior: al alejar con el mapa llenando la pantalla se repinta en cada cuadro.

Todo cambio en lo que el mapa dibuja se mide con traza (Layerize, Paint), no contando cuadros.

### Fase 7 — Estructura

1. Partir los cinco archivos grandes por responsabilidad.
2. Extraer la lógica de `usePensum`, `useHorario` y `useCasillas` a funciones puras con pruebas.
3. Tipos sin costo en ejecución: JSDoc y `tsc --checkJs --noEmit` en el build, empezando por asignatura, sesión y layout.
4. Mover las comprobaciones de navegador de cada pantalla al repo (`scripts/verificar/`).
5. Detección de código y exportaciones sin uso dentro de `npm run lint`.

### Fase 8 — Teléfonos reales

1. Probar en dos o tres Android baratos reales con trazado remoto.
2. Comparar con Speed Insights tras cada fase publicada.
3. Fijar los presupuestos definitivos.

## 5. Lo que no se hace, y por qué

- **Backend o base de datos para ir más rápido.** Los datos son 2-3 kB estáticos por carrera, servidos desde CDN y guardados sin conexión. Una base de datos añade un viaje de red y un punto de fallo, y la fluidez se decide en el teléfono. Un backend sí tendría sentido para una función nueva: sincronizar el avance entre aparatos.
- **Ajustes internos de Chrome.** No se pueden activar en el navegador de otra persona. Lo equivalente que sí controlamos está en las fases: capas de GPU, `content-visibility`, contención, precargas y caché.
- **Reescribir el mapa en canvas o WebGL.** Los gestos ya repintan entre 1 y 6 veces y van a 11-20 ms por cuadro con la CPU frenada. Se perdería texto nítido y accesibilidad por un problema que hoy no se mide. Se reabre solo si los teléfonos reales lo desmienten.
- **Cambiar React por otra librería.** Ahorraría unos 40 kB, pero la app usa `<Activity>` de React 19 y habría que rehacer las vistas. Se revisa al final, con números.
