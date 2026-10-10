import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import { guardar, leer } from '../../data/almacen'
import { guardarCarga, leerCarga } from '../../data/cargaPlan'
import { compartirArchivo, descargarArchivo, puedeCompartir } from '../../data/compartir'
import { imagenDeLaRuta, mensajeDeLaRuta } from '../../data/exportarPlan'
import { MES } from '../../data/meses'
import { useMarcas, useProgreso } from '../../hooks/useAvance'
import { mesEstimadoGrado, planificar } from '../../layout/planificador'

import HojaPlan from '../HojaPlan'

import Acciones from './Acciones'
import Fecha from './Fecha'
import ListaSemestres from './ListaSemestres'
import MandoCarga from './MandoCarga'
import Ventana from './Ventana'
import { ROTULO } from './estilos'
import useImpresion from './useImpresion'

const CLAVE_NOMBRE = 'mapa-pensum:nombre'

/**
 * El plan y todo lo que se hace con el. La carga se guarda al momento, pero el
 * plan se recalcula con un valor diferido: arrastrar el mando tiene que
 * responder en el acto aunque el telefono tarde un poco en rehacer la lista.
 */
export default function Ruta({ carrera, elegidas, telefono = false, alCerrar }) {
  const { asignaturas, grupos } = carrera
  const marcas = useMarcas()
  const progreso = useProgreso()
  const [carga, setCarga] = useState(leerCarga)
  const [nombre, setNombre] = useState(() => leer(CLAVE_NOMBRE, ''))
  const cargaDelPlan = useDeferredValue(carga)
  const { imprimiendo, imprimir } = useImpresion()

  useEffect(() => {
    guardarCarga(carga)
  }, [carga])
  useEffect(() => {
    guardar(CLAVE_NOMBRE, nombre)
  }, [nombre])

  const plan = useMemo(
    () => planificar({ asignaturas, grupos, marcas, elegidas, carga: cargaDelPlan }),
    [asignaturas, grupos, marcas, elegidas, cargaDelPlan],
  )
  const grado = mesEstimadoGrado(plan.semestres.length)
  const terminado = plan.semestres.length === 0

  const hoja = (
    <HojaPlan
      nombre={nombre}
      carrera={carrera}
      progreso={progreso}
      plan={plan}
      carga={cargaDelPlan}
      grado={grado && MES(grado)}
    />
  )

  const cuerpo = (
    <>
      <Fecha plan={plan} grado={grado} />
      {!terminado && (
        <>
          <MandoCarga carga={carga} alCambiar={setCarga} plan={plan} />
          <ListaSemestres plan={plan} grado={grado} />
        </>
      )}
      <label className="mt-7 block">
        <span className={`px-1.5 ${ROTULO}`}>Tu nombre en el PDF y la imagen</span>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Opcional"
          autoComplete="name"
          className="seleccionable mt-2 w-full rounded-2xl border border-panel-borde bg-panel-suave px-4 py-3 text-[15px] text-tinta outline-none placeholder:text-tinta-tenue focus:border-aprobada"
        />
      </label>
    </>
  )

  /* La ruta como imagen. En el telefono se manda con la hoja de compartir
     del sistema -a un chat, a un estado-; en el ordenador, donde esa hoja es
     una rareza, se baja. Devuelve si salio, para que el boton lo diga. */
  const compartir = async () => {
    const archivo = await imagenDeLaRuta({
      carrera,
      nombre,
      progreso,
      plan,
      carga: cargaDelPlan,
      grado,
    })
    if (puedeCompartir()) return compartirArchivo(archivo, mensajeDeLaRuta(grado))
    descargarArchivo(archivo)
    return true
  }

  const acciones = (
    <Acciones alImprimir={imprimir} alCompartir={compartir} deshabilitado={terminado} />
  )

  return (
    <>
      {telefono ? (
        <>
          <div className="px-5 pb-6">{cuerpo}</div>
          <div className="sticky bottom-0 bg-gradient-to-t from-panel from-60% to-transparent px-4 pt-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {acciones}
          </div>
        </>
      ) : (
        <Ventana carrera={carrera} alCerrar={alCerrar} cuerpo={cuerpo} acciones={acciones}>
          {hoja}
        </Ventana>
      )}

      {/* Copia para el papel: cuelga de <body>, sin padres que la recorten,
          y con la paleta clara. Solo existe mientras se imprime. */}
      {imprimiendo &&
        createPortal(
          <div className="solo-impresion" data-tema="claro">
            {hoja}
          </div>,
          document.body,
        )}
    </>
  )
}
