import React, { useState, useRef, useEffect, useCallback } from 'react'
import type { StickerObject } from './types'

interface StickerRendererProps {
  sticker: StickerObject
  onDragStart: (id: string, e: React.MouseEvent | React.TouchEvent) => void
  onDragMove: (id: string, x: number, y: number) => void
  onDragEnd: (id: string) => void
  onDelete: (id: string) => void
  onCopy: (id: string) => void
  onBringToFront: (id: string) => void
}

export const StickerRenderer: React.FC<StickerRendererProps> = ({
  sticker,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDelete,
  onCopy,
  onBringToFront
}) => {
  const [showMenu, setShowMenu] = useState(false)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isDragging = useRef(false)
  const hasLongPressed = useRef(false)

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  const handlePointerDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault()
      e.stopPropagation()
      isDragging.current = true
      hasLongPressed.current = false
      onBringToFront(sticker.id)

      longPressTimer.current = setTimeout(() => {
        if (isDragging.current) {
          hasLongPressed.current = true
          setShowMenu(true)
        }
      }, 1000)

      onDragStart(sticker.id, e)
    },
    [sticker.id, onDragStart, onBringToFront]
  )

  const handlePointerMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDragging.current || hasLongPressed.current) return

      let clientX: number, clientY: number
      if ('touches' in e) {
        clientX = e.touches[0].clientX
        clientY = e.touches[0].clientY
      } else {
        clientX = e.clientX
        clientY = e.clientY
      }
      onDragMove(sticker.id, clientX, clientY)
    },
    [sticker.id, onDragMove]
  )

  const handlePointerUp = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault()
      isDragging.current = false
      clearLongPressTimer()

      if (!hasLongPressed.current) {
        onDragEnd(sticker.id)
      }
      hasLongPressed.current = false
    },
    [sticker.id, onDragEnd, clearLongPressTimer]
  )

  useEffect(() => {
    return () => clearLongPressTimer()
  }, [clearLongPressTimer])

  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    left: sticker.x - sticker.width / 2,
    top: sticker.y - sticker.height / 2,
    width: sticker.width,
    height: sticker.height,
    zIndex: sticker.zIndex,
    transform: `rotate(${sticker.rotation}rad) scaleX(${sticker.squashScaleX}) scaleY(${sticker.squashScaleY})`,
    transformOrigin: 'center center',
    transition: sticker.isRemoving
      ? 'transform 400ms ease-in, opacity 400ms ease-in'
      : sticker.isSquashing
      ? 'transform 150ms ease-out'
      : 'none',
    opacity: sticker.isRemoving ? 0 : 1,
    cursor: 'grab',
    userSelect: 'none',
    touchAction: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }

  const renderBubble = () => (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: sticker.color,
        borderRadius: 16,
        border: '2px solid rgba(0,0,0,0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px 14px',
        boxSizing: 'border-box',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}
    >
      <span
        style={{
          color: '#fff',
          fontSize: 14,
          fontWeight: 600,
          textAlign: 'center',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          lineHeight: 1.3,
          textShadow: '0 1px 2px rgba(0,0,0,0.2)'
        }}
      >
        {sticker.text}
      </span>
    </div>
  )

  const renderEmoji = () => (
    <span
      style={{
        fontSize: sticker.width * 0.85,
        lineHeight: 1,
        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))'
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
        <div
          style={{
            position: 'absolute',
            left: sticker.x + 30,
            top: sticker.y - sticker.height / 2 - 10,
            zIndex: 99999,
            backgroundColor: '#ffffff',
            borderRadius: 8,
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            padding: 4,
            display: 'flex',
            gap: 2
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <MenuButton
            icon="🗑️"
            label="删除"
            onClick={() => {
              setShowMenu(false)
              onDelete(sticker.id)
            }}
          />
          <MenuButton
            icon="📋"
            label="复制"
            onClick={() => {
              setShowMenu(false)
              onCopy(sticker.id)
            }}
          />
          <MenuButton
            icon="⬆️"
            label="置顶"
            onClick={() => {
              setShowMenu(false)
              onBringToFront(sticker.id)
            }}
          />
          <MenuButton
            icon="✕"
            label="关闭"
            onClick={() => setShowMenu(false)}
          />
        </div>
      )}
    </>
  )
}

const MenuButton: React.FC<{
  icon: string
  label: string
  onClick: () => void
}> = ({ icon, label, onClick }) => {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '6px 8px',
        border: 'none',
        borderRadius: 6,
        backgroundColor: hovered ? '#f0f0f0' : 'transparent',
        cursor: 'pointer',
        gap: 2,
        minWidth: 44
      }}
    >
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span style={{ fontSize: 10, color: '#555' }}>{label}</span>
    </button>
  )
}
