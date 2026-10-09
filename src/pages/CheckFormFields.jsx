import { FiCreditCard, FiUser, FiHash, FiPercent, FiEdit3 } from 'react-icons/fi'
import { Field, TextInput } from '../components/ui/Field'
import SearchableSelect from '../components/ui/SearchableSelect'
import MoneyInput from '../components/ui/MoneyInput'

function Section({ icon: Icon, title, hint, children }) {
  return (
    <section className="fb-checkform__section">
      <header className="fb-checkform__section-head">
        <span className="fb-checkform__icon">
          <Icon size={15} />
        </span>
        <span className="fb-checkform__section-title">{title}</span>
        {hint && <span className="fb-checkform__section-hint">{hint}</span>}
      </header>
      <div className="fb-checkform__section-body">{children}</div>
    </section>
  )
}

/**
 * The fields of the check form, laid out in labelled sections. Everything is
 * visible at once — nothing hides behind a toggle.
 */
export default function CheckFormFields({ form, setForm, fieldErrors, accountOptions, uacsOptions, accountLocked }) {
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })
  const setValue = (key) => (value) => setForm({ ...form, [key]: value })

  return (
    <div className="fb-checkform">
      <Section icon={FiCreditCard} title="Check details">
        <Field
          label="Bank account"
          required
          error={fieldErrors.bank_account_id?.[0]}
          hint={accountLocked ? 'A recorded check keeps its bank account.' : undefined}
        >
          <SearchableSelect
            options={accountOptions}
            value={form.bank_account_id}
            onChange={(id) => setForm({ ...form, bank_account_id: String(id) })}
            placeholder="Choose a bank account…"
            searchPlaceholder="Search bank, account no., or fund…"
            panelTitle="Select bank account"
            overlayPanel
            countLabel="account"
            emptyMessage="No bank accounts match your search."
            error={!!fieldErrors.bank_account_id?.[0]}
            disabled={accountLocked}
            required
          />
        </Field>
        <div className="fb-check-form__grid">
          <Field label="Check number" required error={fieldErrors.serial_no?.[0]}>
            <TextInput value={form.serial_no} onChange={set('serial_no')} placeholder="e.g. 000100003" required />
          </Field>
          <Field
            label="Date of check"
            required
            error={fieldErrors.check_date?.[0]}
            hint="Decides which reconciliation period it belongs to."
          >
            <TextInput type="date" value={form.check_date} onChange={set('check_date')} required />
          </Field>
        </div>
      </Section>

      <Section icon={FiUser} title="Payment">
        <Field label="Payee (who the check is for)" required error={fieldErrors.payee?.[0]}>
          <TextInput value={form.payee} onChange={set('payee')} placeholder="e.g. ABC Training Center Inc." required />
        </Field>
        <div className="fb-check-form__grid">
          <Field label="Amount" required error={fieldErrors.amount?.[0]}>
            <MoneyInput
              prefix
              positive
              value={form.amount}
              onChange={setValue('amount')}
              placeholder="0.00"
              error={!!fieldErrors.amount?.[0]}
              required
            />
          </Field>
          <Field label="Nature of payment">
            <TextInput value={form.nature_of_payment} onChange={set('nature_of_payment')} placeholder="e.g. Training services" />
          </Field>
        </div>
      </Section>

      <Section icon={FiHash} title="Accounting references" hint="Optional">
        <div className="fb-check-form__grid">
          <Field label="DV no.">
            <TextInput value={form.dv_no} onChange={set('dv_no')} />
          </Field>
          <Field label="OR/BURS no.">
            <TextInput value={form.or_burs_no} onChange={set('or_burs_no')} />
          </Field>
          <Field label="Responsibility center code">
            <TextInput value={form.responsibility_center_code} onChange={set('responsibility_center_code')} />
          </Field>
          <Field label="UACS object code">
            <SearchableSelect
              options={uacsOptions}
              value={form.uacs_object_code}
              onChange={(code) => setForm({ ...form, uacs_object_code: code })}
              placeholder="Search a UACS code…"
              searchPlaceholder="Search code or title…"
              panelTitle="Select UACS object code"
              overlayPanel
              countLabel="code"
              emptyMessage="No UACS codes match your search."
            />
          </Field>
          <Field label="Report no.">
            <TextInput value={form.report_no} onChange={set('report_no')} />
          </Field>
        </div>
      </Section>

      <Section icon={FiPercent} title="Tax" hint="Optional">
        <div className="fb-check-form__grid">
          <Field label="Gross taxable amount" error={fieldErrors.gross_taxable_amount?.[0]}>
            <MoneyInput prefix value={form.gross_taxable_amount} onChange={setValue('gross_taxable_amount')} placeholder="0.00" />
          </Field>
          <Field label="Withholding tax" error={fieldErrors.withholding_tax?.[0]}>
            <MoneyInput prefix value={form.withholding_tax} onChange={setValue('withholding_tax')} placeholder="0.00" />
          </Field>
        </div>
      </Section>

      <Section icon={FiEdit3} title="Notes" hint="Optional">
        <textarea
          className="form-control"
          rows={2}
          value={form.notes}
          onChange={set('notes')}
          placeholder="Anything worth remembering about this check"
        />
      </Section>
    </div>
  )
}
