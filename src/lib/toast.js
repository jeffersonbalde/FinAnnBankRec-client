import { toast } from 'react-toastify'
import { extractErrorMessage } from './api'

export { toast }

/** Show an error toast, pulling the message out of a Laravel/Axios error. */
export function notifyError(error, fallback) {
  toast.error(extractErrorMessage(error, fallback))
}

/** Show a success toast. */
export function notifySuccess(message) {
  toast.success(message)
}
