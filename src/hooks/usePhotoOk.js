import { useState } from 'react'

/**
 * Whether a profile photo can be shown: false when there is none, or when the
 * file cannot be loaded (e.g. it is gone from the storage) so the caller can
 * show the person's initials instead of a broken picture.
 * Remembers which address failed, so a new photo gets a fresh try.
 */
export default function usePhotoOk(url) {
  const [failedUrl, setFailedUrl] = useState(null)

  return { ok: !!url && failedUrl !== url, onError: () => setFailedUrl(url) }
}
