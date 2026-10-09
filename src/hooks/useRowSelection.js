import { useState } from 'react'
import { notifyError } from '../lib/toast'

/**
 * Ticked rows for a table's bulk actions. The selection is kept while paging, but
 * is tied to `scopeKey` (the filters in force) — change a filter and it is dropped,
 * so nothing stays selected that is no longer in view.
 *
 * @param {string} scopeKey  anything that changes when the visible set changes (e.g. JSON of the filters)
 * @param {number} [limit]   most rows that may be ticked at once (matches the server's limit)
 */
export function useRowSelection(scopeKey, limit = 500) {
  const [state, setState] = useState({ key: scopeKey, items: {} })
  const items = state.key === scopeKey ? state.items : {}
  const list = Object.values(items)

  function commit(change) {
    const next = { ...items }
    change(next)
    if (Object.keys(next).length > limit) {
      notifyError(null, `You can select up to ${limit} at a time.`)
      return
    }
    setState({ key: scopeKey, items: next })
  }

  return {
    items,
    list,
    count: list.length,
    has: (row) => !!items[row.id],
    toggle: (row) =>
      commit((next) => {
        if (next[row.id]) delete next[row.id]
        else next[row.id] = row
      }),
    /** Tick every selectable row of the page, or untick them all when they already are. */
    togglePage: (selectableRows) => {
      const all = selectableRows.length > 0 && selectableRows.every((r) => items[r.id])
      commit((next) =>
        selectableRows.forEach((r) => {
          if (all) delete next[r.id]
          else next[r.id] = r
        }),
      )
    },
    clear: () => setState({ key: scopeKey, items: {} }),
  }
}
