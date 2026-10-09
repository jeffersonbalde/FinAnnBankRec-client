/**
 * @param {{ key: string, header: string, render?: (row, index: number) => any, className?: string }[]} columns
 * @param {import('react').ReactNode} [footer] - rendered inside the same card, below the table (e.g. a Pagination bar)
 * @param {(row) => string | undefined} [rowClassName] - extra class for a row (e.g. "is-selected")
 * @param {import('react').ReactNode} [head] - rendered inside the card, above the table (e.g. a bulk-action strip)
 */
export default function DataTable({
  columns,
  rows,
  loading,
  empty = 'No records yet.',
  rowKey = 'id',
  footer,
  rowClassName,
  head,
}) {
  return (
    <div className="fb-table__wrap">
      {head}
      <div className="fb-table__scroll">
        <table className="fb-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={col.className}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={`s${i}`}>
                  {columns.map((col) => (
                    <td key={col.key}>
                      <span className="fb-skel" style={{ display: 'block', width: `${50 + ((i * 13) % 40)}%` }} />
                    </td>
                  ))}
                </tr>
              ))}

            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="fb-table__empty">
                  {empty}
                </td>
              </tr>
            )}

            {!loading &&
              rows.map((row, i) => (
                <tr key={row[rowKey]} className={rowClassName?.(row)}>
                  {columns.map((col) => (
                    <td key={col.key} className={col.className}>
                      {col.render ? col.render(row, i) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {footer}
    </div>
  )
}
