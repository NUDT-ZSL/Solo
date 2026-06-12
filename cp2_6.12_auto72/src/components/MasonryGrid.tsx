import { useState, useEffect, useRef, useCallback } from 'react'
import GalleryCard from '@/components/GalleryCard'
import type { Artwork } from '@/types'

interface MasonryGridProps {
  artworks: Artwork[]
  onCardClick: (id: string) => void
}

const MasonryGrid = ({ artworks, onCardClick }: MasonryGridProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [columns, setColumns] = useState(3)
  const [cardPositions, setCardPositions] = useState<{ top: number; left: number; width: number; height: number }[]>([])
  const [containerHeight, setContainerHeight] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const updateColumns = () => {
      const width = window.innerWidth
      if (width < 480) {
        setColumns(1)
      } else if (width < 768) {
        setColumns(2)
      } else {
        setColumns(3)
      }
    }
    updateColumns()
    window.addEventListener('resize', updateColumns)
    return () => window.removeEventListener('resize', updateColumns)
  }, [])

  const calculatePositions = useCallback(() => {
    if (!containerRef.current) return

    const containerWidth = containerRef.current.offsetWidth
    const gap = 20
    const cardWidth = (containerWidth - gap * (columns - 1)) / columns

    const heights = new Array(columns).fill(0)
    const positions: { top: number; left: number; width: number; height: number }[] = []

    artworks.forEach((artwork, index) => {
      const cardHeight = cardWidth * artwork.aspectRatio

      const shortestColumn = heights.indexOf(Math.min(...heights))
      const top = heights[shortestColumn]
      const left = shortestColumn * (cardWidth + gap)

      positions.push({ top, left, width: cardWidth, height: cardHeight })
      heights[shortestColumn] = top + cardHeight + gap
    })

    setCardPositions(positions)
    setContainerHeight(Math.max(...heights))
  }, [artworks, columns])

  useEffect(() => {
    calculatePositions()
    const timer = setTimeout(() => setMounted(true), 50)
    return () => clearTimeout(timer)
  }, [calculatePositions])

  useEffect(() => {
    window.addEventListener('resize', calculatePositions)
    return () => window.removeEventListener('resize', calculatePositions)
  }, [calculatePositions])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: containerHeight
      }}
    >
      {artworks.map((artwork, index) => {
        const position = cardPositions[index]
        if (!position) return null

        const row = Math.floor(index / columns)
        const col = index % columns
        const rowDelay = row * columns * 0.1
        const colDelay = col * 0.1
        const totalDelay = rowDelay + colDelay

        return (
          <div
            key={artwork.id}
            style={{
              position: 'absolute',
              top: position.top,
              left: position.left,
              width: position.width,
              height: position.height,
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(20px)',
              transition: `opacity 0.3s ease-out ${totalDelay}s, transform 0.3s ease-out ${totalDelay}s`
            }}
          >
            <GalleryCard
              artwork={artwork}
              index={index}
              onClick={() => onCardClick(artwork.id)}
            />
          </div>
        )
      })}
    </div>
  )
}

export default MasonryGrid
