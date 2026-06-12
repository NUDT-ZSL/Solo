import { useState, useEffect } from 'react'
import type { Artwork, ToolType } from '@/types'

interface GalleryCardProps {
  artwork: Artwork
  index: number
  onClick: () => void
}

const toolLabels: Record<ToolType, string> = {
  digital: '数字绘画',
  watercolor: '水彩',
  pencil: '铅笔'
}

const GalleryCard = ({ artwork, index, onClick }: GalleryCardProps) => {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(true)
    }, index * 100)
    return () => clearTimeout(timer)
  }, [index])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div
      className="gallery-card"
      onClick={onClick}
      style={{
        animationDelay: `${index * 0.1}s`,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.3s ease-out, transform 0.3s ease-out'
      }}
    >
      <img
        src={artwork.thumbnailUrl}
        alt={artwork.title}
        loading="lazy"
        onLoad={() => setImageLoaded(true)}
        style={{
          opacity: imageLoaded ? 1 : 0,
          transition: 'opacity 0.3s ease'
        }}
      />
      <div className="gallery-card-overlay">
        <h3 className="gallery-card-title">{artwork.title}</h3>
        <p className="gallery-card-date">{formatDate(artwork.createdAt)}</p>
        <div className="gallery-card-tags">
          {artwork.tools.map((tool) => (
            <span key={tool} className={`tool-tag ${tool}`}>
              {toolLabels[tool]}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default GalleryCard
