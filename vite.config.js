import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Tailwind v4 entra como plugin de Vite: no hace falta postcss.config ni tailwind.config
export default defineConfig({
  plugins: [react(), tailwindcss()],
})
