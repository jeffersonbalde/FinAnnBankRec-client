import { useMemo, useState } from 'react'
import { FiAlertTriangle, FiChevronDown, FiSearch } from 'react-icons/fi'
import { money } from '../../lib/format'
import './flags-panel.css'

const PAGE = 10

/**
 * What the matching run could not settle by itself, grouped by what kind of
 * problem it is. Each group folds away and lists its items in a small table
 * that can be searched and shown a page at a time, so even hundreds of flags
 * stay readable.
 */
// Flags saved by an older run carry the check number only inside their message ("Check 000123: books show…").
const mismatchCheckNo = (f) => String(f.check_no ?? f.message?.match(/^Check (\S+?):/)?.[1] ?? '—')

const GROUPS = [
  {
    type: 'unrecorded_check',
    title: 'Cleared by the bank, but not in your Report of Checks Issued',
    help: 'Add these checks to the Report of Checks Issued (or import it again), then run auto-match.',
    amountLabel: 'Bank amount',
    columns: ['Check no.', 'Amount'],
    row: (f) => [f.check_no, money(f.amount)],
    total: (items) => items.reduce((sum, f) => sum + Number(f.amount || 0), 0),
    search: (f) => String(f.check_no ?? ''),
  },
  {
    type: 'amount_mismatch',
    title: 'Amount in your books is not the amount the bank cleared',
    help: 'Correct the amount in the Report of Checks Issued if it was typed wrongly, then run auto-match.',
    columns: ['Check no.', 'Books', 'Bank', 'Difference'],
    row: (f) => [mismatchCheckNo(f), money(f.book_amount), money(f.bank_amount), money(f.difference)],
    search: (f) => mismatchCheckNo(f),
  },
]

function Group({ group, items, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen)
  const [query, setQuery] = useState('')
  const [shown, setShown] = useState(PAGE)

  const q = query.trim().toLowerCase()
  const matches = useMemo(
    () => (q ? items.filter((f) => group.search(f).toLowerCase().includes(q)) : items),
    [items, q, group],
  )
  const visible = matches.slice(0, shown)
  const total = group.total?.(items)

  return (
    <section className={`fb-flags__group${open ? ' is-open' : ''}`}>
      <button type="button" className="fb-flags__head" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="fb-flags__count">{items.length}</span>
        <span className="fb-flags__title">
          {group.title}
          {total != null && <span className="fb-flags__sub">Total {money(total)}</span>}
        </span>
        <FiChevronDown size={18} className="fb-flags__chev" aria-hidden="true" />
      </button>

      {open && (
        <div className="fb-flags__body">
          <p className="fb-flags__help">{group.help}</p>

          {items.length > PAGE && (
            <div className="fb-flags__search">
              <FiSearch size={14} />
              <input
                className="form-control"
                type="search"
                placeholder="Search a check number..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setShown(PAGE)
                }}
              />
            </div>
          )}

          <div className="fb-flags__scroll">
            <table className="fb-flags__table">
              <thead>
                <tr>
                  <th className="fb-flags__num">#</th>
                  {group.columns.map((c, i) => (
                    <th key={c} className={i > 0 ? 'fb-flags__amt' : undefined}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((f, i) => (
                  <tr key={`${f.bank_transaction_id ?? f.check_no}-${i}`}>
                    <td className="fb-flags__num">{i + 1}</td>
                    {group.row(f).map((cell, c) => (
                      <td key={c} className={c > 0 ? 'fb-flags__amt' : 'fb-flags__strong'}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={group.columns.length + 1} className="fb-flags__none">
                      No check number matches your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {matches.length > shown && (
            <div className="fb-flags__more">
              <span>
                Showing {visible.length} of {matches.length}
              </span>
              <button type="button" className="fb-btn fb-btn--link fb-btn--sm" onClick={() => setShown((n) => n + 25)}>
                Show 25 more
              </button>
              {matches.length - shown > 25 && (
                <button type="button" className="fb-btn fb-btn--link fb-btn--sm" onClick={() => setShown(matches.length)}>
                  Show all
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

export default function FlagsPanel({ flags, embedded = false }) {
  const grouped = useMemo(() => {
    const known = GROUPS.map((g) => ({ group: g, items: flags.filter((f) => f.type === g.type) }))
    const others = flags.filter((f) => !GROUPS.some((g) => g.type === f.type))
    if (others.length > 0) {
      known.push({
        group: {
          type: 'other',
          title: 'Other things to check',
          help: 'Please review these.',
          columns: ['Details'],
          row: (f) => [f.message],
          search: (f) => String(f.message ?? ''),
        },
        items: others,
      })
    }
    return known.filter((g) => g.items.length > 0)
  }, [flags])

  if (flags.length === 0) return null

  return (
    <div className={`fb-flags${embedded ? ' fb-flags--embedded' : ''}`}>
      {!embedded && (
        <div className="fb-flags__top">
          <FiAlertTriangle size={17} />
          <strong>Needs your attention</strong>
          <span className="fb-flags__total">
            {flags.length} {flags.length === 1 ? 'item' : 'items'}
          </span>
        </div>
      )}
      {grouped.map(({ group, items }, index) => (
        <Group
          key={group.type}
          group={group}
          items={items}
          // Inside the list window the first group is already open; elsewhere a big list starts folded.
          defaultOpen={flags.length <= 12 || (embedded && index === 0)}
        />
      ))}
    </div>
  )
}
