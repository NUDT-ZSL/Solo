import { useEffect, useRef, useCallback } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import type { Memo } from '../types'

interface HeatmapLayerProps {
  memos: Memo[]
  radius: number
}

export default function HeatmapLayer({ memos, radius }: HeatmapLayerProps) {
  const map = useMap()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const drawHeatmap = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !map) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const size = map.getSize()
    canvas.width = size.x
    canvas.height = size.y

    ctx.clearRect(0, 0, size.x, size.y)

    if (memos.length === 0) return

    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = size.x
    tempCanvas.height = size.y
    const tempCtx = tempCanvas.getContext('2d')
    if (!tempCtx) return

    memos.forEach((memo) => {
      const point = map.latLngToContainerPoint([memo.lat, memo.lng])

      if (point.x < -radius * 3 || point.x > size.x + radius * 3 || 
          point.y < -radius * 3 || point.y > size.y + radius * 3) {
        return
      }

      const gradient = tempCtx.createRadialGradient(
        point.x, point.y, 0,
        point.x, point.y, radius
      )
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)')
      gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.3)')
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')

      tempCtx.fillStyle = gradient
      tempCtx.beginPath()
      tempCtx.arc(point.x, point.y, radius, 0, Math.PI * 2)
      tempCtx.fill()
    })

    const imageData = tempCtx.getImageData(0, 0, size.x, size.y)
    const data = imageData.data

    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3]
      if (alpha === 0) continue

      const intensity = alpha / 255
      let r: number, g: number, b: number

      if (intensity < 0.2) {
        const t = intensity / 0.2
        r = Math.floor(0 + 0 * t)
        g = Math.floor(0 + 100 * t)
        b = Math.floor(139 + 116 * t)
      } else if (intensity < 0.4) {
        const t = (intensity - 0.2) / 0.2
        r = Math.floor(0 + 50 * t)
        g = Math.floor(100 + 155 * t)
        b = Math.floor(255 - 55 * t)
      } else if (intensity < 0.6) {
        const t = (intensity - 0.4) / 0.2
        r = Math.floor(50 + 200 * t)
        g = Math.floor(255 - 55 * t)
        b = Math.floor(200 - 100 * t)
      } else if (intensity < 0.8) {
        const t = (intensity - 0.6) / 0.2
        r = Math.floor(255 + 0 * t)
        g = Math.floor(200 - 100 * t)
        b = Math.floor(100 - 100 * t)
      } else {
        const t = (intensity - 0.8) / 0.2
        r = Math.floor(255)
        g = Math.floor(100 - 80 * t)
        b = 0
      }

      data[i] = r
      data[i + 1] = g
      data[i + 2] = b
      data[i + 3] = Math.floor(alpha * 0.85)
    }

    ctx.putImageData(imageData, 0, 0)
  }, [memos, radius, map])

  useEffect(() => {
    if (!map) return

    const canvas = document.createElement('canvas')
    canvas.style.position = 'absolute'
    canvas.style.top = '0'
    canvas.style.left = '0'
    canvas.style.pointerEvents = 'none'
    canvas.style.zIndex = '450'
    canvas.className = 'leaflet-zoom-animated'

    canvasRef.current = canvas

    const pane = map.getPane('overlayPane')
    if (pane) {
      pane.appendChild(canvas)
    }

    const updateCanvasPosition = () => {
      if (!canvas || !map) return
      const topLeft = map.containerPointToLayerPoint([0, 0])
      canvas.style.transform = `translate(${topLeft.x}px, ${topLeft.y}px)`
    }

    const onMove = () => {
      updateCanvasPosition()
      drawHeatmap()
    }

    map.on('move', onMove)
    map.on('zoom', onMove)
    map.on('viewreset', onMove)

    updateCanvasPosition()
    drawHeatmap()

    return () => {
      map.off('move', onMove)
      map.off('zoom', onMove)
      map.off('viewreset', onMove)
      if (pane && canvas.parentNode === pane) {
        pane.removeChild(canvas)
      }
      canvasRef.current = null
    }
  }, [map, drawHeatmap])

  useEffect(() => {
    drawHeatmap()
  }, [drawHeatmap])

  return null
}
