import { useRef, useCallback } from 'react'

export interface SandParticle {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  color: string
  alpha: number
  life: number
  maxLife: number
  isDrifting: boolean
  driftTime: number
  originalAlpha: number
}

export interface SandStormParticle {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  alpha: number
  life: number
}

export interface MergedParticle {
  id: number
  x: number
  y: number
  targetX: number
  targetY: number
  radius: number
  life: number
  maxLife: number
}

export interface PickupGlow {
  id: number
  x: number
  y: number
  color: string
  radius: number
  alpha: number
  life: number
}

export interface TextureData {
  deposited: boolean
  baseAlpha: number
  noiseImage: ImageData | null
}

const DEFAULT_COLORS = ['#4A2F1B', '#6B4226', '#8B5E3C', '#A67C52']
const SAND_STORM_COLOR = '#C8A882'
const MERGED_COLOR = '#3A1F0B'

const MAX_PARTICLES = 3000
const MAX_NEW_PER_FRAME = 80
const DRIFT_DURATION = 48
const DRIFT_SPEED_MIN = 1
const DRIFT_SPEED_MAX = 2
const STATIC_EVENT_CHANCE = 0.08
const MERGE_DURATION = 12
const SAND_STORM_DURATION = 24
const TEXTURE_THRESHOLD = 500
const NOISE_SIZE = 256
const NOISE_DENSITY = 0.3

let particleIdCounter = 0
let stormIdCounter = 0
let mergedIdCounter = 0
let glowIdCounter = 0

const randRange = (min: number, max: number) => Math.random() * (max - min) + min
const randInt = (min: number, max: number) => Math.floor(randRange(min, max + 1))
const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 74, g: 47, b: 27 }
}
const rgbToHex = (r: number, g: number, b: number) => {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('')
}
const dist = (x1: number, y1: number, x2: number, y2: number) =>
  Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)

export const useSandPhysics = () => {
  const particlesRef = useRef<SandParticle[]>([])
  const stormParticlesRef = useRef<SandStormParticle[]>([])
  const mergedParticlesRef = useRef<MergedParticle[]>([])
  const pickupGlowsRef = useRef<PickupGlow[]>([])
  const textureDataRef = useRef<TextureData>({ deposited: false, baseAlpha: 0, noiseImage: null })
  const frameCountRef = useRef(0)
  const lastMousePosRef = useRef<{ x: number; y: number } | null>(null)
  const currentColorRef = useRef<string | null>(null)

  const generateNoiseImage = useCallback((ctx: CanvasRenderingContext2D) => {
    if (textureDataRef.current.noiseImage) return
    const offCanvas = document.createElement('canvas')
    offCanvas.width = NOISE_SIZE
    offCanvas.height = NOISE_SIZE
    const offCtx = offCanvas.getContext('2d')!
    const imgData = offCtx.createImageData(NOISE_SIZE, NOISE_SIZE)
    for (let i = 0; i < NOISE_SIZE * NOISE_SIZE; i++) {
      const idx = i * 4
      const hasNoise = Math.random() < NOISE_DENSITY
      const gray = hasNoise ? Math.floor(randRange(100, 180)) : 0
      imgData.data[idx] = gray
      imgData.data[idx + 1] = gray
      imgData.data[idx + 2] = gray
      imgData.data[idx + 3] = hasNoise ? 255 : 0
    }
    textureDataRef.current.noiseImage = imgData
  }, [])

  const generateParticles = useCallback((
    mouseX: number,
    mouseY: number,
    prevX: number | null,
    prevY: number | null
  ) => {
    if (particlesRef.current.length >= MAX_PARTICLES) return

    let speed = 0
    if (prevX !== null && prevY !== null) {
      speed = dist(mouseX, mouseY, prevX, prevY)
    }

    const minCount = 30
    const maxCount = 50
    const countFactor = Math.max(0.3, 1 - speed / 100)
    const targetCount = Math.floor(randRange(minCount, maxCount + 1) * countFactor)
    const actualCount = Math.min(targetCount, MAX_NEW_PER_FRAME, MAX_PARTICLES - particlesRef.current.length)

    const colors = currentColorRef.current
      ? [currentColorRef.current]
      : DEFAULT_COLORS

    for (let i = 0; i < actualCount; i++) {
      const angle = randRange(0, Math.PI * 2)
      const r = randRange(0, 15)
      const x = mouseX + Math.cos(angle) * r
      const y = mouseY + Math.sin(angle) * r
      const spreadFactor = 1 + speed * 0.02
      const offsetX = (Math.random() - 0.5) * 8 * spreadFactor
      const offsetY = (Math.random() - 0.5) * 8 * spreadFactor

      particlesRef.current.push({
        id: particleIdCounter++,
        x: x + offsetX,
        y: y + offsetY,
        vx: 0,
        vy: 0,
        radius: randRange(2, 4),
        color: colors[randInt(0, colors.length - 1)],
        alpha: randRange(0.7, 0.9),
        life: 0,
        maxLife: Infinity,
        isDrifting: false,
        driftTime: 0,
        originalAlpha: 0,
      })
    }
  }, [])

  const triggerStaticEvent = useCallback(() => {
    const drifting = particlesRef.current.filter(p => p.isDrifting)
    if (drifting.length < 5) return

    const centerIdx = randInt(0, drifting.length - 1)
    const center = drifting[centerIdx]
    const neighbors: SandParticle[] = [center]

    for (const p of drifting) {
      if (p.id === center.id) continue
      if (neighbors.length >= 5) break
      const d = dist(p.x, p.y, center.x, center.y)
      if (d < 60) neighbors.push(p)
    }

    if (neighbors.length < 3) return

    const cx = neighbors.reduce((s, p) => s + p.x, 0) / neighbors.length
    const cy = neighbors.reduce((s, p) => s + p.y, 0) / neighbors.length

    for (const p of neighbors) {
      p.vx += ((cx - p.x) / dist(p.x, p.y, cx, cy)) * 0.3
      p.vy += ((cy - p.y) / dist(p.x, p.y, cx, cy)) * 0.3
    }

    const neighborIds = new Set(neighbors.map(n => n.id))

    mergedParticlesRef.current.push({
      id: mergedIdCounter++,
      x: neighbors[0].x,
      y: neighbors[0].y,
      targetX: cx,
      targetY: cy,
      radius: randRange(6, 8),
      life: 0,
      maxLife: MERGE_DURATION,
    })

    setTimeout(() => {
      particlesRef.current = particlesRef.current.filter(p => !neighborIds.has(p.id))
      const stormCount = randInt(15, 25)
      for (let i = 0; i < stormCount; i++) {
        const angle = randRange(0, Math.PI * 2)
        const speed = randRange(4, 6)
        stormParticlesRef.current.push({
          id: stormIdCounter++,
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: randRange(1, 2),
          alpha: 1,
          life: SAND_STORM_DURATION,
        })
      }
    }, MERGE_DURATION * 16)
  }, [])

  const pickColor = useCallback((x: number, y: number, ctx: CanvasRenderingContext2D) => {
    const pickRadius = 10
    const nearby = particlesRef.current.filter(p => dist(p.x, p.y, x, y) < pickRadius)

    let avgColor: string
    if (nearby.length > 0) {
      let totalR = 0, totalG = 0, totalB = 0
      for (const p of nearby) {
        const rgb = hexToRgb(p.color)
        totalR += rgb.r
        totalG += rgb.g
        totalB += rgb.b
      }
      avgColor = rgbToHex(totalR / nearby.length, totalG / nearby.length, totalB / nearby.length)
    } else {
      const pixel = ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data
      if (pixel[3] > 0) {
        avgColor = rgbToHex(pixel[0], pixel[1], pixel[2])
      } else {
        avgColor = DEFAULT_COLORS[0]
      }
    }

    currentColorRef.current = avgColor

    pickupGlowsRef.current.push({
      id: glowIdCounter++,
      x,
      y,
      color: avgColor,
      radius: 20,
      alpha: 0.6,
      life: 60,
    })

    return avgColor
  }, [])

  const update = useCallback((isMouseDown: boolean, mouseX: number | null, mouseY: number | null) => {
    frameCountRef.current++
    generateNoiseImage({} as CanvasRenderingContext2D)

    if (isMouseDown && mouseX !== null && mouseY !== null) {
      generateParticles(
        mouseX,
        mouseY,
        lastMousePosRef.current?.x ?? null,
        lastMousePosRef.current?.y ?? null
      )
      lastMousePosRef.current = { x: mouseX, y: mouseY }
    } else {
      if (lastMousePosRef.current) {
        for (const p of particlesRef.current) {
          if (!p.isDrifting) {
            p.isDrifting = true
            p.driftTime = DRIFT_DURATION
            p.originalAlpha = p.alpha
            const angle = randRange(0, Math.PI * 2)
            const speed = randRange(DRIFT_SPEED_MIN, DRIFT_SPEED_MAX)
            p.vx = Math.cos(angle) * speed
            p.vy = Math.sin(angle) * speed
          }
        }
      }
      lastMousePosRef.current = null
    }

    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
      const p = particlesRef.current[i]
      if (p.isDrifting) {
        p.x += p.vx
        p.y += p.vy
        p.vx *= 0.99
        p.vy *= 0.99
        p.driftTime--
        p.alpha = p.originalAlpha * (p.driftTime / DRIFT_DURATION)
        if (p.driftTime <= 0) {
          particlesRef.current.splice(i, 1)
          continue
        }
      }
    }

    for (let i = stormParticlesRef.current.length - 1; i >= 0; i--) {
      const s = stormParticlesRef.current[i]
      s.x += s.vx
      s.y += s.vy
      s.vx *= 0.97
      s.vy *= 0.97
      s.life--
      s.alpha = s.life / SAND_STORM_DURATION
      if (s.life <= 0) {
        stormParticlesRef.current.splice(i, 1)
      }
    }

    for (let i = mergedParticlesRef.current.length - 1; i >= 0; i--) {
      const m = mergedParticlesRef.current[i]
      m.x += (m.targetX - m.x) * 0.2
      m.y += (m.targetY - m.y) * 0.2
      m.life++
      if (m.life >= m.maxLife) {
        mergedParticlesRef.current.splice(i, 1)
      }
    }

    for (let i = pickupGlowsRef.current.length - 1; i >= 0; i--) {
      const g = pickupGlowsRef.current[i]
      g.life--
      g.alpha = 0.6 * (g.life / 60)
      if (g.life <= 0) {
        pickupGlowsRef.current.splice(i, 1)
      }
    }

    if (frameCountRef.current % 100 === 0) {
      if (Math.random() < STATIC_EVENT_CHANCE) {
        triggerStaticEvent()
      }
    }

    if (particlesRef.current.length > TEXTURE_THRESHOLD && !textureDataRef.current.deposited) {
      textureDataRef.current.deposited = true
    }
    if (textureDataRef.current.deposited) {
      textureDataRef.current.baseAlpha = Math.min(0.3, textureDataRef.current.baseAlpha + 0.001)
    }
  }, [generateParticles, triggerStaticEvent, generateNoiseImage])

  const render = useCallback((
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    mouseX: number | null,
    mouseY: number | null,
    isDragging: boolean
  ) => {
    ctx.clearRect(0, 0, width, height)

    const baseAlpha = textureDataRef.current.baseAlpha
    if (baseAlpha > 0) {
      ctx.fillStyle = `rgba(42, 26, 10, ${baseAlpha})`
      ctx.fillRect(0, 0, width, height)
    }

    if (textureDataRef.current.deposited && textureDataRef.current.noiseImage) {
      const noise = textureDataRef.current.noiseImage
      const offCanvas = document.createElement('canvas')
      offCanvas.width = NOISE_SIZE
      offCanvas.height = NOISE_SIZE
      const offCtx = offCanvas.getContext('2d')!
      offCtx.putImageData(noise, 0, 0)

      ctx.globalAlpha = 0.2
      const pattern = ctx.createPattern(offCanvas, 'repeat')!
      ctx.fillStyle = pattern
      ctx.fillRect(0, 0, width, height)
      ctx.globalAlpha = 1
    }

    for (const p of particlesRef.current) {
      const rgb = hexToRgb(p.color)
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius)
      gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${p.alpha})`)
      gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`)
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
      ctx.fillStyle = gradient
      ctx.fill()
    }

    for (const m of mergedParticlesRef.current) {
      const progress = m.life / m.maxLife
      const rgb = hexToRgb(MERGED_COLOR)
      const gradient = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.radius * (0.5 + progress * 0.5))
      gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${progress})`)
      gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`)
      ctx.beginPath()
      ctx.arc(m.x, m.y, m.radius * (0.5 + progress * 0.5), 0, Math.PI * 2)
      ctx.fillStyle = gradient
      ctx.fill()
    }

    for (const s of stormParticlesRef.current) {
      const rgb = hexToRgb(SAND_STORM_COLOR)
      ctx.beginPath()
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${s.alpha})`
      ctx.fill()
    }

    for (const g of pickupGlowsRef.current) {
      const rgb = hexToRgb(g.color)
      const gradient = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, g.radius)
      gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${g.alpha})`)
      gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`)
      ctx.beginPath()
      ctx.arc(g.x, g.y, g.radius, 0, Math.PI * 2)
      ctx.fillStyle = gradient
      ctx.fill()
    }

    if (isDragging && mouseX !== null && mouseY !== null) {
      const innerRgb = hexToRgb(SAND_STORM_COLOR)
      const outerRgb = hexToRgb('#4A2F1B')
      const haloRadius = 30
      const gradient = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, haloRadius)
      gradient.addColorStop(0, `rgba(${innerRgb.r}, ${innerRgb.g}, ${innerRgb.b}, 0.2)`)
      gradient.addColorStop(1, `rgba(${outerRgb.r}, ${outerRgb.g}, ${outerRgb.b}, 0)`)
      ctx.beginPath()
      ctx.arc(mouseX, mouseY, haloRadius, 0, Math.PI * 2)
      ctx.fillStyle = gradient
      ctx.fill()
    }
  }, [])

  const resetAll = useCallback(() => {
    particlesRef.current = []
    stormParticlesRef.current = []
    mergedParticlesRef.current = []
    pickupGlowsRef.current = []
    textureDataRef.current = { deposited: false, baseAlpha: 0, noiseImage: null }
    frameCountRef.current = 0
    lastMousePosRef.current = null
    currentColorRef.current = null
  }, [])

  const getCurrentColor = useCallback(() => currentColorRef.current, [])
  const setCurrentColor = useCallback((c: string | null) => { currentColorRef.current = c }, [])

  return {
    particlesRef,
    stormParticlesRef,
    mergedParticlesRef,
    pickupGlowsRef,
    textureDataRef,
    update,
    render,
    resetAll,
    pickColor,
    getCurrentColor,
    setCurrentColor,
    generateNoiseImage,
    DEFAULT_COLORS,
  }
}

export default useSandPhysics
