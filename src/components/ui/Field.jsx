import clsx from 'clsx'

export function Field({ label, error, hint, required = false, children }) {
  return (
    <div className="fb-field">
      {label && (
        <span className="fb-field__label">
          {label}
          {required && (
            <span className="fb-field__req" aria-hidden="true">
              {' '}
              *
            </span>
          )}
        </span>
      )}
      {children}
      {hint && !error && <span className="fb-field__hint">{hint}</span>}
      {error && <span className="fb-field__error">{error}</span>}
    </div>
  )
}

export function TextInput({ error, className, ...props }) {
  return <input className={clsx('form-control', error && 'is-invalid', className)} {...props} />
}

export function Select({ error, className, children, ...props }) {
  return (
    <select className={clsx('form-select', error && 'is-invalid', className)} {...props}>
      {children}
    </select>
  )
}

export function Checkbox({ label, ...props }) {
  return (
    <label className="fb-check">
      <input type="checkbox" className="form-check-input mt-0" {...props} />
      {label}
    </label>
  )
}
