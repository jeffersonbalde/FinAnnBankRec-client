import { FiTrash2 } from 'react-icons/fi'
import Button from './Button'

/**
 * The leading checkbox column for a DataTable.
 *
 * @param {ReturnType<import('../../hooks/useRowSelection').useRowSelection>} selection
 * @param {Array<object>} rows the rows on the current page
 * @param {(row: object) => boolean} isSelectable rows that may not be ticked get an empty cell
 */
export function selectColumn(selection, rows, isSelectable) {
  const selectable = rows.filter(isSelectable)
  const ticked = selectable.filter((r) => selection.has(r)).length
  const all = selectable.length > 0 && ticked === selectable.length

  return {
    key: 'select',
    className: 'fb-table__check',
    header: (
      <input
        type="checkbox"
        className="fb-check-box"
        aria-label="Select all on this page"
        checked={all}
        disabled={selectable.length === 0}
        ref={(el) => {
          if (el) el.indeterminate = ticked > 0 && !all
        }}
        onChange={() => selection.togglePage(selectable)}
      />
    ),
    render: (row) =>
      isSelectable(row) ? (
        <input
          type="checkbox"
          className="fb-check-box"
          aria-label="Select row"
          checked={selection.has(row)}
          onChange={() => selection.toggle(row)}
        />
      ) : null,
  }
}

/** Highlight class for ticked rows — pass as DataTable's rowClassName. */
export const selectedRowClass = (selection) => (row) => (selection.has(row) ? 'is-selected' : undefined)

/** The strip across the top of a table card while rows are ticked. */
export function BulkBar({ count, summary, onClear, onAction, actionLabel = 'Remove', busy = false }) {
  if (count === 0) return null

  return (
    <div className="fb-bulkbar" role="status">
      <span>
        <strong>{count}</strong> selected{summary ? ` · ${summary}` : ''}
      </span>
      <button type="button" className="fb-btn fb-btn--link fb-btn--sm" onClick={onClear}>
        Clear
      </button>
      <span className="fb-bulkbar__spacer" />
      <Button size="sm" variant="danger" onClick={onAction} loading={busy}>
        <FiTrash2 size={14} /> {actionLabel}
      </Button>
    </div>
  )
}
