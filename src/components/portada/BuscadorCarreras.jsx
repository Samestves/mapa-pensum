import { useEffect, useRef, useState } from 'react'
import { IconoBuscar } from '../IconosSF'
import { buscarCarreras } from '../../data/portada'
import FilaCarrera from './FilaCarrera'

/**
 * La hoja de buscar del telefono: el campo arriba, ya con el teclado, y las
 * carreras que coinciden debajo mientras se escribe. Tocar una abre su ficha.
 */
function BuscadorCarreras({ carreras, colorDe, avances, alElegir, alPrecargar }) {
  const [texto, setTexto] = useState('')
  const campo = useRef(null)
  const halladas = buscarCarreras(carreras, texto)

  /* El teclado sale cuando la hoja ya subio: abrirlo a la vez que sube hace
     que el telefono recoloque la pantalla dos veces seguidas. */
  useEffect(() => {
    const t = setTimeout(() => campo.current?.focus({ preventScroll: true }), 380)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="px-5 pb-5">
      <label className="buscador-hoja">
        <IconoBuscar size={20} />
        <input
          ref={campo}
          type="search"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Sistemas, Petróleo, Contaduría…"
          aria-label="Buscar tu carrera"
          autoComplete="off"
          enterKeyHint="search"
        />
      </label>

      <p className="mt-5 mb-1 px-1 text-[12.5px] font-medium text-tinta-tenue">
        {texto.trim()
          ? halladas.length === 1
            ? '1 carrera'
            : `${halladas.length} carreras`
          : 'Todas las carreras'}
      </p>
      {halladas.length ? (
        <ul className="lista-panel">
          {halladas.map((carrera) => (
            <li key={carrera.slug}>
              <FilaCarrera
                carrera={carrera}
                color={colorDe(carrera)}
                hechas={avances[carrera.slug]?.hechas}
                alElegir={alElegir}
                alPrecargar={alPrecargar}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-8 text-center text-[14.5px] text-tinta-tenue">
          Ninguna carrera se llama así. Prueba con una palabra, como «sistemas».
        </p>
      )}
    </div>
  )
}

export default BuscadorCarreras
