import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react'

interface VirtualListProps<T> {
  items: T[]
  itemHeight: number
  renderItem: (item: T, index: number, style: React.CSSProperties) => React.ReactNode
  className?: string
  style?: React.CSSProperties
  overscan?: number
}

function VirtualList<T>({
  items,
  itemHeight,
  renderItem,
  className,
  style,
  overscan = 5,
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(0)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    setViewportHeight(container.clientHeight)

    const handleResize = () => {
      setViewportHeight(container.clientHeight)
    }

    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  const totalHeight = useMemo(() => {
    return items.length * itemHeight
  }, [items.length, itemHeight])

  const visibleCount = useMemo(() => {
    return Math.ceil(viewportHeight / itemHeight) + overscan * 2
  }, [viewportHeight, itemHeight, overscan])

  const startIndex = useMemo(() => {
    return Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  }, [scrollTop, itemHeight, overscan])

  const endIndex = useMemo(() => {
    return Math.min(items.length, startIndex + visibleCount)
  }, [startIndex, visibleCount, items.length])

  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex).map((item, index) => ({
      item,
      index: startIndex + index,
      offsetTop: (startIndex + index) * itemHeight,
    }))
  }, [items, startIndex, endIndex, itemHeight])

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        overflowY: 'auto',
        overflowX: 'hidden',
        ...style,
      }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ item, index, offsetTop }) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              transform: `translateY(${offsetTop}px)`,
            }}
          >
            {renderItem(item, index, {})}
          </div>
        ))}
      </div>
    </div>
  )
}

export default VirtualList
