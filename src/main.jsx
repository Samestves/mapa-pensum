import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    {/* Contador de visitas de Vercel. En local no envia nada: el script real
        solo se carga en el despliegue. Hay que activar Web Analytics en el
        panel del proyecto para que empiecen a aparecer los datos. */}
    <Analytics />
  </StrictMode>,
)
