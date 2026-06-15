import { useEffect, useCallback } from 'react'
import './Modal.css'

interface Photo {
  id: number
  year: number
  date: string
  location: string
  imageUrl: string
}

interface ModalProps {
  photos: Photo[]
  currentIndex: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}

function Modal({ photos, currentIndex, onClose, onPrev, onNext }: ModalProps) {
  const photo = photos[currentIndex]

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
    if (e.key === 'ArrowLeft') onPrev()
    if (e.key === 'ArrowRight') onNext()
  }, [onClose, onPrev, onNext])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [handleKeyDown])

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-location">{photo.location}</div>
      <div className="modal-content">
        <button className="modal-nav modal-nav-prev" onClick={onPrev} aria-label="上一张">
          <span className="modal-arrow modal-arrow-left" />
        </button>
        <img
          className="modal-image"
          key={photo.id}
          src={photo.imageUrl.replace('/600/400', '/1200/800')}
          alt={photo.location}
        />
        <button className="modal-nav modal-nav-next" onClick={onNext} aria-label="下一张">
          <span className="modal-arrow modal-arrow-right" />
        </button>
      </div>
      <div className="modal-counter">
        {currentIndex + 1} / {photos.length}
      </div>
    </div>
  )
}

export default Modal
