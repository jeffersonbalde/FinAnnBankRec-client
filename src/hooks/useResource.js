import { useCallback, useEffect, useState } from 'react'
import api, { extractErrorMessage } from '../lib/api'

/**
 * Minimal CRUD helper around a REST collection endpoint.
 * `basePath` is relative to the axios baseURL, e.g. "/bank-accounts".
 */
export function useResource(basePath, { params, auto = true } = {}) {
  const [items, setItems] = useState([])
  // Laravel's paginated resource response ({ data, links, meta }) puts page
  // info here; stays null for a plain, unpaginated collection endpoint.
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(auto)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get(basePath, { params })
      setItems(data.data ?? data)
      setMeta(data.meta ?? null)
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [basePath, JSON.stringify(params)]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (auto) reload()
  }, [auto, reload])

  const create = useCallback((payload) => api.post(basePath, payload).then((r) => r.data.data ?? r.data), [basePath])
  const update = useCallback(
    (id, payload) => api.put(`${basePath}/${id}`, payload).then((r) => r.data.data ?? r.data),
    [basePath],
  )
  const remove = useCallback((id) => api.delete(`${basePath}/${id}`), [basePath])

  return { items, meta, loading, error, reload, create, update, remove }
}
