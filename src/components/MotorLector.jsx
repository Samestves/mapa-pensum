import { Monitor, Smartphone, Sparkles } from 'lucide-react'
import { MOTOR } from '../hooks/useLecturaHorario'

/**
 * Quien lee el horario, o quien lo leyo: el OCR del propio aparato o la IA
 * del servidor.
 *
 * No es un adorno. Las dos lecturas no se parecen: una no gasta datos ni
 * cupo y la otra si, una entiende solo la captura del sistema y la otra
 * cualquier foto. Que la pantalla diga cual esta trabajando es lo que hace
 * entendible que a veces tarde, que a veces se acabe por hoy y que a veces no.
 *
 * Completo dice tambien donde; `compacto` -la cabecera de la revision, donde
 * no cabe- solo el nombre, y el donde queda para los lectores de pantalla.
 *
 * @param {object} props
 * @param {string} props.motor  uno de MOTOR
 * @param {boolean} props.telefono  para decir "tu teléfono" y no "tu equipo"
 * @param {boolean} [props.compacto]
 */
function MotorLector({ motor, telefono, compacto = false }) {
  const ia = motor === MOTOR.IA
  const Icono = ia ? Sparkles : telefono ? Smartphone : Monitor
  const donde = ia ? 'en línea' : telefono ? 'en tu teléfono' : 'en tu equipo'

  return (
    <span className="motor-lector" data-motor={motor}>
      <Icono size={12} strokeWidth={1.75} aria-hidden="true" />
      <span>
        <span className="font-medium text-tinta">{ia ? 'IA' : 'OCR'}</span>
        <span className={compacto ? 'sr-only' : undefined}> {donde}</span>
      </span>
    </span>
  )
}

export default MotorLector
