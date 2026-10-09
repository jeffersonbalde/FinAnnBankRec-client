import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'
import api, { extractErrorMessage } from '../../lib/api'
import { money, shortDate } from '../../lib/format'
import { CardSkeleton, StatSkeleton } from '../../components/ui/Skeletons'
import PageHeader from '../../components/PageHeader'
import Badge from '../../components/ui/Badge'
import Tabs from '../../components/ui/Tabs'
import ChecksTab from './ChecksTab'
import BankStatementTab from './BankStatementTab'
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
  const [tab, setTab] = useState('checks')

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

  if (loading) {
    // The same shape as the loaded page: back link, title, five stat cards, then the tab content.
    return (
      <div aria-busy="true">
        <span className="fb-skel" style={{ display: 'block', width: '9rem', marginBottom: '1rem' }} />
        <div className="fb-page__header">
          <div>
            <span className="fb-skel" style={{ display: 'block', width: '16rem', height: '1.6rem' }} />
            <span
              className="fb-skel"
              style={{ display: 'block', width: '22rem', maxWidth: '100%', marginTop: '0.6rem' }}
            />
          </div>
        </div>
        <StatSkeleton count={5} style={{ marginBottom: '1.35rem' }} />
        <CardSkeleton height="14rem" />
      </div>
    )
  }
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
  // Numbered so the order of work is obvious: checks → statement → match → review.
  const tabs = [
    { key: 'checks', label: '1. Checks Issued' },
    { key: 'statement', label: '2. Bank Statement' },
    { key: 'matching', label: '3. Matching' },
    { key: 'items', label: '4. Reconciling Items' },
    { key: 'brs', label: '5. BRS' },
    { key: 'schedules', label: '6. Schedules' },
    { key: 'workflow', label: '7. Workflow' },
  ]

  const cards = [
    { label: 'Unadjusted book', value: money(recon.unadjusted_book_balance) },
    { label: 'Unadjusted bank', value: money(recon.unadjusted_bank_balance) },
    { label: 'Adjusted book', value: money(recon.adjusted_book_balance) },
    { label: 'Adjusted bank', value: money(recon.adjusted_bank_balance) },
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

      <div className="fb-stats fb-reveal" style={{ marginBottom: '1.35rem' }}>
        {cards.map((c) => (
          <div key={c.label} className="fb-stat">
            <span className="fb-stat__label">{c.label}</span>
            <span className={`fb-stat__value fb-stat__value--money${c.danger ? ' fb-stat__value--danger' : ''}`}>
              {c.value}
            </span>
          </div>
        ))}
      </div>

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      <div style={{ marginTop: '1.35rem' }}>
        {tab === 'checks' && <ChecksTab reconciliation={recon} onChanged={load} />}
        {tab === 'statement' && (
          <BankStatementTab reconciliation={recon} onChanged={load} onOpenMatching={() => setTab('matching')} />
        )}
        {tab === 'matching' && <MatchingTab reconciliation={recon} onChanged={load} />}
        {tab === 'items' && <ReconcilingItemsTab reconciliation={recon} onChanged={load} />}
        {tab === 'brs' && <BrsTab reconciliation={recon} onChanged={load} />}
        {tab === 'schedules' && <SchedulesTab reconciliation={recon} />}
        {tab === 'workflow' && <WorkflowTab reconciliation={recon} onChanged={load} />}
      </div>
    </div>
  )
}
