import { useEffect, useMemo, useRef, useState } from 'react'
import { FiPlus, FiSearch, FiEye, FiEyeOff, FiCamera, FiUser } from 'react-icons/fi'
import { useResource } from '../../hooks/useResource'
import { extractErrorMessage } from '../../lib/api'
import { ROLE_LABELS, ROLES, ASSIGNABLE_ROLE_LABELS } from '../../lib/roles'
import { useAuth } from '../../context/AuthContext'
import { notifyError, notifySuccess } from '../../lib/toast'
import { fbConfirm } from '../../lib/confirm'
import { useRegisterModalDirty } from '../../context/ModalDirtyContext'
import { useConfirmClose } from '../../hooks/useConfirmClose'
import Pagination from '../../components/ui/Pagination'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { Field, TextInput, Select } from '../../components/ui/Field'
import { ActiveBadge } from '../../components/ui/Badge'
import { FullPageSpinner } from '../../components/Spinner'
import api from '../../lib/api'
import './users.css'

const BLANK = {
  name: '',
  email: '',
  role: ROLES.FINANCIAL_ANALYST,
  designation: '',
  password: '',
  password_confirmation: '',
}

const PER_PAGE_OPTIONS = [8, 12, 24]

const MAX_AVATAR_BYTES = 10 * 1024 * 1024

function buildUserFormData(form, { avatarFile, removeAvatar }) {
  const fd = new FormData()
  fd.append('name', form.name)
  fd.append('email', form.email)
  fd.append('role', form.role)
  fd.append('designation', form.designation)
  if (form.password) {
    fd.append('password', form.password)
    fd.append('password_confirmation', form.password_confirmation)
  }
  if (avatarFile) fd.append('avatar', avatarFile)
  if (removeAvatar) fd.append('remove_avatar', '1')
  return fd
}

function PasswordField({ label, hint, error, required, value, onChange, autoComplete }) {
  const [show, setShow] = useState(false)
  return (
    <Field label={label} hint={hint} error={error} required={required}>
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
          tabIndex={0}
        >
          {show ? <FiEyeOff size={16} /> : <FiEye size={16} />}
        </button>
      </div>
    </Field>
  )
}

function UserAvatar({ user, size = 'md' }) {
  if (user.avatar_url) {
    return <img src={user.avatar_url} alt="" className={`fb-user-avatar fb-user-avatar--${size}`} />
  }
  const initials = (user.name || '?')
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
  return <span className={`fb-user-avatar fb-user-avatar--${size} fb-user-avatar--fallback`}>{initials || <FiUser size={18} />}</span>
}

export default function UsersTab() {
  const { user: currentUser } = useAuth()
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(8)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, perPage, roleFilter])

  const { items, meta, loading, error, reload } = useResource('/users', {
    params: {
      page,
      per_page: perPage,
      ...(debouncedSearch && { search: debouncedSearch }),
      ...(roleFilter && { role: roleFilter }),
    },
  })

  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(BLANK)
  const [initialForm, setInitialForm] = useState(BLANK)
  const [formError, setFormError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [removeAvatar, setRemoveAvatar] = useState(false)
  const [initialAvatarUrl, setInitialAvatarUrl] = useState(null)
  const fileRef = useRef(null)

  const isDirty = useMemo(() => {
    if (!editing) return false
    if (JSON.stringify(form) !== JSON.stringify(initialForm)) return true
    if (avatarFile || removeAvatar) return true
    return false
  }, [editing, form, initialForm, avatarFile, removeAvatar])

  useRegisterModalDirty(isDirty)
  const requestClose = useConfirmClose(isDirty, () => {
    setEditing(null)
    resetAvatarState()
  })

  function resetAvatarState() {
    setAvatarFile(null)
    setAvatarPreview(null)
    setRemoveAvatar(false)
    setInitialAvatarUrl(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  function openNew() {
    setForm(BLANK)
    setInitialForm(BLANK)
    setFieldErrors({})
    setFormError('')
    resetAvatarState()
    setEditing('new')
  }

  function openEdit(row) {
    const next = {
      name: row.name,
      email: row.email,
      role: row.role,
      designation: row.designation ?? '',
      password: '',
      password_confirmation: '',
    }
    setForm(next)
    setInitialForm(next)
    setFieldErrors({})
    setFormError('')
    resetAvatarState()
    setInitialAvatarUrl(row.avatar_url || null)
    setEditing(row)
  }

  function onPickAvatar(file) {
    if (!file) return
    if (file.size > MAX_AVATAR_BYTES) {
      setFieldErrors((prev) => ({ ...prev, avatar: ['Photo must be 10 MB or smaller.'] }))
      setAvatarFile(null)
      setAvatarPreview(null)
      if (fileRef.current) fileRef.current.value = ''
      return
    }
    setFieldErrors((prev) => {
      const next = { ...prev }
      delete next.avatar
      return next
    })
    setRemoveAvatar(false)
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  function clearAvatar() {
    setAvatarFile(null)
    setAvatarPreview(null)
    if (fileRef.current) fileRef.current.value = ''
    if (editing !== 'new' && initialAvatarUrl) setRemoveAvatar(true)
  }

  const passwordMismatch =
    form.password_confirmation.length > 0 && form.password !== form.password_confirmation

  async function save(e) {
    e.preventDefault()
    if (passwordMismatch) {
      setFormError('Passwords do not match.')
      return
    }
    if (editing === 'new' && form.password.length > 0 && form.password.length < 8) {
      setFieldErrors((prev) => ({ ...prev, password: ['Password must be at least 8 characters.'] }))
      return
    }
    const isNewSave = editing === 'new'
    const ok = await fbConfirm({
      title: isNewSave ? 'Create user?' : 'Save changes?',
      text: `${form.name || form.email} — ${ROLE_LABELS[form.role]}`,
      confirmText: isNewSave ? 'Create' : 'Save',
    })
    if (!ok) return

    setSaving(true)
    setFormError('')
    setFieldErrors({})
    try {
      const fd = buildUserFormData(form, { avatarFile, removeAvatar })
      if (isNewSave) {
        await api.post('/users', fd)
      } else {
        fd.append('_method', 'PUT')
        await api.post(`/users/${editing.id}`, fd)
      }
      notifySuccess('User saved.')
      setEditing(null)
      resetAvatarState()
      await reload()
    } catch (err) {
      setFieldErrors(err?.response?.data?.errors ?? {})
      setFormError(extractErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(row) {
    const deactivating = row.is_active
    const ok = await fbConfirm({
      title: deactivating ? 'Deactivate user?' : 'Activate user?',
      text: deactivating
        ? `${row.name} will not be able to sign in until activated again.`
        : `${row.name} will be able to sign in again.`,
      confirmText: deactivating ? 'Deactivate' : 'Activate',
      danger: deactivating,
    })
    if (!ok) return

    try {
      await api.post(`/users/${row.id}/toggle-active`)
      notifySuccess(deactivating ? 'User deactivated.' : 'User activated.')
      await reload()
    } catch (err) {
      notifyError(err)
    }
  }

  const previewSrc = avatarPreview || (!removeAvatar && initialAvatarUrl) || null

  return (
    <div>
      <div className="fb-toolbar">
        <div className="fb-toolbar__search">
          <FiSearch size={15} />
          <input
            className="form-control"
            type="search"
            placeholder="Search name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          aria-label="Filter by role"
          className="fb-user-toolbar__role"
        >
          <option value="">All roles</option>
          {Object.entries(ASSIGNABLE_ROLE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <span className="fb-toolbar__spacer" />
        <label className="fb-user-toolbar__perpage">
          Per page
          <Select value={perPage} onChange={(e) => setPerPage(Number(e.target.value))}>
            {PER_PAGE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
        </label>
        <Button onClick={openNew} className="fb-user-toolbar__add">
          <FiPlus size={16} /> Add user
        </Button>
      </div>

      {error && (
        <div className="fb-alert fb-alert--danger" style={{ marginBottom: '0.9rem' }}>
          {error}
        </div>
      )}

      {loading && <FullPageSpinner />}

      {!loading && items.length === 0 && (
        <div className="fb-empty">
          {debouncedSearch || roleFilter ? 'No users match this filter.' : 'No users yet.'}
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="fb-user-grid">
          {items.map((u) => (
            <article key={u.id} className={`fb-user-card${!u.is_active ? ' is-inactive' : ''}`}>
              <div className="fb-user-card__photo">
                <UserAvatar user={u} size="lg" />
              </div>
              <div className="fb-user-card__body">
                <div className="fb-user-card__meta">
                  <h3 className="fb-user-card__name">{u.name}</h3>
                  <p className="fb-user-card__role">{ROLE_LABELS[u.role] || u.role_label}</p>
                  <ActiveBadge active={u.is_active} />
                </div>
                <dl className="fb-user-card__details">
                  <div>
                    <dt>Email</dt>
                    <dd>{u.email}</dd>
                  </div>
                  <div>
                    <dt>Designation</dt>
                    <dd>{u.designation || '—'}</dd>
                  </div>
                </dl>
                <div className="fb-user-card__actions">
                  <Button size="sm" variant="primary" onClick={() => openEdit(u)}>
                    Edit
                  </Button>
                  {u.id !== currentUser.id && (
                    <Button size="sm" variant="secondary" onClick={() => toggleActive(u)}>
                      {u.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {!loading && <Pagination meta={meta} onPageChange={setPage} />}

      <Modal
        open={!!editing}
        onClose={requestClose}
        icon={<FiPlus size={16} />}
        title={editing === 'new' ? 'New user' : 'Edit user'}
        size="lg"
      >
        <form onSubmit={save} className="fb-user-form" noValidate>
          <div className="fb-user-form__photo">
            <div className="fb-user-form__photo-preview">
              {previewSrc ? (
                <img src={previewSrc} alt="" />
              ) : (
                <span className="fb-user-form__photo-empty">
                  <FiUser size={28} />
                </span>
              )}
            </div>
            <div className="fb-user-form__photo-actions">
              <Button type="button" variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
                <FiCamera size={14} /> Upload photo
              </Button>
              {(previewSrc || removeAvatar) && (
                <Button type="button" variant="ghost" size="sm" onClick={clearAvatar}>
                  Remove
                </Button>
              )}
              <p className="fb-field__hint">JPG, PNG or WebP · max 10 MB</p>
              {fieldErrors.avatar?.[0] && <span className="fb-field__error">{fieldErrors.avatar[0]}</span>}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => onPickAvatar(e.target.files?.[0])}
            />
          </div>

          <Field label="Full name" required error={fieldErrors.name?.[0]}>
            <TextInput
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Juan Dela Cruz"
              required
            />
          </Field>
          <Field label="Email" required error={fieldErrors.email?.[0]}>
            <TextInput
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="e.g. name@tesda.gov.ph"
              required
            />
          </Field>
          <div className="fb-user-form__grid">
            <Field label="Role" required error={fieldErrors.role?.[0]}>
              <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} required>
                {Object.entries(ASSIGNABLE_ROLE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Designation" required error={fieldErrors.designation?.[0]}>
              <TextInput
                value={form.designation}
                onChange={(e) => setForm({ ...form, designation: e.target.value })}
                placeholder="e.g. Administrative Officer IV"
                required
              />
            </Field>
          </div>
          <div className="fb-user-form__grid">
            <PasswordField
              label={editing === 'new' ? 'Password' : 'New password'}
              hint={editing === 'new' ? 'Min. 8 characters' : 'Leave blank to keep current'}
              error={
                fieldErrors.password?.[0] ||
                (passwordMismatch ? 'Passwords do not match.' : undefined)
              }
              required={editing === 'new'}
              value={form.password}
              onChange={(e) => {
                const password = e.target.value
                setForm((prev) => ({ ...prev, password }))
                setFieldErrors((prev) => {
                  const next = { ...prev }
                  delete next.password
                  return next
                })
                if (formError.toLowerCase().includes('password')) setFormError('')
              }}
              autoComplete="new-password"
            />
            <PasswordField
              label="Confirm password"
              error={passwordMismatch ? 'Passwords do not match.' : undefined}
              required={editing === 'new' || !!form.password}
              value={form.password_confirmation}
              onChange={(e) => {
                const password_confirmation = e.target.value
                setForm((prev) => ({ ...prev, password_confirmation }))
                if (formError.toLowerCase().includes('password')) setFormError('')
              }}
              autoComplete="new-password"
            />
          </div>

          {formError && !passwordMismatch && <div className="fb-alert fb-alert--danger">{formError}</div>}

          <div className="fb-user-form__actions">
            <Button type="button" variant="secondary" onClick={requestClose}>
              Cancel
            </Button>
            <Button type="submit" loading={saving} disabled={passwordMismatch}>
              Save
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
