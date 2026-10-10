# Plan de rendimiento y clean code

Objetivo: que Mapa de Pensum vaya fluido en un teléfono Android de gama baja con datos lentos, y que el código quede en un estado que se pueda mantener. Se ejecuta por fases; cada fase tiene una meta medible y no se da por hecha hasta que el banco lo confirma.

| Fase | Estado |
| --- | --- |
| 0 · Instrumentos | Hecha el 2026-10-05 |
| 1 · Arranque: peso | Hecha el 2026-10-05. El CSS por pantalla pasó a la fase 2 |
| 2 · Un módulo por vista | Hecha el 2026-10-06 |
| 3 · La lista pinta lo que se ve | Hecha el 2026-10-06 |
| 4 · Cambiar de vista sin rehacer | Probada y retirada el 2026-10-07 |
| 5 · Estado granular | Hecha el 2026-10-09, con contextos en vez de almacén (ver abajo) |
| 6 · Mapa | El lanzamiento, hecho el 2026-10-09; lo demás, aplazado |
| 7 · Estructura | Hecha en parte el 2026-10-07 (ver abajo) |
| 8 | Pendiente |

## 1. Cómo está hecho hoy

- **Arranque.** `index` (React, portada, analítica: 77 kB de JS y 15 de CSS) → al entrar a una carrera llegan a la vez su pensum (2-3 kB), el cascarón `VistaCarrera` (25 kB de JS y 8 de CSS) y la vista con la que abre (lista 5 kB, mapa 16, horario 18).
- **Vistas.** `VistaCarrera` guarda todo el estado (marcas, electivas, vista, paneles) y monta mapa, lista y horario dentro de `<Activity>` de React 19: cada vista se monta la primera vez que se visita y después queda viva pero oculta. Cada una es un trozo de código aparte (`components/carreraPorTrozos.js`); las que no se abren al entrar se bajan en reposo, con el plan de ruta y la paleta.
- **Mapa.** SVG en planos memoizados; los gestos estiran una capa ya pintada en la GPU y repintan una vez al acabar (`layout/vistaViva.js`).
- **Modo ligero.** Todo aparato táctil va sin luces animadas ni cristal (`data/ligero.js`).
- **Lógica.** Reglas puras en `src/layout` y `src/data`, con 456 pruebas.
- **Lector de horario.** OCR en el aparato, cargado solo cuando se usa —el motor y, desde la fase 2, también la hoja que lo enseña—; el servidor es respaldo.
- **Estilos.** Tres niveles que se cargan en este orden: la hoja de entrada (`src/index.css`: Tailwind, tema, portada), la de la carrera (`estilos/carrera.css`, con el cascarón) y las del plan y del lector, cada una con su trozo.

No es código espagueti: la base es buena y ya tiene mucho trabajo de rendimiento encima. Lo que queda es estructural y está medido abajo.

## 2. Cómo se mide

Tres instrumentos, los tres en el repo:

- **`npm run rendimiento`** — Chrome real simulando un teléfono modesto (360×740 a 2x, CPU ×6, 4G lenta de 1,6 Mbps y 150 ms) y un portátil (CPU ×4). Tres medidas en `scripts/banco/`: `arranque`, `uso` y `gestos`. Enseña la mediana de tres pasadas y sale con código 1 si algo se pasa de su tope. Hay que correrlo antes de pasar nada a `main`. El servidor del banco entrega la página prerenderizada de la carrera y las cabeceras de caché de `vercel.json`, como producción. En el arranque cuenta aparte lo que se pide hasta ver la pantalla y lo que la página baja después, en reposo.
- **`scripts/peso.js`** — al final de cada `npm run build`. Tumba el build si la entrada, el cascarón de la carrera, una vista o el lector pasan de su tope.
- **`npm run comparar -- <build de antes>`** — abre 32 pantallas en ese build y en `dist/` y compara dos cosas: la foto, píxel a píxel, y los estilos calculados de cada elemento, propiedad a propiedad. Con `--movimiento` repite los estilos con las animaciones puestas. Es la comprobación de todo cambio que no debe verse: fuentes, reparto de CSS, mover reglas.

### Qué se juzga y qué no

El 2026-10-05 se midió lo mismo dos veces con una hora de diferencia y los tiempos salieron entre 1,4 y 3 veces más altos: había un juego en streaming abierto en el equipo. Un tope en milisegundos de reloj habría fallado sin que el código cambiara, así que el banco juzga solo lo que sale igual con el equipo ocupado:

- **Veces** (se juzgan, margen del 3-15 %): peticiones, nodos del documento, elementos a los que se les recalcula el estilo (`restilados`), objetos que se maquetan (`objetos`), repintados del mapa. Entre corridas, los objetos salen idénticos y los restilados varían un 1-3 %.
- **CPU** (se juzga con el doble de lo medido): ms de procesador del hilo principal. Se mueve menos que el reloj, pero se mueve.
- **Reloj** (se enseña, no se juzga): primer pintado, tiempo hasta ver la pantalla, respuesta al toque, bloqueo. Desde la fase 2 «ver la pantalla» es el momento en que la vista se pinta, apuntado dentro de la página; antes se medía desde fuera y salía unas décimas más alto.

Para afirmar que una fase bajó un **tiempo**, se comparan los dos builds seguidos en la misma sesión (`DIST=ruta/al/otro/build npm run rendimiento -- uso`), sin nada más abierto.

## 3. Línea base

Ingeniería de Sistemas con 8 marcas. «Al empezar» es el commit `ad907f0`; «hoy», tras la fase 3.

### Lo que el banco juzga

| Qué | Al empezar | Hoy | Meta | Fase |
| --- | --- | --- | --- | --- |
| Portada: peso que compite por el primer pintado | 228 kB (76 JS + 26 CSS + 126 fuentes) | 152 kB (77 + 15 + 60) | ≤ 150 kB | 1 y 2 |
| Portada: peso en segundo plano | 0 | 17 kB (letra del mapa) | — | — |
| Carrera: peticiones en cadena tras el HTML | 3 (el pensum y dos trocitos del código) | 0 | 0 | 1 y 2 |
| Carrera: JS de la carrera hasta la primera vista | 75,7 kB | 30 kB por la lista, 41 por el mapa, 43 por el horario | ≤ 40 kB | 2 |
| Carrera: descarga hasta ver la pantalla | 321 kB | 222 kB por la lista, 232 por el mapa | — | 1 y 2 |
| Carrera por la lista: objetos maquetados | 3 581 | 1 439 | ≤ 1 500 | 2 y 3 |
| Carrera por la lista: elementos restilados | 2 603 | 1 167 | ≤ 1 200 | 2 y 3 |
| Carrera por la lista: nodos | 4 330 | 4 377 | se quedan (ver fase 3) | 3 |
| Volver a la lista ya montada: objetos | 2 072 | 802 | ≤ 100 | 3 y 4 |
| Volver al mapa ya montado: objetos | 1 994 | igual | ≤ 100 | 4 |
| Volver a una vista montada: restilados | 1 595-1 695 | lista 724, mapa 1 655 | ≤ 150 | 4 y 6 |
| Marcar una materia: restilados / objetos | 325 / 829 | igual | la mitad | 5 |
| Marcar una materia: CPU | 141 ms | igual | ≤ 70 ms | 5 |
| Lista → mapa, primera vez: CPU | 144 ms | igual | ≤ 100 ms | 6 |
| Mapa quieto en portátil: recálculos de estilo | 203 en 2 s (uno por cuadro) | igual | 0 con las luces en otra capa | 6 |
| Gestos del mapa: repintados | rueda 3, arrastre 1, pellizco 6, dedo 1 | igual | mantener | — |
| Desplazar la lista: maquetados | 0 | igual | mantener | — |

Los objetos, restilados y nodos de la carrera salen más altos que en la primera versión de esta tabla (2 791, 2 183, 3 930) sin que la aplicación haya cambiado: el banco abría la portada genérica y no la página prerenderizada de la carrera, que trae además el texto para buscadores. Se corrigió en la fase 1. En la fase 2 ese texto dejó de maquetarse, y de ahí la bajada de objetos y restilados.

### Tiempos de referencia

Con el freno puesto, medianas de tres pasadas con el equipo tranquilo. Orientan; no son topes. Los de arranque de «al empezar» y de la fase 1 son de una comparación seguida entre los dos builds, medidos desde fuera de la página.

La fase 2 cambió la vara de «pantalla visible» (ver arriba), así que su comparación va aparte, los dos builds seguidos y con la vara nueva:

| Qué | Tras la fase 1 | Tras la fase 2 |
| --- | --- | --- |
| Portada: pantalla visible | 2,5 s | 2,3 s |
| Carrera por la lista: pantalla visible | 3,8 s | 3,6 s |
| Carrera por el mapa: pantalla visible | 3,9 s | 3,7 s |

Y la tabla de siempre, con la vara vieja:

| Qué | Al empezar | Tras la fase 1 | Meta |
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
- **Texto para buscadores** (resuelto en la fase 2): la página de cada carrera trae el pensum en HTML legible, que el navegador maquetaba —443 cajas, dos veces o más— antes de que React lo sustituyera.
- **Un solo trozo** (resuelto en la fase 2): `VistaCarrera` llevaba mapa, lista, horario, plan, paleta y exportadores. Quien solo usaba la lista descargaba y compilaba todo.
- **CSS en un solo archivo** (resuelto a medias en la fase 2): eran 690 reglas para todas las pantallas. La portada ya no carga las de la carrera, ni la carrera las del plan y el lector. Lo que no se pudo partir son las utilidades de Tailwind, unos 12 kB que comparten todas las pantallas.

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
3. ✅ **Caché en el navegador** para `/assets/*` (una hora) y para el modelo del lector (permanente) en `vercel.json`. Para `/assets/*` se puso primero permanente y se bajó al publicarlo: Vercel le pone la misma cabecera a un 404, y un archivo que no existe —el trozo de una versión anterior, pedido desde una pestaña vieja— quedaba guardado como «no existe» un año. Si ese archivo volvía con un revert, a esa persona no le cargaba. Con una hora se conserva lo que importaba —lo pedido por adelantado se usa sin volver a preguntar— y un 404 se olvida solo; las visitas siguientes salen del service worker, no de esta caché.
4. ✅ **El pensum se pide desde el HTML** de su carrera, a la vez que el código. Antes esperaba a que el JS principal se ejecutara: una ida y vuelta de más (~200 ms con 4G lenta).
5. ✅ **El banco mide lo que sirve producción**: la página prerenderizada y las cabeceras de caché.

Resultado medido seguido, antes contra después: la portada se pinta ~0,2 s antes y una carrera está en pantalla ~0,3-0,4 s antes, con 50 kB menos.

Lo que se probó y no se hizo:

- **Pedir la letra del mapa solo al ir al mapa.** No funciona en Chrome: un `<link rel="preload">` creado por script después de cargar la página no se reutiliza (el mapa la vuelve a pedir, se pinta con la letra del sistema y se maqueta dos veces, 3 350 objetos en vez de 2 000), y `document.fonts.load` la activa, lo que obliga a maquetar de nuevo todo lo que haya en pantalla (7 700 objetos en la lista en vez de 3 600). Lo único fiable es pedirla desde el HTML.
- **Aligerar el JS de entrada.** No hay de dónde: el 62 % es `react-dom`. La analítica de Vercel es el 2 % y ya se inyecta después del primer pintado; diferirla más arriesga perder visitas cortas a cambio de 1,6 kB. La meta de 65 kB se retira.
- **CSS por pantalla.** Pasa a la fase 2: la frontera de cada hoja es la del trozo de código que la usa, y partirla dos veces es el doble de riesgo. Además hay clases compartidas (`.boton-aro` vive en `mapa.css` y la usa la portada) que hay que reubicar con cuidado.

### Fase 2 — Un módulo por vista (hecha)

Lo que cambió, sin tocar un píxel (32 pantallas comparadas antes y después: fotos idénticas y, salvo lo que se dice abajo, estilos idénticos):

1. ✅ **Un trozo por vista** (`components/carreraPorTrozos.js`). El cascarón —estado y barras— son 25 kB y llega con la vista que se va a pintar. Las otras dos, el plan de ruta y la paleta se bajan en reposo, con la primera ya en pantalla; si esa bajada falla no pasa nada, se vuelve a pedir cuando haga falta.
2. ✅ **La hoja del lector de horarios, aparte.** Era un tercio del trozo del horario (26 → 18 kB) y se usa una vez por semestre. Empieza a bajar al tocar «Subir una foto».
3. ✅ **La página de cada carrera pide desde el HTML lo que va a necesitar**: cascarón, estilos, pensum y la vista con la que abre. La vista depende de lo guardado en el navegador, así que la decide un script suelto, como el del tema.
4. ✅ **Reparto en archivos gobernado** (`TROZOS` en `vite.config.js`). El empaquetador hacía un archivo por cada módulo compartido: 49 archivos, 17 peticiones solo para el cascarón. Con dos grupos son 25 y el cascarón, dos. De paso desapareció una espera en cadena que ya existía y no se había visto: dos trocitos que `VistaCarrera` importaba y nadie pedía por adelantado.
5. ✅ **CSS por niveles.** La portada carga 15 kB en vez de 25; los estilos de la carrera (8 kB) llegan con el cascarón, y los del plan y el lector con su trozo. Las reglas de «menos movimiento» y de impresión se repartieron con las hojas a las que apagan, porque ganan por ir detrás.
6. ✅ **El texto para buscadores ya no se maqueta** (adelantado de la fase 3). Con `content-visibility: hidden` sigue en el documento pero el navegador no lo prepara: 443 cajas menos por pasada, y eran entre dos y cinco pasadas. Sin JavaScript se le devuelve a los lectores de pantalla.
7. ✅ **Los instrumentos**: `comparar` compara también los estilos calculados, el banco separa lo que se pide para ver la pantalla de lo que llega después, y `peso.js` vigila cada trozo.

Resultado medido, los dos builds seguidos en el teléfono modesto del banco (cuatro rondas alternadas, medianas): el primer pintado de una carrera llega ~0,2 s antes y la vista entera entre 0,1 y 0,2 s antes, que en este equipo es menos de lo que baila una pasada de otra (una tanda anterior, sin el reparto del CSS, dio 0,3-0,4 s). Lo que no baila: 40-50 kB menos de descarga hasta ver la pantalla, un 24 % menos de objetos maquetados, un 18 % menos de elementos restilados y ninguna petición en cadena.

Metas, una a una:

- **JS hasta la primera vista 152 → ≤ 105 kB:** 107 por la lista, 118 por el mapa. Casi. Lo que falta está en el cascarón: el selector de electiva (1,8 kB) se queda porque partirlo rompía su precalentado.
- **CSS de la portada 25 → ≤ 13 kB:** 14,8. El resto son las utilidades de Tailwind, que usan todas las pantallas y no se pueden repartir en dos hojas sin que cambie cuál gana.
- **Analizar y compilar −40 %:** no se midió por separado. El procesador total del arranque quedó igual o algo por debajo; lo que baja es lo que se descarga y cuándo.
- **Recálculo del mapa quieto:** sin cambio medible. La carrera sigue cargando casi todas sus reglas; queda para la fase 6, que ataca la causa (un recálculo por cuadro).

Lo que se probó y no se hizo:

- **Montar la primera vista en una transición de React.** Bloquea el hilo la mitad, pero la vista llega más tarde (~0,3 s por la lista) y gasta más procesador, y cualquier actualización urgente que caiga en medio la reinicia: el precalentado del avance la interrumpía y la lista se preparaba dos veces. Se queda síncrono, como estaba. Tiene sentido volver a mirarlo en la fase 3, con la lista montándose por tramos.
- **Dejar que el empaquetador reparta solo, o por quién usa cada módulo** (`entriesAware`). De 31 a 49 archivos de cien bytes. Los dos grupos explícitos son más simples y dan menos peticiones.
- **Partir las utilidades de Tailwind por pantalla.** El orden entre utilidades decide cuál gana (`px-2` sobre `p-4`), y en dos hojas ese orden se rompe.

Lo que cambia sin verse, para que no sorprenda: la portada ya no define las siete variables `--cristal-*`, que solo usa la cabecera de la carrera; `comparar` contra un build anterior a esta fase las lista como diferencia en las cuatro pantallas de la portada.

Queda un riesgo conocido, que no es nuevo pero ahora tiene más sitios donde aparecer: si se pierde la conexión antes de que el service worker termine de guardar la aplicación y se toca una vista que aún no ha bajado, el fallo sigue el camino de «hay versión nueva»: borra la copia sin conexión y recarga. Bajar las vistas en reposo cierra casi toda esa ventana. Tratarlo bien —esperar a que vuelva la red sin recargar— es trabajo de otra fase.

### Fase 3 — La lista pinta lo que se ve (hecha)

Lo que cambió, sin tocar un píxel (32 pantallas comparadas contra el build de la fase 2: fotos idénticas; en estilos solo cambia lo que se dice abajo):

1. ✅ **El panel de cada fila cerrada no se prepara.** Era la mitad de lo que costaba entrar. Cada fila lleva montado su panel —el selector Aprobada/Cursando/Sin cursar y las pastillas del camino— para plegarse suave, y aunque estaba cerrado (alto 0, opacidad 0) se maquetaba entero. Ahora `.plegable` cerrado le pone `content-visibility: hidden` a lo de dentro, con una transición discreta (`allow-discrete`) de 360 ms: al abrir se ve desde el primer cuadro y al cerrar se queda hasta que acaba el pliegue. Vale también para los semestres plegados.
2. ✅ **El alto reservado de cada sección sale de sus filas.** `content-visibility: auto` ya estaba en cada sección, con 520 px reservados para todas. Medido: una cabecera son 50 px, cada fila 49,8. Con el valor fijo, Sistemas reservaba ~3 840 px para siete secciones que miden ~1 770, y la barra de desplazamiento encogía a saltos al bajar. Ahora `VistaLista` calcula la reserva de cada una (a ±4 px del alto real en Sistemas y en Agronómica).
3. ✅ **El montaje por tramos se queda.** Ya existía (tres secciones en el primer cuadro y el resto en una transición). Con lo anterior se probó quitarlo y montar todo de una vez: maqueta lo mismo, pero bloquea más (ver tabla).
4. ✅ **Comprobaciones de la lista en el repo** (`npm run verificar`, en `scripts/verificar/lista.js`): saltar a un semestre desde el resumen, «Elegir» una electiva hasta su grupo al final, ir a una materia de otro semestre desde sus pastillas, plegar y desplegar, abrir y cerrar una fila, la posición al volver del mapa y buscar en la página una materia aún sin pintar. Las siete pasan.

Resultado, los tres builds seguidos en el teléfono modesto del banco (cuatro rondas alternadas, medianas; medido en la nube, que va más rápida que el equipo de Sam, así que valen las diferencias y no los valores):

| Qué | Fase 2 | Fase 3 | Fase 3 sin tramos |
| --- | --- | --- | --- |
| Entrar por la lista: pantalla visible | 2 791 ms | 2 599 ms | 2 762 ms |
| Entrar por la lista: bloqueo | 707 ms | 483 ms | 672 ms |
| Mapa → lista, primera vez: bloqueo | 341 ms | 85 ms | 148 ms |
| Mapa → lista, primera vez: objetos | 2 094 | 824 | 813 |

Metas, una a una:

- **Objetos al entrar 2 709 → ≤ 1 500:** 1 439. El primer cuadro de la lista pasa de 1 036 objetos a 305.
- **Restilados 2 148 → ≤ 1 200:** 1 167. Lo que no se prepara tampoco se restila.
- **Pantalla visible 3,6 → ≤ 2,5 s:** no. Baja unos 0,2 s (un 7 %). La lista ya entra en el documento a ~2,5 s y se pinta ~0,1 s después; lo que queda antes es red y JavaScript (descargar ~220 kB con 4G lenta y ejecutar React), que no son de la lista. Para bajar de ahí hay que tocar el peso o el arranque de React, no la lista.
- **De regalo, adelantado de la fase 4:** volver a la lista ya montada maqueta 802 objetos en vez de 2 072 y restila 724 en vez de 1 754, porque los paneles cerrados ya no se rehacen al quitarle el `display:none`.
- **Nodos:** se quedan (4 377). Quitar del documento lo que no se ve rompería «buscar en la página», el lector de pantalla y el plegado suave; con `content-visibility` esos nodos ya casi no cuestan.

Lo que cambia sin verse, para que no sorprenda:

- **El tabulador ya no entra en lo cerrado.** Antes, con el teclado, el foco caía en botones invisibles: el selector de cada fila cerrada y las filas de un semestre plegado. Era un fallo de accesibilidad; ahora se saltan. Las comprobaciones lo vigilan.
- **«Buscar en la página» ya no encuentra lo plegado.** Antes lo encontraba, pero no se veía (alto 0 y opacidad 0); ahora no lo encuentra. Lo que está desplegado se encuentra aunque esté lejos y sin pintar. Si se quiere que la búsqueda despliegue el semestre solo, el camino es `hidden="until-found"` con su evento `beforematch`.
- `comparar` contra un build anterior marca 7 pantallas por estilos, nunca por fotos: la transición de los paneles (`transition` sobre `content-visibility`), la reserva de cada sección (`contain-intrinsic-size`) y, por ella, el alto total de la lista mientras las secciones de abajo no se han pintado.

Lo que se miró y no se hizo:

- **Quitar los tramos** (ver tabla): mismo maquetado y más bloqueo.
- **Marcar una materia sale con más objetos** (640 → 728) y no es una regresión. Después de marcar, el porcentaje del resumen se anima y cada cuadro maqueta 21 objetos durante ~600 ms; con la lista más ligera caben más cuadros en esa animación (31 contra 24). La pasada de la marca en sí baja de 67 a 50. Ese número que se maqueta en cada cuadro queda para la fase 5.

Topes del banco bajados a lo medido: entrar por la lista (restilados 1 205, objetos 1 485) y volver a la lista ya montada (restilados 750, objetos 830).

### Fase 4 — Cambiar de vista sin rehacer (probada y retirada)

Se probó ocultar la vista que se deja con `content-visibility: hidden` en vez de `display:none`, para que el navegador guardara su maquetado. Funcionaba en el banco —volver a la lista pasaba de ~1 300 objetos y ~0,4 s a ~75 objetos y ~35 ms, con la misma memoria— pero se retiró el 2026-10-07:

- **Era un parche contra React.** `<Activity>` oculta con un `display:none !important` en línea que ningún CSS vence, así que había que quitárselo a mano con un `MutationObserver` y envolver cada vista en una capa. Si React cambia cómo oculta, deja de funcionar sin avisar.
- **Rompió el mapa en un teléfono real** sin que el banco lo viera: al reiniciar las animaciones de la vista se reanudaba la que mueve el mapa en los gestos, y el mapa dejaba de seguir al dedo al volver a él. El banco medía en Chrome emulado y el fallo solo aparecía tras ir a otra vista y volver; ahora hay comprobaciones para eso (`npm run verificar`, `gestos`).
- **Navegadores sin `content-visibility`** (Safari anterior al 18) habrían dejado las tres vistas pintadas y apiladas.

La ganancia no compensa esa fragilidad: las vistas ya iban bien. Se conserva lo que sirvió: las comprobaciones del mapa al volver, el escenario «dedo tras volver de la lista» del banco, `comparar --transparente` y la defensa de `moverCapa`. Si algún día `<Activity>` ofrece ocultar sin `display:none`, vale la pena volver a mirarlo.

### Fase 5 — Estado granular (hecha)

El avance (marcas, estados, progreso, cuotas de electivas, el toque y la descarga) ya no lo reparte `VistaCarrera` por props. `usePensum` vive en `ProveedorAvance` y se lee por cuatro contextos que cambian en momentos distintos —avance, toque, descarga y acciones—, con un hook por dato en `hooks/useAvance.js`. `VistaCarrera` queda de cascarón: la pantalla de dentro solo actúa y lee los estados en el momento de pulsar (`leer()`), así que marcar no la repinta.

**Por qué contextos y no el almacén con `useSyncExternalStore` que decía este plan.** Las vistas ocultas viven en un `<Activity>` con los efectos desmontados, y un almacén externo se suscribe en un efecto: las dejaría sin poner al día hasta volver a ellas, y entonces todo de golpe y de forma síncrona. Con estado de React se ponen al día en segundo plano, como hasta ahora, y volver a una vista sigue siendo enseñarla.

Lo que se hizo, cada cosa en su commit:

1. **El cálculo, a funciones puras con pruebas**: `estadosDe`, `avanceDeGrupos`, `progresoDe`, `depurarMarcas` y `conMarcas` en `data/avance.js` (21 pruebas). `usePensum` pasa de 279 a 152 líneas.
2. **El contador de cada animación, solo a quien la hace.** El del toque y el de la descarga se pasaban a las 130 tarjetas, a sus cables y a las 60 filas, y al cambiar en cada marca las repintaban todas, dos o tres veces.
3. **Los contextos.** La fila de la lista recibe su situación ya calculada en vez del mapa entero de estados.
4. **Lo de dentro de una fila cerrada no se monta** hasta que se abre por primera vez: las pastillas de «Le falta» y «Desbloquea» de sesenta filas que nadie ha abierto eran 745 nodos, y cada una miraba los estados de todas las demás.

Medido en el teléfono modesto del banco («marcar una materia», con las tres vistas montadas):

| | Antes | Ahora |
| --- | --- | --- |
| Del toque al pintado | 168 ms | 96 ms |
| Tareas largas tras el toque | 69 ms | 14 ms |
| Nodos en el documento | 6 463 | 5 718 |
| JavaScript, perfil de CPU sin freno | 70 ms | 48 ms |
| El golpe a los 2,4 s, al acabar la animación de aprobar | 11–17 ms | 2–3 ms |

La meta era la mitad de trabajo y se queda en un tercio menos de JavaScript; lo que sí baja casi a la mitad es lo que nota quien toca. Los restilados y los objetos maquetados de ese toque no bajan (265 y 875, dentro de su tope): con las filas cerradas vacías, lo que queda por maquetar es la cabecera, el resumen y la fila tocada.

Lo que cambia sin verse: `comparar` contra un build anterior da siete pantallas con «otro estilo» y las mismas fotos, por esos 745 nodos que ya no existen. `verificar` abre las filas para encontrar sus pastillas.

Queda como está, a propósito: la paleta, el plan y el panel de avance leen el avance mientras están montados y se repintan con cada marca, como antes; son pocos nodos y solo existen después de abrirlos.

### Fase 6 — Mapa

1. Primera visita al mapa: montar formas y textos en cuadros separados; revisar la medición inicial de `useVistaGrafo`, que fuerza un maquetado de ~200 ms con el freno.
2. Mapa quieto en portátil: que la luz de los cables no obligue a recalcular estilos en cada cuadro.
3. Pendiente anterior: al alejar con el mapa llenando la pantalla se repinta en cada cuadro.
4. ✅ **El mapa lanzado corre en la GPU** (2026-10-09). Al soltar un arrastre con velocidad, la inercia la ponía JavaScript cuadro a cuadro, y un lanzamiento normal se salía de lo pintado a medio camino: el mapa se pintaba entero con el mapa en marcha, y ese cuadro parado es lo que en un teléfono modesto se sentía como que «no frena fluido». Ahora el recorrido entero se calcula al soltar (`trayectoriaDeLanzamiento`), se pinta **una** vez lo que va a necesitar (`vistaParaLanzamiento`) y la capa lo recorre sola con una animación del compositor (`animarCapa`): lo que tarde el hilo principal —incluido ese pintado— no le quita cuadros. Un dedo lo para donde va.

   Medido en teléfono emulado a CPU ×6, pintados del mapa desde que se suelta hasta que queda nítido: lanzamiento normal 2 → 1, medio 2 → 2, fuerte 3 → 2, muy fuerte 5 → 2; el recorrido y lo que tarda en parar, iguales; la posición en pantalla, continua cuadro a cuadro también en el cambio de capa. Lo que la emulación **no** ve es el compositor: que en un teléfono real el deslizamiento no pierda cuadros se comprueba con el teléfono en la mano (fase 8).

   Queda cuadro a cuadro, como antes, lo que no puede ir así: un navegador sin animaciones, un lanzamiento tan largo que ninguna capa lo abarca, y el mapa con la ficha de escritorio enganchada.

5. **El pintado nítido al parar, medido y sin cambio** (2026-10-09). Se sospechaba que pintar el mapa al quedarse quieto era el tirón del final de cada gesto. Con traza a CPU ×6, tras un arrastre y tras un pellizco: la tarea más larga dura 26–35 ms, y de eso el estilo, el maquetado y el pintado son unos 30 ms repartidos; el raster va en la GPU y no llega a 5 ms. No hay nada que repartir ni que abaratar, y pintar a menos resolución no ganaría nada: lo caro nunca fue el número de píxeles.

Todo cambio en lo que el mapa dibuja se mide con traza (Layerize, Paint), no contando cuadros.

### Fase 7 — Estructura (hecha en parte)

Hecho, sin cambiar nada de lo que se ve (en cada paso: build en verde, `comparar` con 32 pantallas idénticas con y sin movimiento, `verificar` y, si tocaba el mapa, el banco de gestos igual):

1. ✅ **Los cinco archivos grandes, partidos por responsabilidad**, uno por commit:
   - `VistaLista` 922 → 240 líneas: sus piezas en `components/lista/` (Selector, Camino, FilaMateria, Riel, Resumen, CasillaLista, Filtros, SeccionSemestre, SeccionGrupo, el montaje por tramos).
   - `PlanRuta` 615 → 35: `components/plan/`.
   - `DetalleAsignatura` 604 → 316: `components/ficha/`.
   - `GrafoPensum` 583 → 482: dos hooks (`useSenalado`, `useFichaSaliente`).
   - `useVistaGrafo` 898 → 831: se le saca solo lo puro; el resto es hablar con el navegador a través de refs que se comparten entre gestos, cámara y viajes, y partirlo arriesga justo lo que más cuesta de medir. Si se parte, que sea con el banco de gestos delante.
2. ✅ **Lógica pura con pruebas** (`node:test`): filtros y cuentas de la lista, semestres y secciones, alturas reservadas (`layout/filtrosLista`, `semestresLista`, `alturaLista`), límites, zoom e inercia del mapa (`limitesVista`), cajas y manejadores (`cajas`, `manejadores`). 34 pruebas nuevas, 490 en total.
3. ✅ **Comprobaciones de navegador en el repo**: `npm run verificar` (`scripts/verificar/lista.js` y `mapa.js`), 14 comprobaciones.

Pendiente:

- **Sacar la lógica de `usePensum`, `useHorario` y `useCasillas`** a funciones puras con pruebas.
- **Tipos con JSDoc y `tsc --checkJs` en el build.** Necesita `typescript` como dependencia de desarrollo, que rompe el «cero dependencias»; falta que Sam lo confirme.
- **Detección de código y exportaciones sin uso** dentro de `npm run lint`: `oxlint` no la trae, y las herramientas que la hacen (knip) son otra dependencia.
- `VistaCarrera.jsx` sigue siendo el archivo más largo después de `useVistaGrafo`. La fase 5 le quitó el avance; lo que le queda es el estado de la pantalla (vista, paneles, selección, casillas), que es suyo.
- **El presupuesto de «portátil · rueda» del banco de gestos está en rojo desde antes del 2026-10-09** (recálculos 440–466 contra 435, igual con el build anterior a cada cambio de ese día). Cuenta recálculos por cuadro mientras gira la rueda, así que sube con los cuadros que dé el equipo: hay que juzgarlo por cuadro o buscar qué commit lo subió.

### Fase 8 — Teléfonos reales

1. Probar en dos o tres Android baratos reales con trazado remoto.
2. Comparar con Speed Insights tras cada fase publicada.
3. Fijar los presupuestos definitivos.

## 5. Lo que no se hace, y por qué

- **Backend o base de datos para ir más rápido.** Los datos son 2-3 kB estáticos por carrera, servidos desde CDN y guardados sin conexión. Una base de datos añade un viaje de red y un punto de fallo, y la fluidez se decide en el teléfono. Un backend sí tendría sentido para una función nueva: sincronizar el avance entre aparatos.
- **Ajustes internos de Chrome.** No se pueden activar en el navegador de otra persona. Lo equivalente que sí controlamos está en las fases: capas de GPU, `content-visibility`, contención, precargas y caché.
- **Reescribir el mapa en canvas o WebGL.** Los gestos ya repintan entre 1 y 6 veces y van a 11-20 ms por cuadro con la CPU frenada. Se perdería texto nítido y accesibilidad por un problema que hoy no se mide. Se reabre solo si los teléfonos reales lo desmienten.
- **Cambiar React por otra librería.** Ahorraría unos 40 kB, pero la app usa `<Activity>` de React 19 y habría que rehacer las vistas. Se revisa al final, con números.
