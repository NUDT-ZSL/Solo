import { useState, useEffect, useRef, useCallback } from 'react'
import { store, type Screenshot, type FixationPoint } from './store'
import { HeatmapRenderer } from './heatmap-module'
import { SaccadeRenderer } from './saccade-module'
import { UIControl } from './ui-control'

const SCREENSHOT_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
]

interface AppState {
  screenshots: Screenshot[]
  currentId: string | null
  heatmapParams: ReturnType<typeof store.getHeatmapParams>
  saccadeParams: ReturnType<typeof store.getSaccadeParams>
  chartParams: ReturnType<typeof store.getChartParams>
}

export default function App() {
  const [state, setState] = useState<AppState>(() => ({
    screenshots: store.getScreenshots(),
    currentId: store.getCurrentScreenshotId(),
    heatmapParams: store.getHeatmapParams(),
    saccadeParams: store.getSaccadeParams(),
    chartParams: store.getChartParams()
  }))
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isNarrow, setIsNarrow] = useState(false)

  const previewRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const heatmapCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const saccadeCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const heatmapRendererRef = useRef<HeatmapRenderer | null>(null)
  const saccadeRendererRef = useRef<SaccadeRenderer | null>(null)
  const imageFileInputRef = useRef<HTMLInputElement>(null)
  const csvFileInputRef = useRef<HTMLInputElement>(null)
  const pendingImageRef = useRef<{ url: string; name: string; width: number; height: number; imgEl: HTMLImageElement } | null>(null)

  const currentScreenshot = state.screenshots.find(s => s.id === state.currentId) || null

  useEffect(() => {
    const checkWidth = () => setIsNarrow(window.innerWidth < 900)
    checkWidth()
    window.addEventListener('resize', checkWidth)
    return () => window.removeEventListener('resize', checkWidth)
  }, [])

  useEffect(() => {
    const unsubscribe = store.on('store:updated', () => {
      setState({
        screenshots: store.getScreenshots(),
        currentId: store.getCurrentScreenshotId(),
        heatmapParams: store.getHeatmapParams(),
        saccadeParams: store.getSaccadeParams(),
        chartParams: store.getChartParams()
      })
    })
    return unsubscribe
  }, [])

  const renderLayers = useCallback(() => {
    if (!currentScreenshot || !imageRef.current || !previewRef.current) return

    const img = imageRef.current
    const displayWidth = img.clientWidth
    const displayHeight = img.clientHeight

    if (displayWidth === 0 || displayHeight === 0) return

    if (!heatmapRendererRef.current) {
      heatmapRendererRef.current = new HeatmapRenderer(displayWidth, displayHeight)
    }
    if (!saccadeRendererRef.current) {
      saccadeRendererRef.current = new SaccadeRenderer(displayWidth, displayHeight)
    }

    const heatmapCanvas = heatmapRendererRef.current.render(
      currentScreenshot.fixations,
      state.heatmapParams,
      currentScreenshot.width,
      currentScreenshot.height,
      displayWidth,
      displayHeight
    )
    if (heatmapCanvasRef.current) {
      const hctx = heatmapCanvasRef.current.getContext('2d')
      heatmapCanvasRef.current.width = displayWidth
      heatmapCanvasRef.current.height = displayHeight
      if (hctx) {
        hctx.clearRect(0, 0, displayWidth, displayHeight)
        hctx.drawImage(heatmapCanvas, 0, 0)
      }
    }

    const saccadeCanvas = saccadeRendererRef.current.render(
      currentScreenshot.fixations,
      state.saccadeParams,
      currentScreenshot.width,
      currentScreenshot.height,
      displayWidth,
      displayHeight
    )
    if (saccadeCanvasRef.current) {
      const sctx = saccadeCanvasRef.current.getContext('2d')
      saccadeCanvasRef.current.width = displayWidth
      saccadeCanvasRef.current.height = displayHeight
      if (sctx) {
        sctx.clearRect(0, 0, displayWidth, displayHeight)
        sctx.drawImage(saccadeCanvas, 0, 0)
      }
    }
  }, [currentScreenshot, state.heatmapParams, state.saccadeParams])

  useEffect(() => {
    const timer = setTimeout(() => renderLayers(), 16)
    return () => clearTimeout(timer)
  }, [renderLayers])

  useEffect(() => {
    window.addEventListener('resize', renderLayers)
    return () => window.removeEventListener('resize', renderLayers)
  }, [renderLayers])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert('请上传有效的图片文件 (PNG/JPG/WebP)')
      return
    }

    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      pendingImageRef.current = {
        url,
        name: file.name,
        width: img.width,
        height: img.height,
        imgEl: img
      }
      csvFileInputRef.current?.click()
    }
    img.src = url
    e.target.value = ''
  }

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const pending = pendingImageRef.current
    pendingImageRef.current = null

    if (!pending) {
      e.target.value = ''
      return
    }

    if (!file || !file.name.toLowerCase().endsWith('.csv')) {
      URL.revokeObjectURL(pending.url)
      alert('请上传对应的CSV眼动数据文件')
      e.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = (ev) => {
      const csvText = ev.target?.result as string
      const fixations = store.parseCSV(csvText)
      if (fixations.length === 0) {
        URL.revokeObjectURL(pending.url)
        alert('CSV文件格式错误或为空，请确保包含列：timestamp, x, y, fixation_duration_ms')
        return
      }

      const imgEl = new Image()
      imgEl.src = pending.url
      imgEl.onload = () => {
        store.addScreenshot({
          name: pending.name,
          imageUrl: pending.url,
          imageElement: imgEl,
          width: pending.width,
          height: pending.height,
          fixations
        })
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function shadeColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16)
    let r = (num >> 16) + percent
    let g = ((num >> 8) & 0xff) + percent
    let b = (num & 0xff) + percent
    r = Math.max(0, Math.min(255, r))
    g = Math.max(0, Math.min(255, g))
    b = Math.max(0, Math.min(255, b))
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')
  }

  function hexWithAlpha(hex: string, alpha: number): string {
    const num = parseInt(hex.replace('#', ''), 16)
    const r = (num >> 16) & 0xff
    const g = ((num >> 8) & 0xff)
    const b = num & 0xff
    const a = Math.max(0, Math.min(1, alpha))
    return `rgba(${r},${g},${b},${a})`
  }

  function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    const radius = Math.min(r, w / 2, h / 2)
    ctx.beginPath()
    ctx.moveTo(x + radius, y)
    ctx.lineTo(x + w - radius, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
    ctx.lineTo(x + w, y + h - radius)
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
    ctx.lineTo(x + radius, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
    ctx.lineTo(x, y + radius)
    ctx.quadraticCurveTo(x, y, x + radius, y)
    ctx.closePath()
  }

  function calculateNiceScale(min: number, max: number, maxTicks: number) {
    const rawRange = max - min
    if (rawRange <= 0) {
      return { min: 0, max: Math.max(1, max), step: Math.max(1, max / maxTicks), steps: maxTicks }
    }
    const range = niceNumber(rawRange, false)
    const step = niceNumber(range / (maxTicks - 1), true)
    const niceMin = Math.floor(min / step) * step
    const niceMax = Math.ceil(max / step) * step
    const steps = Math.round((niceMax - niceMin) / step)
    return { min: niceMin, max: niceMax, step, steps }
  }

  function niceNumber(range: number, round: boolean): number {
    const exp = Math.floor(Math.log10(range))
    const frac = range / Math.pow(10, exp)
    let niceFrac: number
    if (round) {
      if (frac < 1.5) niceFrac = 1
      else if (frac < 3) niceFrac = 2
      else if (frac < 7) niceFrac = 5
      else niceFrac = 10
    } else {
      if (frac <= 1) niceFrac = 1
      else if (frac <= 2) niceFrac = 2
      else if (frac <= 5) niceFrac = 5
      else niceFrac = 10
    }
    return niceFrac * Math.pow(10, exp)
  }

  const chartCanvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = chartCanvasRef.current
    if (!canvas) return

    const resizeCanvas = () => {
      const container = canvas.parentElement
      if (!container) return
      const rect = container.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = 180 * dpr
      canvas.style.width = `${rect.width}px`
      canvas.style.height = '180px'
      const ctx = canvas.getContext('2d')!
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      drawChart()
    }

    const drawChart = () => {
      if (!canvas) return
      const displayW = parseFloat(canvas.style.width) || canvas.width
      canvas.getContext('2d')!.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0)
      const ctx = canvas.getContext('2d')!
      ctx.clearRect(0, 0, displayW, 180)
      if (state.chartParams.mode === 'bar') {
        renderBarChartImpl(displayW, 180)
      } else {
        renderStackedTimelineImpl(displayW, 180)
      }
    }

    const renderBarChartImpl = (w: number, h: number) => {
      const ctx = canvas!.getContext('2d')!
      const fixations = currentScreenshot?.fixations || []
      if (fixations.length === 0) return

      const padding = { top: 20, right: 12, bottom: 30, left: 42 }
      const chartW = w - padding.left - padding.right
      const chartH = h - padding.top - padding.bottom

      const maxDuration = Math.max(...fixations.map(f => f.duration))
      const barWidth = Math.max(2, (chartW / fixations.length) * 0.7)
      const gap = (chartW / fixations.length) * 0.3
      const color = SCREENSHOT_COLORS[0]

      ctx.fillStyle = '#F8FAFC'
      ctx.fillRect(padding.left, padding.top, chartW, chartH)

      ctx.strokeStyle = '#E2E8F0'
      ctx.lineWidth = 1
      for (let i = 0; i <= 4; i++) {
        const y = padding.top + (chartH / 4) * i
        ctx.beginPath()
        ctx.moveTo(padding.left, y)
        ctx.lineTo(padding.left + chartW, y)
        ctx.stroke()
        ctx.fillStyle = '#94A3B8'
        ctx.font = '10px Arial'
        ctx.textAlign = 'right'
        ctx.textBaseline = 'middle'
        ctx.fillText(`${Math.round(maxDuration * (1 - i / 4))}`, padding.left - 6, y)
      }

      fixations.forEach((f, i) => {
        const x = padding.left + i * (barWidth + gap) + gap / 2
        const barH = (f.duration / maxDuration) * chartH
        const y = padding.top + chartH - barH
        const gradient = ctx.createLinearGradient(x, y, x, y + barH)
        gradient.addColorStop(0, color)
        gradient.addColorStop(1, shadeColor(color, -30))
        ctx.fillStyle = gradient
        roundRect(ctx, x, y, barWidth, barH, 2)
        ctx.fill()
      })

      ctx.fillStyle = '#64748B'
      ctx.font = '10px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('注视点序号', padding.left + chartW / 2, h - 8)
      ctx.save()
      ctx.translate(12, padding.top + chartH / 2)
      ctx.rotate(-Math.PI / 2)
      ctx.fillText('持续时间 (ms)', 0, 0)
      ctx.restore()
    }

    const renderStackedTimelineImpl = (w: number, h: number) => {
      const ctx = canvas!.getContext('2d')!
      const validShots = state.screenshots.filter(s => s.fixations.length > 0)
      if (validShots.length === 0) return

      const padding = { top: 18, right: 12, bottom: 30, left: 72 }
      const chartW = w - padding.left - padding.right

      const normalizedShots = validShots.map(s => {
        if (s.fixations.length === 0) return { shot: s, startTs: 0, relativeFixations: [] as any[] }
        const startTs = s.fixations[0].timestamp
        const relativeFixations = s.fixations.map(f => ({
          ...f,
          relTs: f.timestamp - startTs,
          relEndTs: f.timestamp - startTs + f.duration
        }))
        const shotMaxEnd = Math.max(...relativeFixations.map(f => f.relEndTs))
        return { shot: s, startTs, relativeFixations, shotMaxEnd }
      })

      let globalMaxRelEnd = 0
      let globalMaxDuration = 0
      normalizedShots.forEach(ns => {
        if (ns.shotMaxEnd > globalMaxRelEnd) globalMaxRelEnd = ns.shotMaxEnd
        ns.relativeFixations.forEach(f => {
          if (f.duration > globalMaxDuration) globalMaxDuration = f.duration
        })
      })
      if (globalMaxRelEnd === 0) return

      const niceTimeRange = calculateNiceScale(0, globalMaxRelEnd, 5)
      const maxRange = niceTimeRange.max

      const rowH = Math.max(16, Math.min(36, (h - padding.top - padding.bottom) / Math.max(validShots.length, 1) - 6))
      const rowGap = 6

      normalizedShots.forEach((ns, rowIdx) => {
        const { shot, relativeFixations } = ns
        const color = SCREENSHOT_COLORS[rowIdx % SCREENSHOT_COLORS.length]
        const rowY = padding.top + rowIdx * (rowH + rowGap)
        const isCurrent = shot.id === state.currentId

        ctx.fillStyle = isCurrent ? '#EFF6FF' : '#F8FAFC'
        ctx.fillRect(padding.left, rowY - 2, chartW, rowH + 4)

        ctx.fillStyle = isCurrent ? '#3B82F6' : '#64748B'
        ctx.font = `${isCurrent ? 'bold ' : ''}11px Arial`
        ctx.textAlign = 'right'
        ctx.textBaseline = 'middle'
        const label = shot.name.length > 10 ? shot.name.slice(0, 10) + '…' : shot.name
        ctx.fillText(label, padding.left - 6, rowY + rowH / 2)

        relativeFixations.forEach(f => {
          const normX = Math.min(1, Math.max(0, f.relTs / maxRange))
          const normDur = Math.min(1 - normX, Math.max(0, f.duration / maxRange))
          const x = padding.left + normX * chartW
          const durW = Math.max(2, normDur * chartW)
          const durAlpha = globalMaxDuration > 0
            ? 0.35 + (f.duration / globalMaxDuration) * 0.65
            : 0.6
          const gradient = ctx.createLinearGradient(x, rowY, x, rowY + rowH)
          gradient.addColorStop(0, hexWithAlpha(color, durAlpha + 0.1))
          gradient.addColorStop(0.5, hexWithAlpha(color, durAlpha))
          gradient.addColorStop(1, hexWithAlpha(shadeColor(color, -25), durAlpha))
          ctx.fillStyle = gradient
          roundRect(ctx, x, rowY, Math.min(durW, chartW - (x - padding.left)), rowH, 2)
          ctx.fill()
          if (isCurrent && durW > 14) {
            ctx.fillStyle = '#FFFFFF'
            ctx.font = '9px Arial'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(`${Math.round(f.duration)}`, x + durW / 2, rowY + rowH / 2)
          }
        })
      })

      ctx.strokeStyle = '#E2E8F0'
      ctx.lineWidth = 1
      const tickCount = niceTimeRange.steps
      for (let i = 0; i <= tickCount; i++) {
        const tickValue = niceTimeRange.min + (niceTimeRange.step * i)
        const tickRatio = Math.min(1, tickValue / maxRange)
        const x = padding.left + tickRatio * chartW
        ctx.beginPath()
        ctx.moveTo(x, padding.top - 4)
        ctx.lineTo(x, padding.top + validShots.length * (rowH + rowGap))
        ctx.stroke()
        ctx.fillStyle = '#94A3B8'
        ctx.font = '9px Arial'
        ctx.textAlign = 'center'
        const label = tickValue >= 1000
          ? `${(tickValue / 1000).toFixed(tickValue >= 10000 ? 0 : 1)}s`
          : `${Math.round(tickValue)}ms`
        ctx.fillText(label, x, h - 12)
      }
      ctx.fillStyle = '#64748B'
      ctx.font = '10px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('时间轴 (各自归一化起始对齐)', padding.left + chartW / 2, h - 2)
    }

    resizeCanvas()
    drawChart()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [state.screenshots, state.currentId, state.chartParams.mode, currentScreenshot])

  const ScreenshotSidebar = () => (
    <div style={{
      width: 250,
      height: '100%',
      background: '#F1F5F9',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      flexShrink: 0
    }}>
      <div style={{
        padding: '14px 16px',
        borderBottom: '1px solid #E2E8F0',
        background: '#FFFFFF'
      }}>
        <div style={{
          fontSize: 15,
          fontWeight: 700,
          color: '#1E293B',
          marginBottom: 4
        }}>
          📷 截图列表
        </div>
        <div style={{ fontSize: 11, color: '#94A3B8' }}>
          {state.screenshots.length}/10 张截图
        </div>
      </div>

      <div style={{
        padding: 12,
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }}>
        {state.screenshots.map((s, idx) => (
          <div
            key={s.id}
            onClick={() => {
              store.switchScreenshot(s.id)
              if (isNarrow) setSidebarOpen(false)
            }}
            style={{
              cursor: 'pointer',
              borderRadius: 8,
              padding: 8,
              background: s.id === state.currentId ? '#FFFFFF' : 'transparent',
              border: s.id === state.currentId ? '2px solid #3B82F6' : '2px solid transparent',
              boxShadow: s.id === state.currentId ? '0 2px 8px rgba(59,130,246,0.15)' : 'none',
              transition: 'all 0.2s ease',
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start'
            }}
          >
            <div style={{
              width: 80,
              height: 50,
              borderRadius: 4,
              overflow: 'hidden',
              background: '#E2E8F0',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <img
                src={s.imageUrl}
                alt={s.name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
                draggable={false}
              />
            </div>
            <div style={{
              flex: 1,
              minWidth: 0
            }}>
              <div style={{
                fontSize: 12,
                fontWeight: s.id === state.currentId ? 600 : 500,
                color: s.id === state.currentId ? '#3B82F6' : '#334155',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                marginBottom: 4
              }}>
                {idx + 1}. {s.name}
              </div>
              <div style={{
                fontSize: 10,
                color: '#94A3B8'
              }}>
                {s.width}×{s.height} · {s.fixations.length}个注视点
              </div>
            </div>
          </div>
        ))}

        {state.screenshots.length === 0 && (
          <div style={{
            padding: 32,
            textAlign: 'center',
            color: '#94A3B8',
            fontSize: 12,
            lineHeight: 1.8
          }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🖼️</div>
            暂无截图<br />
            点击下方「上传截图+CSV」按钮添加
          </div>
        )}
      </div>

      <div style={{
        padding: 12,
        borderTop: '1px solid #E2E8F0',
        background: '#FFFFFF'
      }}>
        <button
          onClick={() => imageFileInputRef.current?.click()}
          disabled={state.screenshots.length >= 10}
          style={{
            width: '100%',
            padding: '10px 14px',
            border: 'none',
            borderRadius: 6,
            background: state.screenshots.length >= 10 ? '#CBD5E1' : 'linear-gradient(135deg, #3B82F6, #2563EB)',
            color: '#FFFFFF',
            fontSize: 13,
            fontWeight: 600,
            cursor: state.screenshots.length >= 10 ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: state.screenshots.length >= 10 ? 'none' : '0 2px 8px rgba(59,130,246,0.3)'
          }}
          onMouseEnter={(e) => {
            if (state.screenshots.length < 10) {
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(59,130,246,0.4)'
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = state.screenshots.length >= 10 ? 'none' : '0 2px 8px rgba(59,130,246,0.3)'
          }}
        >
          ⬆️ 上传截图+CSV
        </button>
      </div>
    </div>
  )

  const showSidebar = !isNarrow || sidebarOpen

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      background: '#0F172A',
      position: 'relative'
    }}>
      <input
        ref={imageFileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        onChange={handleImageUpload}
        style={{ display: 'none' }}
      />
      <input
        ref={csvFileInputRef}
        type="file"
        accept=".csv"
        onChange={handleCSVUpload}
        style={{ display: 'none' }}
      />

      <div style={{
        position: 'absolute',
        zIndex: 100,
        transition: 'transform 0.3s ease',
        transform: showSidebar ? 'translateX(0)' : 'translateX(-100%)',
        height: '100%',
        boxShadow: isNarrow && sidebarOpen ? '4px 0 20px rgba(0,0,0,0.3)' : 'none'
      }}>
        <ScreenshotSidebar />
      </div>

      {isNarrow && (
        <>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              position: 'absolute',
              top: 16,
              left: 16,
              zIndex: 101,
              width: 40,
              height: 40,
              borderRadius: 8,
              background: sidebarOpen ? 'rgba(59,130,246,0.9)' : 'rgba(255,255,255,0.9)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              color: sidebarOpen ? '#FFFFFF' : '#334155',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
            }}
          >
            {sidebarOpen ? '✕' : '☰'}
          </button>
          {sidebarOpen && (
            <div
              onClick={() => setSidebarOpen(false)}
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0,0,0,0.4)',
                zIndex: 99
              }}
            />
          )}
        </>
      )}

      <div
        ref={previewRef}
        style={{
          flex: 1,
          background: '#1E1E1E',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          paddingLeft: isNarrow ? 0 : 250,
          transition: 'padding-left 0.3s ease',
          minWidth: 0
        }}
      >
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          overflow: 'auto',
          position: 'relative',
          minHeight: 0
        }}>
          {!currentScreenshot ? (
            <div style={{
              textAlign: 'center',
              color: '#94A3B8',
              padding: 60
            }}>
              <div style={{ fontSize: 64, marginBottom: 20 }}>👁️</div>
              <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 12, color: '#E2E8F0' }}>
                眼动热力图分析工具
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.8, maxWidth: 420, margin: '0 auto' }}>
                请上传屏幕截图和对应的眼动CSV数据文件开始分析。<br />
                <span style={{ color: '#64748B', fontSize: 12 }}>
                  CSV需包含列: timestamp, x, y, fixation_duration_ms
                </span>
              </div>
              <button
                onClick={() => imageFileInputRef.current?.click()}
                style={{
                  marginTop: 32,
                  padding: '12px 28px',
                  border: 'none',
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                  color: '#FFFFFF',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(59,130,246,0.4)',
                  transition: 'all 0.2s ease'
                }}
              >
                🚀 立即开始
              </button>
            </div>
          ) : (
            <div style={{
              position: 'relative',
              display: 'inline-block',
              border: '4px solid #FFFFFF',
              borderRadius: 4,
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              maxWidth: '80vw',
              maxHeight: '80vh',
              overflow: 'hidden'
            }}>
              <img
                ref={imageRef}
                src={currentScreenshot.imageUrl}
                alt={currentScreenshot.name}
                onLoad={renderLayers}
                style={{
                  display: 'block',
                  maxWidth: '80vw',
                  maxHeight: '80vh',
                  width: 'auto',
                  height: 'auto',
                  userSelect: 'none'
                }}
                draggable={false}
              />
              <canvas
                ref={(el) => { heatmapCanvasRef.current = el; if (el && currentScreenshot) setTimeout(renderLayers, 50) }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none'
                }}
              />
              <canvas
                ref={(el) => { saccadeCanvasRef.current = el; if (el && currentScreenshot) setTimeout(renderLayers, 60) }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none'
                }}
              />
            </div>
          )}
        </div>

        <div style={{
          background: '#FFFFFF',
          borderTop: '1px solid #E2E8F0',
          padding: '14px 24px 18px 24px',
          minHeight: 220,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 10
          }}>
            <div style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#334155'
            }}>
              📊 注视持续时间统计
              {currentScreenshot && (
                <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 400, marginLeft: 10 }}>
                  {currentScreenshot.name} · 共 {currentScreenshot.fixations.length} 个注视点
                  {state.chartParams.mode === 'stackedTimeline' && state.screenshots.length > 0 && (
                    ` · 对比 ${state.screenshots.filter(s => s.fixations.length > 0).length} 张截图`
                  )}
                </span>
              )}
            </div>
            <div style={{
              fontSize: 11,
              color: '#94A3B8',
              padding: '3px 8px',
              background: '#F1F5F9',
              borderRadius: 4
            }}>
              {state.chartParams.mode === 'bar' ? '柱状图模式' : '堆叠时间线模式'}
            </div>
          </div>
          <div style={{
            flex: 1,
            width: '100%',
            position: 'relative'
          }}>
            <canvas
              ref={chartCanvasRef}
              style={{
                width: '100%',
                height: 180,
                display: 'block'
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ flexShrink: 0 }}>
        <UIControl />
      </div>
    </div>
  )
}
