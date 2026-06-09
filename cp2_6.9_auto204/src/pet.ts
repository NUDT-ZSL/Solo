export type PetState = 'idle' | 'eating' | 'cleaning' | 'playing'

export interface PetStats {
  hunger: number
  cleanliness: number
  happiness: number
  energy: number
}

const STAT_DECAY_PER_MINUTE: Record<keyof PetStats, number> = {
  hunger: 2,
  cleanliness: 1,
  happiness: 1,
  energy: 2,
}

export class Pet {
  public readonly petSize = 64
  public state: PetState = 'idle'
  public stats: PetStats = { hunger: 80, cleanliness: 100, happiness: 60, energy: 80 }
  public targetStats: PetStats = { ...this.stats }
  public isSick = false
  public animFrame = 0
  public animTimer = 0
  public blinkTimer = 0
  public blinkDuration = 0
  public isBlinking = false
  public isYawning = false
  public yawnTimer = 0
  public idleRandomTimer = 3
  public stateDuration = 0
  public hoverBubbleTimer = 0
  public isHovering = false
  public statusMessage: string | null = null
  public statusMessageTimer = 0
  public shakeTimer = 0

  private nextRandomEvent() {
    return 3 + Math.random() * 2
  }

  public update(dt: number) {
    this.animTimer += dt
    if (this.animTimer >= 1) {
      this.animTimer = 0
      this.animFrame = 1 - this.animFrame
    }

    for (const key of Object.keys(this.stats) as (keyof PetStats)[]) {
      this.stats[key] -= (STAT_DECAY_PER_MINUTE[key] / 60) * dt
      if (this.stats[key] < 0) this.stats[key] = 0
      const diff = this.targetStats[key] - this.stats[key]
      if (Math.abs(diff) > 0.1) {
        this.stats[key] += diff * Math.min(1, dt * 5)
      } else {
        this.stats[key] = this.targetStats[key]
      }
    }

    const anyZero = Object.values(this.stats).some(v => v <= 0)
    this.isSick = anyZero

    if (this.isSick) {
      this.shakeTimer += dt
    }

    if (this.state !== 'idle') {
      this.stateDuration -= dt
      if (this.stateDuration <= 0) {
        this.state = 'idle'
      }
    } else {
      this.idleRandomTimer -= dt
      if (this.idleRandomTimer <= 0) {
        if (Math.random() < 0.6) {
          this.isBlinking = true
          this.blinkDuration = 0.15
        } else {
          this.isYawning = true
          this.yawnTimer = 1
        }
        this.idleRandomTimer = this.nextRandomEvent()
      }
      if (this.isBlinking) {
        this.blinkDuration -= dt
        if (this.blinkDuration <= 0) this.isBlinking = false
      }
      if (this.isYawning) {
        this.yawnTimer -= dt
        if (this.yawnTimer <= 0) this.isYawning = false
      }
    }

    if (this.isHovering) {
      this.hoverBubbleTimer += dt
    } else {
      this.hoverBubbleTimer = 0
    }

    if (this.statusMessage !== null) {
      this.statusMessageTimer -= dt
      if (this.statusMessageTimer <= 0) {
        this.statusMessage = null
      }
    }
  }

  public setStat(key: keyof PetStats, value: number) {
    this.targetStats[key] = Math.max(0, Math.min(100, value))
  }

  public eat() {
    if (this.isSick) return
    this.state = 'eating'
    this.stateDuration = 1
    this.animFrame = 0
    this.setStat('hunger', this.targetStats.hunger + 10)
    this.setStat('happiness', this.targetStats.happiness + 2)
    this.showStatus('进食中...')
  }

  public clean() {
    if (this.isSick) return
    this.state = 'cleaning'
    this.stateDuration = 1
    this.animFrame = 0
    this.setStat('cleanliness', this.targetStats.cleanliness + 10)
    this.setStat('energy', this.targetStats.energy - 5)
    this.showStatus('清洁中...')
  }

  public play() {
    if (this.isSick) return
    this.state = 'playing'
    this.stateDuration = 1
    this.animFrame = 0
    this.setStat('happiness', this.targetStats.happiness + 10)
    this.setStat('energy', this.targetStats.energy - 5)
    this.setStat('hunger', this.targetStats.hunger - 3)
    this.showStatus('玩耍中...')
  }

  public heal() {
    for (const key of Object.keys(this.targetStats) as (keyof PetStats)[]) {
      this.setStat(key, 50)
    }
    this.state = 'idle'
    this.isSick = false
    this.shakeTimer = 0
    this.showStatus('治疗中...')
  }

  private showStatus(msg: string) {
    this.statusMessage = msg
    this.statusMessageTimer = 1
  }

  public draw(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
    ctx.save()
    let offsetX = 0
    let offsetY = 0
    if (this.isSick) {
      offsetX = (Math.random() - 0.5) * 4 * scale
      offsetY = (Math.random() - 0.5) * 4 * scale
    }
    const px = x + offsetX
    const py = y + offsetY
    const s = scale
    this.drawPetBody(ctx, px, py, s)
    ctx.restore()
  }

  private drawPetBody(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
    const sickTint = this.isSick
    const P = (dx: number, dy: number, w: number, h: number, color: string) => {
      ctx.fillStyle = color
      ctx.fillRect(Math.floor(x + dx * s), Math.floor(y + dy * s), Math.ceil(w * s), Math.ceil(h * s))
    }
    const bodyColor = sickTint ? '#888888' : '#FFB347'
    const bodyDark = sickTint ? '#666666' : '#E8941F'
    const bellyColor = sickTint ? '#AAAAAA' : '#FFE0B2'
    const cheekColor = sickTint ? '#999999' : '#FF8A80'
    const eyeWhite = '#FFFFFF'
    const eyeBlack = '#2D2D2D'

    if (this.state === 'playing' && this.animFrame === 1) {
      P(8, 4, 48, 56, bodyColor)
    } else {
      P(8, 8, 48, 52, bodyColor)
    }
    P(10, 10, 44, 48, bodyColor)
    P(16, 32, 32, 22, bellyColor)
    P(8, 8, 4, 48, bodyDark)
    P(52, 8, 4, 48, bodyDark)
    P(8, 56, 48, 4, bodyDark)

    if (this.state === 'eating') {
      P(4, 12, 6, 4, bodyColor)
      P(54, 12, 6, 4, bodyColor)
    } else if (this.state === 'cleaning') {
      if (this.animFrame === 0) {
        P(2, 20, 4, 4, bodyColor)
        P(58, 18, 4, 4, bodyColor)
      } else {
        P(2, 18, 4, 4, bodyColor)
        P(58, 22, 4, 4, bodyColor)
      }
    } else if (this.state === 'playing') {
      if (this.animFrame === 0) {
        P(4, 4, 4, 4, bodyColor)
        P(56, 4, 4, 4, bodyColor)
      }
    } else {
      P(6, 14, 4, 4, bodyColor)
      P(54, 14, 4, 4, bodyColor)
    }

    P(14, 6, 8, 6, bodyColor)
    P(42, 6, 8, 6, bodyColor)
    P(16, 8, 4, 2, bodyDark)
    P(44, 8, 4, 2, bodyDark)

    if (this.state === 'eating') {
      const close = this.animFrame === 0
      P(18, 20, 10, close ? 2 : 8, eyeWhite)
      P(36, 20, 10, close ? 2 : 8, eyeWhite)
      if (!close) {
        P(22, 22, 4, 4, eyeBlack)
        P(40, 22, 4, 4, eyeBlack)
      }
      P(24, 38, 16, this.animFrame === 0 ? 6 : 10, '#8B4513')
      P(28, 36, 8, 4, '#D32F2F')
    } else if (this.state === 'cleaning') {
      const h = this.animFrame === 0 ? 8 : 10
      P(18, 20, 10, h, eyeWhite)
      P(36, 20, 10, h, eyeWhite)
      const pupilY = this.animFrame === 0 ? 22 : 24
      P(22, pupilY, 4, 4, eyeBlack)
      P(40, pupilY, 4, 4, eyeBlack)
      P(26, 38, 12, 4, '#81D4FA')
      P(24, 42, 4, 4, '#81D4FA')
      P(36, 42, 4, 4, '#81D4FA')
    } else if (this.state === 'playing') {
      P(18, 22, 10, 10, eyeWhite)
      P(36, 22, 10, 10, eyeWhite)
      if (this.animFrame === 0) {
        P(24, 26, 4, 4, eyeBlack)
        P(42, 26, 4, 4, eyeBlack)
      } else {
        P(20, 26, 4, 4, eyeBlack)
        P(38, 26, 4, 4, eyeBlack)
      }
      P(24, 40, 16, 6, '#E91E63')
      P(28, 40, 2, 2, '#FFFFFF')
      P(34, 40, 2, 2, '#FFFFFF')
    } else {
      if (this.isBlinking) {
        P(18, 24, 10, 2, bodyDark)
        P(36, 24, 10, 2, bodyDark)
      } else if (this.isYawning) {
        P(18, 22, 10, 8, eyeWhite)
        P(36, 22, 10, 8, eyeWhite)
        P(22, 24, 4, 4, eyeBlack)
        P(40, 24, 4, 4, eyeBlack)
        P(24, 40, 16, 12, '#5D4037')
        P(26, 42, 12, 8, '#E57373')
      } else {
        const bob = this.animFrame === 1 ? 0 : 2
        P(18, 20 + bob, 10, 10, eyeWhite)
        P(36, 20 + bob, 10, 10, eyeWhite)
        P(22, 24 + bob, 4, 4, eyeBlack)
        P(40, 24 + bob, 4, 4, eyeBlack)
        P(23, 25 + bob, 1, 1, '#FFFFFF')
        P(41, 25 + bob, 1, 1, '#FFFFFF')
        P(24, 38, 16, 2, bodyDark)
        P(30, 38, 4, 4, '#E57373')
      }
    }

    if (!sickTint && this.state === 'idle' && !this.isYawning) {
      P(12, 32, 6, 4, cheekColor)
      P(46, 32, 6, 4, cheekColor)
    }

    if (this.state === 'idle') {
      const footY = this.animFrame === 0 ? 58 : 60
      P(18, footY, 10, 4, bodyDark)
      P(36, footY, 10, 4, bodyDark)
    } else if (this.state === 'eating') {
      P(16, 58, 12, 4, bodyDark)
      P(36, 58, 12, 4, bodyDark)
    } else if (this.state === 'cleaning') {
      P(18, 60, 10, 4, bodyDark)
      P(36, 60, 10, 4, bodyDark)
    } else if (this.state === 'playing') {
      if (this.animFrame === 0) {
        P(16, 60, 10, 4, bodyDark)
        P(38, 56, 10, 4, bodyDark)
      } else {
        P(16, 56, 10, 4, bodyDark)
        P(38, 60, 10, 4, bodyDark)
      }
    }
  }

  public contains(px: number, py: number, cx: number, cy: number, scale: number): boolean {
    const left = cx + 8 * scale
    const right = cx + 56 * scale
    const top = cy + 4 * scale
    const bottom = cy + 64 * scale
    return px >= left && px <= right && py >= top && py <= bottom
  }

  public showBubble(): boolean {
    return this.isHovering && this.hoverBubbleTimer >= 0.5 && this.state === 'idle' && !this.isSick
  }
}
