import { useEffect, useRef, useState } from 'react'

interface LazyImageProps {
  src: string
  alt: string
  style?: React.CSSProperties
  className?: string
}

export default function LazyImage({ src, alt, style, className }: LazyImageProps) {
  const imgRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

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
      { rootMargin: '200px' }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={imgRef} style={{ ...style, overflow: 'hidden', background: '#1f2937' }}>
      {isVisible && (
        <img
          src={src}
          alt={alt}
          className={`lazy-image ${isLoaded ? 'loaded' : ''} ${className || ''}`}
          onLoad={() => setIsLoaded(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' as const, transition: 'opacity 0.4s ease' }}
        />
      )}
    </div>
  )
}
