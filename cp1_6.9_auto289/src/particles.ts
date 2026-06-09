export interface Particle {
  x: number
  y: number
  baseX: number
  baseY: number
  charIndex: number
  covered: boolean
  phase: number
  charId: number
}

export interface Character {
  id: number
  char: string
  centerX: number
  centerY: number
  particles: Particle[]
  coveredCount: number
  completed: boolean
  floatProgress: number
  scattered: boolean
  scatterDots: ScatterDot[]
}

export interface ScatterDot {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  alpha: number
  settled: boolean
  targetX: number
  targetY: number
}

const LAN_TING_TEXT = '永和九年岁在癸丑暮春之初会于会稽山阴之兰亭'
const CHAR_SIZE = 80
const PARTICLES_PER_CHAR = 50
const BREATH_PERIOD = 0.3
const BREATH_MIN = 0.6
const BREATH_MAX = 1.0
const COVER_RADIUS = 15
const COMPLETE_THRESHOLD = 0.8

let charIdCounter = 0

export class ParticleSystem {
  characters: Character[] = []
  private text: string = LAN_TING_TEXT
  private cols: number = 10
  private rows: number = 2
  private cellW: number = CHAR_SIZE + 30
  private cellH: number = CHAR_SIZE + 30
  private tabletLeft: number = 0
  private tabletTop: number = 0
  private tabletWidth: number = 0
  private tabletHeight: number = 0
  private scale: number = 1

  layout(canvasWidth: number, canvasHeight: number, bottomAreaHeight: number) {
    this.scale = canvasWidth < 768 ? canvasWidth / (this.cellW * this.cols + 80) : 1
    const actualCellW = this.cellW * this.scale
    const actualCellH = this.cellH * this.scale
    this.tabletWidth = actualCellW * this.cols + 60 * this.scale
    this.tabletHeight = actualCellH * this.rows + 80 * this.scale
    this.tabletLeft = (canvasWidth - this.tabletWidth) / 2
    this.tabletTop = (canvasHeight - bottomAreaHeight - this.tabletHeight) / 2 + 20

    this.characters = []
    charIdCounter = 0

    for (let i = 0; i < this.text.length; i++) {
      const row = Math.floor(i / this.cols)
      const col = i % this.cols
      const centerX = this.tabletLeft + 30 * this.scale + col * actualCellW + actualCellW / 2
      const centerY = this.tabletTop + 40 * this.scale + row * actualCellH + actualCellH / 2
      const char = this.createCharacter(this.text[i], centerX, centerY)
      this.characters.push(char)
    }
  }

  private createCharacter(char: string, cx: number, cy: number): Character {
    const id = charIdCounter++
    const particles = this.extractParticles(char, cx, cy, id)
    return {
      id,
      char,
      centerX: cx,
      centerY: cy,
      particles,
      coveredCount: 0,
      completed: false,
      floatProgress: 0,
      scattered: false,
      scatterDots: []
    }
  }

  private extractParticles(char: string, cx: number, cy: number, charId: number): Particle[] {
    const size = CHAR_SIZE * this.scale
    const offCanvas = document.createElement('canvas')
    const s = Math.ceil(size * 1.5)
    offCanvas.width = s
    offCanvas.height = s
    const octx = offCanvas.getContext('2d')!
    octx.fillStyle = '#fff'
    octx.font = `bold ${Math.floor(size)}px "KaiTi", "楷体", "STKaiti", serif`
    octx.textAlign = 'center'
    octx.textBaseline = 'middle'
    octx.fillText(char, s / 2, s / 2)

    const imgData = octx.getImageData(0, 0, s, s).data
    const edgePoints: { x: number; y: number }[] = []

    const step = Math.max(1, Math.floor(s / 80))
    for (let y = 0; y < s; y += step) {
      for (let x = 0; x < s; x += step) {
        const idx = (y * s + x) * 4
        if (imgData[idx + 3] > 128) {
          let isEdge = false
          for (let dy = -step; dy <= step && !isEdge; dy += step) {
            for (let dx = -step; dx <= step && !isEdge; dx += step) {
              if (dx === 0 && dy === 0) continue
              const nx = x + dx, ny = y + dy
              if (nx < 0 || nx >= s || ny < 0 || ny >= s) { isEdge = true; break }
              const nidx = (ny * s + nx) * 4
              if (imgData[nidx + 3] < 128) isEdge = true
            }
          }
          if (isEdge) {
            edgePoints.push({ x: x - s / 2, y: y - s / 2 })
          }
        }
      }
    }

    if (edgePoints.length === 0) {
      const pts: { x: number; y: number }[] = []
      for (let i = 0; i < PARTICLES_PER_CHAR; i++) {
        const ang = (i / PARTICLES_PER_CHAR) * Math.PI * 2
        pts.push({
          x: Math.cos(ang) * size * 0.3,
          y: Math.sin(ang) * size * 0.3
        })
      }
      return pts.map((p, i) => ({
        x: cx + p.x,
        y: cy + p.y,
        baseX: cx + p.x,
        baseY: cy + p.y,
        charIndex: i,
        covered: false,
        phase: Math.random() * Math.PI * 2,
        charId
      }))
    }

    const sampled: { x: number; y: number }[] = []
    const remaining = [...edgePoints]
    const targetCount = PARTICLES_PER_CHAR

    if (remaining.length <= targetCount) {
      sampled.push(...remaining)
      while (sampled.length < targetCount) {
        const p = remaining[Math.floor(Math.random() * remaining.length)]
        sampled.push({
          x: p.x + (Math.random() - 0.5) * 3,
          y: p.y + (Math.random() - 0.5) * 3
        })
      }
    } else {
      const startIdx = 0
      const ordered: { x: number; y: number }[] = [remaining[startIdx]]
      remaining.splice(startIdx, 1)

      while (remaining.length > 0 && ordered.length < targetCount * 2) {
        const last = ordered[ordered.length - 1]
        let nearestIdx = 0
        let nearestDist = Infinity
        for (let i = 0; i < remaining.length; i++) {
          const dx = remaining[i].x - last.x
          const dy = remaining[i].y - last.y
          const dist = dx * dx + dy * dy
          if (dist < nearestDist) {
            nearestDist = dist
            nearestIdx = i
          }
        }
        ordered.push(remaining[nearestIdx])
        remaining.splice(nearestIdx, 1)
      }

      const interval = ordered.length / targetCount
      for (let i = 0; i < targetCount; i++) {
        const idx = Math.min(Math.floor(i * interval), ordered.length - 1)
        sampled.push(ordered[idx])
      }
    }

    return sampled.map((p, i) => ({
      x: cx + p.x,
      y: cy + p.y,
      baseX: cx + p.x,
      baseY: cy + p.y,
      charIndex: i,
      covered: false,
      phase: Math.random() * Math.PI * 2,
      charId
    }))
  }

  update(dt: number, brushX: number, brushY: number, isPressed: boolean): Character | null {
    let completedChar: Character | null = null

    for (const ch of this.characters) {
      if (ch.completed) {
        if (!ch.scattered) {
          ch.floatProgress += dt / 0.5
          if (ch.floatProgress >= 1) {
            ch.scattered = true
            this.createScatterDots(ch)
          }
        }
        this.updateScatterDots(ch, dt)
        continue
      }

      for (const p of ch.particles) {
        if (!p.covered) {
          p.phase += (dt / BREATH_PERIOD) * Math.PI * 2
        }
        if (isPressed && !p.covered) {
          const dx = brushX - p.x
          const dy = brushY - p.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist <= COVER_RADIUS * this.scale) {
            p.covered = true
            ch.coveredCount++
          }
        }
      }

      const ratio = ch.coveredCount / ch.particles.length
      if (ratio >= COMPLETE_THRESHOLD && !ch.completed) {
        ch.completed = true
        ch.floatProgress = 0
        completedChar = ch
      }
    }

    return completedChar
  }

  private createScatterDots(ch: Character) {
    const dotCount = 30
    for (let i = 0; i < dotCount; i++) {
      ch.scatterDots.push({
        x: ch.centerX + (Math.random() - 0.5) * CHAR_SIZE * this.scale,
        y: ch.centerY + (Math.random() - 0.5) * CHAR_SIZE * this.scale,
        vx: (Math.random() - 0.5) * 40,
        vy: 60 + Math.random() * 80,
        size: 1 + Math.random() * 3,
        alpha: 0.8 + Math.random() * 0.2,
        settled: false,
        targetX: 0,
        targetY: 0
      })
    }
  }

  private updateScatterDots(ch: Character, dt: number) {
    for (const dot of ch.scatterDots) {
      if (!dot.settled) {
        dot.vy += 120 * dt
        dot.x += dot.vx * dt
        dot.y += dot.vy * dt
        dot.vx *= 0.98
      } else {
        const maxV = 5
        dot.x += (Math.random() - 0.5) * maxV * dt
        dot.y += (Math.random() - 0.5) * maxV * dt
        if (dot.x < dot.targetX - 15) dot.x = dot.targetX - 15
        if (dot.x > dot.targetX + 15) dot.x = dot.targetX + 15
        if (dot.y < dot.targetY - 8) dot.y = dot.targetY - 8
        if (dot.y > dot.targetY + 8) dot.y = dot.targetY + 8
      }
    }
  }

  settleScatterDots(targetY: number, canvasWidth: number) {
    const completedChars = this.characters.filter(c => c.completed)
    const spacing = canvasWidth / (completedChars.length + 1)
    completedChars.forEach((ch, idx) => {
      const baseX = spacing * (idx + 1)
      for (const dot of ch.scatterDots) {
        if (!dot.settled && dot.y >= targetY - 5) {
          dot.settled = true
          dot.vx = 0
          dot.vy = 0
        }
        if (dot.settled) {
          dot.targetX = baseX + (Math.random() - 0.5) * 20
          dot.targetY = targetY - 15 - Math.random() * 30
        }
      }
    })
  }

  getBreathBrightness(p: Particle): number {
    if (p.covered) return 1.0
    const t = (Math.sin(p.phase) + 1) / 2
    return BREATH_MIN + t * (BREATH_MAX - BREATH_MIN)
  }

  getTabletRect() {
    return {
      left: this.tabletLeft,
      top: this.tabletTop,
      width: this.tabletWidth,
      height: this.tabletHeight,
      scale: this.scale
    }
  }

  getCompletedCount(): number {
    return this.characters.filter(c => c.completed).length
  }

  getTotalCount(): number {
    return this.characters.length
  }

  hoverScatterDot(x: number, y: number, bottomY: number): Character | null {
    for (const ch of this.characters) {
      if (!ch.completed) continue
      for (const dot of ch.scatterDots) {
        if (!dot.settled) continue
        const dx = x - dot.x
        const dy = y - dot.y
        if (Math.sqrt(dx * dx + dy * dy) < 12) {
          return ch
        }
      }
    }
    return null
  }
}
