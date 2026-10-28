import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// O front chama /api na própria origem e o Vite repassa ao Spring Boot.
// Com isso o celular (pelo IP do PC ou por um túnel HTTPS) usa uma origem só.
const api = {
  '/api': { target: process.env.SIGFEC_API || 'http://localhost:8080', changeOrigin: true },
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // expõe na rede local — acesso por celular via IP do PC
    port: 5173,
    proxy: api,
    allowedHosts: ['.trycloudflare.com', '.ngrok-free.app'], // túnel HTTPS para instalar o PWA no celular
  },
  preview: {
    host: true,
    port: 4173,
    proxy: api,
    allowedHosts: ['.trycloudflare.com', '.ngrok-free.app'],
  },
})
