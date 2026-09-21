import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'
import api, { extractErrorMessage } from '../../lib/api'
import { money, shortDate } from '../../lib/format'
import { FullPageSpinner } from '../../components/Spinner'
import PageHeader from '../../components/PageHeader'
import Badge from '../../components/ui/Badge'
import Tabs from '../../components/ui/Tabs'
import ImportsTab from './ImportsTab'
import MatchingTab from './MatchingTab'
import ReconcilingItemsTab from './ReconcilingItemsTab'
import BrsTab from './BrsTab'
import SchedulesTab from './SchedulesTab'
import WorkflowTab from './WorkflowTab'
import './reconciliation.css'

const STATUS_TONE = {
  draft: 'slate',
  for_review: 'amber',
  certified: 'green',
  returned: 'red',
}

export default function ReconciliationDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [recon, setRecon] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [tab, setTab] = useState('imports')

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/reconciliations/${id}`)
      setRecon(data.data)
    } catch (err) {
      if (err?.response?.status === 404) {
        setNotFound(true)
      } else {
        setError(extractErrorMessage(err))
      }
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <FullPageSpinner />
  if (notFound) {
    return (
      <div className="fb-empty">
        <p className="fb-empty__big">Not found</p>
        <p style={{ marginTop: '0.5rem' }}>
          This reconciliation doesn&apos;t exist. It may have been deleted, or the link is out of date.
        </p>
        <Link to="/reconciliations" className="fb-btn fb-btn--subtle fb-btn--sm" style={{ marginTop: '1rem' }}>
          Back to reconciliations
        </Link>
      </div>
    )
  }
  if (error) return <div className="fb-alert fb-alert--danger">{error}</div>
  if (!recon) return null

  const account = recon.bank_account
  const committed = (recon.import_batches ?? []).filter((b) => b.status === 'committed').length
  const tabs = [
    { key: 'imports', label: 'Imports', badge: committed || null },
    { key: 'matching', label: 'Matching' },
    { key: 'items', label: 'Reconciling Items' },
    { key: 'brs', label: 'BRS' },
    { key: 'schedules', label: 'Schedules' },
    { key: 'workflow', label: 'Workflow' },
  ]

  const cards = [
    { label: 'Unadjusted book', value: money(recon.unadjusted_book_balance) },
    { label: 'Unadjusted bank', value: money(recon.unadjusted_bank_balance) },
    {
      label: 'Adjusted (book / bank)',
      value: `${money(recon.adjusted_book_balance)} / ${money(recon.adjusted_bank_balance)}`,
    },
    { label: 'Difference', value: money(recon.difference), danger: Number(recon.difference) !== 0 },
  ]

  return (
    <div>
      <button type="button" className="fb-page__back" onClick={() => navigate('/reconciliations')}>
        <FiArrowLeft size={14} /> All reconciliations
      </button>

      <PageHeader
        title={`${shortDate(recon.period_start)} – ${shortDate(recon.period_end)}`}
        subtitle={
          account
            ? `${account.bank_short_name || account.bank_name} · ${account.account_number} · ${account.fund_cluster}`
            : ''
        }
        actions={<Badge tone={STATUS_TONE[recon.status] ?? 'slate'}>{recon.status_label}</Badge>}
      />

      <div className="fb-stats" style={{ marginBottom: '1.35rem' }}>
        {cards.map((c) => (
          <div key={c.label} className="fb-stat">
            <span className="fb-stat__label">{c.label}</span>
            <span className={`fb-stat__value${c.danger ? ' fb-stat__value--danger' : ''}`} style={{ fontSize: '1.15rem' }}>
              {c.value}
            </span>
          </div>
        ))}
      </div>

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      <div style={{ marginTop: '1.35rem' }}>
        {tab === 'imports' && <ImportsTab reconciliation={recon} onChanged={load} />}
        {tab === 'matching' && <MatchingTab reconciliation={recon} onChanged={load} />}
        {tab === 'items' && <ReconcilingItemsTab reconciliation={recon} onChanged={load} />}
        {tab === 'brs' && <BrsTab reconciliation={recon} onChanged={load} />}
        {tab === 'schedules' && <SchedulesTab reconciliation={recon} />}
        {tab === 'workflow' && <WorkflowTab reconciliation={recon} onChanged={load} />}
      </div>
    </div>
  )
}
