import { useCallback } from 'react'
import { fbConfirm } from '../lib/confirm'

// Wraps a modal's real close handler so backdrop click, the X button, the
// Escape key, and a Cancel button all ask before discarding unsaved input.
// Pass this same function everywhere the modal can be dismissed.
export function useConfirmClose(isDirty, onClose) {
  return useCallback(async () => {
    if (isDirty) {
      const ok = await fbConfirm({
        title: 'Discard changes?',
        text: "You have unsaved changes. They'll be lost if you close this form.",
        confirmText: 'Discard changes',
        cancelText: 'Keep editing',
        danger: true,
      })
      if (!ok) return
    }
    onClose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty, onClose])
}
