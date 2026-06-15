import { Star, Asteroid, TrailPoint, TargetRing } from './types'

export class GameRenderer {
  private ctx: CanvasRenderingContext2D
  private width: number
  private height: number

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx
    this.width = width
    this.height = height
  }

  public resize(width: number, height: number): void {
    this.width = width
    this.height = height
  }

  public clear(): void {
    this.ctx.fillStyle = '#0a0a2a'
    this.ctx.fillRect(0, 0, this.width, this.height)
  }

  public drawStars(stars: Star[], time: number): void {
    for (const star of stars) {
      const pulseIntensity = 0.7 + 0.3 * Math.sin(time / 1500 + star.pulsePhase)

      const gradient = this.ctx.createRadialGradient(
        star.x, star.y, 0,
        star.x, star.y, star.radius
      )
      gradient.addColorStop(0, `rgba(255, 200, 100, ${pulseIntensity})`)
      gradient.addColorStop(0.5, `rgba(255, 120, 50, ${pulseIntensity})`)
      gradient.addColorStop(1, `rgba(200, 50, 30, ${pulseIntensity})`)

      this.ctx.beginPath()
      this.ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2)
      this.ctx.fillStyle = gradient
      this.ctx.fill()

      this.ctx.beginPath()
      this.ctx.arc(star.x, star.y, star.gravityRadius, 0, Math.PI * 2)
      this.ctx.strokeStyle = 'rgba(255, 150, 100, 0.15)'
      this.ctx.lineWidth = 1
      this.ctx.stroke()
    }
  }

  public drawTrails(trails: TrailPoint[]): void {
    if (trails.length < 2) return

    for (let i = 1; i < trails.length; i++) {
      const prev = trails[i - 1]
      const curr = trails[i]

      this.ctx.beginPath()
      this.ctx.moveTo(prev.x, prev.y)
      this.ctx.lineTo(curr.x, curr.y)
      this.ctx.strokeStyle = `rgba(0, 255, 255, ${curr.alpha})`
      this.ctx.lineWidth = 2
      this.ctx.stroke()
    }
  }

  public drawAsteroid(asteroid: Asteroid, isLowFuel: boolean): void {
    const color = isLowFuel ? '#ff4444' : '#888888'

    const gradient = this.ctx.createRadialGradient(
      asteroid.x - asteroid.radius * 0.3,
      asteroid.y - asteroid.radius * 0.3,
      0,
      asteroid.x,
      asteroid.y,
      asteroid.radius
    )
    gradient.addColorStop(0, '#aaaaaa')
    gradient.addColorStop(1, color)

    this.ctx.beginPath()
    this.ctx.arc(asteroid.x, asteroid.y, asteroid.radius, 0, Math.PI * 2)
    this.ctx.fillStyle = gradient
    this.ctx.fill()
  }

  public drawTargets(targets: TargetRing[], time: number): void {
    for (const target of targets) {
      const ringColor = target.isHit ? 'rgba(255, 215, 0, 0.8)' : 'rgba(255, 255, 255, 0.6)'

      this.ctx.beginPath()
      this.ctx.arc(target.x, target.y, target.radius, 0, Math.PI * 2)
      this.ctx.strokeStyle = ringColor
      this.ctx.lineWidth = 3
      this.ctx.stroke()

      this.ctx.beginPath()
      this.ctx.arc(target.x, target.y, target.radius - 5, 0, Math.PI * 2)
      this.ctx.strokeStyle = target.isHit ? 'rgba(255, 215, 0, 0.3)' : 'rgba(255, 255, 255, 0.2)'
      this.ctx.lineWidth = 1
      this.ctx.stroke()

      if (target.isHit && target.rippleAlpha > 0) {
        this.ctx.beginPath()
        this.ctx.arc(target.x, target.y, target.rippleRadius, 0, Math.PI * 2)
        this.ctx.strokeStyle = `rgba(255, 215, 0, ${target.rippleAlpha})`
        this.ctx.lineWidth = 2
        this.ctx.stroke()
      }
    }
  }

  public drawScorePopup(
    show: boolean,
    popupTime: number,
    currentTime: number
  ): void {
    if (!show) return

    const elapsed = currentTime - popupTime
    const totalDuration = 2000
    const flyInDuration = 300
    const stayDuration = 1000

    if (elapsed > totalDuration) return

    const centerX = this.width / 2
    const centerY = this.height / 2

    let y = centerY
    let alpha = 1

    if (elapsed < flyInDuration) {
      const progress = elapsed / flyInDuration
      const easeOut = 1 - Math.pow(1 - progress, 3)
      y = centerY + 100 * (1 - easeOut)
      alpha = easeOut
    } else if (elapsed < flyInDuration + stayDuration) {
      alpha = 1
    } else {
      const fadeProgress = (elapsed - flyInDuration - stayDuration) / (totalDuration - flyInDuration - stayDuration)
      alpha = 1 - fadeProgress
    }

    this.ctx.save()
    this.ctx.globalAlpha = alpha
    this.ctx.font = 'bold 48px Arial'
    this.ctx.fillStyle = '#ffd700'
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    this.ctx.shadowColor = 'rgba(255, 215, 0, 0.5)'
    this.ctx.shadowBlur = 20
    this.ctx.fillText('+1 分', centerX, y)
    this.ctx.restore()
  }

  public render(
    stars: Star[],
    asteroid: Asteroid,
    trails: TrailPoint[],
    targets: TargetRing[],
    isLowFuel: boolean,
    showScorePopup: boolean,
    scorePopupTime: number,
    time: number
  ): void {
    this.clear()
    this.drawStars(stars, time)
    this.drawTargets(targets, time)
    this.drawTrails(trails)
    this.drawAsteroid(asteroid, isLowFuel)
    this.drawScorePopup(showScorePopup, scorePopupTime, time)
  }
}
