import { useRef, useState, useEffect } from 'react'
import './PhotoCard.css'

interface Photo {
  id: number
  year: number
  date: string
  location: string
  imageUrl: string
}

interface PhotoCardProps {
  photo: Photo
  index: number
  onClick: (index: number) => void
}

function PhotoCard({ photo, index, onClick }: PhotoCardProps) {
  const imgRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const el = imgRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.unobserve(el)
        }
      },
      { rootMargin: '100px' }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      className="photo-card"
      onClick={() => onClick(index)}
      role="button"
      tabIndex={0}
      aria-label={`${photo.location} ${photo.date}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick(index)
        }
      }}
    >
      <div className="photo-card-img-wrapper" ref={imgRef}>
        {!isVisible || !loaded ? (
          <div className="photo-card-placeholder" />
        ) : null}
        {isVisible && (
          <img
            className="photo-card-img"
            src={photo.imageUrl}
            alt={photo.location}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            style={{ opacity: loaded ? 1 : 0, position: loaded ? 'relative' : 'absolute' }}
          />
        )}
      </div>
      <div className="photo-card-info">
        <div className="photo-card-location">{photo.location}</div>
        <div className="photo-card-date">{photo.date}</div>
      </div>
    </div>
  )
}

export default PhotoCard
