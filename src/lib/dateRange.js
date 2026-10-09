/**
 * Ready-made date ranges for filters ("This month", "Last month"…).
 * Dates are plain local YYYY-MM-DD strings — never converted through UTC, so a
 * range never slips a day.
 */

const pad = (n) => String(n).padStart(2, '0')

export function toIsoDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function range(from, to) {
  return { from: toIsoDate(from), to: toIsoDate(to) }
}

export const DATE_PRESETS = [
  {
    key: 'this_month',
    label: 'This month',
    range: (t) => range(new Date(t.getFullYear(), t.getMonth(), 1), new Date(t.getFullYear(), t.getMonth() + 1, 0)),
  },
  {
    key: 'last_month',
    label: 'Last month',
    range: (t) => range(new Date(t.getFullYear(), t.getMonth() - 1, 1), new Date(t.getFullYear(), t.getMonth(), 0)),
  },
  {
    key: 'last_3_months',
    label: 'Last 3 months',
    range: (t) => range(new Date(t.getFullYear(), t.getMonth() - 2, 1), new Date(t.getFullYear(), t.getMonth() + 1, 0)),
  },
  {
    key: 'this_year',
    label: 'This year',
    range: (t) => range(new Date(t.getFullYear(), 0, 1), new Date(t.getFullYear(), 11, 31)),
  },
  {
    key: 'last_year',
    label: 'Last year',
    range: (t) => range(new Date(t.getFullYear() - 1, 0, 1), new Date(t.getFullYear() - 1, 11, 31)),
  },
  { key: 'all', label: 'All time', range: () => ({ from: '', to: '' }) },
]

/** The preset whose dates match `from`/`to` exactly, or 'custom' when none do. */
export function presetFor(from, to, today = new Date()) {
  const hit = DATE_PRESETS.find((p) => {
    const r = p.range(today)
    return r.from === from && r.to === to
  })
  return hit ? hit.key : 'custom'
}
