import { useState } from 'react'
import clsx from 'clsx'

const initialsOf = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

/**
 * A small round profile picture; initials on blue when the person has no photo
 * (or the photo cannot be loaded). Pass `children` (an icon) for a non-person
 * badge, e.g. "All users".
 */
export default function PersonAvatar({ name, url, size = 'sm', children }) {
  // Remember which photo failed, so a new URL gets another try.
  const [failedUrl, setFailedUrl] = useState(null)

  if (url && failedUrl !== url) {
    return (
      <img src={url} alt="" className={clsx('fb-avatar', `fb-avatar--${size}`)} onError={() => setFailedUrl(url)} />
    )
  }

  return (
    <span className={clsx('fb-avatar', `fb-avatar--${size}`, 'fb-avatar--fallback')} aria-hidden="true">
      {children ?? (initialsOf(name) || '?')}
    </span>
  )
}
