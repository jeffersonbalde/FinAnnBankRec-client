import { useCallback, useState } from 'react'
import api, { extractErrorMessage } from '../lib/api'
import { findFullPath, forgetFolder, pickFolder, rememberFolder, syncLocalBackups } from '../lib/localBackup'

const BLOCKED =
  'Windows and your browser do not allow this folder, because it holds system files or is a main folder such as Documents, Desktop, Downloads, Pictures or a whole drive. Please choose or create a folder inside it instead, for example a new folder named "FABReS Backups".'

/**
 * Backup folder choice: opens the computer's own folder window straight away,
 * then tells the user what happened in `modal` (shown only for the result or
 * an error — see FolderChoiceModal).
 *
 * `start()` must be called directly from a click (browsers require it).
 */
export default function useFolderChoice({ existingCount = 0, onDone } = {}) {
  const [modal, setModal] = useState({ open: false, step: 'working', result: null, error: '' })

  const close = useCallback(() => setModal((m) => ({ ...m, open: false })), [])

  const start = useCallback(async () => {
    let handle
    try {
      handle = await pickFolder()
    } catch (err) {
      setModal({
        open: true,
        step: 'error',
        result: null,
        error: err?.name === 'SecurityError' ? BLOCKED : 'The folder window could not be opened. Please try again.',
      })
      return
    }
    if (!handle) return // closed the window without choosing

    setModal({ open: true, step: 'working', result: null, error: '' })

    try {
      // Same computer as the server? Then the server can save the backups there by itself.
      const path = await findFullPath(handle)

      if (path) {
        const { data } = await api.put('/system/backup-folder', { directory: path, move_existing: existingCount > 0 })
        await forgetFolder()
        setModal({ open: true, step: 'done', error: '', result: { mode: 'server', path: data?.folder?.path || path, moved: data?.moved || 0 } })
      } else {
        await rememberFolder(handle)
        const copy = await syncLocalBackups()
        setModal({
          open: true,
          step: 'done',
          error: '',
          result: { mode: 'browser', name: handle.name, copied: copy.copied, failed: copy.failed },
        })
      }
      onDone?.()
    } catch (err) {
      setModal({
        open: true,
        step: 'error',
        result: null,
        error: extractErrorMessage(err, 'The folder could not be saved. Please choose another folder.'),
      })
    }
  }, [existingCount, onDone])

  return { start, modal, close }
}
