const peso = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
})

export function money(value) {
  if (value == null || value === '') return '—'
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? peso.format(n) : '—'
}

/** "Oct 8, 2026, 1:19 PM" for a timestamp. */
export function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime())
    ? String(value)
    : d.toLocaleString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

const compact = new Intl.NumberFormat('en-PH', { notation: 'compact', maximumFractionDigits: 1 })

/** 1,250,000 → "1.3M". For chart axes only, where there is no room for the full amount. */
export function compactNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? compact.format(n) : ''
}

export function shortDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
}
