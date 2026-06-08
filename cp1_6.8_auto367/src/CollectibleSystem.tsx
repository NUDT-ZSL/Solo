import { useRef, useCallback } from 'react'

export interface Spore {
  id: number
  x: number
  y: number
  collected: boolean
  color: string
  radius: number
  pulsePhase: number
  collectAnim: number
}

export interface CollectFeedback {
  x: number
  y: number
  color: string
  life: number
  maxLife: number
  particles: { x: number; y: number; vx: number; vy: number; life: number }[]
}

const SPORE_COLORS = ['#ff6eb4', '#7fff7f', '#bf7fff', '#7fffff', '#ffbf7f']
const SPORE_COUNT_PER_AREA = 60
const SPORE_RADIUS = 6
const COLLECT_RADIUS = 24

export function useCollectibleSystem() {
  const sporesRef = useRef<Spore[]>([])
  const feedbacksRef = useRef<CollectFeedback[]>([])
  const collectedRef = useRef(0)
  const totalRef = useRef(SPORE_COUNT_PER_AREA)
  const nextIdRef = useRef(0)
  const audioCtxRef = useRef<AudioContext | null>(null)

  const initAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext()
    }
  }, [])

  const playCollectSound = useCallback(() => {
    if (!audioCtxRef.current) return
    const ctx = audioCtxRef.current
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    const now = ctx.currentTime
    osc.frequency.setValueAtTime(800 + Math.random() * 600, now)
    osc.frequency.exponentialRampToValueAtTime(1200 + Math.random() * 400, now + 0.05)
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.15)
    gain.gain.setValueAtTime(0.12, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2)
    osc.start(now)
    osc.stop(now + 0.2)
  }, [])

  const generateSpores = useCallback((areaIndex: number, canvasW: number, canvasH: number) => {
    const spores: Spore[] = []
    const margin = 60
    for (let i = 0; i < SPORE_COUNT_PER_AREA; i++) {
      let x: number, y: number
      let attempts = 0
      do {
        x = margin + Math.random() * (canvasW - margin * 2)
        y = margin + Math.random() * (canvasH - margin * 2)
        attempts++
      } while (attempts < 50 && spores.some(s => Math.hypot(s.x - x, s.y - y) < 40))

      spores.push({
        id: nextIdRef.current++,
        x,
        y,
        collected: false,
        color: SPORE_COLORS[(areaIndex * 2 + Math.floor(Math.random() * 3)) % SPORE_COLORS.length],
        radius: SPORE_RADIUS + Math.random() * 3,
        pulsePhase: Math.random() * Math.PI * 2,
        collectAnim: 0,
      })
    }
    sporesRef.current = spores
    collectedRef.current = 0
    totalRef.current = SPORE_COUNT_PER_AREA
    feedbacksRef.current = []
  }, [])

  const checkCollection = useCallback((px: number, py: number): boolean => {
    let collected = false
    for (const spore of sporesRef.current) {
      if (spore.collected) continue
      const dist = Math.hypot(spore.x - px, spore.y - py)
      if (dist < COLLECT_RADIUS) {
        spore.collected = true
        spore.collectAnim = 1
        collectedRef.current++
        collected = true

        const particleCount = 12
        const particles: CollectFeedback['particles'] = []
        for (let i = 0; i < particleCount; i++) {
          const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.3
          const speed = 1.5 + Math.random() * 3
          particles.push({
            x: spore.x,
            y: spore.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1,
          })
        }
        feedbacksRef.current.push({
          x: spore.x,
          y: spore.y,
          color: spore.color,
          life: 1,
          maxLife: 1,
          particles,
        })

        playCollectSound()
      }
    }
    return collected
  }, [playCollectSound])

  const update = useCallback((dt: number) => {
    for (const fb of feedbacksRef.current) {
      fb.life -= dt * 2
      for (const p of fb.particles) {
        p.x += p.vx
        p.y += p.vy
        p.vx *= 0.96
        p.vy *= 0.96
        p.life -= dt * 2.5
      }
    }
    feedbacksRef.current = feedbacksRef.current.filter(fb => fb.life > 0)

    for (const spore of sporesRef.current) {
      if (spore.collectAnim > 0) {
        spore.collectAnim -= dt * 3
      }
      spore.pulsePhase += dt * 2
    }
  }, [])

  const isAreaComplete = useCallback(() => {
    return collectedRef.current >= 50
  }, [])

  const getProgress = useCallback(() => {
    return { collected: collectedRef.current, total: 50 }
  }, [])

  return {
    sporesRef,
    feedbacksRef,
    generateSpores,
    checkCollection,
    update,
    isAreaComplete,
    getProgress,
    initAudio,
  }
}
