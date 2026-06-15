import React, { useRef, useState, useEffect, useCallback } from 'react'
import { FurnitureItem, ItemCategory, ThemeConfig, SLOT_POSITIONS, SNAP_THRESHOLD } from '../utils/constants'

interface CatalogueViewProps {
  placedItems: Record<ItemCategory, FurnitureItem | null>
  theme: ThemeConfig
  onItemPlaced: (category: ItemCategory, item: FurnitureItem) => void
  onItemRemoved: (category: ItemCategory) => void
}

interface DragState {
  category: ItemCategory
  item: FurnitureItem
  startX: number
  startY: number
  offsetX: number
  offsetY: number
  currentX: number
  currentY: number
}

interface AnimationState {
  exiting: Record<ItemCategory, FurnitureItem | null>
  entering: Record<ItemCategory, boolean>
  snapping: ItemCategory | null
}

const CatalogueView: React.FC<CatalogueViewProps> = ({
  placedItems,
  theme,
  onItemPlaced,
  onItemRemoved,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [animState, setAnimState] = useState<AnimationState>({
    exiting: { sofa: null, chandelier: null, painting: null },
    entering: { sofa: false, chandelier: false, painting: false },
    snapping: null,
  })
  const [prevItems, setPrevItems] = useState<Record<ItemCategory, FurnitureItem | null>>({
    sofa: null,
    chandelier: null,
    painting: null,
  })

  useEffect(() => {
    const categories: ItemCategory[] = ['sofa', 'chandelier', 'painting']

    categories.forEach((cat) => {
      const current = placedItems[cat]
      const prev = prevItems[cat]

      if (current && prev && current.id !== prev.id) {
        setAnimState((prevState) => ({
          ...prevState,
          exiting: { ...prevState.exiting, [cat]: prev },
          entering: { ...prevState.entering, [cat]: false },
        }))

        const exitTimer = setTimeout(() => {
          setAnimState((prevState) => ({
            ...prevState,
            exiting: { ...prevState.exiting, [cat]: null },
            entering: { ...prevState.entering, [cat]: true },
          }))
          setPrevItems((p) => ({ ...p, [cat]: current }))

          const enterTimer = setTimeout(() => {
            setAnimState((prevState) => ({
              ...prevState,
              entering: { ...prevState.entering, [cat]: false },
            }))
          }, 300)

          return () => clearTimeout(enterTimer)
        }, 200)

        return () => clearTimeout(exitTimer)
      } else if (current && !prev) {
        setAnimState((prevState) => ({
          ...prevState,
          entering: { ...prevState.entering, [cat]: true },
        }))
        setPrevItems((p) => ({ ...p, [cat]: current }))

        const timer = setTimeout(() => {
          setAnimState((prevState) => ({
            ...prevState,
            entering: { ...prevState.entering, [cat]: false },
          }))
        }, 300)

        return () => clearTimeout(timer)
      } else if (!current && prev) {
        setAnimState((prevState) => ({
          ...prevState,
          exiting: { ...prevState.exiting, [cat]: prev },
        }))

        const timer = setTimeout(() => {
          setAnimState((prevState) => ({
            ...prevState,
            exiting: { ...prevState.exiting, [cat]: null },
          }))
          setPrevItems((p) => ({ ...p, [cat]: null }))
        }, 200)

        return () => clearTimeout(timer)
      }
    })
  }, [placedItems, prevItems])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, category: ItemCategory, item: FurnitureItem) => {
      e.preventDefault()
      if (!canvasRef.current) return

      const rect = canvasRef.current.getBoundingClientRect()
      const slot = SLOT_POSITIONS[category]
      const itemX = (slot.x - slot.width / 2) * (rect.width / 100)
      const itemY = (slot.y - slot.height / 2) * (rect.height / 100)

      setDragState({
        category,
        item,
        startX: itemX,
        startY: itemY,
        offsetX: e.clientX - rect.left - itemX,
        offsetY: e.clientY - rect.top - itemY,
        currentX: itemX,
        currentY: itemY,
      })
    },
    []
  )

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragState || !canvasRef.current) return

      const rect = canvasRef.current.getBoundingClientRect()
      const newX = e.clientX - rect.left - dragState.offsetX
      const newY = e.clientY - rect.top - dragState.offsetY

      setDragState((prev) => (prev ? { ...prev, currentX: newX, currentY: newY } : null))
    },
    [dragState]
  )

  const handleMouseUp = useCallback(() => {
    if (!dragState || !canvasRef.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    const slot = SLOT_POSITIONS[dragState.category]
    const slotCenterX = slot.x * (rect.width / 100)
    const slotCenterY = slot.y * (rect.height / 100)
    const itemWidth = slot.width * (rect.width / 100)
    const itemHeight = slot.height * (rect.height / 100)

    const itemCenterX = dragState.currentX + itemWidth / 2
    const itemCenterY = dragState.currentY + itemHeight / 2

    const distance = Math.sqrt(
      Math.pow(itemCenterX - slotCenterX, 2) + Math.pow(itemCenterY - slotCenterY, 2)
    )

    const threshold = Math.min(itemWidth, itemHeight) * SNAP_THRESHOLD

    if (distance < threshold) {
      setAnimState((prevState) => ({
        ...prevState,
        snapping: dragState.category,
      }))
      onItemPlaced(dragState.category, dragState.item)

      setTimeout(() => {
        setAnimState((prevState) => ({
          ...prevState,
          snapping: null,
        }))
      }, 200)
    }

    setDragState(null)
  }, [dragState, onItemPlaced])

  useEffect(() => {
    if (dragState) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'grabbing'
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
        document.body.style.cursor = ''
      }
    }
  }, [dragState, handleMouseMove, handleMouseUp])

  const renderItemVisual = (item: FurnitureItem, themeColor: string, secondaryColor: string) => {
    const colorTransition = 'fill 0.5s ease, stroke 0.5s ease'

    if (item.category === 'sofa') {
      return (
        <svg viewBox="0 0 200 100" width="100%" height="100%" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`sofa-grad-${item.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={themeColor} />
              <stop offset="100%" stopColor={secondaryColor} />
            </linearGradient>
          </defs>
          <rect x="15" y="35" width="170" height="55" rx="10" fill={`url(#sofa-grad-${item.id})`} style={{ transition: colorTransition }} />
          <rect x="15" y="20" width="35" height="70" rx="10" fill={`url(#sofa-grad-${item.id})`} style={{ transition: colorTransition }} />
          <rect x="150" y="20" width="35" height="70" rx="10" fill={`url(#sofa-grad-${item.id})`} style={{ transition: colorTransition }} />
          <rect x="40" y="45" width="120" height="40" rx="6" fill={secondaryColor} opacity="0.4" style={{ transition: colorTransition }} />
          <ellipse cx="32" cy="88" rx="8" ry="4" fill={secondaryColor} opacity="0.3" style={{ transition: colorTransition }} />
          <ellipse cx="168" cy="88" rx="8" ry="4" fill={secondaryColor} opacity="0.3" style={{ transition: colorTransition }} />
        </svg>
      )
    }

    if (item.category === 'chandelier') {
      return (
        <svg viewBox="0 0 180 140" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
          <line x1="90" y1="0" x2="90" y2="30" stroke={themeColor} strokeWidth="3" style={{ transition: colorTransition }} />
          <ellipse cx="90" cy="32" rx="18" ry="8" fill={themeColor} style={{ transition: colorTransition }} />
          <path d="M 25 55 Q 90 30 155 55" stroke={themeColor} strokeWidth="4" fill="none" style={{ transition: colorTransition }} />
          <path d="M 50 48 Q 90 35 130 48" stroke={themeColor} strokeWidth="3" fill="none" opacity="0.7" style={{ transition: colorTransition }} />
          <ellipse cx="35" cy="60" rx="14" ry="18" fill="#FFF8E7" opacity="0.9" />
          <ellipse cx="90" cy="55" rx="20" ry="26" fill="#FFFBF0" opacity="0.95" />
          <ellipse cx="145" cy="60" rx="14" ry="18" fill="#FFF8E7" opacity="0.9" />
          <circle cx="35" cy="58" r="7" fill={themeColor} opacity="0.8" style={{ transition: colorTransition }} />
          <circle cx="90" cy="52" r="10" fill={themeColor} opacity="0.8" style={{ transition: colorTransition }} />
          <circle cx="145" cy="58" r="7" fill={themeColor} opacity="0.8" style={{ transition: colorTransition }} />
          <ellipse cx="90" cy="75" rx="40" ry="10" fill="rgba(255, 248, 231, 0.2)" />
        </svg>
      )
    }

    if (item.category === 'painting') {
      return (
        <svg viewBox="0 0 120 160" width="100%" height="100%" preserveAspectRatio="none">
          <rect x="2" y="2" width="116" height="156" rx="2" fill={secondaryColor} style={{ transition: colorTransition }} />
          <rect x="8" y="8" width="104" height="144" fill={themeColor} style={{ transition: colorTransition }} />
          {item.id === 'painting-abstract' && (
            <>
              <circle cx="45" cy="55" r="28" fill="#E8C872" opacity="0.85" />
              <circle cx="75" cy="90" r="22" fill="#7BA3A8" opacity="0.85" />
              <path d="M 20 120 Q 60 85 100 120" stroke="#fff" strokeWidth="3" fill="none" opacity="0.7" />
              <circle cx="90" cy="45" r="12" fill="#D4A574" opacity="0.6" />
            </>
          )}
          {item.id === 'painting-landscape' && (
            <>
              <rect x="8" y="8" width="104" height="80" fill="#87CEEB" />
              <circle cx="85" cy="35" r="16" fill="#FFE066" />
              <polygon points="8,88 35,55 60,75 90,45 112,68 112,152 8,152" fill="#228B22" />
              <rect x="8" y="95" width="104" height="57" fill="#32CD32" />
              <ellipse cx="30" cy="130" rx="15" ry="10" fill="#228B22" opacity="0.6" />
            </>
          )}
          {item.id === 'painting-floral' && (
            <>
              <rect x="8" y="8" width="104" height="144" fill="#FFF5EE" />
              <circle cx="60" cy="70" r="32" fill="#FFB6C1" opacity="0.7" />
              <circle cx="40" cy="52" r="18" fill="#FFB6C1" opacity="0.95" />
              <circle cx="80" cy="52" r="18" fill="#FFB6C1" opacity="0.95" />
              <circle cx="40" cy="88" r="18" fill="#FFB6C1" opacity="0.95" />
              <circle cx="80" cy="88" r="18" fill="#FFB6C1" opacity="0.95" />
              <circle cx="60" cy="70" r="12" fill="#FFD700" />
              <rect x="56" y="90" width="8" height="50" fill="#228B22" />
              <ellipse cx="45" cy="115" rx="10" ry="6" fill="#90EE90" transform="rotate(-30 45 115)" />
              <ellipse cx="75" cy="115" rx="10" ry="6" fill="#90EE90" transform="rotate(30 75 115)" />
            </>
          )}
          {item.id === 'painting-geometric' && (
            <>
              <polygon points="60,15 112,70 8,70" fill="#D4A574" />
              <rect x="8" y="75" width="50" height="77" fill="#8B7355" />
              <rect x="62" y="75" width="50" height="77" fill="#C4A882" />
              <circle cx="87" cy="110" r="18" fill="#6B5344" />
              <rect x="20" y="90" width="26" height="40" fill="#A67B5B" opacity="0.6" />
            </>
          )}
        </svg>
      )
    }

    return null
  }

  const renderPlacedItem = (category: ItemCategory) => {
    const item = placedItems[category]
    const exitingItem = animState.exiting[category]
    const entering = animState.entering[category]
    const isSnapping = animState.snapping === category
    const isDragging = dragState?.category === category
    const slot = SLOT_POSITIONS[category]

    if (!item && !exitingItem) return null

    const displayItem = item || exitingItem
    const themeColor = displayItem ? theme.itemColorMap[displayItem.id] || displayItem.color : '#ccc'
    const secondaryColor = displayItem ? displayItem.secondaryColor || themeColor : '#999'

    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      left: `${slot.x - slot.width / 2}%`,
      top: `${slot.y - slot.height / 2}%`,
      width: `${slot.width}%`,
      height: `${slot.height}%`,
      cursor: isDragging ? 'grabbing' : 'grab',
      transition: exitingItem ? 'opacity 0.2s ease-out, transform 0.2s ease-out' : 'opacity 0.3s ease, transform 0.2s ease-out',
      opacity: exitingItem ? 0 : isDragging ? 0.5 : 1,
      pointerEvents: exitingItem ? 'none' : 'auto',
      transform: isDragging ? 'scale(1.1)' : 'scale(1)',
      zIndex: isDragging ? 500 : 10,
    }

    const enterAnimationStyle: React.CSSProperties = entering
      ? {
          animation: 'elasticIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        }
      : {}

    const snapStyle: React.CSSProperties = isSnapping
      ? {
          animation: 'snapBounce 0.2s ease-out forwards',
        }
      : {}

    return (
      <div
        key={`${category}-${displayItem?.id || 'empty'}-${exitingItem ? 'exit' : 'normal'}`}
        style={{ ...baseStyle, ...enterAnimationStyle, ...snapStyle }}
        onMouseDown={(e) => item && !exitingItem && handleMouseDown(e, category, item)}
      >
        {renderItemVisual(displayItem!, themeColor, secondaryColor)}
      </div>
    )
  }

  const renderDragGhost = () => {
    if (!dragState || !canvasRef.current) return null

    const rect = canvasRef.current.getBoundingClientRect()
    const slot = SLOT_POSITIONS[dragState.category]
    const width = slot.width * (rect.width / 100)
    const height = slot.height * (rect.height / 100)
    const themeColor = theme.itemColorMap[dragState.item.id] || dragState.item.color
    const secondaryColor = dragState.item.secondaryColor || themeColor

    return (
      <div
        style={{
          position: 'absolute',
          left: dragState.currentX,
          top: dragState.currentY,
          width,
          height,
          pointerEvents: 'none',
          opacity: 0.5,
          zIndex: 1000,
          filter: `drop-shadow(0 10px 25px ${theme.shadowColor})`,
          transform: 'scale(1.1)',
          transition: 'none',
        }}
      >
        {renderItemVisual(dragState.item, themeColor, secondaryColor)}
      </div>
    )
  }

  const renderSlotHighlight = (category: ItemCategory) => {
    const slot = SLOT_POSITIONS[category]
    const hasItem = placedItems[category] !== null
    const isSnapping = animState.snapping === category
    const isDraggingOver = dragState?.category === category

    if (hasItem && !isDraggingOver) return null

    return (
      <div
        style={{
          position: 'absolute',
          left: `${slot.x - slot.width / 2}%`,
          top: `${slot.y - slot.height / 2}%`,
          width: `${slot.width}%`,
          height: `${slot.height}%`,
          border: `2px dashed ${isDraggingOver ? theme.accentColor : 'rgba(180, 175, 170, 0.4)'}`,
          borderRadius: 8,
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isDraggingOver ? `${theme.accentColor}10` : 'transparent',
          transition: 'all 0.2s ease',
          transform: isSnapping ? 'scale(1.05)' : 'scale(1)',
        }}
      >
        <span
          style={{
            fontFamily: "'Noto Sans SC', sans-serif",
            fontSize: 11,
            color: isDraggingOver ? theme.accentColor : 'rgba(150, 145, 140, 0.6)',
            transition: 'color 0.2s ease',
          }}
        >
          {category === 'sofa' ? '沙发位' : category === 'chandelier' ? '吊灯位' : '装饰画位'}
        </span>
      </div>
    )
  }

  return (
    <div
      ref={canvasRef}
      style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        transition: 'background-color 0.5s ease',
        backgroundColor: theme.ceilingColor,
      }}
    >
      <style>{`
        @keyframes elasticIn {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.08); }
          70% { transform: scale(0.95); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes snapBounce {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        @keyframes fadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes fadeOut {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>

      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '15%',
          transition: 'background-color 0.5s ease',
          backgroundColor: theme.ceilingColor,
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: '15%',
          left: 0,
          right: '30%',
          height: '55%',
          transition: 'background 0.5s ease, background-color 0.5s ease',
          background: `linear-gradient(180deg, ${theme.wallColor} 0%, ${theme.wallColorDark} 100%)`,
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: '15%',
          right: 0,
          width: '30%',
          height: '55%',
          transition: 'background 0.5s ease, background-color 0.5s ease',
          background: `linear-gradient(90deg, ${theme.wallColorDark} 0%, ${theme.wallColor} 100%)`,
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: '65%',
          left: 0,
          right: 0,
          bottom: 0,
          transition: 'background 0.5s ease, background-color 0.5s ease',
          background: `linear-gradient(180deg, ${theme.floorColor} 0%, ${theme.floorColor} 100%)`,
          transform: 'perspective(800px) rotateX(30deg)',
          transformOrigin: 'top center',
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: '15%',
          right: '30%',
          width: 0,
          height: 0,
          borderLeft: `40px solid transparent`,
          borderBottom: `55vh solid transparent`,
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '20%',
          transition: 'box-shadow 0.5s ease',
          boxShadow: `inset 0 30px 60px -30px ${theme.shadowColor}`,
          pointerEvents: 'none',
        }}
      />

      {(['sofa', 'chandelier', 'painting'] as ItemCategory[]).map((cat) => (
        <React.Fragment key={`slot-${cat}`}>{renderSlotHighlight(cat)}</React.Fragment>
      ))}

      {(['sofa', 'chandelier', 'painting'] as ItemCategory[]).map((cat) => (
        <React.Fragment key={`placed-${cat}`}>{renderPlacedItem(cat)}</React.Fragment>
      ))}

      {renderDragGhost()}

      <div
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          padding: '8px 16px',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          borderRadius: 8,
          boxShadow: `0 2px 10px ${theme.shadowColor}`,
          transition: 'all 0.5s ease',
        }}
      >
        <span
          style={{
            fontFamily: "'Noto Sans SC', sans-serif",
            fontSize: 13,
            color: '#5A5550',
          }}
        >
          当前主题：
          <strong style={{ color: theme.accentColor, marginLeft: 4, transition: 'color 0.5s ease' }}>{theme.name}</strong>
        </span>
      </div>
    </div>
  )
}

export default CatalogueView
