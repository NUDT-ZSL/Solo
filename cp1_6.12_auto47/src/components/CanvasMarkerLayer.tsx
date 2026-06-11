import { useEffect, useRef, useCallback, useState } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import type { DisplayMemo } from '../types'
import './CanvasMarkerLayer.css'

interface CanvasMarkerLayerProps {
  memos: DisplayMemo[]
  selectedMemoId: number | null
  onSelect: (id: number | null) => void
  getColorByDate: (timestamp: number) => string
}

export default function CanvasMarkerLayer({
  memos,
  selectedMemoId,
  onSelect,
  getColorByDate,
}: CanvasMarkerLayerProps) {
  const map = useMap()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const memoPositionsRef = useRef<Array<{ memo: DisplayMemo; x: number; y: number; radius: number }>>([])
  const [activePopup, setActivePopup] = useState<DisplayMemo | null>(null)
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | null>(null)
  const popupRef = useRef<HTMLDivElement | null>(null)

  const drawMarkers = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !map) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const size = map.getSize()
    canvas.width = size.x
    canvas.height = size.y

    ctx.clearRect(0, 0, size.x, size.y)

    const positions: Array<{ memo: DisplayMemo; x: number; y: number; radius: number }> = []

    memos.forEach((memo) => {
      if (memo.opacity <= 0) return

      const point = map.latLngToContainerPoint([memo.lat, memo.lng])
      const isSelected = memo.id === selectedMemoId
      const radius = isSelected ? 18 : 15
      const color = getColorByDate(memo.timestamp)

      if (point.x < -radius || point.x > size.x + radius || point.y < -radius || point.y > size.y + radius) {
        return
      }

      positions.push({ memo, x: point.x, y: point.y, radius })

      ctx.globalAlpha = memo.opacity

      const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius * 2)
      gradient.addColorStop(0, color + '60')
      gradient.addColorStop(1, color + '00')
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(point.x, point.y, radius * 2, 0, Math.PI * 2)
      ctx.fill()

      const markerGradient = ctx.createRadialGradient(
        point.x - radius * 0.3,
        point.y - radius * 0.3,
        0,
        point.x,
        point.y,
        radius
      )
      markerGradient.addColorStop(0, '#ffffff80')
      markerGradient.addColorStop(0.3, color)
      markerGradient.addColorStop(1, color + 'cc')

      ctx.fillStyle = markerGradient
      ctx.beginPath()
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = '#ffffff40'
      ctx.lineWidth = 2
      ctx.stroke()

      if (isSelected) {
        ctx.strokeStyle = color
        ctx.lineWidth = 3
        ctx.globalAlpha = memo.opacity * 0.5
        ctx.beginPath()
        ctx.arc(point.x, point.y, radius + 8, 0, Math.PI * 2)
        ctx.stroke()
      }

      ctx.globalAlpha = 1
    })

    memoPositionsRef.current = positions
  }, [memos, selectedMemoId, map, getColorByDate])

  const handleCanvasClick = useCallback(
    (e: MouseEvent) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      for (let i = memoPositionsRef.current.length - 1; i >= 0; i--) {
        const pos = memoPositionsRef.current[i]
        const dx = x - pos.x
        const dy = y - pos.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance <= pos.radius + 5) {
          onSelect(pos.memo.id)
          setPopupPosition({ x: pos.x, y: pos.y - pos.radius - 10 })
          setActivePopup(pos.memo)
          return
        }
      }

      setActivePopup(null)
      setPopupPosition(null)
    },
    [onSelect]
  )

  useEffect(() => {
    if (!map) return

    const canvas = document.createElement('canvas')
    canvas.style.position = 'absolute'
    canvas.style.top = '0'
    canvas.style.left = '0'
    canvas.style.pointerEvents = 'auto'
    canvas.style.zIndex = '500'
    canvas.className = 'leaflet-zoom-animated'

    canvasRef.current = canvas

    const pane = map.getPane('overlayPane')
    if (pane) {
      pane.appendChild(canvas)
    }

    canvas.addEventListener('click', handleCanvasClick)

    const updateCanvasPosition = () => {
      if (!canvas || !map) return
      const topLeft = map.containerPointToLayerPoint([0, 0])
      canvas.style.transform = `translate(${topLeft.x}px, ${topLeft.y}px)`
    }

    const onMove = () => {
      updateCanvasPosition()
      drawMarkers()
      if (activePopup) {
        const point = map.latLngToContainerPoint([activePopup.lat, activePopup.lng])
        setPopupPosition({ x: point.x, y: point.y - 20 })
      }
    }

    map.on('move', onMove)
    map.on('zoom', onMove)
    map.on('viewreset', onMove)

    updateCanvasPosition()
    drawMarkers()

    return () => {
      map.off('move', onMove)
      map.off('zoom', onMove)
      map.off('viewreset', onMove)
      canvas.removeEventListener('click', handleCanvasClick)
      if (pane && canvas.parentNode === pane) {
        pane.removeChild(canvas)
      }
      canvasRef.current = null
    }
  }, [map, drawMarkers, handleCanvasClick, activePopup])

  useEffect(() => {
    drawMarkers()
  }, [drawMarkers])

  useEffect(() => {
    if (activePopup && selectedMemoId === null) {
      setActivePopup(null)
      setPopupPosition(null)
    }
  }, [selectedMemoId, activePopup])

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <>
      {activePopup && popupPosition && (
        <div
          ref={popupRef}
          className="canvas-popup"
          style={{
            left: popupPosition.x,
            top: popupPosition.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="canvas-popup-arrow" />
          <div className="canvas-popup-content">
            <div className="canvas-popup-time">{formatDate(activePopup.timestamp)}</div>
            <div className="canvas-popup-text">{activePopup.content}</div>
          </div>
        </div>
      )}
    </>
  )
}
