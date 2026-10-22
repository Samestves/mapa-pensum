import { IconoBuscar } from '../IconosSF'
import { PLURAL, TIPOS, TODAS, buscarCarreras, tipoDe } from '../../data/portada'
import FilaCarrera from './FilaCarrera'

/**
 * Las carreras para elegir: un filtro por tipo arriba y la lista debajo.
 *
 * Con "Todas" van agrupadas bajo su tipo, porque nueve renglones seguidos no
 * se recorren, se leen; con un tipo elegido, el grupo ya es el filtro. En
 * escritorio lleva ademas el buscador en linea; en el telefono el buscador es
 * el boton de abajo, al alcance del pulgar (ver BotonBuscar).
 *
 * @param {string} props.titulo  lo que encabeza la lista
 * @param {object[]} props.carreras  las que se ofrecen (sin la tuya, si vuelves)
 */
function ListaCarreras({
  titulo,
  carreras,
  tipo,
  texto,
  colorDe,
  avances,
  alCambiarTipo,
  alCambiarTexto,
  alElegir,
  alPrecargar,
}) {
  const halladas = buscarCarreras(carreras, texto, tipo)
  const tipos = TIPOS.filter((t) => carreras.some((c) => tipoDe(c) === t))
  const agrupar = tipo === TODAS && !texto.trim()

  const fila = (carrera) => (
    <li key={carrera.slug}>
      <FilaCarrera
        carrera={carrera}
        color={colorDe(carrera)}
        hechas={avances[carrera.slug]?.hechas}
        alElegir={alElegir}
        alPrecargar={alPrecargar}
      />
    </li>
  )

  return (
    <section aria-labelledby="lista-carreras" className="lista-carreras">
      <h2
        id="lista-carreras"
        className="font-ui text-[21px] font-normal tracking-[-0.01em] text-tinta"
      >
        {titulo}
      </h2>

      <label className="buscador-en-linea">
        <IconoBuscar size={19} />
        <input
          type="search"
          value={texto}
          onChange={(e) => alCambiarTexto(e.target.value)}
          placeholder="Buscar tu carrera"
          aria-label="Buscar tu carrera"
          autoComplete="off"
        />
      </label>

      <div role="group" aria-label="Tipo de carrera" className="filtro-carreras">
        {[TODAS, ...tipos].map((t) => (
          <button key={t} type="button" aria-pressed={tipo === t} onClick={() => alCambiarTipo(t)}>
            {t === TODAS ? 'Todas' : PLURAL[t]}
          </button>
        ))}
      </div>

      {!halladas.length ? (
        <p className="py-10 text-center text-[14.5px] text-tinta-tenue">
          Ninguna carrera se llama así. Prueba con una palabra, como «sistemas».
        </p>
      ) : agrupar ? (
        tipos.map((t) => (
          <div key={t} className="grupo-carreras">
            <h3>
              {PLURAL[t]}
              <span>{halladas.filter((c) => tipoDe(c) === t).length}</span>
            </h3>
            <ul className="lista-panel">{halladas.filter((c) => tipoDe(c) === t).map(fila)}</ul>
          </div>
        ))
      ) : (
        <ul className="lista-panel mt-4">{halladas.map(fila)}</ul>
      )}
    </section>
  )
}

export default ListaCarreras
