import { useRef, useState } from 'react'
import { FiAlertTriangle, FiCheckCircle, FiUploadCloud } from 'react-icons/fi'
import api, { extractErrorMessage } from '../../lib/api'
import { notifySuccess } from '../../lib/toast'
import { fbConfirm } from '../../lib/confirm'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import { money, shortDate } from '../../lib/format'

const PREVIEW_COLUMNS = {
  rci: [
    ['check_date', 'Date', (v) => shortDate(v)],
    ['serial_no', 'Serial no.'],
    ['payee', 'Payee'],
    ['uacs_object_code', 'UACS'],
    ['amount', 'Amount', (v) => money(v)],
  ],
  bank_statement: [
    ['txn_date', 'Date', (v) => shortDate(v)],
    ['check_no', 'Check no.'],
    ['description', 'Description'],
    ['debit', 'Debit', (v) => money(v)],
    ['credit', 'Credit', (v) => money(v)],
    ['running_balance', 'Balance', (v) => money(v)],
  ],
}

/** The file is for another bank account than this reconciliation: the commonest slip, so say it loudly. */
function AccountWarning({ text }) {
  if (!text) return null

  return (
    <div className="fb-import-account-warning" role="alert">
      <FiAlertTriangle size={16} />
      <span>{text}</span>
    </div>
  )
}

/** What a file adds up to: how many rows, the totals, and for a bank statement the balances. */
function Totals({ type, totals }) {
  if (!totals) return null

  const tiles =
    type === 'rci'
      ? [
          ['Checks', totals.count],
          ['Total amount', money(totals.total_amount)],
        ]
      : [
          ['Transactions', totals.count],
          ['Total debits', money(totals.total_debit)],
          ['Total credits', money(totals.total_credit)],
          ['Opening balance', totals.opening_balance == null ? '—' : money(totals.opening_balance)],
          ['Ending balance', totals.ending_balance == null ? '—' : money(totals.ending_balance)],
        ]

  return (
    <div className="fb-import-totals">
      <div className="fb-import-totals__tiles">
        {tiles.map(([label, value]) => (
          <div className="fb-import-totals__tile" key={label}>
            <span className="fb-import-totals__label">{label}</span>
            <span className="fb-import-totals__value">{value}</span>
          </div>
        ))}
      </div>
      {type === 'bank_statement' && totals.adds_up === true && (
        <p className="fb-import-totals__ok">
          <FiCheckCircle size={14} /> Opening balance − debits + credits equals the ending balance.
        </p>
      )}
      {type === 'bank_statement' && totals.adds_up === false && (
        <p className="fb-import-totals__warn">
          <FiAlertTriangle size={14} /> The balances in this file do not add up (opening − debits + credits is not the
          ending balance). Please check that it is the complete statement.
        </p>
      )}
    </div>
  )
}

export default function ImportCard({
  reconciliationId,
  type,
  title,
  description,
  committedBatch,
  disabled,
  readOnlyReason,
  replaceNote,
  removeNote,
  onChanged,
}) {
  const inputRef = useRef(null)
  const [preview, setPreview] = useState(null) // parsed (uncommitted) batch
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const columns = PREVIEW_COLUMNS[type]

  async function handleFile(file) {
    if (!file) return
    setBusy(true)
    setError('')
    const body = new FormData()
    body.append('type', type)
    body.append('file', file)
    try {
      const { data } = await api.post(`/reconciliations/${reconciliationId}/imports`, body, {
        params: { with_preview: true },
      })
      setPreview(data.data)
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function commit() {
    setBusy(true)
    setError('')
    try {
      await api.post(`/imports/${preview.id}/commit`)
      notifySuccess(`${title.split(' (')[0]} ${committedBatch ? 'replaced' : 'imported'}.`)
      setPreview(null)
      onChanged()
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  // Replacing or removing a file that is already imported changes what has been matched, so say so first.
  async function replace() {
    if (replaceNote) {
      const ok = await fbConfirm({
        title: `Replace the ${title.split(' (')[0].toLowerCase()}?`,
        text: replaceNote,
        confirmText: 'Choose a new file',
      })
      if (!ok) return
    }
    inputRef.current?.click()
  }

  async function remove(batchId) {
    const ok = await fbConfirm({
      title: `Remove the ${title.split(' (')[0].toLowerCase()}?`,
      text: removeNote ?? 'The rows from this file are removed.',
      confirmText: 'Remove',
      danger: true,
    })
    if (ok) await discard(batchId)
  }

  async function discard(batchId) {
    setBusy(true)
    try {
      await api.delete(`/imports/${batchId}`)
      setPreview(null)
      onChanged()
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fb-card fb-import-card">
      <div className="fb-import-card__head">
        <div>
          <p className="font-semibold" style={{ color: 'var(--ink)' }}>{title}</p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>{description}</p>
        </div>
        {committedBatch ? (
          <Badge tone="green">Imported</Badge>
        ) : (
          <Badge tone="slate">Not imported</Badge>
        )}
      </div>

      <div className="fb-import-card__body">
        {/* Committed state */}
        {committedBatch && !preview && (
          <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
            <p className="text-slate-700">
              {committedBatch.original_filename} — {committedBatch.imported_count} rows
              {committedBatch.error_count > 0 && (
                <span className="text-amber-600"> · {committedBatch.error_count} skipped</span>
              )}
            </p>
            <AccountWarning text={committedBatch.account_warning} />
            <Totals type={type} totals={committedBatch.totals} />
            {!disabled && (
              <div className="mt-2 flex gap-2">
                <Button variant="secondary" onClick={replace} loading={busy}>
                  Replace
                </Button>
                <Button
                  variant="ghost"
                  style={{ color: 'var(--danger)' }}
                  onClick={() => remove(committedBatch.id)}
                >
                  Remove
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Not this user's task */}
        {!committedBatch && !preview && readOnlyReason && (
          <p className="rounded-lg bg-slate-50 px-3 py-4 text-center text-xs text-slate-400">
            {readOnlyReason}
          </p>
        )}

        {/* Empty state */}
        {!committedBatch && !preview && !readOnlyReason && (
          <button type="button" disabled={disabled || busy} onClick={() => inputRef.current?.click()} className="fb-dropzone">
            <FiUploadCloud size={22} />
            {busy ? 'Reading file…' : 'Click to choose an .xlsx or .csv file'}
          </button>
        )}

        {/* Preview state */}
        {preview && (
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium text-slate-700">{preview.original_filename}</span>
              <Badge tone="blue">{preview.valid_count} valid</Badge>
              {preview.error_count > 0 && <Badge tone="amber">{preview.error_count} with errors</Badge>}
            </div>

            {preview.meta && Object.keys(preview.meta).length > 0 && (
              <p className="mb-2 text-xs text-slate-400">
                {Object.entries(preview.meta)
                  .filter(([, v]) => v != null && v !== '')
                  .map(([k, v]) => `${k.replaceAll('_', ' ')}: ${v}`)
                  .join('  ·  ')}
              </p>
            )}

            <AccountWarning text={preview.account_warning} />
            <Totals type={type} totals={preview.totals} />

            <div className="fb-import-preview">
              <table className="fb-mini-table">
                <thead>
                  <tr>
                    <th className="fb-mini-table__index">#</th>
                    {columns.map(([, header]) => (
                      <th key={header}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(preview.preview ?? []).slice(0, 100).map((row, i) => (
                    <tr key={i}>
                      <td className="fb-mini-table__index">{i + 1}</td>
                      {columns.map(([key, header, fmt]) => (
                        <td
                          key={header}
                          className={
                            key === 'check_date' || key === 'txn_date'
                              ? 'fb-mini-table__date'
                              : key === 'amount' || key === 'debit' || key === 'credit' || key === 'running_balance'
                                ? 'fb-mini-table__num'
                                : undefined
                          }
                        >
                          {row.is_balance_forward && key === 'description'
                            ? 'Balance forwarded'
                            : fmt
                              ? fmt(row[key])
                              : (row[key] ?? '—')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
                {preview.totals && (
                  <tfoot>
                    <tr className="fb-mini-table__total">
                      <td colSpan={type === 'rci' ? columns.length : 4}>
                        Total · {preview.totals.count} {type === 'rci' ? 'checks' : 'transactions'}
                        {(preview.preview ?? []).length > 100 ? ' (all rows, not only the 100 shown)' : ''}
                      </td>
                      {type === 'rci' ? (
                        <td className="fb-mini-table__num">{money(preview.totals.total_amount)}</td>
                      ) : (
                        <>
                          <td className="fb-mini-table__num">{money(preview.totals.total_debit)}</td>
                          <td className="fb-mini-table__num">{money(preview.totals.total_credit)}</td>
                          <td />
                        </>
                      )}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {preview.errors?.length > 0 && (
              <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                <p className="font-medium">Rows that could not be read:</p>
                <ul className="mt-1 list-inside list-disc">
                  {preview.errors.slice(0, 10).map((e, i) => (
                    <li key={i}>
                      Row {e.row}: {e.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-3 flex gap-2">
              <Button onClick={commit} loading={busy} disabled={preview.valid_count === 0}>
                {committedBatch ? `Replace with ${preview.valid_count} rows` : `Commit ${preview.valid_count} rows`}
              </Button>
              <Button variant="secondary" onClick={() => discard(preview.id)} disabled={busy}>
                Discard
              </Button>
            </div>
          </div>
        )}

        {error && (
          <p className="mt-2 text-xs" style={{ color: 'var(--danger)' }}>
            {error}
          </p>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  )
}
