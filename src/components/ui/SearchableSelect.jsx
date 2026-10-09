import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { FiChevronDown, FiSearch, FiX } from 'react-icons/fi'
import clsx from 'clsx'

/**
 * Searchable combobox. Use overlayPanel for a centered modal-style picker
 * (same pattern as WPDS FlatSearchSelect).
 *
 * An option may carry leading (a node, e.g. a profile picture) shown before its text.
 *
 * @param {{ value: string|number, label: string, meta?: string, displayLabel?: string, keywords?: string, leading?: import('react').ReactNode }[]} options
 */
export default function SearchableSelect({
  options = [],
  value = '',
  onChange,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  panelTitle = 'Select option',
  error = false,
  required = false,
  disabled = false,
  emptyMessage = 'No matches found.',
  countLabel = 'result',
  overlayPanel = false,
  className,
}) {
  const listId = useId()
  const rootRef = useRef(null)
  const searchRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)

  const selected = useMemo(() => options.find((o) => String(o.value) === String(value)) || null, [options, value])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => {
      const hay = `${o.label} ${o.meta || ''} ${o.keywords || ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [options, query])

  function closePanel() {
    setOpen(false)
    setQuery('')
    setHighlight(0)
  }

  useEffect(() => {
    if (!open) return undefined
    const t = window.setTimeout(() => searchRef.current?.focus(), 30)
    return () => window.clearTimeout(t)
  }, [open])

  useEffect(() => {
    setHighlight(0)
  }, [query, open])

  useEffect(() => {
    if (!open) return undefined
    function onDocMouseDown(e) {
      if (e.target.closest('.fb-combobox__backdrop')) return
      if (!rootRef.current?.contains(e.target)) closePanel()
    }
    function onDocKeyDown(e) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        e.preventDefault()
        closePanel()
      }
    }
    document.addEventListener('mousedown', onDocMouseDown)
    document.addEventListener('keydown', onDocKeyDown, true)
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown)
      document.removeEventListener('keydown', onDocKeyDown, true)
    }
  }, [open])

  function pick(opt) {
    if (disabled) return
    onChange?.(opt.value)
    closePanel()
  }

  function toggleOpen() {
    if (disabled) return
    if (open) closePanel()
    else setOpen(true)
  }

  function onSearchKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)))
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((i) => Math.max(i - 1, 0))
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      const row = filtered[highlight]
      if (row) pick(row)
    }
    if (e.key === 'Tab') closePanel()
  }

  return (
    <div
      ref={rootRef}
      className={clsx(
        'fb-combobox',
        open && 'is-open',
        error && 'is-invalid',
        disabled && 'is-disabled',
        overlayPanel && 'fb-combobox--overlay',
        className,
      )}
    >
      <button
        type="button"
        className={clsx('fb-combobox__trigger form-select', open && 'is-open', error && 'is-invalid')}
        onClick={toggleOpen}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-required={required || undefined}
      >
        <span className={clsx('fb-combobox__value', !selected && 'is-placeholder', selected?.leading && 'has-lead')}>
          {selected?.leading}
          {selected ? selected.displayLabel || selected.label : placeholder}
        </span>
        <FiChevronDown size={16} className="fb-combobox__chevron" aria-hidden />
      </button>

      <input type="hidden" value={value ?? ''} required={required} readOnly tabIndex={-1} />

      {open && overlayPanel ? (
        <div className="fb-combobox__backdrop" role="presentation" onMouseDown={closePanel} />
      ) : null}

      {open ? (
        <div className={clsx('fb-combobox__panel', overlayPanel && 'fb-combobox__panel--overlay')} role="presentation">
          {overlayPanel ? (
            <div className="fb-combobox__head">
              <span className="fb-combobox__head-title">{panelTitle}</span>
              <button type="button" className="fb-combobox__head-close" onClick={closePanel} aria-label="Close">
                <FiX size={16} />
              </button>
            </div>
          ) : null}

          <div className="fb-combobox__search">
            <FiSearch size={14} aria-hidden />
            <input
              ref={searchRef}
              type="text"
              className="form-control form-control-sm"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onSearchKeyDown}
              placeholder={searchPlaceholder}
              autoComplete="off"
              spellCheck={false}
              aria-label={searchPlaceholder}
            />
            {query ? (
              <button
                type="button"
                className="fb-combobox__search-clear"
                onClick={() => setQuery('')}
                aria-label="Clear search"
              >
                <FiX size={13} />
              </button>
            ) : null}
          </div>

          <p className="fb-combobox__count">
            {filtered.length} {countLabel}
            {filtered.length === 1 ? '' : 's'}
          </p>

          <ul id={listId} className="fb-combobox__list" role="listbox">
            {filtered.length === 0 ? (
              <li className="fb-combobox__empty">{emptyMessage}</li>
            ) : (
              filtered.map((opt, idx) => {
                const active = String(opt.value) === String(value)
                const hot = idx === highlight
                return (
                  <li key={String(opt.value)} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      className={clsx(
                        'fb-combobox__option',
                        opt.leading && 'has-lead',
                        active && 'is-active',
                        hot && 'is-highlight',
                      )}
                      onMouseEnter={() => setHighlight(idx)}
                      onClick={() => pick(opt)}
                    >
                      {opt.leading ? (
                        <>
                          {opt.leading}
                          <span className="fb-combobox__option-text">
                            <span className="fb-combobox__option-label">{opt.label}</span>
                            {opt.meta ? <span className="fb-combobox__option-meta">{opt.meta}</span> : null}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="fb-combobox__option-label">{opt.label}</span>
                          {opt.meta ? <span className="fb-combobox__option-meta">{opt.meta}</span> : null}
                        </>
                      )}
                    </button>
                  </li>
                )
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
