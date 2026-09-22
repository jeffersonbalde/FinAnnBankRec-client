import axios from 'axios'

/**
 * Shared HTTP client for the FinAnnBankRec API.
 * `withCredentials` + `withXSRFToken` make Laravel Sanctum's cookie session work.
 *
 * Every API call depends on ONE env var: VITE_LARAVEL_API (see .env.example).
 * It must be set in .env for local dev (e.g. http://localhost:8000/api/v1).
 * Left empty in production, it falls back to a same-origin relative path
 * (/api/v1) so the web server can proxy the API on the same domain.
 */
const API_BASE = String(import.meta.env.VITE_LARAVEL_API ?? '/api/v1')
  .trim()
  .replace(/\/+$/, '')

// The Sanctum CSRF cookie lives on the API's origin, not under /api/v1.
const API_ORIGIN = API_BASE.replace(/\/api\/v1$/, '')

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  withXSRFToken: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
  headers: { Accept: 'application/json' },
})

let csrfReady = false

/** Fetch the CSRF cookie once before the first state-changing request. */
export async function ensureCsrfCookie() {
  if (csrfReady) return
  await axios.get(`${API_ORIGIN}/sanctum/csrf-cookie`, { withCredentials: true })
  csrfReady = true
}

/** Pull a human-readable message out of an Axios error (Laravel shape aware). */
export function extractErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  const data = error?.response?.data
  if (data?.errors) {
    const first = Object.values(data.errors)[0]
    if (Array.isArray(first) && first[0]) return first[0]
  }
  return data?.message || error?.message || fallback
}

export default api
