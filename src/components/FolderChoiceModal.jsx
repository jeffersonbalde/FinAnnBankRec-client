import { FiAlertTriangle, FiCheckCircle, FiFolder, FiLoader } from 'react-icons/fi'
import Modal from './ui/Modal'
import Button from './ui/Button'
import './folder-picker.css'

/**
 * The result of choosing a backup folder, in plain words: working, done, or
 * what went wrong. `modal` and `onClose` come from useFolderChoice.
 */
export default function FolderChoiceModal({ modal, onClose, onRetry }) {
  const { open, step, result, error } = modal
  const working = step === 'working'

  let footer = null
  if (step === 'error') {
    footer = (
      <>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
        <Button
          onClick={() => {
            onClose()
            onRetry()
          }}
        >
          <FiFolder size={15} /> Choose another folder
        </Button>
      </>
    )
  } else if (step === 'done') {
    footer = <Button onClick={onClose}>Done</Button>
  }

  return (
    <Modal open={open} onClose={working ? undefined : onClose} title="Backup folder" icon={<FiFolder size={18} />} size="sm" footer={footer}>
      {step === 'working' && (
        <div className="fb-choice fb-choice--center">
          <FiLoader size={28} className="fb-choice__spin" />
          <p className="fb-choice__lead">Setting up your backup folder…</p>
        </div>
      )}

      {step === 'done' && result && (
        <div className="fb-choice fb-choice--center">
          <span className="fb-choice__badge fb-choice__badge--ok">
            <FiCheckCircle size={26} />
          </span>
          <h3 className="fb-choice__title">Backup folder is set</h3>
          {result.mode === 'server' ? (
            <>
              <p className="fb-choice__path">{result.path}</p>
              <p className="fb-choice__lead">
                Every backup is now saved here automatically, even when nobody is signed in.
                {result.moved > 0 ? ` ${result.moved} existing file${result.moved === 1 ? ' was' : 's were'} moved too.` : ''}
              </p>
            </>
          ) : (
            <>
              <p className="fb-choice__path">{result.name}</p>
              <p className="fb-choice__lead">
                {result.copied > 0 ? `${result.copied} backup${result.copied === 1 ? ' was' : 's were'} copied. ` : ''}
                The system runs on another computer, so it cannot see this folder’s full location. Your browser will copy
                every new backup here while you are signed in. A safety copy also stays on the server.
              </p>
              {result.failed > 0 && (
                <p className="fb-choice__warn">
                  {result.failed} file{result.failed === 1 ? '' : 's'} could not be copied. Use “Copy now” to try again.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {step === 'error' && (
        <div className="fb-choice fb-choice--center">
          <span className="fb-choice__badge fb-choice__badge--bad">
            <FiAlertTriangle size={26} />
          </span>
          <h3 className="fb-choice__title">We could not use that folder</h3>
          <p className="fb-choice__lead">{error}</p>
        </div>
      )}
    </Modal>
  )
}
