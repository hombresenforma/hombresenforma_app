import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Usar './' asegura que la app funcione sea cual sea el nombre de tu repositorio
  base: './',
})
