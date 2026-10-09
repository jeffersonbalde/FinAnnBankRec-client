import api from './api'
import { fbAlert, fbConfirm } from './confirm'
import { notifyError, notifySuccess } from './toast'

const plural = (n, noun) => `${n} ${noun}${n === 1 ? '' : 's'}`

/**
 * Confirm, then remove many rows with one request, and report the outcome:
 * a toast for what was removed, and a modal for anything the server had to keep.
 *
 * @param {object}   opts
 * @param {string}   opts.url         bulk endpoint, e.g. '/check-register/bulk-delete'
 * @param {number[]} opts.ids
 * @param {string}   opts.noun        singular, e.g. 'check'
 * @param {string}   opts.text        what the confirm dialog says
 * @param {() => Promise<void>|void} opts.onDone  runs after a successful request (reload, clear selection…)
 * @param {(busy: boolean) => void} [opts.setBusy]
 * @returns {Promise<boolean>} true when the request went through
 */
export async function bulkRemove({ url, ids, noun, text, onDone, setBusy }) {
  const ok = await fbConfirm({
    title: `Remove ${plural(ids.length, noun)}?`,
    text,
    confirmText: `Remove ${ids.length}`,
    danger: true,
  })
  if (!ok) return false

  setBusy?.(true)
  try {
    const { data } = await api.post(url, { ids })
    if (data.deleted > 0) notifySuccess(`${plural(data.deleted, noun)} removed.`)
    await onDone?.()

    const skipped = data.skipped ?? []
    if (skipped.length > 0) {
      const shown = skipped
        .slice(0, 5)
        .map((s) => `${s.serial_no ?? s.label ?? 'Item'}: ${s.reason}`)
        .join('  •  ')
      const more = skipped.length > 5 ? `  •  and ${skipped.length - 5} more` : ''
      await fbAlert(`${plural(skipped.length, noun)} ${skipped.length === 1 ? 'was' : 'were'} kept`, `${shown}${more}`)
    }
    return true
  } catch (err) {
    notifyError(err)
    return false
  } finally {
    setBusy?.(false)
  }
}
