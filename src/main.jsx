import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import './index.css'
import App from './App.jsx'
import LimiteDeError from './components/LimiteDeError'

/* El service worker guarda la app para que abra sin conexion. Solo en
   produccion: en desarrollo se quedaria con una copia del servidor de Vite y
   dejarias de ver tus propios cambios. Se registra despues de load para no
   competir por el ancho de banda con el primer pintado. */
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Sin service worker la app funciona igual, solo que pidiendo red
    })
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* Dos limites y no uno, porque no protegen lo mismo.
        El de dentro de App envuelve a la vista y puede ofrecer volver al
        selector, que es una recuperacion de verdad: se sigue usando la app.
        Este de fuera solo entra cuando lo que revienta es App -el enrutado,
        el estado de la ruta-, y entonces no hay a donde navegar porque
        navegar es justo lo roto. Ahi lo unico honesto que se puede ofrecer
        es recargar. */}
    <LimiteDeError alReintentar={() => window.location.reload()} etiquetaReintento="Recargar">
      <App />
    </LimiteDeError>
    {/* Contador de visitas de Vercel. En local no envia nada: el script real
        solo se carga en el despliegue. Hay que activar Web Analytics en el
        panel del proyecto para que empiecen a aparecer los datos. */}
    <Analytics />
    {/* Metricas reales de carga (LCP, CLS, INP) de quien usa la web, no de
        un banco de pruebas. Importante para este publico: un telefono viejo
        con datos caros da numeros muy distintos a los de un portatil.
        Ojo con la documentacion: Vercel sugiere el import de /next, que es
        para Next.js. Aqui es Vite, y la subruta correcta es /react. */}
    <SpeedInsights />
  </StrictMode>,
)
