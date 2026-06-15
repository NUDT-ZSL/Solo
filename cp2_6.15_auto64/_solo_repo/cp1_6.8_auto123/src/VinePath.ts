export interface VineNode {
  x: number
  y: number
  swayOffset: number
  swaySpeed: number
  growProgress: number
  isBranch: boolean
  branchDepth: number
}

export interface VineSegment {
  nodes: VineNode[]
  isMain: boolean
}

export interface ScaleDust {
  x: number
  y: number
  collected: boolean
  glowPhase: number
  pulseSpeed: number
  vineRef: number
}

export interface MovingPlatform {
  x: number
  y: number
  width: number
  height: number
  vx: number
  vy: number
  rangeX: number
  rangeY: number
  originX: number
  originY: number
  phase: number
}

export class VinePath {
  segments: VineSegment[] = []
  scaleDusts: ScaleDust[] = []
  movingPlatforms: MovingPlatform[] = []
  private nextGenX: number = 0
  private genStep: number = 300
  private canvasH: number = 600
  private swayTime: number = 0
  private growSpeed: number = 0.02

  constructor(canvasW: number, canvasH: number) {
    this.canvasH = canvasH
    this.nextGenX = 0
    this.generateInitialPaths(canvasW, canvasH)
  }

  private generateInitialPaths(canvasW: number, canvasH: number): void {
    const count = Math.ceil(canvasW / this.genStep) + 3
    for (let i = 0; i < count; i++) {
      this.generateSegment()
    }
  }

  private generateSegment(): void {
    const startX = this.nextGenX
    const yCenter = this.canvasH * 0.3 + Math.random() * this.canvasH * 0.4
    const nodeCount = 4 + Math.floor(Math.random() * 3)
    const nodes: VineNode[] = []

    for (let i = 0; i < nodeCount; i++) {
      const t = i / (nodeCount - 1)
      nodes.push({
        x: startX + t * this.genStep,
        y: yCenter + (Math.random() - 0.5) * 120,
        swayOffset: Math.random() * Math.PI * 2,
        swaySpeed: 0.3 + Math.random() * 0.5,
        growProgress: 0,
        isBranch: false,
        branchDepth: 0,
      })
    }

    const mainSegment: VineSegment = { nodes, isMain: true }
    this.segments.push(mainSegment)

    if (Math.random() < 0.6) {
      const branchStartIdx = 1 + Math.floor(Math.random() * (nodeCount - 2))
      const branchNodes: VineNode[] = []
      const branchDir = Math.random() < 0.5 ? -1 : 1
      const branchLen = 2 + Math.floor(Math.random() * 2)

      for (let i = 0; i <= branchLen; i++) {
        const baseNode = nodes[Math.min(branchStartIdx + i, nodeCount - 1)]
        branchNodes.push({
          x: baseNode.x + i * 15 * branchDir,
          y: baseNode.y + (i + 1) * (30 + Math.random() * 20) * branchDir,
          swayOffset: Math.random() * Math.PI * 2,
          swaySpeed: 0.4 + Math.random() * 0.4,
          growProgress: 0,
          isBranch: true,
          branchDepth: 1,
        })
      }

      const branchSegment: VineSegment = { nodes: branchNodes, isMain: false }
      this.segments.push(branchSegment)

      const lastNode = branchNodes[branchNodes.length - 1]
      this.scaleDusts.push({
        x: lastNode.x,
        y: lastNode.y,
        collected: false,
        glowPhase: Math.random() * Math.PI * 2,
        pulseSpeed: 1.5 + Math.random(),
        vineRef: this.segments.length - 1,
      })
    }

    if (Math.random() < 0.3 && this.segments.length > 2) {
      const refSeg = this.segments[this.segments.length - 1]
      const midIdx = Math.floor(refSeg.nodes.length / 2)
      const refNode = refSeg.nodes[midIdx]
      this.movingPlatforms.push({
        x: refNode.x,
        y: refNode.y + 40,
        width: 50,
        height: 8,
        vx: 0.5 + Math.random() * 0.5,
        vy: 0,
        rangeX: 60,
        rangeY: 0,
        originX: refNode.x,
        originY: refNode.y + 40,
        phase: Math.random() * Math.PI * 2,
      })
    }

    this.nextGenX += this.genStep
  }

  update(dt: number, cameraX: number, canvasW: number): void {
    this.swayTime += dt

    while (this.nextGenX < cameraX + canvasW + 600) {
      this.generateSegment()
    }

    for (const seg of this.segments) {
      for (const node of seg.nodes) {
        if (node.growProgress < 1) {
          node.growProgress = Math.min(1, node.growProgress + this.growSpeed)
        }
      }
    }

    for (const dust of this.scaleDusts) {
      dust.glowPhase += dust.pulseSpeed * dt
    }

    for (const plat of this.movingPlatforms) {
      plat.phase += dt * 1.5
      plat.x = plat.originX + Math.sin(plat.phase) * plat.rangeX
      plat.y = plat.originY + Math.sin(plat.phase * 0.7) * plat.rangeY
    }

    this.cleanup(cameraX - 400)
  }

  private cleanup(minX: number): void {
    this.segments = this.segments.filter(seg => {
      const lastX = seg.nodes[seg.nodes.length - 1].x
      return lastX > minX
    })
    this.scaleDusts = this.scaleDusts.filter(d => d.x > minX)
    this.movingPlatforms = this.movingPlatforms.filter(p => p.originX > minX)
  }

  getSwayedPos(node: VineNode): { x: number; y: number } {
    const sway = Math.sin(this.swayTime * node.swaySpeed + node.swayOffset) * 6 * node.growProgress
    return {
      x: node.x + sway,
      y: node.y + sway * 0.3,
    }
  }

  render(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    for (const seg of this.segments) {
      if (seg.nodes.length < 2) continue
      const firstSway = this.getSwayedPos(seg.nodes[0])
      const lastSway = this.getSwayedPos(seg.nodes[seg.nodes.length - 1])
      if (lastSway.x - camX < -50 || firstSway.x - camX > ctx.canvas.width + 50) continue

      ctx.beginPath()
      const s0 = this.getSwayedPos(seg.nodes[0])
      ctx.moveTo(s0.x - camX, s0.y - camY)

      for (let i = 1; i < seg.nodes.length; i++) {
        const prev = this.getSwayedPos(seg.nodes[i - 1])
        const curr = this.getSwayedPos(seg.nodes[i])
        const progress = curr.x === prev.x ? 1 : (seg.nodes[i].growProgress)

        const cpx = (prev.x + curr.x) / 2
        const cpy = (prev.y + curr.y) / 2 - 20 * (seg.isMain ? 1 : 0.5)

        const ex = prev.x + (curr.x - prev.x) * progress
        const ey = prev.y + (curr.y - prev.y) * progress

        ctx.quadraticCurveTo(cpx - camX, cpy - camY, ex - camX, ey - camY)
      }

      const lineWidth = seg.isMain ? 4 : 2.5
      const alpha = seg.isMain ? 0.6 : 0.4
      ctx.strokeStyle = `rgba(80, 220, 120, ${alpha})`
      ctx.lineWidth = lineWidth
      ctx.lineCap = 'round'
      ctx.stroke()

      ctx.strokeStyle = `rgba(120, 255, 160, ${alpha * 0.4})`
      ctx.lineWidth = lineWidth + 4
      ctx.stroke()
    }

    for (const dust of this.scaleDusts) {
      if (dust.collected) continue
      const dx = dust.x - camX
      const dy = dust.y - camY
      if (dx < -30 || dx > ctx.canvas.width + 30) continue

      const pulse = 0.7 + Math.sin(dust.glowPhase) * 0.3
      const glowR = 16 * pulse

      const grd = ctx.createRadialGradient(dx, dy, 1, dx, dy, glowR)
      grd.addColorStop(0, `rgba(255, 240, 150, ${0.9 * pulse})`)
      grd.addColorStop(0.5, `rgba(255, 200, 80, ${0.3 * pulse})`)
      grd.addColorStop(1, 'rgba(255, 180, 50, 0)')
      ctx.beginPath()
      ctx.arc(dx, dy, glowR, 0, Math.PI * 2)
      ctx.fillStyle = grd
      ctx.fill()

      ctx.beginPath()
      ctx.arc(dx, dy, 4 * pulse, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255, 250, 200, ${0.95 * pulse})`
      ctx.fill()
    }

    for (const plat of this.movingPlatforms) {
      const px = plat.x - camX
      const py = plat.y - camY
      if (px < -plat.width || px > ctx.canvas.width + plat.width) continue

      ctx.fillStyle = 'rgba(80, 200, 120, 0.5)'
      ctx.fillRect(px - plat.width / 2, py, plat.width, plat.height)
      ctx.strokeStyle = 'rgba(120, 255, 160, 0.4)'
      ctx.lineWidth = 1
      ctx.strokeRect(px - plat.width / 2, py, plat.width, plat.height)
    }
  }

  checkDustCollection(bx: number, by: number, radius: number): ScaleDust | null {
    for (const dust of this.scaleDusts) {
      if (dust.collected) continue
      const dx = dust.x - bx
      const dy = dust.y - by
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < radius + 12) {
        dust.collected = true
        return dust
      }
    }
    return null
  }
}
