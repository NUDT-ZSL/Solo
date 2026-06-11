import { useEffect, useRef, useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
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
  const popupContainerRef = useRef<HTMLDivElement | null>(null)
  const [popupMemo, setPopupMemo] = useState<DisplayMemo | null>(null)
  const [popupMount, setPopupMount] = useState<HTMLDivElement | null>(null)

  const drawMarkers = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !map) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const size = map.getSize()
    canvas.width = size.x
    canvas.height = size.y

    ctx.clearRect(0, 0, size.x, size.y)

    memos.forEach((memo) => {
      if (memo.opacity <= 0) return

      const point = map.latLngToContainerPoint([memo.lat, memo.lng])
      const isSelected = memo.id === selectedMemoId
      const radius = isSelected ? 18 : 15
      const color = getColorByDate(memo.timestamp)

      if (point.x < -radius * 2 || point.x > size.x + radius * 2 ||
          point.y < -radius * 2 || point.y > size.y + radius * 2) {
        return
      }

      ctx.globalAlpha = memo.opacity

      const glowGradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius * 2)
      glowGradient.addColorStop(0, color + '60')
      glowGradient.addColorStop(1, color + '00')
      ctx.fillStyle = glowGradient
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
  }, [memos, selectedMemoId, map, getColorByDate])

  const updatePopupPosition = useCallback(() => {
    if (!popupMemo || !map || !popupContainerRef.current) return
    const point = map.latLngToContainerPoint([popupMemo.lat, popupMemo.lng])
    const container = popupContainerRef.current
    container.style.setProperty('--popup-x', `${point.x}px`)
    container.style.setProperty('--popup-y', `${point.y - 25}px`)
  }, [popupMemo, map])

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

    const popupContainer = document.createElement('div')
    popupContainer.className = 'canvas-popup-root'
    popupContainer.style.position = 'absolute'
    popupContainer.style.top = '0'
    popupContainer.style.left = '0'
    popupContainer.style.width = '100%'
    popupContainer.style.height = '100%'
    popupContainer.style.pointerEvents = 'none'
    popupContainer.style.zIndex = '501'
    popupContainerRef.current = popupContainer
    setPopupMount(popupContainer)

    const pane = map.getPane('overlayPane')
    if (pane) {
      pane.appendChild(canvas)
      pane.appendChild(popupContainer)
    }

    const handleCanvasClick = (e: MouseEvent) => {
      const localCanvas = canvasRef.current
      if (!localCanvas || !map) return

      const rect = localCanvas.getBoundingClientRect()
      const topLeft = map.containerPointToLayerPoint([0, 0])
      const x = e.clientX - rect.left - topLeft.x
      const y = e.clientY - rect.top - topLeft.y

      for (let i = memos.length - 1; i >= 0; i--) {
        const memo = memos[i]
        if (memo.opacity <= 0) continue

        const point = map.latLngToContainerPoint([memo.lat, memo.lng])
        const radius = memo.id === selectedMemoId ? 18 : 15
        const hitRadius = radius + 5
        const dx = x - point.x
        const dy = y - point.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance <= hitRadius) {
          onSelect(memo.id)
          setPopupMemo(memo)
          return
        }
      }

      setPopupMemo(null)
    }

    canvas.addEventListener('click', handleCanvasClick)

    const updateCanvasPosition = () => {
      if (!canvas || !map) return
      const topLeft = map.containerPointToLayerPoint([0, 0])
      canvas.style.transform = `translate(${topLeft.x}px, ${topLeft.y}px)`
      if (popupContainerRef.current) {
        popupContainerRef.current.style.transform = `translate(${topLeft.x}px, ${topLeft.y}px)`
      }
    }

    const onMove = () => {
      updateCanvasPosition()
      drawMarkers()
      updatePopupPosition()
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
      if (pane) {
        if (canvas.parentNode === pane) pane.removeChild(canvas)
        if (popupContainer.parentNode === pane) pane.removeChild(popupContainer)
      }
      canvasRef.current = null
      popupContainerRef.current = null
      setPopupMount(null)
    }
  }, [map, drawMarkers, updatePopupPosition, onSelect, memos, selectedMemoId])

  useEffect(() => {
    drawMarkers()
  }, [drawMarkers])

  useEffect(() => {
    updatePopupPosition()
  }, [updatePopupPosition])

  useEffect(() => {
    if (selectedMemoId == null) {
      setPopupMemo(null)
      return
    }
    if (popupMemo && popupMemo.id === selectedMemoId) return
    const memo = memos.find((m) => m.id === selectedMemoId) || null
    setPopupMemo(memo)
  }, [selectedMemoId, memos, popupMemo])

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleClosePopup = (e: React.MouseEvent) => {
    e.stopPropagation()
    setPopupMemo(null)
  }

  const renderPopup = () => {
    if (!popupMemo || !popupMount) return null
    const point = map.latLngToContainerPoint([popupMemo.lat, popupMemo.lng])
    return createPortal(
      <div
        className="canvas-popup"
        style={{
          left: point.x,
          top: point.y - 25,
          transform: 'translate(-50%, -100%)',
          pointerEvents: 'auto',
        }}
      >
        <button
          className="canvas-popup-close"
          onClick={handleClosePopup}
          title="关闭"
          type="button"
        >
          ×
        </button>
        <div className="canvas-popup-arrow" />
        <div className="canvas-popup-content">
          <div className="canvas-popup-time">{formatDate(popupMemo.timestamp)}</div>
          <div className="canvas-popup-text">{popupMemo.content}</div>
        </div>
      </div>,
      popupMount
    )
  }

  return <>{renderPopup()}</>
}
