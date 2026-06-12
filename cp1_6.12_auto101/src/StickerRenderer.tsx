import React, { useState, useRef, useEffect, useCallback } from 'react'
import type { StickerObject } from './types'

interface StickerRendererProps {
  sticker: StickerObject
  canvasRef: React.RefObject<HTMLDivElement>
  onDragStart: (id: string) => void
  onDragMove: (id: string, x: number, y: number) => void
  onDragEnd: (id: string) => void
  onDelete: (id: string) => void
  onCopy: (id: string, offsetX: number, offsetY: number) => void
  onBringToFront: (id: string) => void
}

export const StickerRenderer: React.FC<StickerRendererProps> = ({
  sticker,
  canvasRef,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDelete,
  onCopy,
  onBringToFront
}) => {
  const [showMenu, setShowMenu] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 })
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isDraggingState = useRef(false)
  const hasLongPressed = useRef(false)
  const dragStartPos = useRef({ x: 0, y: 0 })
  const pointerOffset = useRef({ x: 0, y: 0 })
  const [isRemoving, setIsRemoving] = useState(false)

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  const getCanvasRelativePos = useCallback(
    (clientX: number, clientY: number) => {
      if (!canvasRef.current) return { x: clientX, y: clientY }
      const rect = canvasRef.current.getBoundingClientRect()
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      }
    },
    [canvasRef]
  )

  const handlePointerDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.stopPropagation()
      e.preventDefault()

      let clientX: number, clientY: number
      if ('touches' in e) {
        clientX = e.touches[0].clientX
        clientY = e.touches[0].clientY
      } else {
        clientX = e.clientX
        clientY = e.clientY
      }

      const canvasPos = getCanvasRelativePos(clientX, clientY)
      pointerOffset.current = {
        x: canvasPos.x - sticker.x,
        y: canvasPos.y - sticker.y
      }

      isDraggingState.current = true
      hasLongPressed.current = false
      dragStartPos.current = { x: clientX, y: clientY }

      onBringToFront(sticker.id)
      onDragStart(sticker.id)

      longPressTimer.current = setTimeout(() => {
        if (isDraggingState.current) {
          hasLongPressed.current = true
          setMenuPosition({
            x: sticker.x + sticker.width / 2 + 10,
            y: sticker.y - sticker.height / 2 - 10
          })
          setShowMenu(true)
          onDragEnd(sticker.id)
        }
      }, 1000)
    },
    [sticker, getCanvasRelativePos, onBringToFront, onDragStart, onDragEnd]
  )

  const handlePointerMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDraggingState.current || hasLongPressed.current) return

      let clientX: number, clientY: number
      if ('touches' in e) {
        clientX = e.touches[0].clientX
        clientY = e.touches[0].clientY
      } else {
        clientX = e.clientX
        clientY = e.clientY
      }

      const canvasPos = getCanvasRelativePos(clientX, clientY)
      const x = canvasPos.x - pointerOffset.current.x
      const y = canvasPos.y - pointerOffset.current.y

      onDragMove(sticker.id, x, y)
    },
    [sticker.id, getCanvasRelativePos, onDragMove]
  )

  const handlePointerUp = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault()
      clearLongPressTimer()

      if (!hasLongPressed.current && isDraggingState.current) {
        onDragEnd(sticker.id)
      }

      isDraggingState.current = false
      hasLongPressed.current = false
    },
    [sticker.id, onDragEnd, clearLongPressTimer]
  )

  useEffect(() => {
    return () => clearLongPressTimer()
  }, [clearLongPressTimer])

  const handleDelete = useCallback(() => {
    setShowMenu(false)
    setIsRemoving(true)
    setTimeout(() => {
      onDelete(sticker.id)
    }, 400)
  }, [sticker.id, onDelete])

  const handleCopy = useCallback(() => {
    setShowMenu(false)
    const offsetX = (Math.random() * 4 + 8) * (Math.random() > 0.5 ? 1 : -1)
    const offsetY = -(Math.random() * 4 + 8)
    onCopy(sticker.id, offsetX, offsetY)
  }, [sticker.id, onCopy])

  const handleBringToFront = useCallback(() => {
    setShowMenu(false)
    onBringToFront(sticker.id)
  }, [sticker.id, onBringToFront])

  const scaleX = sticker.isSquashing ? 0.85 : 1
  const scaleY = sticker.isSquashing ? 1.15 : 1

  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    left: sticker.x - sticker.width / 2,
    top: sticker.y - sticker.height / 2,
    width: sticker.width,
    height: sticker.height,
    zIndex: sticker.zIndex,
    transform: `rotate(${sticker.rotation}rad) scaleX(${scaleX}) scaleY(${scaleY})`,
    transformOrigin: 'center center',
    transition: isRemoving
      ? 'transform 400ms ease-in, opacity 400ms ease-in'
      : sticker.isSquashing
      ? 'transform 150ms ease-out'
      : 'none',
    opacity: isRemoving ? 0 : 1,
    cursor: 'grab',
    userSelect: 'none',
    touchAction: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: isRemoving ? 'none' : 'auto'
  }

  const renderBubble = () => (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: sticker.color,
        borderRadius: 16,
        border: '2px solid rgba(0,0,0,0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px 14px',
        boxSizing: 'border-box',
        boxShadow: '0 3px 10px rgba(0,0,0,0.15)'
      }}
    >
      <span
        style={{
          color: '#ffffff',
          fontSize: 14,
          fontWeight: 600,
          textAlign: 'center',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          lineHeight: 1.35,
          textShadow: '0 1px 2px rgba(0,0,0,0.3)'
        }}
      >
        {sticker.text}
      </span>
    </div>
  )

  const renderEmoji = () => (
    <span
      style={{
        fontSize: sticker.width * 0.9,
        lineHeight: 1,
        filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.2))'
      }}
    >
      {sticker.emoji}
    </span>
  )

  return (
    <>
      <div
        style={baseStyle}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
      >
        {sticker.kind === 'bubble' ? renderBubble() : renderEmoji()}
      </div>

      {showMenu && (
        <FloatingMenu
          x={menuPosition.x}
          y={menuPosition.y}
          zIndex={sticker.zIndex + 1000}
          onDelete={handleDelete}
          onCopy={handleCopy}
          onBringToFront={handleBringToFront}
          onClose={() => setShowMenu(false)}
        />
      )}
    </>
  )
}

interface FloatingMenuProps {
  x: number
  y: number
  zIndex: number
  onDelete: () => void
  onCopy: () => void
  onBringToFront: () => void
  onClose: () => void
}

const FloatingMenu: React.FC<FloatingMenuProps> = ({
  x,
  y,
  zIndex,
  onDelete,
  onCopy,
  onBringToFront,
  onClose
}) => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  const menuItems = [
    { id: 'delete', icon: '🗑️', label: '删除', onClick: onDelete },
    { id: 'copy', icon: '📋', label: '复制', onClick: onCopy },
    { id: 'front', icon: '⬆️', label: '置顶', onClick: onBringToFront },
    { id: 'close', icon: '✕', label: '关闭', onClick: onClose }
  ]

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        zIndex,
        backgroundColor: '#ffffff',
        borderRadius: 8,
        boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
        padding: 4,
        display: 'flex',
        gap: 2,
        animation: 'fadeIn 150ms ease-out'
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      {menuItems.map((item) => (
        <button
          key={item.id}
          onClick={item.onClick}
          onMouseEnter={() => setHoveredItem(item.id)}
          onMouseLeave={() => setHoveredItem(null)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6px 8px',
            border: 'none',
            borderRadius: 6,
            backgroundColor: hoveredItem === item.id ? '#f0f0f0' : 'transparent',
            cursor: 'pointer',
            gap: 2,
            minWidth: 44,
            transition: 'background-color 120ms ease'
          }}
        >
          <span style={{ fontSize: 16 }}>{item.icon}</span>
          <span style={{ fontSize: 10, color: '#555' }}>{item.label}</span>
        </button>
      ))}
    </div>
  )
}
