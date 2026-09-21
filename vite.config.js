import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// The Laravel API. In dev the browser talks only to this Vite server and every
// /api, /sanctum and auth request is proxied to Laravel, so the SPA is
// effectively same-origin and the session cookie "just works".
const API_TARGET = process.env.VITE_API_PROXY_TARGET || 'http://localhost:8000'

// Only API paths are proxied. Everything else (including /login) is a client route.
const proxy = ['/api', '/sanctum', '/storage'].reduce((acc, path) => {
  acc[path] = { target: API_TARGET, changeOrigin: true }
  return acc
}, {})

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
  ],
  server: {
    port: 5173,
    proxy,
  },
})
