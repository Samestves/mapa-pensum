# Mapa de Pensum — Ing. de Sistemas UDO

Visualizador interactivo del pensum de Ingeniería de Sistemas de la Universidad de
Oriente, Núcleo Monagas. Las 49 asignaturas se dibujan como un grafo de prerrequisitos
con estética de placa de circuito: los cables que unen las materias se encienden a
medida que apruebas lo que va antes.

## Qué hace

- **Grafo de prerrequisitos** de las 49 asignaturas en 10 semestres, dibujado a mano en SVG.
- **Marcar tu avance**: click en una materia abre su ficha, con botones para aprobada,
  cursando o sin cursar. Al aprobar, la corriente baja por los cables hacia lo que acabas
  de desbloquear.
- **Estados derivados**: solo se guardan tus marcas de *aprobada* y *cursando*.
  *Disponible* y *bloqueada* se recalculan siempre a partir de los prerrequisitos.
- **Cadena completa**: al señalar una materia se ilumina todo lo que necesita hacia atrás
  y todo lo que abre hacia adelante.
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

## El validador

`npm run validar` corre antes de cada build y falla con código 1 si algo no cuadra.
Comprueba que todo código en `prerrequisitos` exista, que no haya ciclos, que ningún
prerrequisito esté en un semestre igual o posterior, que no haya códigos duplicados y
que los totales de `meta` coincidan con los datos reales.

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
│   └── relaciones.js       Adyacencia y cadenas de prerrequisitos
├── hooks/
│   ├── usePensum.js        Estados, progreso y persistencia
│   ├── useVistaGrafo.js    Pan, zoom y encaje
│   └── useTema.js          Claro/oscuro
├── components/             Grafo, nodos, aristas, paneles
└── theme/areas.js          Paleta por área
```

Dos decisiones que explican casi todo el código:

**El layout es determinista.** `calcularLayout()` es una función pura: X según el semestre,
Y según el índice dentro del semestre. Mismas asignaturas, mismas coordenadas siempre.
Nada de simulaciones de fuerzas.

**Los cables nunca pasan por encima de una tarjeta.** Los que unen semestres contiguos
viajan por el hueco vacío entre columnas. Los que saltan más de un semestre bajan a un
canal de ruteo por debajo de todos los nodos, lo recorren y vuelven a subir, cada uno en
su propio carril.

## Stack

Vite · React · JavaScript · Tailwind CSS · SVG a mano (sin librerías de grafos) ·
localStorage · Netlify.

## Desplegar

El repo trae `vercel.json` listo: basta con importar el repositorio en Vercel, que detecta
Vite, corre `npm run build` y publica `dist/`. También queda un `netlify.toml` equivalente
por si prefieres Netlify.

Como el build corre el validador primero, un `pensum.json` inconsistente rompe el deploy en
vez de llegar a producción.

## Pendiente

Las unidades crédito de `pensum.json` se dedujeron del último dígito del código de cada
asignatura y suman 132 UC. **No están verificadas contra el pensum oficial de la escuela.**
El porcentaje de avance depende de ellas, así que conviene confirmarlas antes de tomárselo
en serio.
