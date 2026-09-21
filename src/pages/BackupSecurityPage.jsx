import { useCallback, useEffect, useState } from 'react'
import {
  FiRefreshCw,
  FiDownload,
  FiTrash2,
  FiDatabase,
  FiShield,
  FiClock,
  FiEye,
  FiEyeOff,
  FiSave,
} from 'react-icons/fi'
import PageHeader from '../components/PageHeader'
import Tabs from '../components/ui/Tabs'
import Button from '../components/ui/Button'
import DataTable from '../components/ui/DataTable'
import { Field, TextInput, Select } from '../components/ui/Field'
import { FullPageSpinner } from '../components/Spinner'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import { fbConfirm } from '../lib/confirm'
import { notifyError, notifySuccess } from '../lib/toast'
import './backup-security.css'

const TABS = [
  { key: 'backups', label: 'Data Backups' },
  { key: 'password', label: 'Account Security' },
]

const WEEKDAYS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

const emptySchedule = {
  enabled: true,
  frequency: 'daily',
  time: '02:00',
  weekday: 1,
  retention_days: 30,
  label: '',
  next_run_at: null,
  last_run_at: null,
}

function formatBytes(bytes) {
  const n = Number(bytes) || 0
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}

function formatWhen(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function triggerBlobDownload(blob, filename) {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

function PasswordInput({ value, onChange, autoComplete, error, required }) {
  const [show, setShow] = useState(false)
  return (
    <div className="fb-password">
      <input
        className={`form-control${error ? ' is-invalid' : ''}`}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        required={required}
        placeholder="••••••••"
      />
      <button
        type="button"
        className="fb-password__toggle"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? <FiEyeOff size={16} /> : <FiEye size={16} />}
      </button>
    </div>
  )
}

export default function BackupSecurityPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState('backups')
  const [status, setStatus] = useState(null)
  const [backups, setBackups] = useState([])
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [deletingName, setDeletingName] = useState(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwErrors, setPwErrors] = useState({})
  const [scheduleForm, setScheduleForm] = useState(emptySchedule)
  const [scheduleSaving, setScheduleSaving] = useState(false)

  const pwMismatch =
    passwordConfirmation.length > 0 && password !== passwordConfirmation

  function applySchedule(raw) {
    if (!raw) return
    setScheduleForm({
      enabled: !!raw.enabled,
      frequency: raw.frequency === 'weekly' ? 'weekly' : 'daily',
      time: raw.time || '02:00',
      weekday: raw.weekday == null ? 1 : Number(raw.weekday),
      retention_days: Number(raw.retention_days ?? 30),
      label: raw.label || '',
      next_run_at: raw.next_run_at || null,
      last_run_at: raw.last_run_at || null,
    })
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [statusRes, backupsRes] = await Promise.all([
        api.get('/system/status'),
        api.get('/system/backups'),
      ])
      setStatus(statusRes.data)
      // SQL is the primary backup; JSON companion is kept on disk for restore but not listed.
      const files = backupsRes.data?.data || []
      setBackups(files.filter((f) => f.format === 'sql'))
      applySchedule(statusRes.data?.backup?.schedule || backupsRes.data?.schedule)
    } catch (err) {
      notifyError(err, 'Failed to load backup tools.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function createBackup() {
    setWorking(true)
    try {
      const { data } = await api.post('/system/backups')
      notifySuccess(data.message || 'Backup created.')
      await load()
    } catch (err) {
      notifyError(err, 'Failed to create backup.')
    } finally {
      setWorking(false)
    }
  }

  async function saveSchedule(e) {
    e.preventDefault()
    setScheduleSaving(true)
    try {
      const payload = {
        enabled: !!scheduleForm.enabled,
        frequency: scheduleForm.frequency,
        time: scheduleForm.time,
        retention_days: Number(scheduleForm.retention_days) || 0,
      }
      if (scheduleForm.frequency === 'weekly') {
        payload.weekday = Number(scheduleForm.weekday)
      }
      const { data } = await api.put('/system/backup-schedule', payload)
      notifySuccess(data.message || 'Schedule saved.')
      applySchedule(data.schedule)
      await load()
    } catch (err) {
      notifyError(err, 'Failed to save backup schedule.')
    } finally {
      setScheduleSaving(false)
    }
  }

  async function downloadFreshSql() {
    setWorking(true)
    try {
      const response = await api.get('/system/backup', { responseType: 'blob' })
      const disposition = response.headers['content-disposition'] || ''
      const match = disposition.match(/filename="?([^"]+)"?/i)
      const filename = match?.[1] || `finann-backup-${new Date().toISOString().slice(0, 10)}.sql`
      triggerBlobDownload(new Blob([response.data], { type: 'application/sql' }), filename)
      notifySuccess('SQL backup downloaded.')
      await load()
    } catch (err) {
      notifyError(err, 'Failed to download SQL backup.')
    } finally {
      setWorking(false)
    }
  }

  async function downloadFile(name) {
    setWorking(true)
    try {
      const response = await api.get(`/system/backups/${encodeURIComponent(name)}`, {
        responseType: 'blob',
      })
      const type = name.endsWith('.sql') ? 'application/sql' : 'application/json'
      triggerBlobDownload(new Blob([response.data], { type }), name)
      notifySuccess('Download started.')
    } catch (err) {
      notifyError(err, 'Failed to download backup file.')
    } finally {
      setWorking(false)
    }
  }

  async function deleteFile(name) {
    const ok = await fbConfirm({
      title: 'Delete this backup?',
      text: `${name} will be permanently removed from the server.`,
      confirmText: 'Delete',
      danger: true,
    })
    if (!ok) return

    setDeletingName(name)
    try {
      await api.delete(`/system/backups/${encodeURIComponent(name)}`)
      notifySuccess('Backup deleted.')
      await load()
    } catch (err) {
      notifyError(err, 'Failed to delete backup.')
    } finally {
      setDeletingName(null)
    }
  }

  async function clearActivityData() {
    const ok = await fbConfirm({
      title: 'Clear all reconciliation data?',
      text: 'Deletes every reconciliation, imported check and bank transaction, notification and audit entry. Users, bank accounts and UACS codes are kept. A backup is saved first.',
      confirmText: 'Clear data',
      danger: true,
    })
    if (!ok) return

    setWorking(true)
    try {
      const { data } = await api.delete('/system/activity-data', { data: { confirm: 'CLEAR' } })
      notifySuccess(data.message || 'Reconciliation data cleared.')
      await load()
    } catch (err) {
      notifyError(err, 'Failed to clear reconciliation data.')
    } finally {
      setWorking(false)
    }
  }

  async function changePassword(e) {
    e.preventDefault()
    if (pwMismatch) return
    setPwErrors({})
    setPwSaving(true)
    try {
      await api.put('/system/password', {
        current_password: currentPassword,
        password,
        password_confirmation: passwordConfirmation,
      })
      notifySuccess('Password updated successfully.')
      setCurrentPassword('')
      setPassword('')
      setPasswordConfirmation('')
    } catch (err) {
      setPwErrors(err?.response?.data?.errors ?? {})
      notifyError(err, 'Failed to update password.')
    } finally {
      setPwSaving(false)
    }
  }

  const backupMeta = status?.backup || {}

  const columns = [
    {
      key: 'actions',
      header: 'Actions',
      render: (file) => (
        <div className="fb-bk__row-actions">
          <Button size="sm" variant="secondary" onClick={() => downloadFile(file.name)} disabled={working}>
            <FiDownload size={14} /> Download
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => deleteFile(file.name)}
            disabled={deletingName === file.name || working}
          >
            <FiTrash2 size={14} /> Delete
          </Button>
        </div>
      ),
    },
    { key: 'name', header: 'Filename' },
    {
      key: 'format',
      header: 'Format',
      render: (file) => String(file.format || '').toUpperCase(),
    },
    {
      key: 'size',
      header: 'Size',
      render: (file) => formatBytes(file.size),
    },
    {
      key: 'generated_at',
      header: 'Created',
      render: (file) => formatWhen(file.generated_at),
    },
  ]

  return (
    <div className="fb-bk">
      <PageHeader
        title="Backup & Security"
        subtitle="Create SQL database backups, review stored files, and update your administrator password."
        actions={
          <Button variant="secondary" onClick={load} disabled={loading || working}>
            <FiRefreshCw size={15} className={loading ? 'fb-bk__spin' : undefined} />
            Refresh
          </Button>
        }
      />

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      <div style={{ marginTop: '1.35rem' }}>
        {tab === 'backups' && (
          <div className="fb-bk__section">
            <div className="fb-bk__panel">
              <div className="fb-bk__panel-head">Backup actions</div>
              <div className="fb-bk__panel-body">
                <div className="fb-bk__actions">
                  <Button variant="secondary" onClick={downloadFreshSql} disabled={working}>
                    <FiDownload size={15} /> Download SQL backup
                  </Button>
                  <Button onClick={createBackup} disabled={working}>
                    <FiDatabase size={15} /> Create & keep on server
                  </Button>
                </div>

                <div className="fb-bk__meta-grid">
                  <div className="fb-bk__meta">
                    <FiClock size={16} />
                    <div>
                      <span className="fb-bk__meta-label">Schedule</span>
                      <span className="fb-bk__meta-value">
                        {loading ? '…' : scheduleForm.label || (scheduleForm.enabled ? 'Configured' : 'Disabled')}
                      </span>
                    </div>
                  </div>
                  <div className="fb-bk__meta">
                    <FiShield size={16} />
                    <div>
                      <span className="fb-bk__meta-label">Next automatic backup</span>
                      <span className="fb-bk__meta-value">
                        {loading ? '…' : formatWhen(scheduleForm.next_run_at)}
                      </span>
                    </div>
                  </div>
                  <div className="fb-bk__meta">
                    <FiDatabase size={16} />
                    <div>
                      <span className="fb-bk__meta-label">Latest SQL backup</span>
                      <span className="fb-bk__meta-value">
                        {loading
                          ? '…'
                          : backupMeta.latest?.name
                            ? `${backupMeta.latest.name} · ${formatWhen(backupMeta.latest.generated_at)}`
                            : 'None yet'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="fb-bk__panel">
              <div className="fb-bk__panel-head">Automatic backup schedule</div>
              <div className="fb-bk__panel-body">
                <form onSubmit={saveSchedule}>
                  <div className="fb-bk__schedule-grid">
                    <Field label="Auto backup">
                      <Select
                        value={scheduleForm.enabled ? '1' : '0'}
                        onChange={(e) => setScheduleForm((s) => ({ ...s, enabled: e.target.value === '1' }))}
                      >
                        <option value="1">Enabled</option>
                        <option value="0">Disabled</option>
                      </Select>
                    </Field>
                    <Field label="Frequency">
                      <Select
                        value={scheduleForm.frequency}
                        onChange={(e) => setScheduleForm((s) => ({ ...s, frequency: e.target.value }))}
                        disabled={!scheduleForm.enabled}
                      >
                        <option value="daily">Every day</option>
                        <option value="weekly">Once a week</option>
                      </Select>
                    </Field>
                    {scheduleForm.frequency === 'weekly' && (
                      <Field label="Day">
                        <Select
                          value={scheduleForm.weekday}
                          onChange={(e) => setScheduleForm((s) => ({ ...s, weekday: Number(e.target.value) }))}
                          disabled={!scheduleForm.enabled}
                        >
                          {WEEKDAYS.map((d) => (
                            <option key={d.value} value={d.value}>
                              {d.label}
                            </option>
                          ))}
                        </Select>
                      </Field>
                    )}
                    <Field label="Time">
                      <TextInput
                        type="time"
                        value={scheduleForm.time}
                        onChange={(e) => setScheduleForm((s) => ({ ...s, time: e.target.value }))}
                        disabled={!scheduleForm.enabled}
                        required
                      />
                    </Field>
                    <Field label="Keep files (days)">
                      <TextInput
                        type="number"
                        min={0}
                        max={3650}
                        value={scheduleForm.retention_days}
                        onChange={(e) =>
                          setScheduleForm((s) => ({
                            ...s,
                            retention_days: e.target.value === '' ? 0 : Number(e.target.value),
                          }))
                        }
                      />
                    </Field>
                  </div>
                  <div className="fb-bk__schedule-foot">
                    <span className="fb-bk__hint">
                      Last auto run: {formatWhen(scheduleForm.last_run_at)}
                      {scheduleForm.retention_days === 0
                        ? ' · Keep all files'
                        : ` · Delete after ${scheduleForm.retention_days} days`}
                    </span>
                    <Button type="submit" loading={scheduleSaving} disabled={loading}>
                      <FiSave size={15} /> Save schedule
                    </Button>
                  </div>
                </form>
              </div>
            </div>

            {loading ? (
              <FullPageSpinner />
            ) : (
              <DataTable
                columns={columns}
                rows={backups}
                empty="No backup files on the server yet. Create or download a SQL backup to begin."
                rowKey="name"
                footer={
                  <span className="fb-bk__hint">
                    {backups.length} SQL backup{backups.length === 1 ? '' : 's'} on server
                  </span>
                }
              />
            )}

            <div className="fb-bk__panel">
              <div className="fb-bk__panel-head">Start with a clean slate</div>
              <div className="fb-bk__panel-body">
                <div className="fb-bk__actions">
                  <Button variant="danger" onClick={clearActivityData} disabled={working}>
                    <FiTrash2 size={15} /> Clear reconciliation data
                  </Button>
                </div>
              </div>
            </div>

          </div>
        )}

        {tab === 'password' && (
          <div className="fb-bk__section">
            <div className="fb-bk__panel fb-bk__panel--narrow">
              <div className="fb-bk__panel-head">Administrator password</div>
              <div className="fb-bk__panel-body">
                <p className="fb-bk__lead">Your login email is fixed. Only the password can be changed here.</p>
                <form onSubmit={changePassword} noValidate className="fb-bk__pw-form">
                  <Field label="Email">
                    <TextInput type="email" value={user?.email || ''} disabled readOnly />
                  </Field>
                  <Field label="Current password" required error={pwErrors.current_password?.[0]}>
                    <PasswordInput
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      autoComplete="current-password"
                      error={pwErrors.current_password?.[0]}
                      required
                    />
                  </Field>
                  <Field
                    label="New password"
                    required
                    hint="Min. 8 characters"
                    error={pwErrors.password?.[0] || (pwMismatch ? 'Passwords do not match.' : undefined)}
                  >
                    <PasswordInput
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      error={pwErrors.password?.[0] || (pwMismatch ? '1' : undefined)}
                      required
                    />
                  </Field>
                  <Field
                    label="Confirm new password"
                    required
                    error={pwMismatch ? 'Passwords do not match.' : undefined}
                  >
                    <PasswordInput
                      value={passwordConfirmation}
                      onChange={(e) => setPasswordConfirmation(e.target.value)}
                      autoComplete="new-password"
                      error={pwMismatch ? '1' : undefined}
                      required
                    />
                  </Field>
                  <div className="fb-bk__form-actions">
                    <Button type="submit" loading={pwSaving} disabled={pwMismatch}>
                      Update password
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
