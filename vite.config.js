import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Read .env / .env.local so VITE_LARAVEL_API works from a file, not just the shell.
  const env = loadEnv(mode, process.cwd(), '')

  // Same var the app itself reads (src/lib/api.js). Its origin is also where this
  // dev-only proxy forwards /api, /sanctum and /storage — a fallback path used
  // only when the browser calls a relative /api/... URL (VITE_LARAVEL_API unset).
  const apiBase = env.VITE_LARAVEL_API || 'http://localhost:8000/api/v1'
  const API_TARGET = apiBase.replace(/\/api\/v1\/?$/, '') || 'http://localhost:8000'

  // Only API paths are proxied. Everything else (including /login) is a client route.
  const proxy = ['/api', '/sanctum', '/storage'].reduce((acc, path) => {
    acc[path] = { target: API_TARGET, changeOrigin: true }
    return acc
  }, {})

  return {
    plugins: [
      react(),
      babel({ presets: [reactCompilerPreset()] }),
      tailwindcss(),
    ],
    server: {
      port: 5173,
      proxy,
    },
  }
})
