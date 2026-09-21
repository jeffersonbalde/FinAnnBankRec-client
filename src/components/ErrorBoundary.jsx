import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--dash-bg)', padding: '1.5rem' }}>
          <div className="fb-card" style={{ maxWidth: '28rem', padding: '1.5rem', textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.1rem' }}>Something went wrong</h1>
            <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--muted)' }}>
              {String(this.state.error?.message || this.state.error)}
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ error: null })
                window.location.assign('/')
              }}
              className="fb-btn fb-btn--primary"
              style={{ marginTop: '1rem' }}
            >
              Back to dashboard
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
