export interface EchoParticle {
  x: number
  y: number
  angle: number
  orbitRadius: number
  orbitSpeed: number
  size: number
}

export interface Echo {
  id: number
  x: number
  y: number
  radius: number
  facing: number
  createdAt: number
  trajectory: { x: number; y: number; time: number; facing: number }[]
  startTime: number
  replayDuration: number
  existDuration: number
  phase: 'replaying' | 'static' | 'expired'
  particles: EchoParticle[]
  pulsePhase: number
  activatedPlateIds: Set<string>
}

export class EchoSystem {
  echoes: Echo[]
  maxEchoes: number
  private nextId: number

  constructor() {
    this.echoes = []
    this.maxEchoes = 3
    this.nextId = 1
  }

  createEcho(
    x: number,
    y: number,
    trajectory: { x: number; y: number; time: number; facing: number }[]
  ): Echo | null {
    if (this.echoes.filter((e) => e.phase !== 'expired').length >= this.maxEchoes) {
      const oldest = this.echoes
        .filter((e) => e.phase !== 'expired')
        .sort((a, b) => a.createdAt - b.createdAt)[0]
      if (oldest) {
        oldest.phase = 'expired'
        this.echoes = this.echoes.filter((e) => e.id !== oldest.id)
      }
    }

    const now = Date.now()
    const particles: EchoParticle[] = []
    const count = 35
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3
      particles.push({
        x: x,
        y: y,
        angle,
        orbitRadius: 4 + Math.random() * 15,
        orbitSpeed: 0.012 + Math.random() * 0.02,
        size: 1.5 + Math.random() * 2,
      })
    }

    const normalizedTrajectory = trajectory.length > 0
      ? trajectory.map((t) => ({ ...t, time: t.time - trajectory[0].time }))
      : [{ x, y, time: 0, facing: 0 }]

    const replayDuration = normalizedTrajectory.length > 0
      ? normalizedTrajectory[normalizedTrajectory.length - 1].time
      : 500

    const echo: Echo = {
      id: this.nextId++,
      x,
      y,
      radius: 20,
      facing: trajectory.length > 0 ? trajectory[trajectory.length - 1].facing : 0,
      createdAt: now,
      trajectory: normalizedTrajectory,
      startTime: now,
      replayDuration: Math.max(replayDuration, 500),
      existDuration: 62000,
      phase: 'replaying',
      particles,
      pulsePhase: 0,
      activatedPlateIds: new Set(),
    }

    this.echoes.push(echo)
    return echo
  }

  update(dt: number) {
    const now = Date.now()

    this.echoes = this.echoes.filter((echo) => {
      const age = now - echo.createdAt
      if (age > echo.existDuration) {
        echo.phase = 'expired'
        return false
      }

      echo.pulsePhase += dt * 0.004

      if (echo.phase === 'replaying') {
        const elapsed = now - echo.startTime
        if (elapsed >= echo.replayDuration) {
          echo.phase = 'static'
          if (echo.trajectory.length > 0) {
            const last = echo.trajectory[echo.trajectory.length - 1]
            echo.x = last.x
            echo.y = last.y
            echo.facing = last.facing
          }
        } else {
          let target = echo.trajectory[0]
          for (let i = 0; i < echo.trajectory.length; i++) {
            if (echo.trajectory[i].time <= elapsed) {
              target = echo.trajectory[i]
            } else {
              break
            }
          }
          if (target) {
            echo.x = target.x
            echo.y = target.y
            echo.facing = target.facing
          }
        }
      }

      echo.particles.forEach((p) => {
        const pulse = 1 + Math.sin(echo.pulsePhase + p.angle * 2) * 0.2
        const currentOrbit = p.orbitRadius * pulse
        p.angle += p.orbitSpeed
        const jitterX = (Math.random() - 0.5) * 1
        const jitterY = (Math.random() - 0.5) * 1
        p.x = echo.x + Math.cos(p.angle) * currentOrbit + jitterX
        p.y = echo.y + Math.sin(p.angle) * currentOrbit + jitterY
      })

      return true
    })
  }

  getActiveEchoes(): Echo[] {
    return this.echoes.filter((e) => e.phase !== 'expired')
  }

  clear() {
    this.echoes = []
  }

  draw(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    this.echoes.forEach((echo) => {
      if (echo.phase === 'expired') return

      const age = Date.now() - echo.createdAt
      const remaining = echo.existDuration - age
      let alpha = 0.4
      if (remaining < 5000) {
        alpha = 0.4 * (remaining / 5000) * (0.5 + 0.5 * Math.sin(age * 0.01))
      }

      const sx = echo.x - cameraX
      const sy = echo.y - cameraY

      ctx.save()
      ctx.globalAlpha = alpha * 0.6
      const gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, 55)
      gradient.addColorStop(0, 'rgba(0, 212, 255, 0.4)')
      gradient.addColorStop(0.5, 'rgba(0, 180, 255, 0.15)')
      gradient.addColorStop(1, 'rgba(0, 100, 200, 0)')
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(sx, sy, 55, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      ctx.save()
      ctx.globalAlpha = alpha
      ctx.strokeStyle = '#00d4ff'
      ctx.lineWidth = 2.5
      ctx.shadowColor = '#00d4ff'
      ctx.shadowBlur = 15
      ctx.beginPath()
      ctx.arc(sx, sy, echo.radius, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()

      echo.particles.forEach((p) => {
        const psx = p.x - cameraX
        const psy = p.y - cameraY
        ctx.save()
        ctx.globalAlpha = alpha
        ctx.shadowColor = '#00d4ff'
        ctx.shadowBlur = 6
        ctx.beginPath()
        ctx.arc(psx, psy, p.size, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(100, 220, 255, 0.9)'
        ctx.fill()
        ctx.restore()
      })

      ctx.save()
      ctx.globalAlpha = alpha
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.7)'
      ctx.lineWidth = 2
      ctx.shadowColor = '#00d4ff'
      ctx.shadowBlur = 6
      ctx.beginPath()
      ctx.moveTo(sx, sy)
      ctx.lineTo(sx + Math.cos(echo.facing) * 16, sy + Math.sin(echo.facing) * 16)
      ctx.stroke()
      ctx.beginPath()
      const fx = sx + Math.cos(echo.facing) * 16
      const fy = sy + Math.sin(echo.facing) * 16
      ctx.moveTo(fx, fy)
      ctx.lineTo(fx - Math.cos(echo.facing - 0.5) * 5, fy - Math.sin(echo.facing - 0.5) * 5)
      ctx.lineTo(fx - Math.cos(echo.facing + 0.5) * 5, fy - Math.sin(echo.facing + 0.5) * 5)
      ctx.closePath()
      ctx.fillStyle = 'rgba(0, 212, 255, 0.8)'
      ctx.fill()
      ctx.restore()

      if (echo.phase === 'replaying') {
        ctx.save()
        ctx.globalAlpha = alpha * 0.5
        for (let i = 0; i < echo.trajectory.length - 1; i += 5) {
          const a = echo.trajectory[i]
          const b = echo.trajectory[Math.min(i + 5, echo.trajectory.length - 1)]
          ctx.beginPath()
          ctx.moveTo(a.x - cameraX, a.y - cameraY)
          ctx.lineTo(b.x - cameraX, b.y - cameraY)
          ctx.strokeStyle = 'rgba(0, 212, 255, 0.25)'
          ctx.lineWidth = 2
          ctx.stroke()
        }
        ctx.restore()
      }
    })
  }
}
