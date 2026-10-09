import { useCallback, useEffect, useState } from 'react'
import { FiArrowUp, FiFolder, FiFolderPlus, FiHardDrive, FiChevronRight } from 'react-icons/fi'
import Modal from './ui/Modal'
import Button from './ui/Button'
import { Checkbox, TextInput } from './ui/Field'
import api from '../lib/api'
import { notifyError } from '../lib/toast'
import './folder-picker.css'

/**
 * Choose a folder on the computer that runs the system, the way a normal
 * "Browse for folder" window works: open drives and folders, make a new folder,
 * then confirm. `onSelect(path, { move })` is called with the folder picked.
 */
export default function FolderPickerModal({ open, onClose, startPath, existingCount = 0, saving = false, onSelect }) {
  const [listing, setListing] = useState(null)
  const [loading, setLoading] = useState(false)
  const [move, setMove] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [createError, setCreateError] = useState('')
  const [makingFolder, setMakingFolder] = useState(false)

  const browse = useCallback(async (path) => {
    setLoading(true)
    try {
      const { data } = await api.get('/system/backup-folders', { params: path ? { path } : {} })
      setListing(data)
      return true
    } catch (err) {
      notifyError(err, 'That folder cannot be opened.')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    setCreating(false)
    setNewName('')
    setCreateError('')
    setMove(true)
    // Start where the backups are now; if that cannot be opened, show the drives.
    browse(startPath).then((ok) => {
      if (!ok && startPath) browse(null)
    })
  }, [open, startPath, browse])

  async function createFolder(e) {
    e.preventDefault()
    if (!listing?.path) return
    setCreateError('')
    setMakingFolder(true)
    try {
      const { data } = await api.post('/system/backup-folders', { parent: listing.path, name: newName })
      setCreating(false)
      setNewName('')
      await browse(data.path)
    } catch (err) {
      setCreateError(err?.response?.data?.errors?.name?.[0] || err?.response?.data?.message || 'The folder could not be created.')
    } finally {
      setMakingFolder(false)
    }
  }

  const path = listing?.path || null
  const atDrives = !!listing && !path
  const canUse = !!path && listing.writable
  const goUp = listing?.parent !== null && listing?.parent !== undefined

  const footer = (
    <>
      {existingCount > 0 && (
        <Checkbox
          checked={move}
          onChange={(e) => setMove(e.target.checked)}
          label={`Also move the ${existingCount} existing backup${existingCount === 1 ? '' : 's'} here`}
        />
      )}
      <div className="fb-picker__foot-actions">
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={() => onSelect(path, { move: existingCount > 0 && move })} loading={saving} disabled={!canUse}>
          Use this folder
        </Button>
      </div>
    </>
  )

  return (
    <Modal open={open} onClose={saving ? undefined : onClose} title="Choose backup folder" icon={<FiFolder size={18} />} footer={footer}>
      <div className="fb-picker">
        <div className="fb-picker__bar">
          <button
            type="button"
            className="fb-picker__up"
            onClick={() => browse(listing.parent)}
            disabled={loading || !goUp}
            aria-label="Go up one level"
            title="Up one level"
          >
            <FiArrowUp size={16} />
          </button>
          <div className="fb-picker__path" title={path || 'This PC'}>
            <FiHardDrive size={14} />
            <span>{atDrives ? 'This PC' : path || '…'}</span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setCreating((v) => !v)}
            disabled={!path || loading}
          >
            <FiFolderPlus size={14} /> New folder
          </Button>
        </div>

        {creating && (
          <form className="fb-picker__new" onSubmit={createFolder}>
            <TextInput
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Folder name"
              maxLength={100}
              error={!!createError}
            />
            <Button type="submit" size="sm" loading={makingFolder} disabled={!newName.trim()}>
              Create
            </Button>
            {createError && <span className="fb-picker__error">{createError}</span>}
          </form>
        )}

        <div className={`fb-picker__list${loading ? ' is-loading' : ''}`} role="listbox" aria-label="Folders">
          {listing && listing.folders.length === 0 && (
            <div className="fb-picker__empty">{atDrives ? 'No drives found.' : 'No folders here. You can use this folder or make a new one.'}</div>
          )}
          {listing?.folders.map((f) => (
            <button type="button" key={f.path} className="fb-picker__item" onClick={() => browse(f.path)} disabled={loading}>
              {atDrives ? <FiHardDrive size={16} /> : <FiFolder size={16} />}
              <span>{f.name}</span>
              <FiChevronRight size={14} className="fb-picker__chev" />
            </button>
          ))}
        </div>

        {path && !listing.writable && (
          <div className="fb-alert fb-alert--danger">The system cannot save files in this folder. Choose another one.</div>
        )}
        {atDrives && <div className="fb-picker__hint">Open a drive, then choose or create the folder for your backups.</div>}
      </div>
    </Modal>
  )
}
