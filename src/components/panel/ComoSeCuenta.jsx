import { Tarjeta } from './piezas'
import { diaCorto } from './formato'

/**
 * De donde sale cada numero, en palabras. Un panel en el que no se sabe que
 * cuenta cada cifra termina mirandose con desconfianza, y con razon.
 */
const PREGUNTAS = [
  {
    pregunta: '¿Qué es un «aparato»?',
    respuesta: [
      'La primera vez que alguien abre el mapa, su navegador guarda un número al azar. Cada visita manda ese número, y así se sabe que es el mismo aparato aunque entre veinte veces.',
      'Por eso se habla de aparatos y no de personas: tu teléfono y tu computadora son dos. Casi siempre un aparato es una persona, pero no siempre.',
    ],
  },
  {
    pregunta: '¿La VPN me suma como alguien nuevo?',
    respuesta: [
      'No. Para contar no se mira la IP, sino ese número guardado en el navegador. Cambiar de VPN diez veces sigue siendo el mismo aparato.',
      'La IP tampoco serviría para contar: en Venezuela las líneas móviles cambian de IP a cada rato y comparten la misma entre muchísima gente.',
    ],
  },
  {
    pregunta: '¿Qué sí cuenta como alguien nuevo?',
    respuesta: [
      'Todo lo que empieza sin ese número guardado: una ventana de incógnito, otro navegador en el mismo teléfono, borrar los datos del navegador, o en iPhone la app instalada, que guarda sus datos aparte de Safari.',
      '«Nuevo» es exactamente eso: la primera vez que aparece un número. Si tú entras en incógnito, sumas uno nuevo cada vez.',
    ],
  },
  {
    pregunta: '¿Cómo evito que mis visitas inflen los números?',
    respuesta: [
      'En la pestaña Dispositivos, activa «No contar este aparato». Hazlo una vez en cada teléfono, computadora y navegador que uses. Desde ese momento lo que hagas ahí no entra en ningún total, y en la lista sale como «Tú».',
      'Lo que ya contó antes de activarlo se queda en los totales viejos: los números sumados no se pueden des-sumar.',
      'Abrir este panel tampoco cuenta como visita.',
    ],
  },
  {
    pregunta: '¿De dónde sale la ubicación?',
    respuesta: [
      'De la IP. Vercel, donde vive la web, la traduce a país, estado y ciudad, y eso es lo que se guarda. La IP en sí no se guarda nunca.',
      'La ciudad es aproximada: muchas conexiones móviles de Venezuela salen a internet por Caracas aunque la persona esté en Maturín.',
    ],
  },
  {
    pregunta: '¿Qué es «VPN probable»?',
    respuesta: [
      'La VPN cambia la IP, pero no el reloj del teléfono. Si la IP dice Alemania y el reloj está en hora de Caracas, casi seguro es alguien de aquí usando una VPN.',
      'Por eso «En Venezuela» cuenta a quien tiene una IP de aquí o el reloj en hora de aquí. Es «probable» porque un viajero que no cambió la hora daría lo mismo.',
    ],
  },
  {
    pregunta: '¿Y la dirección MAC?',
    respuesta: [
      'Ninguna página web puede leerla: el navegador no la entrega, y es a propósito. Es un dato de la red de tu casa, no de internet.',
    ],
  },
  {
    pregunta: '¿Cómo se sabe el modelo del teléfono?',
    respuesta: [
      'En Android con Chrome, el propio navegador lo dice si se le pregunta: sale un código como SM-A546E, que en los Samsung se traduce a su nombre (Galaxy A54). Otros navegadores de Android ya no lo dicen.',
      'En iPhone, Apple no deja verlo en ningún navegador. Se estima por el tamaño de la pantalla, que comparten dos o tres modelos: por eso sale «iPhone 12, 13 o 14».',
      'En computadoras solo se sabe el sistema y el navegador.',
    ],
  },
  {
    pregunta: '¿Qué no se guarda?',
    respuesta: [
      'Ni la IP, ni el nombre, ni las marcas que hace el estudiante, ni su horario, ni nada que escriba. De cada aparato se guarda qué es, desde dónde entra, cuándo y qué carreras abrió.',
    ],
  },
]

export default function ComoSeCuenta({ desde }) {
  return (
    <div className="flex flex-col gap-3">
      {desde && (
        <p className="px-1 text-[12px] text-tinta-tenue">
          Los totales se cuentan desde el {diaCorto(desde)}. Las fichas de cada aparato y los datos
          por carrera empezaron más tarde, con esta versión del panel.
        </p>
      )}
      {PREGUNTAS.map(({ pregunta, respuesta }) => (
        <Tarjeta key={pregunta} className="flex flex-col gap-2">
          <h3 className="text-[14px] font-light text-tinta">{pregunta}</h3>
          {respuesta.map((parrafo) => (
            <p
              key={parrafo.slice(0, 24)}
              className="text-[12.5px] leading-relaxed text-tinta-suave"
            >
              {parrafo}
            </p>
          ))}
        </Tarjeta>
      ))}
    </div>
  )
}
