import { useMemo, useState } from 'react'
import { FiDownload, FiSearch } from 'react-icons/fi'
import { apiBaseUrl } from '../../lib/api'
import { money, shortDate } from '../../lib/format'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import FlagsPanel from './FlagsPanel'
import './flags-panel.css'

const PAGE = 25

const TITLES = {
  cleared: 'Cleared checks',
  outstanding: 'Outstanding checks',
  flags: 'Needs your attention',
}

const SUBTITLES = {
  cleared: 'Checks the bank has cashed in this period.',
  outstanding: 'Checks issued but not yet cashed, including those carried over from earlier months.',
  flags: 'What the matching could not settle by itself.',
}

const STATUS_TONE = { outstanding: 'slate', stale: 'red' }

function CheckList({ category, checks, reconciliation }) {
  const [query, setQuery] = useState('')
  const [shown, setShown] = useState(PAGE)

  const q = query.trim().toLowerCase()
  const matches = useMemo(
    () => (q ? checks.filter((c) => `${c.serial_no} ${c.payee ?? ''}`.toLowerCase().includes(q)) : checks),
    [checks, q],
  )
  const visible = matches.slice(0, shown)
  const cleared = category === 'cleared'
  const total = checks.reduce((sum, c) => sum + Number(c.amount || 0), 0)

  return (
    <div className="fb-mlist">
      <div className="fb-mlist__bar">
        <strong>
          {checks.length} {checks.length === 1 ? 'check' : 'checks'}
        </strong>
        <span>Total {money(total)}</span>
        {checks.length > 10 && (
          <div className="fb-flags__search fb-mlist__search">
            <FiSearch size={14} />
            <input
              className="form-control"
              type="search"
              placeholder="Search check no. or payee..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setShown(PAGE)
              }}
            />
          </div>
        )}
      </div>

      <div className="fb-flags__scroll fb-mlist__scroll">
        <table className="fb-flags__table">
          <thead>
            <tr>
              <th className="fb-flags__num">#</th>
              <th>Check no.</th>
              <th>Payee</th>
              <th className="fb-flags__nowrap">Check date</th>
              <th>{cleared ? 'Cleared on' : 'Status'}</th>
              <th className="fb-flags__amt">Amount</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((c, i) => (
              <tr key={c.id}>
                <td className="fb-flags__num">{i + 1}</td>
                <td className="fb-flags__strong">{c.serial_no}</td>
                <td>
                  {c.payee || '—'}
                  {!cleared && c.reconciliation_id != null && c.reconciliation_id !== reconciliation.id && (
                    <span className="fb-mlist__note">
                      Carried over{c.origin_period_label ? ` — issued ${c.origin_period_label}` : ''}
                    </span>
                  )}
                </td>
                <td className="fb-flags__nowrap">{c.check_date ? shortDate(c.check_date) : '—'}</td>
                <td className="fb-flags__nowrap">
                  {cleared ? (
                    c.cleared_on ? shortDate(c.cleared_on) : '—'
                  ) : (
                    <Badge tone={STATUS_TONE[c.status] ?? 'slate'}>{c.status_label}</Badge>
                  )}
                </td>
                <td className="fb-flags__amt">{money(c.amount)}</td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} className="fb-flags__none">
                  {q ? 'Nothing matches your search.' : cleared ? 'No cleared checks yet.' : 'No outstanding checks.'}
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
          <button type="button" className="fb-btn fb-btn--link fb-btn--sm" onClick={() => setShown((n) => n + 50)}>
            Show 50 more
          </button>
          {matches.length - shown > 50 && (
            <button type="button" className="fb-btn fb-btn--link fb-btn--sm" onClick={() => setShown(matches.length)}>
              Show all
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * What is behind the "86 cleared · 187 outstanding · 270 flags" line of the Matching tab:
 * the actual records, searchable, with a button to take them to Excel.
 * `category` is 'cleared' | 'outstanding' | 'flags', or null when closed.
 */
export default function MatchingListModal({ category, onClose, checks, flags, reconciliation }) {
  // Keep showing the last list while the modal fades out.
  const [last, setLast] = useState(category)
  if (category && category !== last) setLast(category)
  const current = category ?? last

  const rows = {
    cleared: checks.filter((c) => c.status === 'cleared'),
    outstanding: checks.filter((c) => c.status === 'outstanding' || c.status === 'stale'),
  }
  const count = current === 'flags' ? flags.length : (rows[current]?.length ?? 0)
  const exportHref = `${apiBaseUrl}/reconciliations/${reconciliation.id}/export/matching.xlsx?category=${current}`

  return (
    <Modal
      open={!!category}
      onClose={onClose}
      title={current ? `${TITLES[current]} (${count})` : ''}
      size="lg"
      footer={
        current && (
          <>
            <a className="fb-btn fb-btn--ghost" href={exportHref} aria-disabled={count === 0}>
              <FiDownload size={15} /> Export to Excel
            </a>
            <Button onClick={onClose}>Close</Button>
          </>
        )
      }
    >
      {current && (
        <>
          <p className="fb-mlist__sub">{SUBTITLES[current]}</p>
          {current === 'flags' ? (
            flags.length > 0 ? (
              <FlagsPanel flags={flags} embedded />
            ) : (
              <p className="fb-flags__none">Nothing needs your attention.</p>
            )
          ) : (
            <CheckList key={current} category={current} checks={rows[current]} reconciliation={reconciliation} />
          )}
        </>
      )}
    </Modal>
  )
}
