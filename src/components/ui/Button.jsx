import clsx from 'clsx'
import { Spinner } from '../Spinner'

const VARIANT = {
  primary: 'fb-btn--primary',
  secondary: 'fb-btn--ghost',
  ghost: 'fb-btn--link',
  danger: 'fb-btn--danger',
  subtle: 'fb-btn--subtle',
  slate: 'fb-btn--slate',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  children,
  disabled,
  ...props
}) {
  return (
    <button
      className={clsx('fb-btn', VARIANT[variant] ?? VARIANT.primary, size === 'sm' && 'fb-btn--sm', loading && 'is-loading', className)}
      disabled={loading || disabled}
      aria-busy={loading || undefined}
      {...props}
    >
      <span className="fb-btn__inner">
        <span className={clsx('fb-btn__label', loading && 'fb-btn__label--hidden')}>{children}</span>
        {loading && (
          <span className="fb-btn__spinner-wrap" aria-hidden="true">
            <Spinner className="fb-btn__spinner" />
          </span>
        )}
      </span>
    </button>
  )
}
