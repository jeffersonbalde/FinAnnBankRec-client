import { useEffect } from 'react'
import { isLocalFolderSupported, syncLocalBackups } from '../lib/localBackup'

const EVERY_MS = 5 * 60 * 1000

/**
 * For the administrator: while signed in, keep the chosen folder on this
 * computer up to date with the server's backups (see lib/localBackup.js).
 */
export default function useLocalBackupSync(enabled) {
  useEffect(() => {
    if (!enabled || !isLocalFolderSupported()) return undefined

    const run = () => syncLocalBackups().catch(() => {})
    const first = setTimeout(run, 4000)
    const timer = setInterval(run, EVERY_MS)

    return () => {
      clearTimeout(first)
      clearInterval(timer)
    }
  }, [enabled])
}
