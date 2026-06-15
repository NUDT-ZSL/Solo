import { useRef, useEffect, useState, useCallback } from 'react'
import type { HeatmapCell, MoodRecord } from '../MoodEngine'
import { WEATHER_CONFIG, getWeatherColor, getDaysInMonth, getFirstDayOfWeek } from '../MoodEngine'
import { useMoodStore } from '../store'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']
const CELL_SIZE_DESKTOP = 48
const CELL_GAP = 6
const PADDING = 16

interface HoverInfo {
  x: number
  y: number
  cell: HeatmapCell
  record?: MoodRecord
}

export default function WeatherHeatmap() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { records, currentYear, currentMonth, setCurrentMonth, openModal } = useMoodStore()
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })
  const animProgressRef = useRef(0)
  const animFrameRef = useRef(0)

  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDay = getFirstDayOfWeek(currentYear, currentMonth)
  const recordMap = new Map<string, MoodRecord>()
  records.forEach(r => recordMap.set(r.date, r))

  const cells: HeatmapCell[] = []
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const record = recordMap.get(dateStr)
    cells.push({
      date: dateStr,
      weather: record?.weather ?? null,
      intensity: record?.intensity ?? 0,
      hasRecord: !!record,
    })
  }

  const totalRows = Math.ceil((firstDay + daysInMonth) / 7)
  const totalCols = 7
  const cellSize = CELL_SIZE_DESKTOP
  const gridWidth = totalCols * (cellSize + CELL_GAP) - CELL_GAP + PADDING * 2
  const gridHeight = totalRows * (cellSize + CELL_GAP) - CELL_GAP + PADDING * 2 + 30

  const getCellRect = useCallback((cellIndex: number) => {
    const globalIndex = firstDay + cellIndex
    const col = globalIndex % 7
    const row = Math.floor(globalIndex / 7)
    return {
      x: PADDING + col * (cellSize + CELL_GAP),
      y: 30 + PADDING + row * (cellSize + CELL_GAP),
      w: cellSize,
      h: cellSize,
    }
  }, [firstDay, cellSize])

  const draw = useCallback((progress: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = gridWidth * dpr
    canvas.height = gridHeight * dpr
    canvas.style.width = `${gridWidth}px`
    canvas.style.height = `${gridHeight}px`
    ctx.scale(dpr, dpr)

    ctx.clearRect(0, 0, gridWidth, gridHeight)

    ctx.font = '12px "Noto Sans SC", sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.textAlign = 'center'
    for (let i = 0; i < 7; i++) {
      ctx.fillText(WEEKDAYS[i], PADDING + i * (cellSize + CELL_GAP) + cellSize / 2, 20 + PADDING / 2)
    }

    cells.forEach((cell, idx) => {
      const rect = getCellRect(idx)
      const p = Math.min(1, progress * (1 + idx * 0.02))
      const eased = 1 - Math.pow(1 - Math.min(1, p), 3)
      const scale = eased
      const alpha = eased

      ctx.save()
      ctx.globalAlpha = alpha
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2)
      ctx.scale(scale, scale)

      const radius = 10
      const color = cell.hasRecord ? getWeatherColor(cell.weather, cell.intensity) : 'rgba(255,255,255,0.06)'

      ctx.beginPath()
      ctx.roundRect(-rect.w / 2, -rect.h / 2, rect.w, rect.h, radius)
      ctx.fillStyle = color
      ctx.fill()

      if (cell.hasRecord) {
        const config = WEATHER_CONFIG[cell.weather!]
        ctx.font = '18px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(config.emoji, 0, -2)
      }

      ctx.font = '10px "Noto Sans SC", sans-serif'
      ctx.fillStyle = cell.hasRecord ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const dayNum = idx + 1
      if (!cell.hasRecord) {
        ctx.fillText(String(dayNum), 0, 0)
      } else {
        ctx.fillText(String(dayNum), 0, 14)
      }

      ctx.restore()
    })
  }, [cells, getCellRect, gridWidth, gridHeight, cellSize])

  useEffect(() => {
    animProgressRef.current = 0
    const animate = () => {
      animProgressRef.current += 0.04
      if (animProgressRef.current > 2) animProgressRef.current = 2
      draw(animProgressRef.current)
      if (animProgressRef.current < 2) {
        animFrameRef.current = requestAnimationFrame(animate)
      }
    }
    animFrameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [draw])

  useEffect(() => {
    setCanvasSize({ width: gridWidth, height: gridHeight })
  }, [gridWidth, gridHeight])

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    for (let i = 0; i < cells.length; i++) {
      const cellRect = getCellRect(i)
      if (
        x >= cellRect.x && x <= cellRect.x + cellRect.w &&
        y >= cellRect.y && y <= cellRect.y + cellRect.h
      ) {
        const record = recordMap.get(cells[i].date)
        setHoverInfo({ x, y, cell: cells[i], record })
        canvas.style.cursor = cells[i].hasRecord ? 'pointer' : 'default'
        return
      }
    }
    setHoverInfo(null)
    canvas.style.cursor = 'default'
  }

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!hoverInfo?.cell.hasRecord) return
    const record = recordMap.get(hoverInfo.cell.date)
    if (record) openModal(record)
  }

  const prevMonth = () => {
    const m = currentMonth === 0 ? 11 : currentMonth - 1
    const y = currentMonth === 0 ? currentYear - 1 : currentYear
    setCurrentMonth(y, m)
  }

  const nextMonth = () => {
    const m = currentMonth === 11 ? 0 : currentMonth + 1
    const y = currentMonth === 11 ? currentYear + 1 : currentYear
    setCurrentMonth(y, m)
  }

  const monthName = `${currentYear}年${currentMonth + 1}月`

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white/80">情绪气象图</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={prevMonth}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
          >
            ‹
          </button>
          <span className="text-sm text-white/70 min-w-[100px] text-center">{monthName}</span>
          <button
            onClick={nextMonth}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
          >
            ›
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative overflow-x-auto"
        style={{ width: '100%' }}
      >
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverInfo(null)}
          onClick={handleClick}
          style={{ width: canvasSize.width, height: canvasSize.height }}
        />

        {hoverInfo?.cell.hasRecord && hoverInfo.record && (
          <div
            className="absolute pointer-events-none z-10 px-3 py-2 rounded-lg text-xs"
            style={{
              left: Math.min(hoverInfo.x + 12, canvasSize.width - 160),
              top: hoverInfo.y - 60,
              background: 'rgba(30,30,50,0.95)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.8)',
            }}
          >
            <div className="flex items-center gap-1 mb-1">
              <span>{WEATHER_CONFIG[hoverInfo.cell.weather!].emoji}</span>
              <span>{WEATHER_CONFIG[hoverInfo.cell.weather!].label}</span>
              <span className="text-white/40 ml-2">{hoverInfo.cell.date}</span>
            </div>
            <div className="text-white/50 max-w-[150px] truncate">
              {hoverInfo.record.diary}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 mt-4 flex-wrap">
        {(['sunny', 'cloudy', 'rainy', 'snowy', 'stormy'] as const).map(w => {
          const cfg = WEATHER_CONFIG[w]
          return (
            <div key={w} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: cfg.color }} />
              <span className="text-xs text-white/40">{cfg.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
