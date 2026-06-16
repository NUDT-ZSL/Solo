import { useEffect, useRef, useState } from 'react'
import { generateWeeklyReport, type WeeklyReportData } from './ReportGenerator'
import './WeeklyReport.css'

export default function WeeklyReport() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [reportData, setReportData] = useState<WeeklyReportData | null>(null)

  useEffect(() => {
    const data = generateWeeklyReport()
    setReportData(data)
  }, [])

  useEffect(() => {
    if (!reportData || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const width = canvas.width
    const height = canvas.height

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const displayWidth = width / dpr
    const displayHeight = height / dpr

    ctx.clearRect(0, 0, displayWidth, displayHeight)

    const padding = { top: 20, right: 20, bottom: 30, left: 40 }
    const chartWidth = displayWidth - padding.left - padding.right
    const chartHeight = displayHeight - padding.top - padding.bottom

    const values = reportData.chartData.values
    const labels = reportData.chartData.labels

    const minValue = 0
    const maxValue = 100

    const xScale = (index: number) =>
      padding.left + (index / (values.length - 1)) * chartWidth

    const yScale = (value: number) =>
      padding.top + ((maxValue - value) / (maxValue - minValue)) * chartHeight

    reportData.chartData.lowIntervals.forEach((interval) => {
      const xStart = xScale(interval.start)
      const xEnd = xScale(interval.end)
      const width = xEnd - xStart

      ctx.fillStyle = 'rgba(255, 68, 68, 0.15)'
      ctx.fillRect(
        xStart - 15,
        padding.top,
        width + 30,
        chartHeight
      )
    })

    reportData.chartData.highIntervals.forEach((interval) => {
      const xStart = xScale(interval.start)
      const xEnd = xScale(interval.end)
      const width = xEnd - xStart

      ctx.fillStyle = 'rgba(68, 255, 68, 0.1)'
      ctx.fillRect(
        xStart - 15,
        padding.top,
        width + 30,
        chartHeight
      )
    })

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.lineWidth = 1

    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (i / 4) * chartHeight
      ctx.beginPath()
      ctx.moveTo(padding.left, y)
      ctx.lineTo(displayWidth - padding.right, y)
      ctx.stroke()
    }

    ctx.font = '10px -apple-system, sans-serif'
    ctx.fillStyle = '#64748b'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'

    for (let i = 0; i <= 4; i++) {
      const value = maxValue - (i / 4) * (maxValue - minValue)
      const y = padding.top + (i / 4) * chartHeight
      ctx.fillText(Math.round(value).toString(), padding.left - 8, y)
    }

    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'

    labels.forEach((label, index) => {
      const x = xScale(index)
      ctx.fillText(label, x, displayHeight - padding.bottom + 8)
    })

    ctx.beginPath()
    ctx.strokeStyle = '#a78bfa'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    for (let i = 0; i < values.length - 1; i++) {
      const x0 = xScale(i)
      const y0 = yScale(values[i])
      const x1 = xScale(i + 1)
      const y1 = yScale(values[i + 1])

      const cpx1 = x0 + (x1 - x0) / 3
      const cpy1 = y0
      const cpx2 = x0 + ((x1 - x0) * 2) / 3
      const cpy2 = y1

      if (i === 0) {
        ctx.moveTo(x0, y0)
      }

      ctx.bezierCurveTo(cpx1, cpy1, cpx2, cpy2, x1, y1)
    }

    ctx.stroke()

    const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight)
    gradient.addColorStop(0, 'rgba(167, 139, 250, 0.3)')
    gradient.addColorStop(1, 'rgba(167, 139, 250, 0)')

    ctx.beginPath()
    ctx.moveTo(xScale(0), yScale(values[0]))

    for (let i = 0; i < values.length - 1; i++) {
      const x0 = xScale(i)
      const y0 = yScale(values[i])
      const x1 = xScale(i + 1)
      const y1 = yScale(values[i + 1])

      const cpx1 = x0 + (x1 - x0) / 3
      const cpy1 = y0
      const cpx2 = x0 + ((x1 - x0) * 2) / 3
      const cpy2 = y1

      ctx.bezierCurveTo(cpx1, cpy1, cpx2, cpy2, x1, y1)
    }

    ctx.lineTo(xScale(values.length - 1), padding.top + chartHeight)
    ctx.lineTo(xScale(0), padding.top + chartHeight)
    ctx.closePath()
    ctx.fillStyle = gradient
    ctx.fill()

    values.forEach((value, index) => {
      const x = xScale(index)
      const y = yScale(value)

      ctx.beginPath()
      ctx.arc(x, y, 6, 0, Math.PI * 2)
      ctx.fillStyle = '#1b2838'
      ctx.fill()

      ctx.beginPath()
      ctx.arc(x, y, 4, 0, Math.PI * 2)
      ctx.fillStyle = '#ffffff'
      ctx.fill()
    })
  }, [reportData])

  if (!reportData) {
    return <div className="weekly-report-loading">加载中...</div>
  }

  return (
    <div className="weekly-report">
      <div className="report-summary">
        <div className="summary-item">
          <span className="summary-label">周平均情绪</span>
          <span className="summary-value" style={{ color: getEmotionColor(reportData.overallAvg) }}>
            {reportData.overallAvg}
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">最高情绪日</span>
          <span className="summary-value high">
            {reportData.highPoints.length > 0
              ? formatDate(reportData.highPoints[0].date)
              : '-'}
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">最低情绪日</span>
          <span className="summary-value low">
            {reportData.lowPoints.length > 0
              ? formatDate(reportData.lowPoints[0].date)
              : '-'}
          </span>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={552}
        height={200}
        className="report-chart"
      />

      <div className="report-legend">
        <div className="legend-item">
          <span className="legend-color high-legend"></span>
          <span className="legend-text">愉快区间</span>
        </div>
        <div className="legend-item">
          <span className="legend-color low-legend"></span>
          <span className="legend-text">低落区间</span>
        </div>
      </div>
    </div>
  )
}

function getEmotionColor(value: number): string {
  const t = value / 100
  return `hsl(${200 - t * 200}, 80%, 65%)`
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}
