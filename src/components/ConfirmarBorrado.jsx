import { useState } from 'react'
import { useEsTelefono } from '../hooks/useEsTelefono'
import HojaInferior from './HojaInferior'
import Ventana from './Ventana'

const ETIQUETA = 'Borrar el horario'

/**
 * La pregunta antes de borrar el horario entero.
 *
 * Borrar una clase no pregunta: se vuelve a poner en diez segundos. Borrar
 * todas si, porque no hay vuelta atras y detras puede haber una tarde de
 * armarlo. Dice lo que se pierde con su numero y lo que pasa despues, y la
 * accion que destruye no va llena: la facil es cancelar.
 *
 * En el telefono es una hoja y en escritorio una ventana, como todo lo que se
 * abre encima.
 *
 * @param {number} props.clases  cuantas clases se van a quitar
 */
function ConfirmarBorrado({ clases, alBorrar, alCerrar }) {
  const telefono = useEsTelefono()

  /* Lo que hay que hacer cuando la hoja termine de irse. En el telefono baja
     antes de desaparecer, y tanto borrar como cancelar la desmontan: se guarda
     la accion y se cumple al acabar la bajada. */
  const [despedida, setDespedida] = useState(null)
  const irse = (accion) => (telefono ? setDespedida(() => accion) : accion())
  const cerrar = () => irse(alCerrar)

  const cuerpo = (
    <div className="mx-auto flex w-full max-w-[380px] flex-col items-center px-5 pt-3 pb-6 text-center md:pt-8 md:pb-7">
      <h2 className="text-[18px] leading-tight font-medium tracking-[-0.015em] text-tinta">
        ¿Borrar todo el horario?
      </h2>
      <p className="mt-2 max-w-[32ch] text-[13px] leading-normal text-balance text-tinta-suave">
        {clases === 1 ? 'Se quita la clase' : `Se quitan las ${clases} clases`} de tu semana y
        vuelves al inicio, para subir otra foto o armarlo a mano.
      </p>

      <button
        type="button"
        onClick={() => irse(alBorrar)}
        className="boton-sordo boton-rojo mt-6 w-full"
      >
        Borrar todo
      </button>
      <button
        type="button"
        onClick={cerrar}
        className="mt-3 py-1.5 text-[14px] font-medium text-tinta-suave transition-colors hover:text-tinta"
      >
        Cancelar
      </button>
    </div>
  )

  return telefono ? (
    <HojaInferior abierta={!despedida} alCerrar={cerrar} alIrse={despedida} etiqueta={ETIQUETA}>
      {cuerpo}
    </HojaInferior>
  ) : (
    <Ventana etiqueta={ETIQUETA} ancho={400} alCerrar={cerrar}>
      {cuerpo}
    </Ventana>
  )
}

export default ConfirmarBorrado
