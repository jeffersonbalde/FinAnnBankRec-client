import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowRight, FiAlertCircle } from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import { extractErrorMessage } from '../lib/api'
import { Spinner } from '../components/Spinner'
import tesdaLogo from '../assets/tesda_logo.png'
import './login.css'

const DEMO_ACCOUNTS = [
  ['admin@tesda.gov.ph', 'Administrator'],
  ['analyst@tesda.gov.ph', 'Financial Analyst'],
  ['disbursing@tesda.gov.ph', 'Disbursing Officer'],
  ['budget@tesda.gov.ph', 'Budget Officer'],
]

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email, password)
      navigate(location.state?.from || '/', { replace: true })
    } catch (err) {
      setError(extractErrorMessage(err, 'Unable to sign in.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fb-login">
      <aside className="fb-login__brand" aria-hidden="true">
        <div className="fb-login__brand-inner">
          <img src={tesdaLogo} alt="TESDA" className="fb-login__brand-mark" />
          <p className="fb-login__brand-title">FinAnnBankRec</p>
          <p className="fb-login__brand-tag">
            Automated Bank Reconciliation System for TESDA &mdash; Misamis Occidental.
          </p>
          <p className="fb-login__brand-foot">Financial Analysis &amp; Bank Reconciliation Unit</p>
        </div>
      </aside>

      <section className="fb-login__panel">
        <div className="fb-login__panel-inner">
          <img src={tesdaLogo} alt="TESDA" className="fb-login__mark-sm" />
          <h1>Welcome back</h1>
          <p className="fb-login__panel-sub">Sign in to continue to FinAnnBankRec.</p>

          <form className="fb-login__form" onSubmit={handleSubmit}>
            {error && (
              <div className="fb-alert fb-alert--danger fb-login__alert" role="alert">
                <FiAlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{error}</span>
              </div>
            )}

            <label className="fb-login__field">
              <span>Email</span>
              <FiMail className="fb-login__field-icon" size={16} />
              <input
                type="email"
                className="form-control"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            <label className="fb-login__field">
              <span>Password</span>
              <FiLock className="fb-login__field-icon" size={16} />
              <input
                type={showPw ? 'text' : 'password'}
                className="form-control"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="fb-login__toggle"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </label>

            <button
              type="submit"
              className="fb-btn fb-btn--primary fb-login__submit"
              disabled={submitting}
            >
              {submitting ? <Spinner /> : <>Sign in <FiArrowRight size={16} /></>}
            </button>
          </form>

          <div className="fb-login__demo">
            <p className="fb-login__demo-label">
              Demo accounts &mdash; password <code>password</code>
            </p>
            <div className="fb-login__demo-grid">
              {DEMO_ACCOUNTS.map(([mail, label]) => (
                <button
                  key={mail}
                  type="button"
                  className="fb-login__demo-chip"
                  onClick={() => {
                    setEmail(mail)
                    setPassword('password')
                  }}
                >
                  <span>{label}</span>
                  <span>{mail}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
