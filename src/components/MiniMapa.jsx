/**
 * Miniatura del pensum: una columna por semestre y un punto por materia.
 *
 * Se dibuja de la silueta real de cada carrera, asi que ninguna se parece a
 * otra: Agronomica arranca con nueve materias y baja a tres, Alimentos es
 * corta y pareja, Sistemas se ensancha en el medio. La identidad sale de la
 * estructura del pensum y no de un icono decorativo, y aparece sola cuando se
 * agrega una carrera nueva.
 *
 * Con `hechas` -cuantas aprobaste de cada semestre- es tambien tu coleccion:
 * los puntos de lo aprobado quedan encendidos y el resto se apaga, asi que la
 * silueta se va llenando a medida que avanzas. Al llegar el dato, el cambio
 * recorre las columnas de izquierda a derecha, semestre a semestre.
 */
function MiniMapa({ silueta, color, hechas, className = '', style }) {
  const columnas = silueta.length
  const maxFilas = Math.max(...silueta, 1)

  const PASO_X = 10
  const PASO_Y = 7
  const R = 2.1
  const ancho = columnas * PASO_X
  const alto = maxFilas * PASO_Y

  return (
    <svg
      viewBox={`0 0 ${ancho} ${alto}`}
      className={className}
      style={style}
      aria-hidden="true"
      preserveAspectRatio="xMidYMid meet"
    >
      {silueta.map((cantidad, col) =>
        Array.from({ length: cantidad }, (_, fila) => {
          // Las de abajo se apagan un poco: da profundidad y deja leer la
          // forma de la columna sin dibujar ninguna linea extra.
          const reposo = 0.95 - (fila / maxFilas) * 0.5
          const opacidad = hechas ? (fila < (hechas[col] ?? 0) ? 0.95 : 0.16) : reposo
          return (
            <circle
              key={`${col}-${fila}`}
              cx={col * PASO_X + PASO_X / 2}
              cy={fila * PASO_Y + PASO_Y / 2}
              r={R}
              fill={color}
              style={{
                opacity: opacidad,
                transition: 'opacity 700ms cubic-bezier(0.22, 0.61, 0.2, 1)',
                transitionDelay: `${col * 45}ms`,
              }}
            />
          )
        }),
      )}
    </svg>
  )
}

export default MiniMapa
