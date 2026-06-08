import { ref, onMounted, onUnmounted } from 'vue'
import type { ElementType } from '@/types/game'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
  element: ElementType
}

interface AnimationState {
  placing: { row: number; col: number; progress: number } | null
  eliminating: { row: number; col: number; progress: number } | null
  pulsing: Set<string>
}

export function useAnimation() {
  const particles = ref<Particle[]>([])
  const canvasRef = ref<HTMLCanvasElement | null>(null)
  const animState: AnimationState = {
    placing: null,
    eliminating: null,
    pulsing: new Set(),
  }
  let animFrame = 0
  let ctx: CanvasRenderingContext2D | null = null

  const ELEMENT_PARTICLE_COLORS: Record<ElementType, string[]> = {
    fire: ['#FF4500', '#FF6B35', '#FF8C00', '#FFD700', '#FF0000'],
    ice: ['#00BFFF', '#87CEEB', '#B0E0E6', '#ADD8E6', '#E0FFFF'],
    wind: ['#00CED1', '#40E0D0', '#48D1CC', '#7FFFD4', '#66CDAA'],
    earth: ['#8B6914', '#DAA520', '#B8860B', '#CD853F', '#D2B48C'],
  }

  function spawnParticles(x: number, y: number, element: ElementType, count: number = 20) {
    const colors = ELEMENT_PARTICLE_COLORS[element]
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5
      const speed = 1 + Math.random() * 3
      particles.value.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        life: 1,
        maxLife: 40 + Math.random() * 30,
        size: 2 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        element,
      })
    }
  }

  function spawnPlaceEffect(x: number, y: number, element: ElementType) {
    spawnParticles(x, y, element, 15)
    animState.placing = { row: 0, col: 0, progress: 0 }
  }

  function spawnEliminateEffect(x: number, y: number, element: ElementType) {
    spawnParticles(x, y, element, 30)
    animState.eliminating = { row: 0, col: 0, progress: 0 }
  }

  function spawnVictoryParticles(element: ElementType) {
    if (!canvasRef.value) return
    const w = canvasRef.value.width
    const h = canvasRef.value.height
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * w
      const y = Math.random() * h
      spawnParticles(x, y, element, 3)
    }
  }

  function updateParticles() {
    const alive: Particle[] = []
    for (const p of particles.value) {
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.05
      p.life -= 1 / p.maxLife
      if (p.life > 0) {
        alive.push(p)
      }
    }
    particles.value = alive
  }

  function renderParticles() {
    if (!ctx || !canvasRef.value) return
    ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)

    for (const p of particles.value) {
      ctx.save()
      ctx.globalAlpha = Math.max(0, p.life)
      ctx.fillStyle = p.color
      ctx.shadowColor = p.color
      ctx.shadowBlur = 8

      switch (p.element) {
        case 'fire':
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2)
          ctx.fill()
          break
        case 'ice':
          ctx.translate(p.x, p.y)
          ctx.rotate(p.life * Math.PI)
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size * p.life, p.size * p.life)
          break
        case 'wind':
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size * p.life * 0.5, 0, Math.PI * 2)
          ctx.fill()
          ctx.beginPath()
          ctx.arc(p.x + p.vx * 2, p.y + p.vy * 2, p.size * p.life * 0.3, 0, Math.PI * 2)
          ctx.fill()
          break
        case 'earth':
          ctx.translate(p.x, p.y)
          ctx.rotate(p.life * Math.PI * 2)
          const s = p.size * p.life
          ctx.beginPath()
          ctx.moveTo(0, -s)
          ctx.lineTo(s, 0)
          ctx.lineTo(0, s)
          ctx.lineTo(-s, 0)
          ctx.closePath()
          ctx.fill()
          break
      }

      ctx.restore()
    }
  }

  function animationLoop() {
    updateParticles()
    renderParticles()
    animFrame = requestAnimationFrame(animationLoop)
  }

  function initCanvas(canvas: HTMLCanvasElement) {
    canvasRef.value = canvas
    ctx = canvas.getContext('2d')
    if (ctx) {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
  }

  function resizeCanvas() {
    if (canvasRef.value) {
      canvasRef.value.width = window.innerWidth
      canvasRef.value.height = window.innerHeight
    }
  }

  onMounted(() => {
    window.addEventListener('resize', resizeCanvas)
    animationLoop()
  })

  onUnmounted(() => {
    window.removeEventListener('resize', resizeCanvas)
    cancelAnimationFrame(animFrame)
  })

  return {
    particles,
    canvasRef,
    initCanvas,
    spawnPlaceEffect,
    spawnEliminateEffect,
    spawnVictoryParticles,
  }
}
