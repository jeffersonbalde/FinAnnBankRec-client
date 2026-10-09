import { useEffect, useRef } from 'react'
import clsx from 'clsx'

const MAX_INT_DIGITS = 13

/** "-1234.5" → "-1,234.5" (keeps a trailing "." so the user can keep typing decimals). */
function group(raw) {
  if (!raw) return ''
  const neg = raw.startsWith('-')
  const [int, dec] = raw.replace('-', '').split('.')
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${neg ? '-' : ''}${grouped}${dec !== undefined ? `.${dec}` : ''}`
}

/** Strip everything but digits, one decimal point and (optionally) a leading minus. */
function clean(text, { decimals, allowNegative }) {
  const neg = allowNegative && text.trim().startsWith('-')
  let s = text.replace(/[^\d.]/g, '')
  if (decimals === 0) {
    s = s.replace(/\./g, '')
  } else {
    const i = s.indexOf('.')
    if (i >= 0) s = s.slice(0, i + 1) + s.slice(i + 1).replace(/\./g, '').slice(0, decimals)
  }
  let [int, dec] = s.split('.')
  int = int.replace(/^0+(?=\d)/, '').slice(0, MAX_INT_DIGITS)
  if (int === '' && dec !== undefined) int = '0'
  const out = dec !== undefined ? `${int}.${dec}` : int
  return out === '' ? (neg ? '-' : '') : `${neg ? '-' : ''}${out}`
}

/**
 * Number field that shows thousands separators while typing (1,234,567.89).
 * `value` / `onChange` use the plain number string ("1234567.89") — no commas —
 * so it can be sent to the API or passed to Number() as is.
 */
export default function MoneyInput({
  value,
  onChange,
  decimals = 2,
  allowNegative = false,
  positive = false,
  prefix = false,
  error,
  className,
  onBlur,
  ...props
}) {
  const ref = useRef(null)
  const raw = value === null || value === undefined ? '' : String(value)
  const display = group(raw)

  // Native validation message for "must be greater than zero".
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const n = Number(raw)
    el.setCustomValidity(positive && raw !== '' && !(n > 0) ? 'Enter an amount greater than zero.' : '')
  }, [raw, positive])

  function handleChange(e) {
    const el = e.target
    const caret = el.selectionStart ?? el.value.length
    // How many digits / dots sit before the caret — used to put it back after regrouping.
    const significant = el.value.slice(0, caret).replace(/[^\d.]/g, '').length
    const next = clean(el.value, { decimals, allowNegative })
    const shown = group(next)

    el.value = shown
    let pos = 0
    let seen = 0
    while (pos < shown.length && seen < significant) {
      if (/[\d.]/.test(shown[pos])) seen += 1
      pos += 1
    }
    el.setSelectionRange(pos, pos)
    onChange?.(next)
  }

  function handleBlur(e) {
    let next = raw
    if (next === '-' || next === '.') next = ''
    // Pad to a fixed number of decimals so amounts read 1,234.50, not 1,234.5.
    if (next !== '' && decimals > 0) {
      const [int, dec = ''] = next.split('.')
      next = `${int}.${dec.padEnd(decimals, '0')}`
    }
    if (next !== raw) onChange?.(next)
    onBlur?.(e)
  }

  const input = (
    <input
      ref={ref}
      type="text"
      inputMode={decimals > 0 ? 'decimal' : 'numeric'}
      autoComplete="off"
      className={clsx('form-control', error && 'is-invalid', className)}
      value={display}
      onChange={handleChange}
      onBlur={handleBlur}
      {...props}
    />
  )

  if (!prefix) return input
  return (
    <div className="fb-money">
      <span className="fb-money__sign">₱</span>
      {input}
    </div>
  )
}
