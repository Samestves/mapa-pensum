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
- **Planificador de ruta**: calcula en cuántos semestres terminas según la carga que puedas
  llevar, respetando todas las prelaciones, y te lo lleva en PDF o Markdown.
- **Avance por área**, con filtro para aislar cada área en el mapa.
- Tema claro/oscuro, pan y zoom, y todo el progreso guardado en el navegador.

## Correr en local

```bash
npm install
npm run dev
```

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run validar` | Valida `pensum.json` (ver abajo) |
| `npm run build` | Valida y compila a `dist/` |
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

Como el build corre el validador primero, un `pensum.json` inconsistente rompe el deploy
en vez de llegar a producción.

## El validador

`npm run validar` falla con código 1 si algo no cuadra. Comprueba que todo código en
`prerrequisitos` exista, que no haya ciclos, que ningún prerrequisito esté en un semestre
igual o posterior, que no haya códigos duplicados y que los totales de `meta` coincidan
con los datos reales.

Acepta una ruta alterna como argumento, útil para probarlo contra un JSON roto a propósito:

```bash
node scripts/validar-pensum.js otro-pensum.json
```

## Estructura

```
src/
├── data/pensum.json        Fuente de verdad: 49 asignaturas
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

## Pendiente

Las unidades crédito de `pensum.json` se dedujeron del último dígito del código de cada
asignatura y suman 132 UC. **El pensum oficial vigente no declara las UC en ninguna parte**:
solo lista código, asignatura y prelación. Códigos y prelaciones sí están verificados contra
él; las UC siguen siendo una inferencia.

El pensum oficial incluye además **8 asignaturas electivas** (3 socio-humanísticas y 5
técnicas) que este mapa todavía no modela.

## Licencia

MIT.
