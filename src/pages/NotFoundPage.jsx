import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="fb-empty">
      <p className="fb-empty__big">404</p>
      <p style={{ marginTop: '0.5rem' }}>This page does not exist.</p>
      <Link to="/" className="fb-btn fb-btn--subtle fb-btn--sm" style={{ marginTop: '1rem' }}>
        Back to dashboard
      </Link>
    </div>
  )
}
