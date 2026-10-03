/**
 * El almacen: Redis en Upstash, por su API REST.
 *
 * Por REST y no con un cliente: una dependencia menos, y con el pipeline cada
 * funcion gasta una sola peticion por tanda de comandos. El plan gratuito da
 * 500.000 comandos al mes.
 *
 * Lo usan el contador (latido.js), su panel (panel.js) y el lector de
 * horarios (leer-horario.js). Cada uno llevaba su copia de estas lineas.
 *
 * Las variables se leen en cada llamada y no al cargar el modulo: asi las
 * pruebas ponen y quitan el almacen sin reimportar nada.
 *
 * El guion bajo del nombre evita que Vercel lo publique como funcion.
 */

/* Las dos parejas de nombres que puede haber: la que pone la integracion de
   Vercel con Upstash y la que da Upstash directamente. */
const destino = () => ({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
})

export function hayAlmacen() {
  const { url, token } = destino()
  return Boolean(url && token)
}

/** Manda los comandos en una sola peticion y devuelve el resultado de cada uno */
export async function pedir(comandos) {
  const { url, token } = destino()
  const respuesta = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(comandos),
  })
  if (!respuesta.ok) throw new Error(`Redis respondio ${respuesta.status}`)
  const datos = await respuesta.json()
  return datos.map((d) => d.result)
}
