export function Spinner({ className = '' }) {
  return <span className={`fb-loader ${className}`} role="status" aria-label="Loading" />
}

export function FullPageSpinner() {
  return (
    <div className="fb-loader__wrap">
      <span className="fb-loader fb-loader--page" role="status" aria-label="Loading" />
    </div>
  )
}
