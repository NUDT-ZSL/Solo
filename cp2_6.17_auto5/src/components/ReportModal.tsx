import { useEffect, useState } from 'react'
import ReportForm from './ReportForm'
import './Modal.css'

interface ReportModalProps {
  onClose: () => void
  initialLocation?: [number, number] | null
  onPickLocation?: () => void
}

export default function ReportModal({ onClose, initialLocation, onPickLocation }: ReportModalProps) {
  const [isClosing, setIsClosing] = useState(false)

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', handleEscape)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [])

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(onClose, 400)
  }

  const handleSuccess = () => {
    handleClose()
  }

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className={`modal-content report-modal ${isClosing ? 'animate-slide-down' : 'animate-slide-up'}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title">上报灾情</h2>
          <button className="modal-close" onClick={handleClose}>
            ×
          </button>
        </div>
        <ReportForm
          onSuccess={handleSuccess}
          initialLocation={initialLocation}
          onPickLocation={onPickLocation}
        />
      </div>
    </div>
  )
}
