import { FiChevronsLeft, FiChevronLeft, FiChevronRight, FiChevronsRight } from 'react-icons/fi'

// Windowed page numbers around the current page (max 5), same idea as most
// admin-table pagers: always show first/last, collapse the middle.
function pageWindow(current, last) {
  const span = 5
  let start = Math.max(1, current - Math.floor(span / 2))
  const end = Math.min(last, start + span - 1)
  start = Math.max(1, end - span + 1)
  const pages = []
  for (let p = start; p <= end; p++) pages.push(p)
  return pages
}

/**
 * @param {{ current_page: number, last_page: number, from: number|null, to: number|null, total: number }} meta
 */
export default function Pagination({ meta, onPageChange }) {
  if (!meta || meta.last_page <= 1) return null

  const { current_page: current, last_page: last, from, to, total } = meta
  const pages = pageWindow(current, last)

  return (
    <div className="fb-pager">
      <span className="fb-pager__meta">
        Showing {from ?? 0}–{to ?? 0} of {total} · Page {current} of {last}
      </span>
      <nav className="fb-pager__nav" aria-label="Pagination">
        <button
          type="button"
          className="fb-pager__btn"
          disabled={current === 1}
          aria-label="First page"
          title="First page"
          onClick={() => onPageChange(1)}
        >
          <FiChevronsLeft size={16} />
        </button>
        <button
          type="button"
          className="fb-pager__btn"
          disabled={current === 1}
          aria-label="Previous page"
          title="Previous page"
          onClick={() => onPageChange(current - 1)}
        >
          <FiChevronLeft size={16} />
        </button>

        <div className="fb-pager__pages">
          {pages[0] > 1 && <span className="fb-pager__ellipsis">…</span>}
          {pages.map((p) => (
            <button
              key={p}
              type="button"
              className={`fb-pager__num${p === current ? ' is-active' : ''}`}
              aria-label={`Page ${p}`}
              aria-current={p === current ? 'page' : undefined}
              onClick={() => onPageChange(p)}
            >
              {p}
            </button>
          ))}
          {pages[pages.length - 1] < last && <span className="fb-pager__ellipsis">…</span>}
        </div>

        <button
          type="button"
          className="fb-pager__btn"
          disabled={current === last}
          aria-label="Next page"
          title="Next page"
          onClick={() => onPageChange(current + 1)}
        >
          <FiChevronRight size={16} />
        </button>
        <button
          type="button"
          className="fb-pager__btn"
          disabled={current === last}
          aria-label="Last page"
          title="Last page"
          onClick={() => onPageChange(last)}
        >
          <FiChevronsRight size={16} />
        </button>
      </nav>
    </div>
  )
}
