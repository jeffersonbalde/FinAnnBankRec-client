import Swal from 'sweetalert2'

const base = {
  buttonsStyling: false,
  reverseButtons: true,
  focusConfirm: false,
  width: 440,
  customClass: {
    popup: 'fb-swal',
    title: 'fb-swal__title',
    htmlContainer: 'fb-swal__text',
    icon: 'fb-swal__icon',
    actions: 'fb-swal__actions',
    confirmButton: 'fb-swal__btn fb-swal__btn--primary',
    denyButton: 'fb-swal__btn fb-swal__btn--secondary',
    cancelButton: 'fb-swal__btn fb-swal__btn--secondary',
  },
}

/**
 * Ask the user to confirm an action. Resolves true when confirmed.
 *
 * @param {{title?: string, text?: string, confirmText?: string, cancelText?: string, danger?: boolean}} opts
 */
export async function fbConfirm({
  title = 'Are you sure?',
  text = '',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  danger = false,
} = {}) {
  const result = await Swal.fire({
    ...base,
    icon: danger ? 'warning' : 'question',
    title,
    text,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    customClass: {
      ...base.customClass,
      confirmButton: `fb-swal__btn ${danger ? 'fb-swal__btn--danger' : 'fb-swal__btn--primary'}`,
    },
  })
  return result.isConfirmed
}

export function fbSuccess(title, text = '') {
  return Swal.fire({ ...base, icon: 'success', title, text, confirmButtonText: 'OK' })
}

/** Info/blocked-action modal with a single OK button — for messages too long for a toast. */
export function fbAlert(title, text = '') {
  return Swal.fire({ ...base, icon: 'info', title, text, confirmButtonText: 'OK' })
}

export function fbLoading(title = 'Working…') {
  Swal.fire({
    ...base,
    title,
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => Swal.showLoading(),
  })
}

export function fbClose() {
  Swal.close()
}
