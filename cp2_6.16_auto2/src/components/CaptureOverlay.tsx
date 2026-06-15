import { useState, useRef, useEffect, useCallback } from 'react'
import html2canvas from 'html2canvas'
import type { SelectionRect } from '../App'

interface CaptureOverlayProps {
  onCaptureComplete: (dataUrl: string) => void
  onExit: () => void
  onSelectionChange: (rect: SelectionRect) => void
  onSelectionCommit: (rect: SelectionRect) => void
  selection: SelectionRect | null
}

type HandleType = 'tl' | 'tr' | 'bl' | 'br' | null

function CaptureOverlay({
  onCaptureComplete,
  onExit,
  onSelectionChange,
  onSelectionCommit,
  selection: propSelection
}: CaptureOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [activeHandle, setActiveHandle] = useState<HandleType>(null)
  const [handleStartRect, setHandleStartRect] = useState<SelectionRect | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [showHandles, setShowHandles] = useState(false)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isCapturing) return
    
    const target = e.target as HTMLElement
    if (target.dataset?.handle) {
      return
    }

    setIsDragging(true)
    setShowHandles(false)
    setDragStart({ x: e.clientX, y: e.clientY })
    onSelectionChange({
      x: e.clientX,
      y: e.clientY,
      width: 0,
      height: 0
    })
  }, [isCapturing, onSelectionChange])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isCapturing) return

    if (activeHandle && handleStartRect) {
      let newX = handleStartRect.x
      let newY = handleStartRect.y
      let newWidth = handleStartRect.width
      let newHeight = handleStartRect.height

      const dx = e.clientX - dragStart.x
      const dy = e.clientY - dragStart.y

      switch (activeHandle) {
        case 'tl':
          newX = handleStartRect.x + dx
          newY = handleStartRect.y + dy
          newWidth = handleStartRect.width - dx
          newHeight = handleStartRect.height - dy
          break
        case 'tr':
          newY = handleStartRect.y + dy
          newWidth = handleStartRect.width + dx
          newHeight = handleStartRect.height - dy
          break
        case 'bl':
          newX = handleStartRect.x + dx
          newWidth = handleStartRect.width - dx
          newHeight = handleStartRect.height + dy
          break
        case 'br':
          newWidth = handleStartRect.width + dx
          newHeight = handleStartRect.height + dy
          break
      }

      if (newWidth < 10) newWidth = 10
      if (newHeight < 10) newHeight = 10

      onSelectionChange({
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight
      })
      return
    }

    if (!isDragging) return

    const currentX = e.clientX
    const currentY = e.clientY
    const startX = dragStart.x
    const startY = dragStart.y

    const x = Math.min(startX, currentX)
    const y = Math.min(startY, currentY)
    const width = Math.abs(currentX - startX)
    const height = Math.abs(currentY - startY)

    onSelectionChange({ x, y, width, height })
  }, [isDragging, isCapturing, activeHandle, handleStartRect, dragStart, onSelectionChange])

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (isCapturing) return

    if (activeHandle) {
      setActiveHandle(null)
      setHandleStartRect(null)
      if (propSelection && propSelection.width > 20 && propSelection.height > 20) {
        onSelectionCommit(propSelection)
      }
      return
    }

    if (!isDragging) return
    setIsDragging(false)

    if (propSelection && propSelection.width > 20 && propSelection.height > 20) {
      setShowHandles(true)
      onSelectionCommit(propSelection)
    }
  }, [isDragging, isCapturing, activeHandle, propSelection, onSelectionCommit])

  const handleHandleMouseDown = useCallback((handle: HandleType, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!propSelection || isCapturing) return

    setActiveHandle(handle)
    setDragStart({ x: e.clientX, y: e.clientY })
    setHandleStartRect({ ...propSelection })
  }, [propSelection, isCapturing])

  const captureScreenshot = useCallback(async () => {
    if (!propSelection || isCapturing) return

    setIsCapturing(true)

    try {
      const canvas = await html2canvas(document.body, {
        x: Math.round(propSelection.x),
        y: Math.round(propSelection.y),
        width: Math.round(propSelection.width),
        height: Math.round(propSelection.height),
        scale: window.devicePixelRatio * 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        logging: false
      })

      const dataUrl = canvas.toDataURL('image/png')
      onCaptureComplete(dataUrl)
    } catch (error) {
      console.error('Screenshot capture failed:', error)
      setIsCapturing(false)
    }
  }, [propSelection, isCapturing, onCaptureComplete])

  useEffect(() => {
    if (propSelection && propSelection.width > 0 && propSelection.height > 0 && !isDragging && !activeHandle) {
      const timer = setTimeout(() => {
        setShowHandles(true)
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [propSelection, isDragging, activeHandle])

  const getHandlePosition = (handle: HandleType) => {
    if (!propSelection) return {}
    const { x, y, width, height } = propSelection
    const handleSize = 10
    const offset = handleSize / 2

    switch (handle) {
      case 'tl':
        return { left: x - offset, top: y - offset, cursor: 'nwse-resize' }
      case 'tr':
        return { left: x + width - offset, top: y - offset, cursor: 'nesw-resize' }
      case 'bl':
        return { left: x - offset, top: y + height - offset, cursor: 'nesw-resize' }
      case 'br':
        return { left: x + width - offset, top: y + height - offset, cursor: 'nwse-resize' }
      default:
        return {}
    }
  }

  return (
    <>
      <div
        ref={overlayRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 9998,
          cursor: 'crosshair',
          backgroundColor: 'rgba(0, 0, 0, 0.1)',
          userSelect: 'none'
        }}
      >
        {propSelection && propSelection.width > 0 && propSelection.height > 0 && (
          <>
            {/* 上遮挡 */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: propSelection.y,
                backgroundColor: 'rgba(0, 0, 0, 0.35)',
                pointerEvents: 'none'
              }}
            />
            {/* 下遮挡 */}
            <div
              style={{
                position: 'absolute',
                top: propSelection.y + propSelection.height,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.35)',
                pointerEvents: 'none'
              }}
            />
            {/* 左遮挡 */}
            <div
              style={{
                position: 'absolute',
                top: propSelection.y,
                left: 0,
                width: propSelection.x,
                height: propSelection.height,
                backgroundColor: 'rgba(0, 0, 0, 0.35)',
                pointerEvents: 'none'
              }}
            />
            {/* 右遮挡 */}
            <div
              style={{
                position: 'absolute',
                top: propSelection.y,
                left: propSelection.x + propSelection.width,
                right: 0,
                height: propSelection.height,
                backgroundColor: 'rgba(0, 0, 0, 0.35)',
                pointerEvents: 'none'
              }}
            />

            {/* 选框 */}
            <div
              style={{
                position: 'absolute',
                left: propSelection.x,
                top: propSelection.y,
                width: propSelection.width,
                height: propSelection.height,
                border: '2px solid #2196f3',
                backgroundColor: 'rgba(33, 150, 243, 0.15)',
                boxSizing: 'border-box',
                pointerEvents: 'none',
                transition: showHandles ? 'none' : 'none'
              }}
            />

            {/* 四角手柄 - 直径10px白色圆点 */}
            {showHandles && !isDragging && !activeHandle && (['tl', 'tr', 'bl', 'br'] as HandleType[]).map((handle) => (
              <div
                key={handle}
                data-handle={handle}
                onMouseDown={(e) => handleHandleMouseDown(handle, e)}
                style={{
                  position: 'absolute',
                  width: '10px',
                  height: '10px',
                  backgroundColor: '#ffffff',
                  borderRadius: '50%',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(33, 150, 243, 0.5)',
                  ...getHandlePosition(handle),
                  zIndex: 9999,
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                } as React.CSSProperties}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.3)'
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(33, 150, 243, 0.6), 0 0 0 1px rgba(33, 150, 243, 0.8)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)'
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(33, 150, 243, 0.5)'
                }}
              />
            ))}

            {/* 尺寸提示 */}
            {showHandles && (
              <div
                style={{
                  position: 'absolute',
                  left: propSelection.x,
                  top: propSelection.y - 28,
                  padding: '4px 8px',
                  background: 'rgba(0, 0, 0, 0.7)',
                  color: '#ffffff',
                  fontSize: '12px',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap'
                }}
              >
                {Math.round(propSelection.width)} × {Math.round(propSelection.height)}
              </div>
            )}
          </>
        )}

        {/* 提示文字 */}
        {!propSelection && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: '#ffffff',
              fontSize: '18px',
              textAlign: 'center',
              pointerEvents: 'none',
              textShadow: '0 2px 8px rgba(0, 0, 0, 0.5)'
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✂️</div>
            <div style={{ marginBottom: '8px' }}>点击并拖拽鼠标选择截图区域</div>
            <div style={{ fontSize: '14px', opacity: 0.8 }}>按 Esc 退出截图模式</div>
          </div>
        )}

        {/* 确认按钮 */}
        {showHandles && propSelection && propSelection.width > 50 && propSelection.height > 50 && !isCapturing && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              captureScreenshot()
            }}
            style={{
              position: 'absolute',
              right: propSelection.x + propSelection.width,
              top: propSelection.y + propSelection.height + 12,
              padding: '8px 20px',
              background: '#4caf50',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(76, 175, 80, 0.4)',
              transition: 'all 0.15s ease',
              transform: 'translateX(-100%)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#388e3c'
              e.currentTarget.style.transform = 'translateX(-100%) scale(1.05)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#4caf50'
              e.currentTarget.style.transform = 'translateX(-100%) scale(1)'
            }}
          >
            ✓ 确认截图
          </button>
        )}

        {/* 加载状态 */}
        {isCapturing && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: '#ffffff',
              fontSize: '16px',
              textAlign: 'center',
              pointerEvents: 'none'
            }}
          >
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📸</div>
            <div>正在截取...</div>
          </div>
        )}
      </div>
    </>
  )
}

export default CaptureOverlay
