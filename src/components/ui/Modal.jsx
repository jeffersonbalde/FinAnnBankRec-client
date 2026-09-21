import { useEffect, useRef, useState } from 'react'
import { FiX } from 'react-icons/fi'

// Must be >= the CSS exit animation duration (fb-fade-out / fb-rise-out,
// both 0.2s) so the modal stays mounted for the close transition to play.
const CLOSE_MS = 200

export default function Modal({ open, onClose, title, icon, size = 'md', children }) {
  const [rendered, setRendered] = useState(open)
  const [closing, setClosing] = useState(false)
  const timeoutRef = useRef(null)

  useEffect(() => {
    if (open) {
      clearTimeout(timeoutRef.current)
      setRendered(true)
      setClosing(false)
    } else if (rendered) {
      setClosing(true)
      timeoutRef.current = setTimeout(() => {
        setRendered(false)
        setClosing(false)
      }, CLOSE_MS)
    }
    return () => clearTimeout(timeoutRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!rendered) return undefined
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      // Nested overlay combobox owns Escape while open.
      if (document.querySelector('.fb-combobox.is-open')) return
      onClose?.()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [rendered, onClose])

  if (!rendered) return null

  return (
    <div className={`fb-modal__root${closing ? ' is-closing' : ''}`} role="presentation">
      <div className="fb-modal__backdrop" onClick={onClose} />
      <div className={`fb-modal fb-modal--${size}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="fb-modal__head">
          {icon && <span className="fb-modal__icon">{icon}</span>}
          <span className="fb-modal__title">{title}</span>
          <button type="button" className="fb-modal__close" onClick={onClose} aria-label="Close">
            <FiX size={18} />
          </button>
        </div>
        <div className="fb-modal__body">{children}</div>
      </div>
    </div>
  )
}
