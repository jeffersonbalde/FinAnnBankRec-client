import { useAuth } from '../../context/AuthContext'
import { ROLES } from '../../lib/roles'
import ImportCard from './ImportCard'

/**
 * Step 2 — the LANDBANK statement for the period. Upload only; the lines it
 * contains are matched against the checks in the next step.
 */
export default function BankStatementTab({ reconciliation, onChanged, onOpenMatching }) {
  const { user } = useAuth()
  const editable = reconciliation.is_editable
  const canUpload = [ROLES.FINANCIAL_ANALYST, ROLES.ADMIN].includes(user.role)
  const committed = (reconciliation.import_batches ?? []).find((b) => b.type === 'bank_statement' && b.status === 'committed')

  return (
    <div style={{ maxWidth: '46rem' }}>
      <p className="fb-help">
        Upload the bank statement (LANDBANK statement of account) for this period. Its balance fills in the unadjusted
        bank balance automatically.
      </p>

      {!editable && (
        <div className="fb-alert fb-alert--muted" style={{ marginBottom: '0.9rem' }}>
          This reconciliation is {reconciliation.status_label.toLowerCase()} — the statement can no longer be changed.
        </div>
      )}

      <ImportCard
        reconciliationId={reconciliation.id}
        type="bank_statement"
        title="Bank Statement"
        description="An .xlsx or .csv file from the bank."
        committedBatch={committed}
        disabled={!editable || !canUpload}
        readOnlyReason={!canUpload ? 'Handled by the Financial Analyst' : null}
        replaceNote="The rows of the current statement are removed and replaced by the new file, and the checks are matched again. Any link you made by hand has to be done again."
        removeNote="The statement rows are removed, and the checks it cleared become outstanding again."
        onChanged={onChanged}
      />

      {committed && onOpenMatching && (
        <p className="fb-help" style={{ marginTop: '1rem' }}>
          Statement uploaded.{' '}
          <button type="button" className="fb-check-form__more" style={{ margin: 0 }} onClick={onOpenMatching}>
            Next: go to Matching
          </button>
        </p>
      )}
    </div>
  )
}
