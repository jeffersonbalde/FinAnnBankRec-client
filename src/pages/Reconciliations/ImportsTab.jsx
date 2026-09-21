import { useAuth } from '../../context/AuthContext'
import { ROLES } from '../../lib/roles'
import ImportCard from './ImportCard'

const DEFS = [
  {
    type: 'rci',
    title: 'Report of Checks Issued (Appendix 35)',
    description: 'Every check the agency issued for the period.',
    owner: 'Disbursing Officer',
  },
  {
    type: 'bank_statement',
    title: 'Bank Statement',
    description: 'The LANDBANK statement of account for the period.',
    owner: 'Financial Analyst',
  },
]

export default function ImportsTab({ reconciliation, onChanged }) {
  const { user } = useAuth()
  const disabled = !reconciliation.is_editable
  const isAnalyst = [ROLES.FINANCIAL_ANALYST, ROLES.ADMIN].includes(user.role)
  const isDisbursing = user.role === ROLES.DISBURSING_OFFICER

  const canUpload = (type) => {
    if (isAnalyst) return true
    if (isDisbursing) return type === 'rci'
    return false
  }

  const batches = reconciliation.import_batches ?? []
  const committedFor = (type) => batches.find((b) => b.type === type && b.status === 'committed')

  return (
    <div>
      {disabled && (
        <div className="fb-alert fb-alert--muted" style={{ marginBottom: '0.9rem' }}>
          This reconciliation is {reconciliation.status_label.toLowerCase()} — imports are locked.
        </div>
      )}
      <div className="fb-imports-grid">
        {DEFS.map((def) => (
          <ImportCard
            key={def.type}
            reconciliationId={reconciliation.id}
            type={def.type}
            title={def.title}
            description={def.description}
            owner={def.owner}
            committedBatch={committedFor(def.type)}
            disabled={disabled || !canUpload(def.type)}
            readOnlyReason={!canUpload(def.type) ? `Handled by the ${def.owner}` : null}
            onChanged={onChanged}
          />
        ))}
      </div>
    </div>
  )
}
