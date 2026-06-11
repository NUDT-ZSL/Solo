import { useRef, useState, useCallback } from 'react'
import type { PanState } from '../types'
import { clamp } from '../utils/helpers'

interface UseCanvasPanZoomOptions {
  zoom: number
  panX: number
  panY: number
  onCanvasStateChange: (zoom: number, panX: number, panY: number) => void
  svgRef: React.RefObject<SVGSVGElement>
}

interface UseCanvasPanZoomResult {
  spacePressed: boolean
  setSpacePressed: (v: boolean) => void
  cursor: string
  setCursor: (v: string) => void
  panState: React.MutableRefObject<PanState>
  handleWheel: (e: React.WheelEvent<SVGSVGElement>) => void
  startPanning: (clientX: number, clientY: number) => void
  updatePanning: (clientX: number, clientY: number) => void
  endPanning: () => void
}

export function useCanvasPanZoom({
  zoom,
  panX,
  panY,
  onCanvasStateChange,
  svgRef
}: UseCanvasPanZoomOptions): UseCanvasPanZoomResult {
  const [spacePressed, setSpacePressed] = useState(false)
  const [cursor, setCursor] = useState('default')

  const panState = useRef<PanState>({
    isPanning: false,
    startX: 0,
    startY: 0,
    startPanX: 0,
    startPanY: 0
  })

  const handleWheel = useCallback(
    (e: React.WheelEvent<SVGSVGElement>) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      const newZoom = clamp(zoom * delta, 0.5, 3)

      const svg = svgRef.current
      if (!svg) return

      const rect = svg.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      const scaleRatio = newZoom / zoom
      const newPanX = mouseX - (mouseX - panX) * scaleRatio
      const newPanY = mouseY - (mouseY - panY) * scaleRatio

      onCanvasStateChange(newZoom, newPanX, newPanY)
    },
    [zoom, panX, panY, onCanvasStateChange, svgRef]
  )

  const startPanning = useCallback(
    (clientX: number, clientY: number) => {
      panState.current = {
        isPanning: true,
        startX: clientX,
        startY: clientY,
        startPanX: panX,
        startPanY: panY
      }
      setCursor('grabbing')
    },
    [panX, panY]
  )

  const updatePanning = useCallback(
    (clientX: number, clientY: number) => {
      if (!panState.current.isPanning) return
      const newPanX = panState.current.startPanX + (clientX - panState.current.startX)
      const newPanY = panState.current.startPanY + (clientY - panState.current.startY)
      onCanvasStateChange(zoom, newPanX, newPanY)
    },
    [zoom, onCanvasStateChange]
  )

  const endPanning = useCallback(() => {
    panState.current.isPanning = false
  }, [])

  return {
    spacePressed,
    setSpacePressed,
    cursor,
    setCursor,
    panState,
    handleWheel,
    startPanning,
    updatePanning,
    endPanning
  }
}
