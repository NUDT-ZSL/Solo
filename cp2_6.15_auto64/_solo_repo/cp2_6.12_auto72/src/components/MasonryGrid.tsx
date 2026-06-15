import { useState, useEffect, useRef, useCallback } from 'react'
import GalleryCard from '@/components/GalleryCard'
import type { Artwork } from '@/types'

interface MasonryGridProps {
  artworks: Artwork[]
  onCardClick: (id: string) => void
}

interface CardPosition {
  top: number
  left: number
  width: number
  height: number
}

const MasonryGrid = ({ artworks, onCardClick }: MasonryGridProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [columns, setColumns] = useState(3)
  const [cardHeights, setCardHeights] = useState<number[]>([])
  const [cardPositions, setCardPositions] = useState<CardPosition[]>([])
  const [containerHeight, setContainerHeight] = useState(0)
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set())

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

  const handleImageLoad = useCallback((id: string, height: number) => {
    setLoadedImages((prev) => {
      const newSet = new Set(prev)
      newSet.add(id)
      return newSet
    })
    setCardHeights((prev) => {
      const index = artworks.findIndex((a) => a.id === id)
      if (index === -1) return prev
      const newHeights = [...prev]
      newHeights[index] = height
      return newHeights
    })
  }, [artworks])

  const calculatePositions = useCallback(() => {
    if (!containerRef.current) return

    const containerWidth = containerRef.current.offsetWidth
    const gap = 20
    const cardWidth = (containerWidth - gap * (columns - 1)) / columns

    const heights = new Array(columns).fill(0)
    const positions: CardPosition[] = []

    artworks.forEach((artwork, index) => {
      const estimatedHeight = cardHeights[index] || cardWidth * 1.2
      const shortestColumn = heights.indexOf(Math.min(...heights))
      const top = heights[shortestColumn]
      const left = shortestColumn * (cardWidth + gap)

      positions.push({ top, left, width: cardWidth, height: estimatedHeight })
      heights[shortestColumn] = top + estimatedHeight + gap
    })

    setCardPositions(positions)
    setContainerHeight(Math.max(...heights))
  }, [artworks, columns, cardHeights])

  useEffect(() => {
    calculatePositions()
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
        const isLoaded = loadedImages.has(artwork.id) || cardHeights[index] !== undefined

        return (
          <div
            key={artwork.id}
            style={{
              position: 'absolute',
              top: position.top,
              left: position.left,
              width: position.width,
              opacity: isLoaded ? 1 : 0,
              transform: isLoaded ? 'translateY(0)' : 'translateY(20px)',
              transition: `opacity 0.3s ease-out ${totalDelay}s, transform 0.3s ease-out ${totalDelay}s`
            }}
          >
            <GalleryCard
              artwork={artwork}
              index={index}
              onClick={() => onCardClick(artwork.id)}
              onImageLoad={(height) => handleImageLoad(artwork.id, height)}
            />
          </div>
        )
      })}
    </div>
  )
}

export default MasonryGrid
