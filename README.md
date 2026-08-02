# Mapa de Pensum — Ing. de Sistemas UDO

Visualizador interactivo del pensum de Ingeniería de Sistemas de la Universidad de
Oriente, Núcleo Monagas. Las 49 asignaturas se dibujan como un grafo de prerrequisitos
con estética de placa de circuito: los cables que unen las materias se encienden a
medida que apruebas lo que va antes.

## Demo

**[mapa-pensum.vercel.app](https://mapa-pensum.vercel.app)**

<!-- Cuando grabes un GIF de la app, súbelo a docs/ y descomenta esta línea:
![Mapa de Pensum en acción](docs/demo.gif)
-->

## Qué hace

- **Grafo de prerrequisitos** de las 49 asignaturas en 10 semestres, dibujado a mano en SVG.
- **Marcar tu avance** como un checklist: un click marca la materia, otro la desmarca. Al
  aprobar, la corriente baja por los cables hacia lo que acabas de desbloquear.
- **Estados derivados**: solo se guardan tus marcas de *aprobada* y *cursando*.
  *Disponible* y *bloqueada* se recalculan siempre a partir de los prerrequisitos.
- **Cadena completa**: al señalar una materia se ilumina todo lo que necesita hacia atrás
  y todo lo que abre hacia adelante.
- **Electivas**: catálogo de las 39 electivas técnicas y humanísticas, con las cuotas de
  15 y 6 UC que exige el título.
- **Planificador de ruta**: calcula en cuántos semestres terminas según la carga que puedas
  llevar, respetando todas las prelaciones, y te lo lleva en PDF o Markdown.
- **Avance por área**, con filtro para aislar cada área en el mapa.
- **Vista de lista** para móvil: el mismo contenido en un formato que se lee con el pulgar,
  porque el mapa completo mide 3200 px y en un teléfono solo cabe a escala 0.10.
- Tema claro/oscuro, pan y zoom, y todo el progreso guardado en el navegador.

## Correr en local

```bash
npm install
npm run dev
```

| Script | Qué hace |
|---|---|
| `npm run dev` | Normaliza los datos y arranca el servidor de desarrollo |
| `npm run datos` | Genera `src/data/carreras/` desde `datos/` |
| `npm run validar` | Valida los pensums normalizados (ver abajo) |
| `npm run build` | Normaliza, valida y compila a `dist/` |
| `npm run lint` | oxlint |
| `npm run preview` | Sirve el build ya compilado |

## Stack

**Vite · React · JavaScript · Tailwind CSS**

Iconos de [Lucide](https://lucide.dev) y tipografías Manrope y JetBrains Mono servidas
desde el propio bundle con `@fontsource`. El grafo está dibujado a mano en SVG, sin
librerías de grafos.

## Hosting

Desplegado en **Vercel**. El repo trae `vercel.json`: al importar el repositorio, Vercel
detecta Vite, corre `npm run build` y publica `dist/`.

Como el build corre el validador primero, un pensum inconsistente rompe el deploy en vez
de llegar a producción.

El contador de visitas es **Vercel Web Analytics** (`@vercel/analytics`, montado en
`src/main.jsx`). Hay que activarlo una vez desde la pestaña *Analytics* del proyecto en
Vercel; en local no envía nada, solo escribe los eventos en la consola.

## Los datos

Ocho carreras del núcleo, cada una con su pensum. El flujo es de una sola dirección:

```
datos/crudo/*.json     Scrape de la DACE tal cual. NO se edita a mano.
datos/overlay.json     Lo que sabemos y la DACE no publica.
        ↓  npm run datos
src/data/carreras/     Generado. Un JSON por carrera + el índice.
```

**Agregar una carrera es dejar caer su JSON en `datos/crudo/`.** El resto se descubre
solo: el normalizador la recoge, Vite le hace su propio chunk y aparece funcionando.
Añadirle color y créditos en el overlay es opcional.

Que el crudo no se toque es lo que permite volver a bajar el pensum cuando la DACE lo
cambie sin perder el trabajo hecho encima.

Dos reglas sobre los códigos, ambas comprobadas contra los 88 registros verificados de
Sistemas:

- **El último dígito son las unidades crédito.** Acierta 88/88, así que la UC se deriva.
- **El penúltimo NO es el semestre.** Falla el 73% en Sistemas, 66% en Petróleo y 71% en
  Alimentos. El semestre sale de las claves del JSON y de ningún otro sitio.

Solo Sistemas tiene créditos oficiales (153, confirmados por INTRADACE) y áreas
clasificadas a mano. Las demás cargan igual, y lo que depende de datos que no hay
—porcentaje de avance, cuotas de electivas, colores por área— **no se muestra en vez de
inventarse**.

## El validador

`npm run validar` corre sobre los pensums normalizados, o sea sobre exactamente lo mismo
que lee la app, y falla con código 1 si algo no cuadra. Por carrera comprueba que todo
código en `prerrequisitos` exista, que no haya ciclos, que ningún prerrequisito esté en
un semestre igual o posterior, que no haya códigos duplicados, que las cuotas sean
alcanzables con la oferta y que los créditos cuadren.

Acepta una ruta alterna como argumento, útil para probarlo contra datos rotos a propósito:

```bash
node scripts/validar-pensum.js ruta/a/otra/carpeta
```

## Estructura

```
datos/                      Fuente: crudo intocable + overlay
scripts/
├── normalizar.js           crudo + overlay → modelo único
└── validar-pensum.js       Puerta de calidad del build
src/
├── data/carreras.js        Índice y carga por carrera (un chunk cada una)
├── layout/
│   ├── constantes.js       Toda la geometría del mapa
│   ├── calcularLayout.js   Asignaturas → coordenadas (función pura)
│   ├── aristas.js          Ruteo de los cables
│   ├── relaciones.js       Adyacencia y cadenas de prerrequisitos
│   └── planificador.js     Reparto de materias por semestre
├── hooks/
│   ├── usePensum.js        Estados, progreso y persistencia
│   ├── useVistaGrafo.js    Pan, zoom y encaje
│   └── useTema.js          Claro/oscuro
├── components/             Grafo, nodos, aristas, paneles, plan
└── theme/areas.js          Paleta por área
```

Tres decisiones que explican casi todo el código:

**El layout es determinista.** `calcularLayout()` es una función pura: X según el semestre,
Y según el índice dentro del semestre. Mismas asignaturas, mismas coordenadas siempre.
Nada de simulaciones de fuerzas.

**Los cables nunca pasan por encima de una tarjeta.** Los que unen semestres contiguos
viajan por el hueco vacío entre columnas. Los que saltan más de un semestre cruzan por el
pasillo libre que queda entre dos tarjetas de la columna intermedia.

**El resplandor no usa filtros SVG.** Se apilan trazos cada vez más anchos y transparentes.
Un `feGaussianBlur` con `objectBoundingBox` no pinta nada sobre una línea perfectamente
horizontal, porque la región del filtro queda con altura cero.

## Los créditos

El título son **153 unidades crédito**, según INTRADACE:

| | UC |
|---|---|
| 49 asignaturas obligatorias | 132 |
| Electivas técnicas | 15 |
| Electivas humanísticas | 6 |
| **Total** | **153** |

Los códigos y las prelaciones están verificados contra el pensum oficial vigente
(resolución CU-021/2013). Las UC de cada asignatura salen del último dígito de su código;
el documento oficial no las declara, pero la suma cuadra exactamente con el total de
INTRADACE, así que el criterio es correcto.

Aparte quedan dos requisitos de grado sin peso en esos 153: el **Servicio Comunitario**
(`0214100`) y la **Extraacadémica Deportiva** (`0151111`).

## Licencia

MIT.
