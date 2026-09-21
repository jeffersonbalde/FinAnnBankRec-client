import axios from 'axios'

/**
 * Shared HTTP client for the FinAnnBankRec API.
 * `withCredentials` + `withXSRFToken` make Laravel Sanctum's cookie session work.
 */
const api = axios.create({
  baseURL: '/api/v1',
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
  await axios.get('/sanctum/csrf-cookie', { withCredentials: true })
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
