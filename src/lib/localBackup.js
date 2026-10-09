import api from './api'

/**
 * Keeps a copy of the server's backups in a folder the user picks on THEIR
 * computer, using the browser's own folder picker (File System Access API:
 * Chrome / Edge, on https or localhost). The browser never reveals the full
 * path, only the folder name, and only the folder handle is remembered
 * (IndexedDB) so it survives reloads.
 */

const DB_NAME = 'fabres-local-backup'
const STORE = 'handles'
const KEY = 'folder'
const LAST_SYNC_KEY = 'fabres-local-backup-last-sync'

export const SYNCED_EVENT = 'fabres:local-backup-synced'

export const isLocalFolderSupported = () =>
  typeof window !== 'undefined' && window.isSecureContext && typeof window.showDirectoryPicker === 'function'

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function withStore(mode, run) {
  const db = await openDb()
  try {
    return await new Promise((resolve, reject) => {
      const request = run(db.transaction(STORE, mode).objectStore(STORE))
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  } finally {
    db.close()
  }
}

/** The folder picked earlier, or null. */
export async function getSavedFolder() {
  try {
    return (await withStore('readonly', (s) => s.get(KEY))) || null
  } catch {
    return null
  }
}

export async function forgetFolder() {
  try {
    await withStore('readwrite', (s) => s.delete(KEY))
  } catch {
    // nothing to forget
  }
}

/** Opens the computer's own folder window. Resolves to the handle, or null if cancelled. */
export async function pickFolder() {
  try {
    return await window.showDirectoryPicker({ id: 'fabres-backups', mode: 'readwrite', startIn: 'documents' })
  } catch (err) {
    if (err?.name === 'AbortError') return null
    throw err
  }
}

/** Remember the picked folder so copies keep going after a reload. */
export async function rememberFolder(handle) {
  await withStore('readwrite', (s) => s.put(handle, KEY))
}

/**
 * The browser only tells us a folder's NAME. To learn its full location we
 * leave a tiny marker file in it and ask the server (when it runs on the same
 * computer) to find that file. Resolves to the full path, or null.
 */
export async function findFullPath(handle) {
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  const marker = `.fabres-check-${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`
  let created = false

  try {
    await handle.getFileHandle(marker, { create: true })
    created = true
    const { data } = await api.post('/system/backup-folders/locate', { name: handle.name, marker })
    return data?.path || null
  } catch {
    return null
  } finally {
    if (created) {
      try {
        await handle.removeEntry(marker)
      } catch {
        // a leftover empty marker file is harmless
      }
    }
  }
}

/** 'granted' | 'prompt' | 'denied' */
export async function folderPermission(handle) {
  try {
    return await handle.queryPermission({ mode: 'readwrite' })
  } catch {
    return 'denied'
  }
}

/** Needs a click from the user (browser rule). */
export async function allowFolder(handle) {
  try {
    return await handle.requestPermission({ mode: 'readwrite' })
  } catch {
    return 'denied'
  }
}

export function lastSyncedAt() {
  try {
    return localStorage.getItem(LAST_SYNC_KEY)
  } catch {
    return null
  }
}

async function alreadyThere(dir, file) {
  try {
    const existing = await (await dir.getFileHandle(file.name)).getFile()
    return existing.size === Number(file.size)
  } catch {
    return false
  }
}

let running = null

/**
 * Copy every server backup that is not yet in the chosen folder.
 * Quietly does nothing without a folder or permission.
 *
 * @returns {Promise<{ copied: number, failed: number, status: 'ok'|'no-folder'|'needs-permission'|'unsupported' }>}
 */
export function syncLocalBackups() {
  if (running) return running

  running = (async () => {
    if (!isLocalFolderSupported()) return { copied: 0, failed: 0, status: 'unsupported' }

    const handle = await getSavedFolder()
    if (!handle) return { copied: 0, failed: 0, status: 'no-folder' }
    if ((await folderPermission(handle)) !== 'granted') return { copied: 0, failed: 0, status: 'needs-permission' }

    const { data } = await api.get('/system/backups')
    const files = (data?.data || []).filter((f) => f.format === 'sql')

    let copied = 0
    let failed = 0
    for (const file of files) {
      if (await alreadyThere(handle, file)) continue
      try {
        const response = await api.get(`/system/backups/${encodeURIComponent(file.name)}`, { responseType: 'blob' })
        const writable = await (await handle.getFileHandle(file.name, { create: true })).createWritable()
        await writable.write(response.data)
        await writable.close()
        copied += 1
      } catch {
        failed += 1
      }
    }

    try {
      localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString())
    } catch {
      // not critical
    }
    const result = { copied, failed, status: 'ok' }
    window.dispatchEvent(new CustomEvent(SYNCED_EVENT, { detail: result }))
    return result
  })().finally(() => {
    running = null
  })

  return running
}
