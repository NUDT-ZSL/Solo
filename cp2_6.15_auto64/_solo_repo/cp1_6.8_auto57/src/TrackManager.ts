export interface Obstacle {
  x: number
  lane: number
  type: 'moving_block' | 'laser_fence'
  width: number
  height: number
  originY: number
  moveSpeed: number
  moveRange: number
  movePhase: number
  active: boolean
}

export interface Crystal {
  x: number
  lane: number
  collected: boolean
  glowPhase: number
  active: boolean
}

export interface TrackSegment {
  x: number
  type: 'normal' | 'broken' | 'moving'
  width: number
  moveOffset: number
  moveSpeed: number
  movePhase: number
  obstacles: Obstacle[]
  crystals: Crystal[]
}

const SEGMENT_WIDTH_MIN = 500
const SEGMENT_WIDTH_MAX = 900
const OBSTACLE_WIDTH = 40
const OBSTACLE_HEIGHT = 30
const CRYSTAL_SIZE = 16

export class TrackManager {
  segments: TrackSegment[] = []
  scrollX: number = 0
  speed: number = 300
  baseSpeed: number = 300
  difficulty: number = 1

  private canvasWidth: number = 0
  private canvasHeight: number = 0
  private laneHeight: number = 0
  private laneOffset: number = 0
  private laneYPositions: number[] = []
  private nextSegmentX: number = 0
  private score: number = 0

  init(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth
    this.canvasHeight = canvasHeight
    this.laneHeight = canvasHeight * 0.18
    this.laneOffset = canvasHeight * 0.25
    this.laneYPositions = []
    for (let i = 0; i < 3; i++) {
      this.laneYPositions.push(this.laneOffset + i * this.laneHeight)
    }
    this.segments = []
    this.scrollX = 0
    this.nextSegmentX = 0
    this.difficulty = 1
    this.speed = this.baseSpeed

    const initialSegments = Math.ceil(canvasWidth / SEGMENT_WIDTH_MIN) + 3
    for (let i = 0; i < initialSegments; i++) {
      this.generateSegment()
    }
  }

  setScore(score: number) {
    this.score = score
    this.difficulty = 1 + score / 500
    this.speed = this.baseSpeed + this.difficulty * 40
  }

  getLaneY(lane: number): number {
    return this.laneYPositions[lane] || this.laneYPositions[1]
  }

  private generateSegment() {
    const width = SEGMENT_WIDTH_MIN + Math.random() * (SEGMENT_WIDTH_MAX - SEGMENT_WIDTH_MIN)
    const types: TrackSegment['type'][] = ['normal', 'normal', 'normal', 'broken', 'moving']
    const type = types[Math.floor(Math.random() * Math.min(types.length, 2 + this.difficulty))]

    const segment: TrackSegment = {
      x: this.nextSegmentX,
      type,
      width,
      moveOffset: 0,
      moveSpeed: type === 'moving' ? 30 + Math.random() * 40 : 0,
      movePhase: Math.random() * Math.PI * 2,
      obstacles: [],
      crystals: [],
    }

    const obstacleCount = Math.min(
      Math.floor(Math.random() * (1 + this.difficulty * 0.5)),
      4
    )
    const usedLanes = new Set<number>()
    for (let i = 0; i < obstacleCount; i++) {
      let lane = Math.floor(Math.random() * 3)
      while (usedLanes.size < 3 && usedLanes.has(lane)) {
        lane = Math.floor(Math.random() * 3)
      }
      usedLanes.add(lane)

      const obsType: Obstacle['type'] = Math.random() > 0.5 ? 'moving_block' : 'laser_fence'
      const obsX = segment.x + 100 + Math.random() * (width - 200)
      const laneY = this.getLaneY(lane)

      segment.obstacles.push({
        x: obsX,
        lane,
        type: obsType,
        width: obsType === 'laser_fence' ? 6 : OBSTACLE_WIDTH,
        height: obsType === 'laser_fence' ? this.laneHeight * 0.6 : OBSTACLE_HEIGHT,
        originY: laneY,
        moveSpeed: obsType === 'moving_block' ? 40 + Math.random() * 30 : 0,
        moveRange: obsType === 'moving_block' ? 30 : 0,
        movePhase: Math.random() * Math.PI * 2,
        active: true,
      })
    }

    const crystalCount = 1 + Math.floor(Math.random() * 3)
    for (let i = 0; i < crystalCount; i++) {
      const lane = Math.floor(Math.random() * 3)
      const cx = segment.x + 50 + Math.random() * (width - 100)
      const isNearObstacle = segment.obstacles.some(
        o => Math.abs(o.x - cx) < 80 && o.lane === lane
      )
      if (!isNearObstacle) {
        segment.crystals.push({
          x: cx,
          lane,
          collected: false,
          glowPhase: Math.random() * Math.PI * 2,
          active: true,
        })
      }
    }

    this.segments.push(segment)
    this.nextSegmentX += width
  }

  update(dt: number) {
    this.scrollX += this.speed * dt

    for (const seg of this.segments) {
      if (seg.type === 'moving') {
        seg.movePhase += seg.moveSpeed * dt
      }
      for (const obs of seg.obstacles) {
        if (obs.type === 'moving_block' && obs.active) {
          obs.movePhase += obs.moveSpeed * dt
        }
      }
      for (const crystal of seg.crystals) {
        if (crystal.active) {
          crystal.glowPhase += dt * 3
        }
      }
    }

    while (this.segments.length > 0) {
      const first = this.segments[0]
      const screenX = first.x + first.width - this.scrollX
      if (screenX < -200) {
        this.segments.shift()
      } else {
        break
      }
    }

    const lastSegment = this.segments[this.segments.length - 1]
    if (lastSegment) {
      const rightEdge = lastSegment.x + lastSegment.width
      if (rightEdge - this.scrollX < this.canvasWidth + 1000) {
        this.generateSegment()
      }
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    ctx.save()

    for (let lane = 0; lane < 3; lane++) {
      const laneY = this.laneYPositions[lane]
      const trackTop = laneY - this.laneHeight * 0.5
      const trackBottom = laneY + this.laneHeight * 0.5

      ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, trackTop)
      ctx.lineTo(this.canvasWidth, trackTop)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, trackBottom)
      ctx.lineTo(this.canvasWidth, trackBottom)
      ctx.stroke()

      const laneGrad = ctx.createLinearGradient(0, trackTop, 0, trackBottom)
      laneGrad.addColorStop(0, 'rgba(0, 240, 255, 0.03)')
      laneGrad.addColorStop(0.5, 'rgba(0, 240, 255, 0.06)')
      laneGrad.addColorStop(1, 'rgba(0, 240, 255, 0.03)')
      ctx.fillStyle = laneGrad
      ctx.fillRect(0, trackTop, this.canvasWidth, this.laneHeight)
    }

    for (const seg of this.segments) {
      const segScreenX = seg.x - this.scrollX
      if (segScreenX > this.canvasWidth + 100 || segScreenX + seg.width < -100) continue

      const moveY = seg.type === 'moving'
        ? Math.sin(seg.movePhase) * 15
        : 0

      if (seg.type === 'broken') {
        const brokenY1 = this.laneOffset + this.laneHeight - 5
        const brokenY2 = this.laneOffset + this.laneHeight + this.laneHeight - 5
        ctx.strokeStyle = 'rgba(255, 23, 68, 0.5)'
        ctx.lineWidth = 2
        ctx.setLineDash([8, 12])
        ctx.beginPath()
        ctx.moveTo(segScreenX, brokenY1)
        ctx.lineTo(segScreenX + seg.width * 0.3, brokenY1)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(segScreenX + seg.width * 0.5, brokenY2)
        ctx.lineTo(segScreenX + seg.width * 0.8, brokenY2)
        ctx.stroke()
        ctx.setLineDash([])
      }

      for (const obs of seg.obstacles) {
        if (!obs.active) continue
        const obsScreenX = obs.x - this.scrollX
        if (obsScreenX > this.canvasWidth + 50 || obsScreenX < -50) continue

        const laneY = this.laneYPositions[obs.lane] + moveY
        const obsMoveY = obs.type === 'moving_block'
          ? Math.sin(obs.movePhase) * obs.moveRange
          : 0
        const obsY = laneY + obsMoveY

        ctx.save()
        if (obs.type === 'moving_block') {
          ctx.shadowColor = '#ff1744'
          ctx.shadowBlur = 10
          ctx.strokeStyle = '#ff1744'
          ctx.lineWidth = 2
          ctx.fillStyle = 'rgba(255, 23, 68, 0.2)'
          ctx.fillRect(
            obsScreenX - obs.width * 0.5,
            obsY - obs.height * 0.5,
            obs.width, obs.height
          )
          ctx.strokeRect(
            obsScreenX - obs.width * 0.5,
            obsY - obs.height * 0.5,
            obs.width, obs.height
          )
        } else {
          ctx.shadowColor = '#ff1744'
          ctx.shadowBlur = 12
          ctx.strokeStyle = '#ff1744'
          ctx.lineWidth = 3
          ctx.globalAlpha = 0.6 + Math.sin(Date.now() * 0.01) * 0.4
          ctx.beginPath()
          ctx.moveTo(obsScreenX, obsY - obs.height * 0.5)
          ctx.lineTo(obsScreenX, obsY + obs.height * 0.5)
          ctx.stroke()
          ctx.globalAlpha = 0.3 + Math.sin(Date.now() * 0.01) * 0.2
          ctx.fillStyle = '#ff1744'
          ctx.fillRect(
            obsScreenX - 3,
            obsY - obs.height * 0.5,
            6, obs.height
          )
        }
        ctx.restore()
      }

      for (const crystal of seg.crystals) {
        if (!crystal.active || crystal.collected) continue
        const crystalScreenX = crystal.x - this.scrollX
        if (crystalScreenX > this.canvasWidth + 50 || crystalScreenX < -50) continue

        const laneY = this.laneYPositions[crystal.lane] + moveY
        const glow = 0.5 + Math.sin(crystal.glowPhase) * 0.5
        const size = CRYSTAL_SIZE * (0.8 + glow * 0.4)

        ctx.save()
        ctx.shadowColor = '#00f0ff'
        ctx.shadowBlur = 15 + glow * 10
        ctx.fillStyle = `rgba(0, 240, 255, ${0.6 + glow * 0.4})`
        ctx.beginPath()
        ctx.moveTo(crystalScreenX, laneY - size)
        ctx.lineTo(crystalScreenX + size * 0.6, laneY)
        ctx.lineTo(crystalScreenX, laneY + size * 0.4)
        ctx.lineTo(crystalScreenX - size * 0.6, laneY)
        ctx.closePath()
        ctx.fill()

        ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + glow * 0.3})`
        ctx.beginPath()
        ctx.moveTo(crystalScreenX, laneY - size * 0.5)
        ctx.lineTo(crystalScreenX + size * 0.2, laneY)
        ctx.lineTo(crystalScreenX, laneY + size * 0.15)
        ctx.lineTo(crystalScreenX - size * 0.2, laneY)
        ctx.closePath()
        ctx.fill()
        ctx.restore()
      }
    }

    ctx.restore()
  }

  getActiveObstacles(): Array<Obstacle & { screenY: number }> {
    const result: Array<Obstacle & { screenY: number }> = []
    for (const seg of this.segments) {
      const moveY = seg.type === 'moving'
        ? Math.sin(seg.movePhase) * 15
        : 0
      for (const obs of seg.obstacles) {
        if (!obs.active) continue
        const screenX = obs.x - this.scrollX
        if (screenX > this.canvasWidth + 50 || screenX < -100) continue
        const laneY = this.laneYPositions[obs.lane] + moveY
        const obsMoveY = obs.type === 'moving_block'
          ? Math.sin(obs.movePhase) * obs.moveRange
          : 0
        result.push({ ...obs, screenY: laneY + obsMoveY })
      }
    }
    return result
  }

  getActiveCrystals(): Array<Crystal & { screenY: number }> {
    const result: Array<Crystal & { screenY: number }> = []
    for (const seg of this.segments) {
      const moveY = seg.type === 'moving'
        ? Math.sin(seg.movePhase) * 15
        : 0
      for (const crystal of seg.crystals) {
        if (!crystal.active || crystal.collected) continue
        const screenX = crystal.x - this.scrollX
        if (screenX > this.canvasWidth + 50 || screenX < -100) continue
        const laneY = this.laneYPositions[crystal.lane] + moveY
        result.push({ ...crystal, screenY: laneY })
      }
    }
    return result
  }
}
