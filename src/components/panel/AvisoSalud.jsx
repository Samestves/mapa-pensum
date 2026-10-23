import { TriangleAlert } from 'lucide-react'
import { haceCuanto } from './formato'

/* Lo que tiene que pasar sin un solo latido para que el silencio sea raro y
   no una noche tranquila */
const SIN_LATIDOS_MS = 24 * 60 * 60 * 1000

/**
 * Avisa cuando el contador no esta guardando, antes de enseñar unos numeros
 * que parecen buenos y estan parados.
 *
 * Dos casos, de mas a menos grave: el almacen no deja escribir -y entonces se
 * dice que contesto Redis y donde se arregla-, o deja escribir pero hace mas
 * de un dia que no entra ningun latido. Si todo va bien no pinta nada.
 *
 * @param {{ ultimoLatido: string|null, escribe: boolean, error?: string }} [props.salud]
 */
function AvisoSalud({ salud }) {
  if (!salud) return null
  const callado =
    salud.ultimoLatido && Date.now() - new Date(salud.ultimoLatido).getTime() > SIN_LATIDOS_MS
  if (salud.escribe && !callado) return null

  return (
    <div
      role="alert"
      className="flex gap-3 rounded-xl border border-[color-mix(in_oklab,var(--estado-rojo)_40%,transparent)] px-4 py-3 text-[13px] leading-relaxed"
    >
      <TriangleAlert size={16} className="mt-0.5 shrink-0 text-[var(--estado-rojo)]" />
      {salud.escribe ? (
        <p className="text-tinta-suave">
          <b className="font-medium text-tinta">
            El último latido se guardó {haceCuanto(salud.ultimoLatido)}.
          </b>{' '}
          El almacén acepta escrituras, así que si hubo visitas desde entonces se están perdiendo
          antes de llegar: mira el registro de <code>/api/latido</code> en Vercel.
        </p>
      ) : (
        <p className="text-tinta-suave">
          <b className="font-medium text-tinta">No se está guardando ninguna visita</b>
          {salud.ultimoLatido && <> desde {haceCuanto(salud.ultimoLatido)}</>}: el almacén no acepta
          escrituras. Redis contestó «{salud.error}». Comprueba en Vercel que{' '}
          <code>KV_REST_API_TOKEN</code> sea el token normal de Upstash y no el de solo lectura, y
          vuelve a desplegar.
        </p>
      )}
    </div>
  )
}

export default AvisoSalud
