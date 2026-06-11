import { CreatureType } from './types'
import type { EcosystemStats, SimConfig, CellState } from './types'

type SeriesType = 'grass' | 'rabbit' | 'fox'

interface ChartOptions {
  padding: { top: number; right: number; bottom: number; left: number }
  colors: Record<SeriesType, string>
}

const DEFAULT_CHART_OPTIONS: ChartOptions = {
  padding: { top: 10, right: 10, bottom: 20, left: 35 },
  colors: {
    grass: '#5bb98c',
    rabbit: '#d0d4dc',
    fox: '#ff8c42'
  }
}

const CREATURE_TYPE_NAMES: Record<string, string> = {
  [CreatureType.Rabbit]: '🐰 兔子',
  [CreatureType.Fox]: '🦊 狐狸'
}

const CREATURE_TYPE_COLORS: Record<string, string> = {
  [CreatureType.Rabbit]: '#d0d4dc',
  [CreatureType.Fox]: '#ff8c42'
}

export class UIManager {
  private chartCanvas: HTMLCanvasElement
  private chartCtx: CanvasRenderingContext2D
  private tooltip: HTMLElement
  private sliderElements: Record<string, HTMLInputElement> = {}
  private valueDisplayElements: Record<string, HTMLElement> = {}
  private turnElement: HTMLElement
  private pauseBtn: HTMLButtonElement
  private restartBtn: HTMLButtonElement
  private panel: HTMLElement
  private panelToggle: HTMLButtonElement
  private legendItems: Partial<Record<SeriesType, HTMLElement>> = {}
  private visibleSeries: Record<SeriesType, boolean> = {
    grass: true,
    rabbit: true,
    fox: true
  }
  private options: ChartOptions = DEFAULT_CHART_OPTIONS

  constructor() {
    this.chartCanvas = document.getElementById('chart-canvas') as HTMLCanvasElement
    this.chartCtx = this.chartCanvas.getContext('2d')!
    this.tooltip = document.getElementById('tooltip')!
    this.turnElement = document.getElementById('turn-count')!
    this.pauseBtn = document.getElementById('pause-btn') as HTMLButtonElement
    this.restartBtn = document.getElementById('restart-btn') as HTMLButtonElement
    this.panel = document.getElementById('panel')!
    this.panelToggle = document.getElementById('panel-toggle') as HTMLButtonElement

    this.initSliders()
    this.initLegend()
    this.initPanelToggle()
    this.resizeChart()
    window.addEventListener('resize', () => this.resizeChart())
  }

  private initSliders(): void {
    const sliderConfig = [
      { id: 'grass-density', valueId: 'grass-density-value' },
      { id: 'rabbit-count', valueId: 'rabbit-count-value' },
      { id: 'fox-count', valueId: 'fox-count-value' },
      { id: 'grass-regrow', valueId: 'grass-regrow-value' },
      { id: 'rabbit-breed', valueId: 'rabbit-breed-value' }
    ]

    for (const config of sliderConfig) {
      const slider = document.getElementById(config.id) as HTMLInputElement
      const valueDisplay = document.getElementById(config.valueId)!
      
      this.sliderElements[config.id] = slider
      this.valueDisplayElements[config.id] = valueDisplay

      slider.addEventListener('input', () => {
        valueDisplay.textContent = slider.value
      })
    }
  }

  private initLegend(): void {
    const series: SeriesType[] = ['grass', 'rabbit', 'fox']
    
    for (const s of series) {
      const item = document.querySelector(`.legend-item[data-series="${s}"]`) as HTMLElement
      if (item) {
        this.legendItems[s] = item
        item.addEventListener('click', () => {
          this.visibleSeries[s] = !this.visibleSeries[s]
          item.classList.toggle('disabled', !this.visibleSeries[s])
        })
      }
    }
  }

  private initPanelToggle(): void {
    this.panelToggle.addEventListener('click', () => {
      this.panel.classList.toggle('collapsed')
      const isCollapsed = this.panel.classList.contains('collapsed')
      this.panelToggle.textContent = isCollapsed ? '▶' : '◀'
    })
  }

  private resizeChart(): void {
    const container = this.chartCanvas.parentElement
    if (!container) return

    const rect = container.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    
    this.chartCanvas.width = rect.width * dpr
    this.chartCanvas.height = rect.height * dpr
    this.chartCanvas.style.width = `${rect.width}px`
    this.chartCanvas.style.height = `${rect.height}px`
    
    this.chartCtx.scale(dpr, dpr)
  }

  public getConfigFromUI(): Partial<SimConfig> {
    return {
      grassDensity: parseInt(this.sliderElements['grass-density'].value),
      rabbitCount: parseInt(this.sliderElements['rabbit-count'].value),
      foxCount: parseInt(this.sliderElements['fox-count'].value),
      grassRegrowTime: parseInt(this.sliderElements['grass-regrow'].value),
      rabbitBreedThreshold: parseInt(this.sliderElements['rabbit-breed'].value)
    }
  }

  public setConfigToUI(config: SimConfig): void {
    this.sliderElements['grass-density'].value = config.grassDensity.toString()
    this.valueDisplayElements['grass-density'].textContent = config.grassDensity.toString()
    
    this.sliderElements['rabbit-count'].value = config.rabbitCount.toString()
    this.valueDisplayElements['rabbit-count'].textContent = config.rabbitCount.toString()
    
    this.sliderElements['fox-count'].value = config.foxCount.toString()
    this.valueDisplayElements['fox-count'].textContent = config.foxCount.toString()
    
    this.sliderElements['grass-regrow'].value = config.grassRegrowTime.toString()
    this.valueDisplayElements['grass-regrow'].textContent = config.grassRegrowTime.toString()
    
    this.sliderElements['rabbit-breed'].value = config.rabbitBreedThreshold.toString()
    this.valueDisplayElements['rabbit-breed'].textContent = config.rabbitBreedThreshold.toString()
  }

  public updateStats(stats: EcosystemStats): void {
    this.turnElement.textContent = stats.turn.toString()
    
    const grassEl = document.getElementById('stat-grass')
    const rabbitEl = document.getElementById('stat-rabbit')
    const foxEl = document.getElementById('stat-fox')
    
    if (grassEl) grassEl.textContent = `${stats.grassCount} (${stats.grassCoverage.toFixed(1)}%)`
    if (rabbitEl) rabbitEl.textContent = stats.rabbitCount.toString()
    if (foxEl) foxEl.textContent = stats.foxCount.toString()
  }

  public updatePauseButton(isPaused: boolean): void {
    this.pauseBtn.textContent = isPaused ? '▶️ 继续' : '⏸️ 暂停'
  }

  public showTooltip(screenX: number, screenY: number, cell: CellState): void {
    let content = `<strong>位置</strong>: (${cell.x}, ${cell.y})`
    
    if (cell.forbidden) {
      content += `<br/><span style="color: #ef476f;">🚫 禁区 - 生物无法进入</span>`
    } else {
      if (cell.grass) {
        if (cell.grass.remainingTurns === 0) {
          content += `<br/><span style="color: #5bb98c;">🌿 草 (可食用)</span>`
        } else {
          content += `<br/><span style="color: #7a9e8c;">🌱 草 (恢复中: ${cell.grass.remainingTurns}回合)</span>`
        }
      }
      
      if (cell.animal) {
        const typeName = CREATURE_TYPE_NAMES[cell.animal.type] || cell.animal.type
        const typeColor = CREATURE_TYPE_COLORS[cell.animal.type] || '#ffffff'
        content += `<br/><span style="color: ${typeColor};">${typeName}</span>`
        content += `<br/><strong>能量</strong>: ${cell.animal.energy}`
        content += `<br/><strong>ID</strong>: #${cell.animal.id}`
      }
      
      if (!cell.grass && !cell.animal) {
        content += `<br/><span style="color: #707888;">空</span>`
      }
    }
    
    this.tooltip.innerHTML = content
    
    const wrapper = this.chartCanvas.closest('#app')?.querySelector('#canvas-wrapper') as HTMLElement
    if (!wrapper) return
    
    const wrapperRect = wrapper.getBoundingClientRect()
    const tooltipRect = this.tooltip.getBoundingClientRect()
    
    let left = screenX - wrapperRect.left + 15
    let top = screenY - wrapperRect.top + 15
    
    if (left + tooltipRect.width + 20 > wrapperRect.width) {
      left = screenX - wrapperRect.left - tooltipRect.width - 15
    }
    if (top + tooltipRect.height + 20 > wrapperRect.height) {
      top = screenY - wrapperRect.top - tooltipRect.height - 15
    }
    
    this.tooltip.style.left = `${left}px`
    this.tooltip.style.top = `${top}px`
    this.tooltip.classList.add('visible')
  }

  public hideTooltip(): void {
    this.tooltip.classList.remove('visible')
  }

  public renderChart(history: EcosystemStats[]): void {
    const ctx = this.chartCtx
    const canvas = this.chartCanvas
    const width = canvas.width / (window.devicePixelRatio || 1)
    const height = canvas.height / (window.devicePixelRatio || 1)
    const { padding } = this.options

    ctx.clearRect(0, 0, width, height)

    const chartWidth = width - padding.left - padding.right
    const chartHeight = height - padding.top - padding.bottom

    if (history.length < 2) {
      ctx.fillStyle = 'rgba(200, 200, 210, 0.5)'
      ctx.font = '12px "Segoe UI", sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('等待数据...', width / 2, height / 2)
      return
    }

    const visibleDataPoints: Array<{ key: SeriesType; values: number[] }> = []
    
    if (this.visibleSeries.grass) {
      visibleDataPoints.push({
        key: 'grass',
        values: history.map(h => h.grassCount)
      })
    }
    if (this.visibleSeries.rabbit) {
      visibleDataPoints.push({
        key: 'rabbit',
        values: history.map(h => h.rabbitCount)
      })
    }
    if (this.visibleSeries.fox) {
      visibleDataPoints.push({
        key: 'fox',
        values: history.map(h => h.foxCount)
      })
    }

    if (visibleDataPoints.length === 0) {
      ctx.fillStyle = 'rgba(200, 200, 210, 0.5)'
      ctx.font = '12px "Segoe UI", sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('请选择显示的曲线', width / 2, height / 2)
      return
    }

    const maxValue = this.calculateOptimalMaxValue(visibleDataPoints)

    this.drawGrid(ctx, padding, chartWidth, chartHeight, maxValue)
    this.drawAxes(ctx, padding, chartWidth, chartHeight, maxValue)

    for (const series of visibleDataPoints) {
      this.drawLine(ctx, series.values, padding, chartWidth, chartHeight, maxValue, this.options.colors[series.key])
    }
  }

  private calculateOptimalMaxValue(series: Array<{ key: SeriesType; values: number[] }>): number {
    let absoluteMax = 0
    let hasValidData = false

    for (const s of series) {
      if (s.values.length === 0) continue
      const seriesMax = Math.max(...s.values)
      if (isFinite(seriesMax) && seriesMax > 0) {
        absoluteMax = Math.max(absoluteMax, seriesMax)
        hasValidData = true
      }
    }

    if (!hasValidData || absoluteMax <= 0) return 10

    const targetMax = absoluteMax * 1.15

    const niceNumbers = [1, 2, 2.5, 5, 10]
    const magnitude = Math.pow(10, Math.floor(Math.log10(targetMax)))
    const normalized = targetMax / magnitude

    let niceMax = niceNumbers[niceNumbers.length - 1]
    for (const n of niceNumbers) {
      if (n >= normalized) {
        niceMax = n
        break
      }
    }

    const result = niceMax * magnitude
    return Math.max(1, Math.ceil(result))
  }

  private drawGrid(
    ctx: CanvasRenderingContext2D,
    padding: { top: number; right: number; bottom: number; left: number },
    width: number,
    height: number,
    _maxValue: number
  ): void {
    ctx.strokeStyle = 'rgba(100, 110, 130, 0.15)'
    ctx.lineWidth = 1

    const ySteps = 5
    for (let i = 0; i <= ySteps; i++) {
      const y = padding.top + (height / ySteps) * i
      ctx.beginPath()
      ctx.moveTo(padding.left, y)
      ctx.lineTo(padding.left + width, y)
      ctx.stroke()
    }
  }

  private drawAxes(
    ctx: CanvasRenderingContext2D,
    padding: { top: number; right: number; bottom: number; left: number },
    width: number,
    height: number,
    maxValue: number
  ): void {
    ctx.strokeStyle = 'rgba(150, 160, 180, 0.4)'
    ctx.lineWidth = 1

    ctx.beginPath()
    ctx.moveTo(padding.left, padding.top)
    ctx.lineTo(padding.left, padding.top + height)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(padding.left, padding.top + height)
    ctx.lineTo(padding.left + width, padding.top + height)
    ctx.stroke()

    ctx.fillStyle = 'rgba(180, 190, 210, 0.8)'
    ctx.font = '10px "Consolas", monospace'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'

    const ySteps = 5
    for (let i = 0; i <= ySteps; i++) {
      const value = Math.round((maxValue / ySteps) * (ySteps - i))
      const y = padding.top + (height / ySteps) * i
      ctx.fillText(value.toString(), padding.left - 6, y)
    }

    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText('回合 →', padding.left + width / 2, padding.top + height + 6)
  }

  private drawLine(
    ctx: CanvasRenderingContext2D,
    values: number[],
    padding: { top: number; right: number; bottom: number; left: number },
    width: number,
    height: number,
    maxValue: number,
    color: string
  ): void {
    if (values.length < 2) return

    const points: { x: number; y: number }[] = []
    const xStep = values.length > 1 ? width / (values.length - 1) : width

    for (let i = 0; i < values.length; i++) {
      const x = padding.left + xStep * i
      const y = padding.top + height - (height * values[i] / Math.max(1, maxValue))
      points.push({ x, y })
    }

    const smoothed = this.smoothPoints(points)

    ctx.beginPath()
    ctx.moveTo(smoothed[0].x, smoothed[0].y)
    
    for (let i = 1; i < smoothed.length; i++) {
      ctx.lineTo(smoothed[i].x, smoothed[i].y)
    }

    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(smoothed[0].x, padding.top + height)
    
    for (let i = 0; i < smoothed.length; i++) {
      ctx.lineTo(smoothed[i].x, smoothed[i].y)
    }
    
    ctx.lineTo(smoothed[smoothed.length - 1].x, padding.top + height)
    ctx.closePath()
    
    const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + height)
    gradient.addColorStop(0, color + '40')
    gradient.addColorStop(1, color + '05')
    ctx.fillStyle = gradient
    ctx.fill()
  }

  private smoothPoints(points: { x: number; y: number }[]): { x: number; y: number }[] {
    if (points.length < 3) return points

    const result: { x: number; y: number }[] = []
    
    for (let i = 0; i < points.length; i++) {
      if (i === 0 || i === points.length - 1) {
        result.push({ ...points[i] })
      } else {
        const prev = points[i - 1]
        const curr = points[i]
        const next = points[i + 1]
        
        const smoothedX = curr.x
        const smoothedY = prev.y * 0.25 + curr.y * 0.5 + next.y * 0.25
        
        result.push({ x: smoothedX, y: smoothedY })
      }
    }

    return result
  }

  public onPauseClick(callback: () => void): void {
    this.pauseBtn.addEventListener('click', callback)
  }

  public onRestartClick(callback: () => void): void {
    this.restartBtn.addEventListener('click', callback)
  }

  public destroy(): void {
    window.removeEventListener('resize', () => this.resizeChart())
  }
}
