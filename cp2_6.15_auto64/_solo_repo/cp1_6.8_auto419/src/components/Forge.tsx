import { useRef, useEffect, useCallback } from 'react'
import { useGameStore, type Particle, ORE_COLORS, ALLOY_COLORS, RECIPES } from '@/store/gameStore'

const MAX_PARTICLES = 500

function createParticle(
  x: number,
  y: number,
  type: Particle['type'],
  color?: string,
): Particle {
  const angle = Math.random() * Math.PI * 2
  const speed = type === 'fragment' ? 2 + Math.random() * 4 : 0.3 + Math.random() * 1.5
  const life = type === 'flame' ? 30 + Math.random() * 30 : type === 'fragment' ? 40 + Math.random() * 30 : 20 + Math.random() * 40

  const colors: Record<Particle['type'], string> = {
    spark: '#FFD700',
    flame: ['#FF6B35', '#FF4500', '#FFD700'][Math.floor(Math.random() * 3)],
    steam: 'rgba(200,200,200,0.4)',
    glow: color ?? '#FFD700',
    fragment: color ?? '#FFD700',
  }

  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: type === 'flame' ? -(1 + Math.random() * 2) : Math.sin(angle) * speed,
    life,
    maxLife: life,
    size: type === 'fragment' ? 2 + Math.random() * 4 : type === 'flame' ? 4 + Math.random() * 6 : 1 + Math.random() * 3,
    color: color ?? colors[type],
    alpha: 1,
    type,
  }
}

export default function Forge() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const frameRef = useRef(0)
  const forges = useGameStore((s) => s.forges)
  const buildingForge = useGameStore((s) => s.buildingForge)
  const buildForge = useGameStore((s) => s.buildForge)
  const completionEffects = useGameStore((s) => s.completionEffects)
  const removeCompletionEffect = useGameStore((s) => s.removeCompletionEffect)
  const selectedForgeId = useGameStore((s) => s.selectedForgeId)
  const selectForge = useGameStore((s) => s.selectForge)

  const addParticles = useCallback((x: number, y: number, type: Particle['type'], count: number, color?: string) => {
    const ps = particlesRef.current
    for (let i = 0; i < count; i++) {
      if (ps.length >= MAX_PARTICLES) {
        const idx = ps.findIndex((p) => p.life <= 0)
        if (idx >= 0) ps[idx] = createParticle(x, y, type, color)
      } else {
        ps.push(createParticle(x, y, type, color))
      }
    }
  }, [])

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      if (buildingForge) {
        buildForge(x, y)
        addParticles(x, y, 'steam', 20)
        addParticles(x, y, 'spark', 15)
        return
      }

      const clickedForge = forges.find((f) => {
        const dx = f.position.x - x
        const dy = f.position.y - y
        return Math.sqrt(dx * dx + dy * dy) < 60
      })
      selectForge(clickedForge?.id ?? null)
    },
    [buildingForge, buildForge, addParticles, forges, selectForge],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let rafId: number

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const drawBackground = (w: number, h: number) => {
      const grad = ctx.createLinearGradient(0, 0, 0, h)
      grad.addColorStop(0, '#1a0e08')
      grad.addColorStop(0.5, '#2C1810')
      grad.addColorStop(1, '#8B1A1A')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, w, h)

      ctx.globalAlpha = 0.03
      for (let i = 0; i < 50; i++) {
        const cx = Math.random() * w
        const cy = Math.random() * h
        const r = 50 + Math.random() * 150
        const radGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
        radGrad.addColorStop(0, '#FF6B35')
        radGrad.addColorStop(1, 'transparent')
        ctx.fillStyle = radGrad
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2)
      }
      ctx.globalAlpha = 1
    }

    const drawForge = (
      fx: number,
      fy: number,
      level: number,
      status: string,
      progress: number,
      activeRecipe: string | null,
      isSelected: boolean,
      t: number,
    ) => {
      const baseW = 80 + level * 15
      const baseH = 90 + level * 10

      ctx.save()

      if (isSelected) {
        ctx.shadowColor = '#FFD700'
        ctx.shadowBlur = 20
      }

      const bodyGrad = ctx.createLinearGradient(fx - baseW / 2, fy - baseH / 2, fx + baseW / 2, fy + baseH / 2)
      bodyGrad.addColorStop(0, '#5C4033')
      bodyGrad.addColorStop(0.5, '#4A3728')
      bodyGrad.addColorStop(1, '#3B2A1A')

      ctx.beginPath()
      const br = 8
      const lx = fx - baseW / 2
      const ly = fy - baseH / 2
      ctx.moveTo(lx + br, ly)
      ctx.lineTo(lx + baseW - br, ly)
      ctx.quadraticCurveTo(lx + baseW, ly, lx + baseW, ly + br)
      ctx.lineTo(lx + baseW, ly + baseH - br)
      ctx.quadraticCurveTo(lx + baseW, ly + baseH, lx + baseW - br, ly + baseH)
      ctx.lineTo(lx + br, ly + baseH)
      ctx.quadraticCurveTo(lx, ly + baseH, lx, ly + baseH - br)
      ctx.lineTo(lx, ly + br)
      ctx.quadraticCurveTo(lx, ly, lx + br, ly)
      ctx.closePath()
      ctx.fillStyle = bodyGrad
      ctx.fill()
      ctx.strokeStyle = '#B87333'
      ctx.lineWidth = 2
      ctx.stroke()

      ctx.shadowBlur = 0

      const openingW = baseW * 0.6
      const openingH = baseH * 0.35
      const ox = fx - openingW / 2
      const oy = fy - baseH / 2 + 10

      if (status === 'smelting' || status === 'idle') {
        const fireIntensity = status === 'smelting' ? 0.7 + Math.sin(t * 0.05) * 0.3 : 0.2 + Math.sin(t * 0.02) * 0.1

        const fireGrad = ctx.createRadialGradient(fx, oy + openingH, 5, fx, oy + openingH * 0.3, openingW * 0.6)
        fireGrad.addColorStop(0, `rgba(255, 215, 0, ${fireIntensity})`)
        fireGrad.addColorStop(0.4, `rgba(255, 107, 53, ${fireIntensity * 0.8})`)
        fireGrad.addColorStop(0.7, `rgba(255, 69, 0, ${fireIntensity * 0.5})`)
        fireGrad.addColorStop(1, `rgba(139, 26, 26, ${fireIntensity * 0.2})`)

        ctx.beginPath()
        const flicker = Math.sin(t * 0.1) * 5
        ctx.ellipse(fx, oy + openingH * 0.5 + flicker, openingW / 2, openingH / 2, 0, 0, Math.PI * 2)
        ctx.fillStyle = fireGrad
        ctx.fill()

        if (status === 'smelting') {
          for (let i = 0; i < 3; i++) {
            const flameX = fx + (Math.random() - 0.5) * openingW * 0.8
            const flameY = oy + Math.random() * openingH * 0.5
            addParticles(flameX, flameY, 'flame', 1)
          }
          if (Math.random() < 0.15) {
            addParticles(fx + (Math.random() - 0.5) * openingW * 0.5, oy, 'spark', 1)
          }
        }
      }

      if (status === 'smelting' && activeRecipe) {
        const recipe = RECIPES.find((r) => r.id === activeRecipe)
        if (recipe) {
          const barW = baseW - 10
          const barH = 8
          const barX = fx - barW / 2
          const barY = fy + baseH / 2 + 8

          ctx.fillStyle = 'rgba(0,0,0,0.6)'
          ctx.beginPath()
          ctx.roundRect(barX, barY, barW, barH, 4)
          ctx.fill()

          const fillGrad = ctx.createLinearGradient(barX, barY, barX + barW * progress, barY)
          fillGrad.addColorStop(0, '#FF6B35')
          fillGrad.addColorStop(1, '#FFD700')
          ctx.fillStyle = fillGrad
          ctx.beginPath()
          ctx.roundRect(barX, barY, barW * progress, barH, 4)
          ctx.fill()

          ctx.strokeStyle = '#B87333'
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.roundRect(barX, barY, barW, barH, 4)
          ctx.stroke()

          const particleX = barX + barW * progress
          addParticles(particleX, barY + barH / 2, 'glow', 1)
        }
      }

      if (status === 'upgrading') {
        const gearAngle = t * 0.05
        const gearX = fx
        const gearY = fy
        ctx.save()
        ctx.translate(gearX, gearY)
        ctx.rotate(gearAngle)
        ctx.strokeStyle = '#B87333'
        ctx.lineWidth = 2
        const teeth = 8
        const innerR = 15
        const outerR = 22
        ctx.beginPath()
        for (let i = 0; i < teeth; i++) {
          const a1 = (i / teeth) * Math.PI * 2
          const a2 = ((i + 0.5) / teeth) * Math.PI * 2
          ctx.lineTo(Math.cos(a1) * outerR, Math.sin(a1) * outerR)
          ctx.lineTo(Math.cos(a2) * innerR, Math.sin(a2) * innerR)
        }
        ctx.closePath()
        ctx.stroke()
        ctx.restore()

        if (Math.random() < 0.2) {
          addParticles(fx + (Math.random() - 0.5) * 40, fy - baseH / 2 - 10, 'steam', 2)
        }
      }

      ctx.fillStyle = '#B87333'
      ctx.font = 'bold 11px "Cinzel", serif'
      ctx.textAlign = 'center'
      ctx.fillText(`Lv.${level}`, fx, fy + baseH / 2 + 24)

      ctx.restore()
    }

    const drawParticles = () => {
      const ps = particlesRef.current
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i]
        p.life -= 1
        if (p.life <= 0) {
          ps.splice(i, 1)
          continue
        }

        p.x += p.vx
        p.y += p.vy
        if (p.type === 'flame') {
          p.vy -= 0.05
          p.vx += (Math.random() - 0.5) * 0.3
        } else if (p.type === 'steam') {
          p.vy -= 0.08
          p.vx += (Math.random() - 0.5) * 0.2
        } else if (p.type === 'fragment') {
          p.vy += 0.1
        }

        p.alpha = p.life / p.maxLife

        ctx.save()
        ctx.globalAlpha = p.alpha

        if (p.type === 'flame') {
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size)
          grad.addColorStop(0, p.color)
          grad.addColorStop(1, 'transparent')
          ctx.fillStyle = grad
          ctx.fillRect(p.x - p.size, p.y - p.size, p.size * 2, p.size * 2)
        } else if (p.type === 'glow') {
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2)
          grad.addColorStop(0, p.color)
          grad.addColorStop(1, 'transparent')
          ctx.fillStyle = grad
          ctx.fillRect(p.x - p.size * 2, p.y - p.size * 2, p.size * 4, p.size * 4)
        } else if (p.type === 'fragment') {
          ctx.fillStyle = p.color
          ctx.fillRect(p.x, p.y, p.size, p.size)
        } else {
          ctx.fillStyle = p.color
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          ctx.fill()
        }

        ctx.restore()
      }
    }

    const drawCompletionEffects = (t: number) => {
      const now = Date.now()
      const effects = useGameStore.getState().completionEffects
      for (const eff of effects) {
        const elapsed = now - eff.time
        if (elapsed > 1500) {
          removeCompletionEffect(eff.forgeId)
          continue
        }
        const forge = forges.find((f) => f.id === eff.forgeId)
        if (!forge) continue
        const progress = elapsed / 1500

        ctx.save()
        ctx.globalAlpha = 1 - progress
        const radius = 30 + progress * 80
        const grad = ctx.createRadialGradient(forge.position.x, forge.position.y, 0, forge.position.x, forge.position.y, radius)
        grad.addColorStop(0, '#FFD700')
        grad.addColorStop(0.5, 'rgba(255, 215, 0, 0.3)')
        grad.addColorStop(1, 'transparent')
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(forge.position.x, forge.position.y, radius, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()

        if (elapsed < 300 && Math.random() < 0.5) {
          const recipe = RECIPES.find((r) => r.id === forge.activeRecipe)
          const color = recipe ? ALLOY_COLORS[recipe.output.type] : '#FFD700'
          addParticles(forge.position.x, forge.position.y, 'fragment', 3, color)
        }
      }
    }

    const drawOreCrystals = (w: number, h: number, t: number) => {
      const oreTypes = Object.entries(ORE_COLORS) as [string, string][]
      const startX = w * 0.05
      const endX = w * 0.95
      const baseY = h * 0.85

      oreTypes.forEach(([ore, color], i) => {
        const x = startX + (endX - startX) * ((i + 0.5) / oreTypes.length)
        const floatY = Math.sin(t * 0.02 + i) * 3
        const y = baseY + floatY

        ctx.save()
        ctx.globalAlpha = 0.6

        const crystalGrad = ctx.createLinearGradient(x, y - 20, x, y + 20)
        crystalGrad.addColorStop(0, color)
        crystalGrad.addColorStop(0.5, color + 'CC')
        crystalGrad.addColorStop(1, color + '88')

        ctx.fillStyle = crystalGrad
        ctx.beginPath()
        ctx.moveTo(x, y - 18)
        ctx.lineTo(x + 10, y - 5)
        ctx.lineTo(x + 7, y + 12)
        ctx.lineTo(x - 7, y + 12)
        ctx.lineTo(x - 10, y - 5)
        ctx.closePath()
        ctx.fill()

        ctx.strokeStyle = color
        ctx.lineWidth = 1
        ctx.stroke()

        ctx.globalAlpha = 0.3 + Math.sin(t * 0.05 + i * 2) * 0.2
        const glowGrad = ctx.createRadialGradient(x, y, 0, x, y, 25)
        glowGrad.addColorStop(0, color)
        glowGrad.addColorStop(1, 'transparent')
        ctx.fillStyle = glowGrad
        ctx.fillRect(x - 25, y - 25, 50, 50)

        ctx.globalAlpha = 0.8
        ctx.fillStyle = '#e0d0c0'
        ctx.font = '10px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(ore, x, y + 25)

        ctx.restore()
      })
    }

    const drawFuelBlocks = (w: number, h: number, t: number) => {
      const startX = w * 0.08
      const endX = w * 0.92
      const baseY = h * 0.15

      const fuels = [
        { name: '煤块', color: '#FF4500' },
        { name: '熔岩煤', color: '#FF6B35' },
        { name: '灵焰', color: '#7B68EE' },
      ]

      fuels.forEach((fuel, i) => {
        const x = startX + (endX - startX) * ((i + 0.5) / fuels.length)
        const floatY = Math.sin(t * 0.025 + i * 1.5) * 2
        const y = baseY + floatY
        const pulse = 0.5 + Math.sin(t * 0.06 + i * 3) * 0.3

        ctx.save()
        ctx.globalAlpha = 0.6

        ctx.fillStyle = '#2a1a0e'
        ctx.beginPath()
        ctx.roundRect(x - 10, y - 8, 20, 16, 4)
        ctx.fill()

        ctx.globalAlpha = pulse
        const glowGrad = ctx.createRadialGradient(x, y, 0, x, y, 20)
        glowGrad.addColorStop(0, fuel.color)
        glowGrad.addColorStop(1, 'transparent')
        ctx.fillStyle = glowGrad
        ctx.fillRect(x - 20, y - 20, 40, 40)

        ctx.globalAlpha = 0.7
        ctx.fillStyle = '#e0d0c0'
        ctx.font = '10px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(fuel.name, x, y + 22)

        ctx.restore()
      })
    }

    const drawBuildPreview = (t: number) => {
      if (!buildingForge) return
      const w = canvas.width
      const h = canvas.height

      ctx.save()
      ctx.globalAlpha = 0.3 + Math.sin(t * 0.05) * 0.1
      ctx.strokeStyle = '#B87333'
      ctx.lineWidth = 2
      ctx.setLineDash([8, 4])
      ctx.strokeRect(w * 0.1, h * 0.2, w * 0.8, h * 0.6)
      ctx.setLineDash([])

      ctx.fillStyle = '#FFD700'
      ctx.font = 'bold 16px "Cinzel", serif'
      ctx.textAlign = 'center'
      ctx.fillText('点击场景放置熔炉', w / 2, h * 0.5)
      ctx.restore()
    }

    const render = () => {
      const w = canvas.width
      const h = canvas.height
      frameRef.current++
      const t = frameRef.current

      ctx.clearRect(0, 0, w, h)
      drawBackground(w, h)
      drawOreCrystals(w, h, t)
      drawFuelBlocks(w, h, t)

      for (const forge of forges) {
        drawForge(
          forge.position.x,
          forge.position.y,
          forge.level,
          forge.status,
          forge.smeltingProgress,
          forge.activeRecipe,
          forge.id === selectedForgeId,
          t,
        )
      }

      drawParticles()
      drawCompletionEffects(t)
      drawBuildPreview(t)

      rafId = requestAnimationFrame(render)
    }

    rafId = requestAnimationFrame(render)
    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
    }
  }, [forges, buildingForge, selectedForgeId, completionEffects, addParticles, removeCompletionEffect])

  return (
    <canvas
      ref={canvasRef}
      className="forge-canvas"
      onClick={handleClick}
    />
  )
}
