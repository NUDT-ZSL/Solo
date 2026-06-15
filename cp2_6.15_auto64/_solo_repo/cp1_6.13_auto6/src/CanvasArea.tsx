import { useEffect, useRef, useState, useCallback } from 'react'
import type { Contour, DragMode } from './types'

interface CanvasAreaProps {
  imageSrc: string
  contours: Contour[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onContoursChange: (contours: Contour[]) => void
  onDetectStart?: () => void
  onDetectComplete?: (count: number) => void
}

const HANDLE_SIZE = 10
const MAX_FPS_INTERVAL = 16

function rectContainsRect(
  outer: Contour,
  inner: Contour,
  tolerance: number = 2
): boolean {
  return (
    inner.x >= outer.x - tolerance &&
    inner.y >= outer.y - tolerance &&
    inner.x + inner.width <= outer.x + outer.width + tolerance &&
    inner.y + inner.height <= outer.y + outer.height + tolerance
  )
}

export default function CanvasArea({
  imageSrc,
  contours,
  selectedId,
  onSelect,
  onContoursChange,
  onDetectStart,
  onDetectComplete
}: CanvasAreaProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })
  const [isImageLoaded, setIsImageLoaded] = useState(false)
  const [isDetecting, setIsDetecting] = useState(false)
  const [contourAppearAt, setContourAppearAt] = useState<number>(0)

  const rAFRef = useRef<number | null>(null)
  const lastFrameAt = useRef<number>(0)
  const pendingContoursRef = useRef<Contour[]>(contours)

  const dragState = useRef<{
    mode: DragMode
    contourId: string
    startX: number
    startY: number
    startContour: Contour | null
    lastContours: Contour[]
  }>({
    mode: null,
    contourId: '',
    startX: 0,
    startY: 0,
    startContour: null,
    lastContours: []
  })

  const imageToCanvas = useCallback(
    (x: number, y: number) => {
      return { x: x * scale, y: y * scale }
    },
    [scale]
  )

  const canvasToImage = useCallback(
    (x: number, y: number) => {
      return { x: x / scale, y: y / scale }
    },
    [scale]
  )

  const detectRectangles = useCallback(
    (img: HTMLImageElement): Contour[] => {
      const workCanvas = document.createElement('canvas')
      const maxDim = 1600
      let w = img.naturalWidth
      let h = img.naturalHeight
      const detectScale = Math.max(w, h) > maxDim ? maxDim / Math.max(w, h) : 1
      w = Math.round(w * detectScale)
      h = Math.round(h * detectScale)
      workCanvas.width = w
      workCanvas.height = h
      const ctx = workCanvas.getContext('2d', { willReadFrequently: true })!
      ctx.drawImage(img, 0, 0, w, h)

      const imageData = ctx.getImageData(0, 0, w, h)
      const pixels = imageData.data
      const gray = new Uint8ClampedArray(w * h)

      for (let i = 0; i < w * h; i++) {
        const idx = i * 4
        gray[i] = Math.round(
          0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2]
        )
      }

      const edges = new Uint8ClampedArray(w * h)
      const threshold = 30

      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const idx = y * w + x
          const tl = gray[idx - w - 1]
          const tc = gray[idx - w]
          const tr = gray[idx - w + 1]
          const cl = gray[idx - 1]
          const cr = gray[idx + 1]
          const bl = gray[idx + w - 1]
          const bc = gray[idx + w]
          const br = gray[idx + w + 1]

          const gx = -tl - 2 * cl - bl + tr + 2 * cr + br
          const gy = -tl - 2 * tc - tr + bl + 2 * bc + br
          const mag = Math.sqrt(gx * gx + gy * gy)
          edges[idx] = mag > threshold ? 255 : 0
        }
      }

      const minArea = Math.max(800, (w * h) / 1500)
      const maxArea = w * h * 0.98
      const minW = 25
      const minH = 25
      const results: Contour[] = []
      const mergedMask = new Uint8Array(w * h)

      const directions = [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1]
      ]

      for (let startY = 4; startY < h - 4; startY += 3) {
        for (let startX = 4; startX < w - 4; startX += 3) {
          const idx0 = startY * w + startX
          if (edges[idx0] === 0 || mergedMask[idx0] === 1) continue

          const stack: [number, number][] = [[startX, startY]]
          const component: [number, number][] = []
          edges[idx0] = 0

          while (stack.length > 0) {
            const [cx, cy] = stack.pop()!
            component.push([cx, cy])
            for (const [dx, dy] of directions) {
              const nx = cx + dx
              const ny = cy + dy
              if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue
              const nidx = ny * w + nx
              if (edges[nidx] === 255) {
                edges[nidx] = 0
                stack.push([nx, ny])
              }
            }
          }

          if (component.length < 15) continue

          let minX = Infinity,
            minY = Infinity,
            maxX = -Infinity,
            maxY = -Infinity
          for (const [px, py] of component) {
            if (px < minX) minX = px
            if (py < minY) minY = py
            if (px > maxX) maxX = px
            if (py > maxY) maxY = py
          }

          const bw = maxX - minX + 1
          const bh = maxY - minY + 1
          const area = bw * bh

          if (bw < minW || bh < minH) continue
          if (area < minArea || area > maxArea) continue

          let edgePoints = 0
          const perim = Math.max(2 * (bw + bh), 1)
          for (const [px, py] of component) {
            const onEdge =
              Math.abs(px - minX) < 3 ||
              Math.abs(px - maxX) < 3 ||
              Math.abs(py - minY) < 3 ||
              Math.abs(py - maxY) < 3
            if (onEdge) edgePoints++
          }
          const coverageRatio = component.length / Math.max(bw * bh, 1)
          const edgeRatio = edgePoints / perim

          if (coverageRatio > 0.4) continue
          if (edgeRatio < 0.25) continue

          const aspect = bw / Math.max(bh, 1)
          if (aspect > 50 || aspect < 0.02) continue

          const overlapThreshold = 0.7
          let shouldSkip = false
          for (let ri = results.length - 1; ri >= 0; ri--) {
            const existing = results[ri]
            const ex = existing.x / detectScale
            const ey = existing.y / detectScale
            const ew = existing.width / detectScale
            const eh = existing.height / detectScale

            const ix1 = Math.max(minX, ex)
            const iy1 = Math.max(minY, ey)
            const ix2 = Math.min(maxX, ew + ex)
            const iy2 = Math.min(maxY, eh + ey)
            const iw = Math.max(0, ix2 - ix1)
            const ih = Math.max(0, iy2 - iy1)
            const intersection = iw * ih

            const union = bw * bh + ew * eh - intersection
            const iou = intersection / Math.max(union, 1)

            const smaller = Math.min(bw * bh, ew * eh)
            const overlapSmaller = intersection / Math.max(smaller, 1)

            if (iou > overlapThreshold || overlapSmaller > 0.85) {
              if (bw * bh < ew * eh) {
                shouldSkip = true
              } else {
                results.splice(ri, 1)
              }
              break
            }
          }

          if (shouldSkip) continue

          for (let yy = minY; yy <= maxY; yy++) {
            for (let xx = minX; xx <= maxX; xx++) {
              mergedMask[yy * w + xx] = 1
            }
          }

          results.push({
            id: `contour-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            x: minX / detectScale,
            y: minY / detectScale,
            width: bw / detectScale,
            height: bh / detectScale,
            parentId: null,
            depth: 0
          })
        }
      }

      results.sort((a, b) => {
        return b.width * b.height - a.width * a.height
      })

      return results
    },
    []
  )

  const loadAndDetect = useCallback(() => {
    if (!imageSrc) return
    setIsDetecting(true)
    onDetectStart?.()

    const img = new Image()
    img.onload = () => {
      imageRef.current = img
      setIsImageLoaded(true)

      setTimeout(() => {
        const detected = detectRectangles(img)
        pendingContoursRef.current = detected
        onContoursChange(detected)
        setContourAppearAt(performance.now())
        setIsDetecting(false)
        onDetectComplete?.(detected.length)
      }, 20)
    }
    img.onerror = () => {
      setIsDetecting(false)
      console.error('图片加载失败')
    }
    img.src = imageSrc
  }, [imageSrc, detectRectangles, onContoursChange, onDetectStart, onDetectComplete])

  useEffect(() => {
    loadAndDetect()
  }, [loadAndDetect])

  useEffect(() => {
    pendingContoursRef.current = contours
  }, [contours])

  useEffect(() => {
    if (!imageRef.current || !containerRef.current) return

    const updateSize = () => {
      const img = imageRef.current!
      const containerWidth = containerRef.current!.clientWidth
      const imgAspect = img.naturalWidth / img.naturalHeight
      let displayWidth = containerWidth
      let displayHeight = containerWidth / imgAspect
      const maxHeight = 750
      if (displayHeight > maxHeight) {
        displayHeight = maxHeight
        displayWidth = maxHeight * imgAspect
      }
      setCanvasSize({ width: displayWidth, height: displayHeight })
      setScale(displayWidth / img.naturalWidth)
    }

    updateSize()
    const ro = new ResizeObserver(updateSize)
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [isImageLoaded])

  const render = useCallback(() => {
    const canvas = canvasRef.current
    const img = imageRef.current
    if (!canvas || !img || canvasSize.width === 0) return

    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    if (
      canvas.width !== Math.round(canvasSize.width * dpr) ||
      canvas.height !== Math.round(canvasSize.height * dpr)
    ) {
      canvas.width = Math.round(canvasSize.width * dpr)
      canvas.height = Math.round(canvasSize.height * dpr)
    }
    canvas.style.width = `${canvasSize.width}px`
    canvas.style.height = `${canvasSize.height}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height)

    ctx.imageSmoothingEnabled = true
    ctx.drawImage(img, 0, 0, canvasSize.width, canvasSize.height)

    const now = performance.now()
    const elapsed = now - contourAppearAt
    const appearProgress = contourAppearAt === 0 ? 1 : Math.min(1, elapsed / 200)
    const appearEase = 1 - Math.pow(1 - appearProgress, 3)

    const activeContours = pendingContoursRef.current
    const sorted = [...activeContours].sort(
      (a, b) => (a.depth || 0) - (b.depth || 0)
    )

    for (const contour of sorted) {
      if (contour.id === selectedId) continue
      const p = imageToCanvas(contour.x, contour.y)
      const w = contour.width * scale
      const h = contour.height * scale
      const alpha = 0.45 * appearEase

      ctx.save()
      ctx.strokeStyle = `rgba(59, 130, 246, ${alpha + 0.25})`
      ctx.lineWidth = 1.5
      ctx.setLineDash([6, 4])
      ctx.lineDashOffset = -(elapsed / 40) % 20
      ctx.strokeRect(
        Math.round(p.x) + 0.5,
        Math.round(p.y) + 0.5,
        Math.round(w),
        Math.round(h)
      )
      ctx.fillStyle = `rgba(59, 130, 246, ${0.08 * appearEase})`
      ctx.fillRect(
        Math.round(p.x) + 0.5,
        Math.round(p.y) + 0.5,
        Math.round(w),
        Math.round(h)
      )
      ctx.restore()
    }

    const selected = activeContours.find((c) => c.id === selectedId)
    if (selected) {
      const p = imageToCanvas(selected.x, selected.y)
      const w = selected.width * scale
      const h = selected.height * scale

      ctx.save()
      ctx.strokeStyle = '#f97316'
      ctx.lineWidth = 2.5
      ctx.setLineDash([])
      ctx.shadowColor = 'rgba(249, 115, 22, 0.5)'
      ctx.shadowBlur = 8
      ctx.strokeRect(
        Math.round(p.x) + 0.5,
        Math.round(p.y) + 0.5,
        Math.round(w),
        Math.round(h)
      )
      ctx.shadowBlur = 0
      ctx.fillStyle = 'rgba(249, 115, 22, 0.12)'
      ctx.fillRect(
        Math.round(p.x) + 0.5,
        Math.round(p.y) + 0.5,
        Math.round(w),
        Math.round(h)
      )
      ctx.restore()

      ctx.save()
      ctx.fillStyle = '#f97316'
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      const handleX = p.x + w - HANDLE_SIZE / 2
      const handleY = p.y + h - HANDLE_SIZE / 2
      ctx.fillRect(handleX, handleY, HANDLE_SIZE, HANDLE_SIZE)
      ctx.strokeRect(handleX + 0.5, handleY + 0.5, HANDLE_SIZE - 1, HANDLE_SIZE - 1)
      ctx.restore()

      ctx.save()
      ctx.font = '11px Consolas, Monaco, monospace'
      const label = `${Math.round(selected.width)} × ${Math.round(selected.height)}`
      const metrics = ctx.measureText(label)
      const labelPadX = 6
      const labelPadY = 3
      const labelW = metrics.width + labelPadX * 2
      const labelH = 16
      const labelX = Math.max(4, Math.min(p.x, canvasSize.width - labelW - 4))
      const labelY = p.y - labelH - 6 < 4 ? p.y + h + 6 : p.y - labelH - 6
      ctx.fillStyle = 'rgba(249, 115, 22, 0.95)'
      ctx.beginPath()
      ;(ctx as any).roundRect(labelX, labelY, labelW, labelH, 4)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.textBaseline = 'middle'
      ctx.fillText(label, labelX + labelPadX, labelY + labelH / 2)
      ctx.restore()
    }
  }, [selectedId, scale, canvasSize, imageToCanvas, contourAppearAt])

  useEffect(() => {
    let mounted = true

    function frame(ts: number) {
      if (!mounted) return
      render()
      rAFRef.current = requestAnimationFrame(frame)
    }
    rAFRef.current = requestAnimationFrame(frame)
    return () => {
      mounted = false
      if (rAFRef.current) cancelAnimationFrame(rAFRef.current)
    }
  }, [render])

  const getMousePos = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    }
  }

  const hitTestHandle = (mouseX: number, mouseY: number, contour: Contour) => {
    const p = imageToCanvas(contour.x, contour.y)
    const w = contour.width * scale
    const h = contour.height * scale
    const hx = p.x + w - HANDLE_SIZE
    const hy = p.y + h - HANDLE_SIZE
    return (
      mouseX >= hx - 3 &&
      mouseX <= hx + HANDLE_SIZE + 3 &&
      mouseY >= hy - 3 &&
      mouseY <= hy + HANDLE_SIZE + 3
    )
  }

  const hitTestContour = (mouseX: number, mouseY: number, contour: Contour) => {
    const p = imageToCanvas(contour.x, contour.y)
    const w = contour.width * scale
    const h = contour.height * scale
    return (
      mouseX >= p.x && mouseX <= p.x + w && mouseY >= p.y && mouseY <= p.y + h
    )
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    const pos = getMousePos(e.clientX, e.clientY)

    const selected = contours.find((c) => c.id === selectedId)
    if (selected && hitTestHandle(pos.x, pos.y, selected)) {
      dragState.current = {
        mode: 'resize',
        contourId: selected.id,
        startX: pos.x,
        startY: pos.y,
        startContour: { ...selected },
        lastContours: contours
      }
      e.preventDefault()
      return
    }

    const hitOrder = [...contours].sort((a, b) => {
      const aDepth = contours.filter(
        (c) => c.id !== a.id && rectContainsRect(c, a)
      ).length
      const bDepth = contours.filter(
        (c) => c.id !== b.id && rectContainsRect(c, b)
      ).length
      if (bDepth - aDepth !== 0) return bDepth - aDepth
      return a.width * a.height - b.width * b.height
    })

    for (const c of hitOrder) {
      if (hitTestContour(pos.x, pos.y, c)) {
        dragState.current = {
          mode: 'move',
          contourId: c.id,
          startX: pos.x,
          startY: pos.y,
          startContour: { ...c },
          lastContours: contours
        }
        onSelect(c.id)
        e.preventDefault()
        return
      }
    }

    onSelect(null)
  }

  const throttleApply = useCallback(
    (e: MouseEvent) => {
      if (!dragState.current.mode || !dragState.current.startContour) return

      const now = performance.now()
      if (now - lastFrameAt.current < MAX_FPS_INTERVAL) return
      lastFrameAt.current = now

      const pos = getMousePos(e.clientX, e.clientY)

      const dxCanvas = pos.x - dragState.current.startX
      const dyCanvas = pos.y - dragState.current.startY
      const start = dragState.current.startContour!
      const id = dragState.current.contourId
      const currentContours = dragState.current.lastContours

      let next: Contour[]
      if (dragState.current.mode === 'move') {
        const { x: dxImg, y: dyImg } = canvasToImage(dxCanvas, dyCanvas)
        next = currentContours.map((c) =>
          c.id === id
            ? {
                ...c,
                x: Math.max(0, Math.round((start.x + dxImg) * 10) / 10),
                y: Math.max(0, Math.round((start.y + dyImg) * 10) / 10)
              }
            : c
        )
      } else if (dragState.current.mode === 'resize') {
        const { x: dxImg, y: dyImg } = canvasToImage(dxCanvas, dyCanvas)
        const newW = Math.max(10, Math.round((start.width + dxImg) * 10) / 10)
        const newH = Math.max(10, Math.round((start.height + dyImg) * 10) / 10)
        next = currentContours.map((c) =>
          c.id === id ? { ...c, width: newW, height: newH } : c
        )
      } else {
        return
      }

      pendingContoursRef.current = next
      onContoursChange(next)
    },
    [canvasToImage, onContoursChange]
  )

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      throttleApply(e)
    },
    [throttleApply]
  )

  const handleMouseUp = useCallback(() => {
    dragState.current.mode = null
    dragState.current.startContour = null
  }, [])

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        const target = e.target as HTMLElement
        if (
          target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable)
        ) {
          return
        }
        const next = contours.filter((c) => c.id !== selectedId)
        pendingContoursRef.current = next
        onContoursChange(next)
        onSelect(null)
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [selectedId, contours, onContoursChange, onSelect])

  return (
    <div className="canvas-container fade-in">
      <div className="canvas-toolbar">
        <span className="canvas-info">
          检测到 {contours.length} 个矩形轮廓 ·
          {selectedId
            ? ` 已选中 (拖拽移动 / 右下角缩放 / Delete删除)`
            : ' 点击轮廓进行选择（重叠区域优先选中较小的）'}
        </span>
      </div>
      <div className="canvas-stage" ref={containerRef}>
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          style={{
            width: canvasSize.width || '100%',
            height: canvasSize.height || 'auto',
            cursor: dragState.current.mode
              ? dragState.current.mode === 'resize'
                ? 'nwse-resize'
                : 'move'
              : 'default',
            transition: 'none'
          }}
        />
        {isDetecting && (
          <div className="loading-overlay">
            <div className="spinner"></div>
            <div className="loading-text">正在分析图片并检测轮廓...</div>
          </div>
        )}
      </div>
    </div>
  )
}
