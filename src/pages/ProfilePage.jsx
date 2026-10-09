import { useState } from 'react'
import PageHeader from '../components/PageHeader'
import PhotoViewerModal, { PhotoButton } from '../components/PhotoViewerModal'
import { useAuth } from '../context/AuthContext'
import { shortDate } from '../lib/format'
import { ROLE_LABELS } from '../lib/roles'
import './profile.css'

function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

export default function ProfilePage() {
  const { user } = useAuth()
  const [viewingPhoto, setViewingPhoto] = useState(null)

  const details = [
    ['Full name', user.name],
    ['Position', user.designation || '—'],
    ['Email', user.email],
    ['Role', ROLE_LABELS[user.role] ?? user.role],
    ['Account status', user.is_active ? 'Active' : 'Inactive'],
    ['Member since', user.created_at ? shortDate(user.created_at) : '—'],
  ]

  return (
    <div className="fb-profile">
      <PageHeader title="My Profile" subtitle="Your account details." />

      <div className="fb-profile__grid">
        <section className="fb-card fb-profile__identity">
          {user.avatar_url ? (
            <PhotoButton
              name={user.name}
              className="fb-profile__photo-btn"
              onOpen={() => setViewingPhoto({ id: user.id, url: user.avatar_url, name: user.name })}
            >
              <img src={user.avatar_url} alt={`Photo of ${user.name}`} className="fb-profile__photo" />
            </PhotoButton>
          ) : (
            <span className="fb-profile__photo fb-profile__photo--fallback" aria-hidden="true">
              {initials(user.name)}
            </span>
          )}
          <h2 className="fb-profile__name">{user.name}</h2>
          <p className="fb-profile__position">{user.designation || ROLE_LABELS[user.role]}</p>
          <span className="fb-profile__role">{ROLE_LABELS[user.role]}</span>
        </section>

        <section className="fb-card">
          <div className="fb-card__head">Account details</div>
          <dl className="fb-profile__details">
            {details.map(([label, value]) => (
              <div key={label} className="fb-profile__row">
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <PhotoViewerModal photo={viewingPhoto} onClose={() => setViewingPhoto(null)} />
    </div>
  )
}
