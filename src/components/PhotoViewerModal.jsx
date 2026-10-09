import { useState } from 'react'
import { FiDownload, FiMaximize2 } from 'react-icons/fi'
import Modal from './ui/Modal'
import Button from './ui/Button'
import api from '../lib/api'
import { notifyError } from '../lib/toast'
import './photo-viewer.css'

/**
 * A photo that can be clicked to see it whole. Wrap the thumbnail in this and
 * pass `onOpen`; render <PhotoViewerModal> once with the photo being viewed.
 */
export function PhotoButton({ name, onOpen, className = '', children }) {
  return (
    <button type="button" className={`fb-photo-btn ${className}`.trim()} onClick={onOpen} aria-label={`View photo of ${name}`}>
      {children}
      <span className="fb-photo-btn__zoom" aria-hidden="true">
        <FiMaximize2 size={14} />
      </span>
    </button>
  )
}

/**
 * The whole photo, at a large size that always fits the screen, with a Download
 * button. `photo` is { id, url, name } (id = the user's id) or null.
 */
export default function PhotoViewerModal({ photo, onClose }) {
  const [downloading, setDownloading] = useState(false)

  async function download() {
    setDownloading(true)
    try {
      // Through the API: a photo on another address cannot be saved straight from the browser.
      const response = await api.get(`/users/${photo.id}/avatar`, { responseType: 'blob' })
      const match = (response.headers['content-disposition'] || '').match(/filename="?([^";]+)"?/i)
      const link = document.createElement('a')
      link.href = window.URL.createObjectURL(response.data)
      link.download = match?.[1] || 'photo.jpg'
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(link.href)
    } catch (err) {
      notifyError(err, 'The photo could not be downloaded.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Modal
      open={!!photo}
      onClose={onClose}
      title={photo?.name || 'Photo'}
      size="lg"
      footer={
        photo?.id ? (
          <Button variant="secondary" onClick={download} loading={downloading}>
            <FiDownload size={15} /> Download
          </Button>
        ) : null
      }
    >
      {photo && (
        <div className="fb-photo-view">
          <img src={photo.url} alt={`Photo of ${photo.name}`} className="fb-photo-view__img" />
        </div>
      )}
    </Modal>
  )
}
