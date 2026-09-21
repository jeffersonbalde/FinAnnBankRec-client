import { useEffect, useState } from 'react'
import api, { extractErrorMessage } from '../../lib/api'
import { notifyError } from '../../lib/toast'
import { fbConfirm } from '../../lib/confirm'
import Button from '../../components/ui/Button'
import { TextInput, Select } from '../../components/ui/Field'

const BLOCKS = [
  ['prepared_by', 'Prepared by'],
  ['certified_correct', 'Certified Correct'],
  ['disbursing_officer', 'Disbursing Officer'],
]

export default function SignatoriesEditor({ bankAccountId }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState({ block: 'prepared_by', name: '', designation: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get(`/bank-accounts/${bankAccountId}/signatories`)
      setRows(data.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [bankAccountId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function add() {
    if (!draft.name || !draft.designation) return
    setBusy(true)
    setError('')
    try {
      await api.post(`/bank-accounts/${bankAccountId}/signatories`, { ...draft, sort_order: rows.length + 1 })
      setDraft({ block: 'prepared_by', name: '', designation: '' })
      await load()
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function removeRow(id) {
    const ok = await fbConfirm({
      title: 'Remove signatory?',
      text: 'This cannot be undone.',
      confirmText: 'Remove',
      danger: true,
    })
    if (!ok) return
    try {
      await api.delete(`/signatories/${id}`)
      await load()
    } catch (err) {
      notifyError(err)
    }
  }

  return (
    <div style={{ borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--surface-2)', padding: '0.85rem' }}>
      <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--ink-soft)' }}>Signatories</p>
      {loading ? (
        <p style={{ fontSize: '0.78rem', color: 'var(--faint)' }}>Loading…</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: '0 0 0.75rem', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          {rows.length === 0 && <li style={{ fontSize: '0.78rem', color: 'var(--faint)' }}>No signatories yet.</li>}
          {rows.map((s) => (
            <li
              key={s.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--surface)',
                padding: '0.35rem 0.6rem',
                fontSize: '0.85rem',
              }}
            >
              <span>
                <span style={{ color: 'var(--faint)' }}>{s.block_label}:</span> {s.name}{' '}
                <span style={{ color: 'var(--faint)' }}>— {s.designation}</span>
              </span>
              <button
                type="button"
                onClick={() => removeRow(s.id)}
                className="fb-btn fb-btn--link fb-btn--sm"
                style={{ color: 'var(--danger)' }}
              >
                remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '10rem 1fr 1fr auto', gap: '0.5rem' }}>
        <Select value={draft.block} onChange={(e) => setDraft({ ...draft, block: e.target.value })}>
          {BLOCKS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
        <TextInput placeholder="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        <TextInput
          placeholder="Designation"
          value={draft.designation}
          onChange={(e) => setDraft({ ...draft, designation: e.target.value })}
        />
        <Button type="button" size="sm" onClick={add} loading={busy}>
          Add
        </Button>
      </div>
      {error && <p style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: 'var(--danger)' }}>{error}</p>}
    </div>
  )
}
