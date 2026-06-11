import { Ecosystem } from './ecosystem'
import { Renderer } from './renderer'
import { UIManager } from './ui'

const TURN_INTERVAL = 2000
const RENDER_INTERVAL = 16

class Game {
  private ecosystem: Ecosystem
  private renderer: Renderer
  private ui: UIManager
  private isPaused = false
  private turnTimer: number | null = null
  private renderTimer: number | null = null
  private chartTimer: number | null = null
  private lastStepDuration = 0

  constructor() {
    const gameCanvas = document.getElementById('game-canvas') as HTMLCanvasElement
    const starsCanvas = document.getElementById('stars-canvas') as HTMLCanvasElement

    this.ecosystem = new Ecosystem()
    this.renderer = new Renderer(gameCanvas, starsCanvas)
    this.ui = new UIManager()

    this.init()
  }

  private init(): void {
    this.ui.setConfigToUI(this.ecosystem.getConfig())
    this.ui.updateStats(this.ecosystem.getStats())

    this.bindEvents()
    this.startTimers()
    this.initialRender()
  }

  private bindEvents(): void {
    this.ui.onPauseClick(() => this.togglePause())
    this.ui.onRestartClick(() => this.restart())

    const gameCanvas = document.getElementById('game-canvas') as HTMLCanvasElement

    gameCanvas.addEventListener('mousemove', (e) => {
      const pos = this.renderer.screenToGrid(e.clientX, e.clientY)
      if (pos) {
        this.renderer.setHoverCell(pos.x, pos.y)
        const cell = this.ecosystem.getCell(pos.x, pos.y)
        if (cell) {
          this.ui.showTooltip(e.clientX, e.clientY, cell)
        }
      } else {
        this.renderer.setHoverCell(null, null)
        this.ui.hideTooltip()
      }
    })

    gameCanvas.addEventListener('mouseleave', () => {
      this.renderer.setHoverCell(null, null)
      this.ui.hideTooltip()
    })

    gameCanvas.addEventListener('click', (e) => {
      const pos = this.renderer.screenToGrid(e.clientX, e.clientY)
      if (pos) {
        this.ecosystem.toggleForbidden(pos.x, pos.y)
        const cell = this.ecosystem.getCell(pos.x, pos.y)
        if (cell) {
          this.ui.showTooltip(e.clientX, e.clientY, cell)
        }
      }
    })

    window.addEventListener('resize', () => {
      this.renderer.resize()
    })
  }

  private startTimers(): void {
    this.turnTimer = window.setInterval(() => {
      if (!this.isPaused) {
        this.step()
      }
    }, TURN_INTERVAL)

    this.renderTimer = window.setInterval(() => {
      this.render()
    }, RENDER_INTERVAL)

    this.chartTimer = window.setInterval(() => {
      this.updateChart()
    }, 500)
  }

  private stopTimers(): void {
    if (this.turnTimer !== null) {
      clearInterval(this.turnTimer)
      this.turnTimer = null
    }
    if (this.renderTimer !== null) {
      clearInterval(this.renderTimer)
      this.renderTimer = null
    }
    if (this.chartTimer !== null) {
      clearInterval(this.chartTimer)
      this.chartTimer = null
    }
  }

  private step(): void {
    const startTime = performance.now()
    this.ecosystem.step()
    this.lastStepDuration = performance.now() - startTime
    
    if (this.lastStepDuration > 100) {
      console.warn(`Slow step detected: ${this.lastStepDuration.toFixed(1)}ms`)
    }

    this.renderer.onStep()
    this.ui.updateStats(this.ecosystem.getStats())
  }

  private render(): void {
    this.renderer.render(this.ecosystem.getGrid())
  }

  private updateChart(): void {
    this.ui.renderChart(this.ecosystem.getHistory())
  }

  private initialRender(): void {
    this.render()
    this.updateChart()
  }

  private togglePause(): void {
    this.isPaused = !this.isPaused
    this.ui.updatePauseButton(this.isPaused)
  }

  private restart(): void {
    const config = this.ui.getConfigFromUI()
    this.ecosystem.updateConfig(config)
    this.ecosystem.reset()
    this.renderer.onStep()
    this.ui.updateStats(this.ecosystem.getStats())
    this.ui.updatePauseButton(false)
    this.isPaused = false
    this.updateChart()
  }

  public destroy(): void {
    this.stopTimers()
    this.renderer.destroy()
    this.ui.destroy()
  }
}

let game: Game | null = null

function init(): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      game = new Game()
    })
  } else {
    game = new Game()
  }
}

function cleanup(): void {
  if (game) {
    game.destroy()
    game = null
  }
}

window.addEventListener('beforeunload', cleanup)

init()
