import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import type { PlayerState, TrailParticle } from './PlayerController'
import type { Enemy } from './EnemyAI'
import type { Spore, CollectFeedback } from './CollectibleSystem'

interface Coral {
  x: number
  y: number
  branches: { angle: number; length: number; width: number; curve: number }[]
  color: string
  alpha: number
  baseWidth: number
}

const CORAL_COLORS = [
  'rgba(255,110,180,0.35)',
  'rgba(127,255,127,0.35)',
  'rgba(191,127,255,0.35)',
  'rgba(127,255,255,0.3)',
  'rgba(255,191,127,0.3)',
]

const AREA_NAMES = ['珊瑚浅滩', '海底峡谷', '沉船遗迹']
const AREA_BG_COLORS = [
  ['#0a1628', '#020810'],
  ['#080e22', '#020408'],
  ['#0c0a1e', '#030206'],
]

interface GameCanvasProps {
  areaIndex: number
  playerRef: React.MutableRefObject<PlayerState>
  trailRef: React.MutableRefObject<TrailParticle[]>
  enemiesRef: React.MutableRefObject<Enemy[]>
  sporesRef: React.MutableRefObject<Spore[]>
  feedbacksRef: React.MutableRefObject<CollectFeedback[]>
  isPlayerChased: boolean
  onReady: () => void
}

export interface GameCanvasHandle {
  getCanvas: () => HTMLCanvasElement | null
}

const GameCanvas = forwardRef<GameCanvasHandle, GameCanvasProps>(
  ({ areaIndex, playerRef, trailRef, enemiesRef, sporesRef, feedbacksRef, isPlayerChased, onReady }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const coralsRef = useRef<Coral[]>([])
    const ambientParticlesRef = useRef<{ x: number; y: number; vx: number; vy: number; size: number; alpha: number; color: string }[]>([])
    const warningAlphaRef = useRef(0)
    const timeRef = useRef(0)
    const initializedRef = useRef(false)

    useImperativeHandle(ref, () => ({
      getCanvas: () => canvasRef.current,
    }))

    const generateCorals = useCallback((w: number, h: number) => {
      const corals: Coral[] = []
      const count = 8 + Math.floor(Math.random() * 6)
      for (let i = 0; i < count; i++) {
        const branchCount = 3 + Math.floor(Math.random() * 4)
        const branches: Coral['branches'] = []
        for (let j = 0; j < branchCount; j++) {
          branches.push({
            angle: -Math.PI / 2 + (Math.random() - 0.5) * 1.2,
            length: 30 + Math.random() * 60,
            width: 0.5 + Math.random() * 0.5,
            curve: (Math.random() - 0.5) * 0.8,
          })
        }
        corals.push({
          x: 40 + Math.random() * (w - 80),
          y: h - 20 - Math.random() * 80,
          branches,
          color: CORAL_COLORS[Math.floor(Math.random() * CORAL_COLORS.length)],
          alpha: 0.2 + Math.random() * 0.3,
          baseWidth: 8 + Math.random() * 12,
        })
      }
      coralsRef.current = corals
    }, [])

    const generateAmbientParticles = useCallback((w: number, h: number) => {
      const particles: typeof ambientParticlesRef.current = []
      const count = 80
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.3,
          vy: -0.1 - Math.random() * 0.3,
          size: 1 + Math.random() * 2,
          alpha: 0.1 + Math.random() * 0.3,
          color: Math.random() > 0.5 ? '#4488aa' : '#6699bb',
        })
      }
      ambientParticlesRef.current = particles
    }, [])

    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const resize = () => {
        canvas.width = window.innerWidth
        canvas.height = window.innerHeight
        if (!initializedRef.current) {
          generateCorals(canvas.width, canvas.height)
          generateAmbientParticles(canvas.width, canvas.height)
          initializedRef.current = true
          onReady()
        }
      }
      resize()
      window.addEventListener('resize', resize)
      return () => window.removeEventListener('resize', resize)
    }, [generateCorals, generateAmbientParticles, onReady])

    useEffect(() => {
      if (initializedRef.current && canvasRef.current) {
        generateCorals(canvasRef.current.width, canvasRef.current.height)
        generateAmbientParticles(canvasRef.current.width, canvasRef.current.height)
      }
    }, [areaIndex, generateCorals, generateAmbientParticles])

    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')!
      let animId = 0
      let lastTime = performance.now()

      const drawBackground = (w: number, h: number) => {
        const colors = AREA_BG_COLORS[areaIndex] || AREA_BG_COLORS[0]
        const grad = ctx.createLinearGradient(0, 0, 0, h)
        grad.addColorStop(0, colors[0])
        grad.addColorStop(1, colors[1])
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, w, h)
      }

      const drawAmbientParticles = (w: number, h: number, dt: number) => {
        for (const p of ambientParticlesRef.current) {
          p.x += p.vx
          p.y += p.vy
          if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w }
          if (p.x < -10) p.x = w + 10
          if (p.x > w + 10) p.x = -10

          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          ctx.fillStyle = p.color
          ctx.globalAlpha = p.alpha * (0.5 + 0.5 * Math.sin(timeRef.current * 2 + p.x * 0.01))
          ctx.fill()
        }
        ctx.globalAlpha = 1
      }

      const drawCoral = (coral: Coral) => {
        ctx.save()
        ctx.translate(coral.x, coral.y)

        for (const branch of coral.branches) {
          ctx.beginPath()
          ctx.moveTo(0, 0)
          const steps = 12
          let cx = 0, cy = 0
          const segLen = branch.length / steps
          for (let i = 1; i <= steps; i++) {
            const t = i / steps
            const wobble = Math.sin(t * Math.PI + timeRef.current * 0.5) * branch.curve * 10
            cx += Math.cos(branch.angle + wobble * 0.02) * segLen
            cy += Math.sin(branch.angle + wobble * 0.02) * segLen
            const width = coral.baseWidth * branch.width * (1 - t * 0.8)
            ctx.lineTo(cx, cy)
          }
          ctx.strokeStyle = coral.color
          ctx.lineWidth = coral.baseWidth * branch.width
          ctx.lineCap = 'round'
          ctx.globalAlpha = coral.alpha
          ctx.stroke()

          const tipX = cx
          const tipY = cy
          const glowGrad = ctx.createRadialGradient(tipX, tipY, 0, tipX, tipY, 15)
          glowGrad.addColorStop(0, coral.color)
          glowGrad.addColorStop(1, 'transparent')
          ctx.fillStyle = glowGrad
          ctx.globalAlpha = coral.alpha * 0.6
          ctx.beginPath()
          ctx.arc(tipX, tipY, 15, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
        ctx.globalAlpha = 1
      }

      const drawSpore = (spore: Spore) => {
        if (spore.collected && spore.collectAnim <= 0) return
        const pulse = 1 + Math.sin(spore.pulsePhase) * 0.2
        const r = spore.radius * pulse
        const alpha = spore.collected ? spore.collectAnim : 1

        ctx.save()
        ctx.globalAlpha = alpha * 0.4
        const glowGrad = ctx.createRadialGradient(spore.x, spore.y, 0, spore.x, spore.y, r * 3)
        glowGrad.addColorStop(0, spore.color)
        glowGrad.addColorStop(1, 'transparent')
        ctx.fillStyle = glowGrad
        ctx.beginPath()
        ctx.arc(spore.x, spore.y, r * 3, 0, Math.PI * 2)
        ctx.fill()

        ctx.globalAlpha = alpha * 0.9
        ctx.fillStyle = spore.color
        ctx.beginPath()
        ctx.arc(spore.x, spore.y, r, 0, Math.PI * 2)
        ctx.fill()

        ctx.globalAlpha = alpha
        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.arc(spore.x, spore.y, r * 0.4, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }

      const drawCollectFeedback = (fb: CollectFeedback) => {
        const alpha = Math.max(0, fb.life / fb.maxLife)
        ctx.save()
        ctx.globalAlpha = alpha * 0.5
        const glowGrad = ctx.createRadialGradient(fb.x, fb.y, 0, fb.x, fb.y, 40 * (1 - alpha + 0.5))
        glowGrad.addColorStop(0, fb.color)
        glowGrad.addColorStop(1, 'transparent')
        ctx.fillStyle = glowGrad
        ctx.beginPath()
        ctx.arc(fb.x, fb.y, 40 * (1 - alpha + 0.5), 0, Math.PI * 2)
        ctx.fill()

        for (const p of fb.particles) {
          if (p.life <= 0) continue
          ctx.globalAlpha = Math.max(0, p.life) * alpha
          ctx.fillStyle = fb.color
          ctx.beginPath()
          ctx.arc(p.x, p.y, 2 * Math.max(0, p.life), 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
      }

      const drawPlayer = (p: PlayerState) => {
        if (!p.alive) return
        ctx.save()

        ctx.globalAlpha = 0.15
        const lightGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 120)
        lightGrad.addColorStop(0, '#7fdbff')
        lightGrad.addColorStop(0.5, '#3a7dbf')
        lightGrad.addColorStop(1, 'transparent')
        ctx.fillStyle = lightGrad
        ctx.beginPath()
        ctx.arc(p.x, p.y, 120, 0, Math.PI * 2)
        ctx.fill()

        ctx.globalAlpha = 1
        ctx.translate(p.x, p.y)
        ctx.rotate(p.angle)

        ctx.fillStyle = '#b4e7ff'
        ctx.beginPath()
        ctx.ellipse(0, 0, 14, 7, 0, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = '#7fdbff'
        ctx.beginPath()
        ctx.moveTo(-10, 0)
        ctx.lineTo(-18, -7)
        ctx.lineTo(-18, 7)
        ctx.closePath()
        ctx.fill()

        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.arc(6, -2, 2.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#0a1628'
        ctx.beginPath()
        ctx.arc(7, -2, 1.2, 0, Math.PI * 2)
        ctx.fill()

        ctx.restore()
      }

      const drawTrail = (particles: TrailParticle[]) => {
        for (const tp of particles) {
          ctx.save()
          ctx.globalAlpha = tp.alpha
          ctx.fillStyle = tp.color
          ctx.beginPath()
          ctx.arc(tp.x, tp.y, tp.size, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        }
      }

      const drawEnemy = (enemy: Enemy) => {
        ctx.save()
        ctx.translate(enemy.x, enemy.y)
        ctx.rotate(enemy.angle)

        const isEel = enemy.type === 'eel'
        const bodyLen = enemy.bodyLength
        const bodyW = isEel ? 6 : 14
        const glowIntensity = 0.3 + Math.sin(enemy.glowPhase) * 0.2

        if (enemy.state === 'stunned') {
          ctx.globalAlpha = 0.4 + Math.sin(timeRef.current * 15) * 0.2
        }

        if (isEel) {
          ctx.fillStyle = '#2a4a6a'
          ctx.beginPath()
          ctx.ellipse(0, 0, bodyLen * 0.5, bodyW, 0, 0, Math.PI * 2)
          ctx.fill()

          const stripeCount = 5
          for (let i = 0; i < stripeCount; i++) {
            const sx = -bodyLen * 0.3 + (i / stripeCount) * bodyLen * 0.6
            ctx.fillStyle = `rgba(100,200,255,${glowIntensity})`
            ctx.beginPath()
            ctx.ellipse(sx, 0, 3, bodyW - 1, 0, 0, Math.PI * 2)
            ctx.fill()
          }

          ctx.fillStyle = '#3a6a9a'
          ctx.beginPath()
          ctx.moveTo(bodyLen * 0.4, 0)
          ctx.lineTo(bodyLen * 0.6, -5)
          ctx.lineTo(bodyLen * 0.6, 5)
          ctx.closePath()
          ctx.fill()
        } else {
          ctx.fillStyle = '#4a5a6a'
          ctx.beginPath()
          ctx.moveTo(bodyLen * 0.5, 0)
          ctx.quadraticCurveTo(bodyLen * 0.2, -bodyW, -bodyLen * 0.3, -bodyW * 0.6)
          ctx.lineTo(-bodyLen * 0.5, 0)
          ctx.lineTo(-bodyLen * 0.3, bodyW * 0.6)
          ctx.quadraticCurveTo(bodyLen * 0.2, bodyW, bodyLen * 0.5, 0)
          ctx.fill()

          ctx.fillStyle = '#8a9aaa'
          ctx.beginPath()
          ctx.moveTo(bodyLen * 0.1, -bodyW * 0.5)
          ctx.lineTo(bodyLen * 0.1, bodyW * 0.5)
          ctx.lineTo(-bodyLen * 0.5, bodyW * 0.3)
          ctx.lineTo(-bodyLen * 0.5, -bodyW * 0.3)
          ctx.closePath()
          ctx.fill()

          const stripeCount = 4
          for (let i = 0; i < stripeCount; i++) {
            const sx = -bodyLen * 0.1 + (i / stripeCount) * bodyLen * 0.4
            ctx.fillStyle = `rgba(180,220,255,${glowIntensity})`
            ctx.beginPath()
            ctx.ellipse(sx, 0, 2, bodyW * 0.5, 0, 0, Math.PI * 2)
            ctx.fill()
          }

          ctx.fillStyle = '#3a4a5a'
          ctx.beginPath()
          ctx.moveTo(bodyLen * 0.5, 0)
          ctx.lineTo(bodyLen * 0.3, -8)
          ctx.lineTo(bodyLen * 0.15, 0)
          ctx.closePath()
          ctx.fill()
          ctx.beginPath()
          ctx.moveTo(bodyLen * 0.5, 0)
          ctx.lineTo(bodyLen * 0.3, 8)
          ctx.lineTo(bodyLen * 0.15, 0)
          ctx.closePath()
          ctx.fill()
        }

        ctx.restore()
        ctx.globalAlpha = 1

        if (enemy.state !== 'stunned') {
          ctx.save()
          ctx.translate(enemy.x, enemy.y)

          const visionStartAngle = enemy.angle - enemy.visionAngle / 2
          const visionEndAngle = enemy.angle + enemy.visionAngle / 2
          const visionAlpha = enemy.state === 'chase' ? 0.15 : 0.06

          ctx.fillStyle = enemy.state === 'chase'
            ? `rgba(255,60,60,${visionAlpha})`
            : `rgba(255,200,100,${visionAlpha})`
          ctx.beginPath()
          ctx.moveTo(0, 0)
          ctx.arc(0, 0, enemy.visionRange, visionStartAngle, visionEndAngle)
          ctx.closePath()
          ctx.fill()

          ctx.strokeStyle = enemy.state === 'chase'
            ? `rgba(255,60,60,${visionAlpha * 2})`
            : `rgba(255,200,100,${visionAlpha * 2})`
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.arc(0, 0, enemy.visionRange, visionStartAngle, visionEndAngle)
          ctx.stroke()

          ctx.restore()
        }
      }

      const drawFlashEffect = (p: PlayerState) => {
        if (!p.flashActive || p.flashRadius <= 0) return
        const progress = 1 - p.flashTimer / 0.4
        const currentRadius = p.flashRadius * Math.min(1, progress * 2)
        const alpha = 0.3 * (1 - progress)

        ctx.save()
        ctx.globalAlpha = alpha
        const flashGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, currentRadius)
        flashGrad.addColorStop(0, '#ffffff')
        flashGrad.addColorStop(0.3, '#7fdbff')
        flashGrad.addColorStop(1, 'transparent')
        ctx.fillStyle = flashGrad
        ctx.beginPath()
        ctx.arc(p.x, p.y, currentRadius, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }

      const drawWarningVignette = (w: number, h: number) => {
        if (!isPlayerChased) {
          warningAlphaRef.current = Math.max(0, warningAlphaRef.current - 0.02)
        } else {
          warningAlphaRef.current = Math.min(0.5, warningAlphaRef.current + 0.03)
        }
        if (warningAlphaRef.current < 0.01) return

        const alpha = warningAlphaRef.current * (0.5 + 0.5 * Math.sin(timeRef.current * 4))
        const edgeSize = 80
        const grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.min(w, h) * 0.7)
        grad.addColorStop(0, 'transparent')
        grad.addColorStop(1, `rgba(180,20,20,${alpha})`)
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, w, h)
      }

      const drawDarkness = (p: PlayerState, w: number, h: number) => {
        const lightRadius = 180
        const grad = ctx.createRadialGradient(p.x, p.y, lightRadius * 0.3, p.x, p.y, lightRadius)
        grad.addColorStop(0, 'rgba(0,0,0,0)')
        grad.addColorStop(0.7, 'rgba(0,0,0,0.3)')
        grad.addColorStop(1, 'rgba(0,0,0,0.65)')
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, w, h)
      }

      const frame = (now: number) => {
        const dt = Math.min((now - lastTime) / 1000, 0.05)
        lastTime = now
        timeRef.current += dt

        const w = canvas.width
        const h = canvas.height

        ctx.clearRect(0, 0, w, h)

        drawBackground(w, h)
        drawAmbientParticles(w, h, dt)

        for (const coral of coralsRef.current) {
          drawCoral(coral)
        }

        const p = playerRef.current
        drawDarkness(p, w, h)

        for (const spore of sporesRef.current) {
          drawSpore(spore)
        }

        for (const fb of feedbacksRef.current) {
          drawCollectFeedback(fb)
        }

        drawTrail(trailRef.current)

        for (const enemy of enemiesRef.current) {
          drawEnemy(enemy)
        }

        drawPlayer(p)
        drawFlashEffect(p)
        drawWarningVignette(w, h)

        animId = requestAnimationFrame(frame)
      }

      animId = requestAnimationFrame(frame)
      return () => cancelAnimationFrame(animId)
    }, [areaIndex, playerRef, trailRef, enemiesRef, sporesRef, feedbacksRef, isPlayerChased])

    return (
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />
    )
  },
)

GameCanvas.displayName = 'GameCanvas'
export default GameCanvas
