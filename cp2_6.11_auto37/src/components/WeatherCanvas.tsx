import React, { useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react'
import type { WeatherParams } from '../types'

export interface WeatherCanvasHandle {
  captureScreenshot: () => string
}

interface WeatherCanvasProps {
  params: WeatherParams
  transitionDuration?: number
}

type ParticleType = 'snow' | 'rain' | 'sand' | 'cloud'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  targetVx: number
  targetVy: number
  size: number
  targetSize: number
  alpha: number
  targetAlpha: number
  color: number[]
  targetColor: number[]
  life: number
  maxLife: number
  type: ParticleType
  targetType: ParticleType
  rotation: number
  seed: number
  active: boolean
  spawnTime: number
}

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value))
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t
const lerpArr = (a: number[], b: number[], t: number): number[] => a.map((v, i) => lerp(v, b[i] || 0, t))
const rgbToString = (rgb: number[], alpha = 1): string =>
  `rgba(${Math.round(rgb[0])},${Math.round(rgb[1])},${Math.round(rgb[2])},${alpha})`

const MAX_PARTICLES = 5000
const TRANSITION_DURATION = 1500

const WIND_SPEED_MAP = (windSpeed: number): number => {
  if (windSpeed <= 0) return 0
  return windSpeed * 0.8
}

interface ParticleConfig {
  type: ParticleType
  count: number
  color: number[]
  baseSize: number
  baseSpeed: number
}

const getParticleConfigs = (params: WeatherParams): ParticleConfig[] => {
  const { temperature, humidity, windSpeed } = params
  const configs: ParticleConfig[] = []

  if (temperature < 5 && humidity > 40) {
    const intensity = clamp(((5 - temperature) / 15) * (humidity / 100), 0, 1)
    configs.push({
      type: 'snow',
      count: Math.round(MAX_PARTICLES * 0.6 * intensity),
      color: [255, 255, 255],
      baseSize: 3,
      baseSpeed: 1.5,
    })
  }

  if (temperature >= 5 && temperature <= 30 && humidity > 60) {
    const intensity = clamp(humidity / 100, 0, 1)
    configs.push({
      type: 'rain',
      count: Math.round(MAX_PARTICLES * 0.7 * intensity),
      color: [150, 180, 230],
      baseSize: 1.5,
      baseSpeed: 10 + windSpeed * 0.3,
    })
  }

  if (temperature > 25 && humidity < 40 && windSpeed > 5) {
    const intensity = clamp(((temperature - 25) / 15) * ((windSpeed - 5) / 15), 0, 1)
    configs.push({
      type: 'sand',
      count: Math.round(MAX_PARTICLES * 0.5 * intensity),
      color: [210, 175, 130],
      baseSize: 2,
      baseSpeed: 4 + windSpeed * 0.4,
    })
  }

  if (humidity > 50 && humidity < 90 && windSpeed < 10) {
    const intensity = clamp(humidity / 100, 0.2, 1)
    configs.push({
      type: 'cloud',
      count: Math.round(MAX_PARTICLES * 0.08 * intensity),
      color: params.preset === 'thunder' ? [100, 100, 120] : [255, 255, 255],
      baseSize: 80,
      baseSpeed: 0.5 + windSpeed * 0.05,
    })
  }

  return configs
}

const createParticle = (
  type: ParticleType,
  width: number,
  height: number,
  params: WeatherParams,
  now: number,
): Particle => {
  const windPixelSpeed = WIND_SPEED_MAP(params.windSpeed)
  const lightFactor = params.lightLevel / 100
  const baseAlpha = 0.4 + lightFactor * 0.5

  let x = 0
  let y = 0
  let vx = 0
  let vy = 0
  let size = 3

  switch (type) {
    case 'snow':
      x = Math.random() * width
      y = -10 - Math.random() * height * 0.3
      vx = ((Math.random() - 0.5) * windPixelSpeed * 0.3) * 60
      vy = (1 + Math.random() * 2) * 60
      size = 2 + Math.random() * 4
      break
    case 'rain':
      x = Math.random() * width
      y = -10 - Math.random() * height * 0.2
      vx = (windPixelSpeed * 0.5) * 60
      vy = (12 + Math.random() * 8) * 60
      size = 1 + Math.random() * 2
      break
    case 'sand':
      x = windPixelSpeed >= 0 ? -10 : width + 10
      y = Math.random() * height
      vx = ((windPixelSpeed >= 0 ? 1 : -1) * (3 + Math.random() * 4)) * 60
      vy = ((Math.random() - 0.5) * 2) * 60
      size = 1 + Math.random() * 3
      break
    case 'cloud':
      x = -100 - Math.random() * width
      y = Math.random() * height * 0.6
      vx = (0.3 + windPixelSpeed * 0.1) * 60
      vy = ((Math.random() - 0.5) * 0.2) * 60
      size = 60 + Math.random() * 120
      break
  }

  const color: number[] =
    type === 'snow' ? [255, 255, 255]
      : type === 'rain' ? [150, 180, 230]
        : type === 'sand' ? [210, 175, 130]
          : params.preset === 'thunder' ? [100, 100, 120] : [255, 255, 255]

  return {
    x,
    y,
    vx,
    targetVx: vx,
    vy,
    targetVy: vy,
    size,
    targetSize: size,
    alpha: baseAlpha * (0.6 + Math.random() * 0.4),
    targetAlpha: baseAlpha * (0.6 + Math.random() * 0.4),
    color: [...color],
    targetColor: [...color],
    life: 1,
    maxLife: 1,
    type,
    targetType: type,
    rotation: Math.random() * Math.PI * 2,
    seed: Math.random(),
    active: true,
    spawnTime: now,
  }
}

const getBackgroundColors = (params: WeatherParams): { top: number[]; bottom: number[] } => {
  const { temperature, lightLevel, humidity, preset } = params
  const tempRatio = (temperature + 10) / 50
  const lightFactor = lightLevel / 100

  let topColor: number[]
  let bottomColor: number[]

  if (preset === 'sunset') {
    topColor = [255, 107, 53]
    bottomColor = [255, 200, 100]
  } else if (preset === 'rainbow') {
    topColor = [100, 180, 255]
    bottomColor = [255, 200, 220]
  } else if (preset === 'thunder') {
    topColor = [20, 20, 40]
    bottomColor = [60, 60, 90]
  } else if (preset === 'blizzard') {
    topColor = [180, 200, 220]
    bottomColor = [220, 230, 245]
  } else if (preset === 'clear') {
    topColor = [135, 206, 250]
    bottomColor = [200, 230, 255]
  } else if (preset === 'mist') {
    topColor = [150, 160, 170]
    bottomColor = [200, 210, 220]
  } else {
    if (tempRatio < 0.5) {
      const t = tempRatio * 2
      topColor = lerpArr([10, 22, 40], [40, 80, 140], t)
      bottomColor = lerpArr([30, 60, 110], [100, 150, 200], t)
    } else {
      const t = (tempRatio - 0.5) * 2
      topColor = lerpArr([40, 80, 140], [255, 107, 53], t)
      bottomColor = lerpArr([100, 150, 200], [255, 200, 150], t)
    }
  }

  topColor = topColor.map((c) => Math.round(c * (0.4 + lightFactor * 0.6)))
  bottomColor = bottomColor.map((c) => Math.round(c * (0.5 + lightFactor * 0.5)))

  const mistFactor = humidity / 100
  const gray = [128, 128, 128]
  topColor = lerpArr(topColor, gray, mistFactor * 0.3)
  bottomColor = lerpArr(bottomColor, gray, mistFactor * 0.3)

  return { top: topColor.map((c) => Math.round(c)), bottom: bottomColor.map((c) => Math.round(c)) }
}

export const WeatherCanvas = forwardRef<WeatherCanvasHandle, WeatherCanvasProps>(function WeatherCanvas(
  { params, transitionDuration = TRANSITION_DURATION },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const particlesRef = useRef<Particle[]>([])
  const particlePoolRef = useRef<(Particle | null)[]>([])
  const currentParamsRef = useRef<WeatherParams>({ ...params })
  const targetParamsRef = useRef<WeatherParams>({ ...params })
  const transitionStartRef = useRef<number>(0)
  const isTransitioningRef = useRef<boolean>(false)
  const sizeRef = useRef({ width: 0, height: 0, dpr: 1 })
  const bgColorsRef = useRef({
    currentTop: [0, 0, 0] as number[],
    currentBottom: [0, 0, 0] as number[],
    targetTop: [0, 0, 0] as number[],
    targetBottom: [0, 0, 0] as number[],
  })
  const lightningRef = useRef({ active: false, intensity: 0, startTime: 0, timer: 0 })
  const lightningTimerRef = useRef<number>(0)
  const configsRef = useRef<ParticleConfig[]>([])
  const targetConfigsRef = useRef<ParticleConfig[]>([])

  useImperativeHandle(ref, () => ({
    captureScreenshot: (): string => {
      const canvas = canvasRef.current
      if (!canvas) return ''
      return canvas.toDataURL('image/png')
    },
  }))

  useEffect(() => {
    targetParamsRef.current = { ...params }
    targetConfigsRef.current = getParticleConfigs(params)
    const bg = getBackgroundColors(params)
    bgColorsRef.current.targetTop = bg.top
    bgColorsRef.current.targetBottom = bg.bottom
    transitionStartRef.current = performance.now()
    isTransitioningRef.current = true
  }, [params])

  const updateParticleTargets = useCallback((params: WeatherParams, configs: ParticleConfig[]): void => {
    const particles = particlesRef.current
    const windPixelSpeed = WIND_SPEED_MAP(params.windSpeed)
    const lightFactor = params.lightLevel / 100
    const baseAlpha = 0.4 + lightFactor * 0.5

    const typeCounts: Record<ParticleType, number> = { snow: 0, rain: 0, sand: 0, cloud: 0 }
    configs.forEach((c) => {
      typeCounts[c.type] = c.count
    })

    particles.forEach((p) => {
      if (!p.active) return

      const targetConfig = configs.find((c) => c.type === p.targetType)
      if (targetConfig) {
        switch (p.targetType) {
          case 'snow':
            p.targetVx = ((Math.random() - 0.5) * windPixelSpeed * 0.3) * 60
            p.targetVy = (1 + (p.seed * 2)) * 60
            p.targetAlpha = baseAlpha * (0.6 + p.seed * 0.4)
            p.targetColor = [255, 255, 255]
            break
          case 'rain':
            p.targetVx = (windPixelSpeed * 0.5) * 60
            p.targetVy = (12 + p.seed * 8) * 60
            p.targetAlpha = baseAlpha * (0.5 + p.seed * 0.3)
            p.targetColor = [150, 180, 230]
            break
          case 'sand':
            p.targetVx = ((windPixelSpeed >= 0 ? 1 : -1) * (3 + p.seed * 4)) * 60
            p.targetVy = ((p.seed - 0.5) * 2) * 60
            p.targetAlpha = baseAlpha * (0.5 + p.seed * 0.3)
            p.targetColor = [210, 175, 130]
            break
          case 'cloud':
            p.targetVx = (0.3 + windPixelSpeed * 0.1) * 60
            p.targetVy = ((p.seed - 0.5) * 0.2) * 60
            p.targetAlpha = 0.12 * baseAlpha
            p.targetColor = params.preset === 'thunder' ? [100, 100, 120] : [255, 255, 255]
            break
        }
      }
    })
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const setupCanvas = (): void => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      const width = rect.width
      const height = rect.height
      sizeRef.current = { width, height, dpr }
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    setupCanvas()

    const handleResize = (): void => {
      setupCanvas()
    }
    window.addEventListener('resize', handleResize)

    const pool = particlePoolRef.current
    for (let i = 0; i < MAX_PARTICLES; i++) {
      pool.push(null)
    }

    const initialConfigs = getParticleConfigs(params)
    configsRef.current = initialConfigs
    targetConfigsRef.current = initialConfigs
    updateParticleTargets(params, initialConfigs)

    const initialBg = getBackgroundColors(params)
    bgColorsRef.current = {
      currentTop: [...initialBg.top],
      currentBottom: [...initialBg.bottom],
      targetTop: [...initialBg.top],
      targetBottom: [...initialBg.bottom],
    }

    const { width, height } = sizeRef.current
    const totalInitial = initialConfigs.reduce((sum, c) => sum + c.count, 0)
    const particles = particlesRef.current

    for (const config of initialConfigs) {
      for (let i = 0; i < config.count; i++) {
        if (particles.length >= MAX_PARTICLES) break
        const p = createParticle(config.type, width, height, params, 0)
        p.x = Math.random() * width
        p.y = Math.random() * height
        particles.push(p)
      }
    }
    void totalInitial

    const animate = (now: number): void => {
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        animationRef.current = requestAnimationFrame(animate)
        return
      }

      const deltaTime = Math.min((now - lastTimeRef.current) / 1000, 0.1)
      lastTimeRef.current = now

      const { width, height } = sizeRef.current

      let transitionProgress = 1
      if (isTransitioningRef.current) {
        transitionProgress = clamp((now - transitionStartRef.current) / transitionDuration, 0, 1)
        if (transitionProgress >= 1) {
          isTransitioningRef.current = false
          currentParamsRef.current = { ...targetParamsRef.current }
          configsRef.current = [...targetConfigsRef.current]
        }
      }
      const easeProgress = 1 - Math.pow(1 - transitionProgress, 3)

      const cp = currentParamsRef.current
      const tp = targetParamsRef.current

      const curParams: WeatherParams = {
        temperature: lerp(cp.temperature, tp.temperature, easeProgress),
        humidity: lerp(cp.humidity, tp.humidity, easeProgress),
        windSpeed: lerp(cp.windSpeed, tp.windSpeed, easeProgress),
        lightLevel: lerp(cp.lightLevel, tp.lightLevel, easeProgress),
        preset: tp.preset,
      }

      if (isTransitioningRef.current) {
        updateParticleTargets(curParams, targetConfigsRef.current)
      }

      const bc = bgColorsRef.current
      bc.currentTop = lerpArr(bc.currentTop, bc.targetTop, easeProgress * 0.08)
      bc.currentBottom = lerpArr(bc.currentBottom, bc.targetBottom, easeProgress * 0.08)

      drawBackground(ctx, width, height, bc.currentTop.map(Math.round), bc.currentBottom.map(Math.round))

      manageParticles(width, height, curParams, now, transitionProgress)
      updateAndDrawParticles(ctx, width, height, deltaTime, curParams)
      drawEffects(ctx, width, height, curParams, now)

      animationRef.current = requestAnimationFrame(animate)
    }

    lastTimeRef.current = performance.now()
    animationRef.current = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationRef.current)
    }
  }, [transitionDuration, updateParticleTargets, params])

  const drawBackground = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    topColor: number[],
    bottomColor: number[],
  ): void => {
    const gradient = ctx.createLinearGradient(0, 0, 0, height)
    gradient.addColorStop(0, rgbToString(topColor))
    gradient.addColorStop(1, rgbToString(bottomColor))
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)
  }

  const manageParticles = (
    width: number,
    height: number,
    params: WeatherParams,
    now: number,
    transitionProgress: number,
  ): void => {
    const particles = particlesRef.current
    const configs = targetConfigsRef.current
    const windSpeed = WIND_SPEED_MAP(params.windSpeed)

    const typeCounts: Record<ParticleType, { current: number; target: number }> = {
      snow: { current: 0, target: 0 },
      rain: { current: 0, target: 0 },
      sand: { current: 0, target: 0 },
      cloud: { current: 0, target: 0 },
    }

    configs.forEach((c) => {
      typeCounts[c.type].target = c.count
    })

    particles.forEach((p) => {
      if (p.active) typeCounts[p.type].current++
    })

    const types: ParticleType[] = ['snow', 'rain', 'sand', 'cloud']
    types.forEach((type) => {
      const { current, target } = typeCounts[type]
      if (current < target) {
        const toAdd = Math.min(
          target - current,
          Math.max(2, Math.ceil((target - current) * 0.05 * (1 + transitionProgress * 2))),
        )
        for (let i = 0; i < toAdd && particles.length < MAX_PARTICLES; i++) {
          const p = createParticle(type, width, height, params, now)
          p.alpha = 0
          particles.push(p)
          typeCounts[type].current++
        }
      } else if (current > target) {
        let toRemove = current - target
        for (let i = particles.length - 1; i >= 0 && toRemove > 0; i--) {
          if (particles[i].type === type && particles[i].active) {
            particles[i].targetAlpha = 0
            setTimeout(() => {
              if (particles[i]) particles[i].active = false
            }, 500)
            toRemove--
          }
        }
      }
    })

    for (let i = particles.length - 1; i >= 0; i--) {
      if (!particles[i].active) {
        particles.splice(i, 1)
      }
    }
    void windSpeed
  }

  const updateAndDrawParticles = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    deltaTime: number,
    params: WeatherParams,
  ): void => {
    const particles = particlesRef.current
    const isTransitioning = isTransitioningRef.current

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]
      if (!p.active) continue

      const lerpFactor = isTransitioning ? 0.05 : 0.15
      p.vx = lerp(p.vx, p.targetVx, lerpFactor)
      p.vy = lerp(p.vy, p.targetVy, lerpFactor)
      p.size = lerp(p.size, p.targetSize, lerpFactor * 0.5)
      p.alpha = lerp(p.alpha, p.targetAlpha, lerpFactor * 2)
      p.color = lerpArr(p.color, p.targetColor, lerpFactor)

      p.x += p.vx * deltaTime
      p.y += p.vy * deltaTime
      p.rotation += 1.2 * deltaTime

      let respawn = false
      if (p.type === 'snow') {
        if (p.y > height + 20 || p.x < -50 || p.x > width + 50) respawn = true
      } else if (p.type === 'rain') {
        if (p.y > height + 30 || p.x < -100 || p.x > width + 100) respawn = true
      } else if (p.type === 'sand') {
        if (p.x < -50 || p.x > width + 50 || p.y < -50 || p.y > height + 50) respawn = true
      } else if (p.type === 'cloud') {
        if (p.x - p.size > width + 200) respawn = true
      }

      if (respawn && p.targetAlpha > 0) {
        const newP = createParticle(p.type, width, height, params, performance.now())
        p.x = newP.x
        p.y = newP.y
        p.vx = newP.vx
        p.vy = newP.vy
        p.targetVx = newP.targetVx
        p.targetVy = newP.targetVy
        p.spawnTime = performance.now()
      }

      drawParticle(ctx, p)
    }
  }

  const drawParticle = (ctx: CanvasRenderingContext2D, p: Particle): void => {
    if (p.alpha <= 0) return

    switch (p.type) {
      case 'snow':
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation)
        ctx.fillStyle = rgbToString(p.color, p.alpha)
        ctx.beginPath()
        for (let j = 0; j < 6; j++) {
          const angle = (j / 6) * Math.PI * 2
          const x = Math.cos(angle) * p.size
          const y = Math.sin(angle) * p.size
          if (j === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.closePath()
        ctx.fill()
        ctx.restore()
        break
      case 'rain':
        const length = p.size * 8
        const rainDirX = p.vx * 0.0015
        const rainDirY = length
        ctx.strokeStyle = rgbToString(p.color, p.alpha)
        ctx.lineWidth = p.size * 0.8
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(p.x, p.y)
        ctx.lineTo(p.x + rainDirX, p.y + rainDirY)
        ctx.stroke()
        break
      case 'sand':
        ctx.fillStyle = rgbToString(p.color, p.alpha)
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
        break
      case 'cloud':
        drawCloud(ctx, p.x, p.y, p.size, p.color, p.alpha)
        break
    }
  }

  const drawCloud = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    color: number[],
    alpha: number,
  ): void => {
    ctx.fillStyle = rgbToString(color, alpha)
    const circles = [
      { dx: 0, dy: 0, r: size * 0.5 },
      { dx: -size * 0.4, dy: size * 0.1, r: size * 0.4 },
      { dx: size * 0.4, dy: size * 0.15, r: size * 0.45 },
      { dx: -size * 0.2, dy: -size * 0.2, r: size * 0.35 },
      { dx: size * 0.2, dy: -size * 0.15, r: size * 0.38 },
    ]
    circles.forEach((c) => {
      ctx.beginPath()
      ctx.arc(x + c.dx, y + c.dy, c.r, 0, Math.PI * 2)
      ctx.fill()
    })
  }

  const drawEffects = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    params: WeatherParams,
    now: number,
  ): void => {
    const { preset } = params

    if (preset === 'rainbow') {
      drawRainbow(ctx, width, height)
    }

    if (preset === 'thunder') {
      drawLightning(ctx, width, height, now)
    }

    if (preset === 'sunset' || preset === 'clear') {
      drawSun(ctx, width, height, params)
    }
  }

  const drawRainbow = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
  ): void => {
    const centerX = width * 0.5
    const centerY = height * 1.2
    const baseRadius = Math.min(width, height * 1.5)

    const colors = [
      { color: [255, 0, 0], alpha: 0.18 },
      { color: [255, 127, 0], alpha: 0.18 },
      { color: [255, 255, 0], alpha: 0.18 },
      { color: [0, 255, 0], alpha: 0.18 },
      { color: [0, 0, 255], alpha: 0.18 },
      { color: [75, 0, 130], alpha: 0.18 },
      { color: [148, 0, 211], alpha: 0.18 },
    ]

    colors.forEach((c, i) => {
      const radius = baseRadius - i * 18
      ctx.strokeStyle = `rgba(${c.color[0]}, ${c.color[1]}, ${c.color[2]}, ${c.alpha})`
      ctx.lineWidth = 18
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, Math.PI, Math.PI * 2)
      ctx.stroke()
    })
  }

  const drawLightning = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    now: number,
  ): void => {
    const lightning = lightningRef.current

    if (!lightning.active && now - lightningTimerRef.current > 3000 + Math.random() * 5000) {
      lightningTimerRef.current = now
      lightning.active = true
      lightning.intensity = 0.7 + Math.random() * 0.3
      lightning.startTime = now
      lightning.timer = 0
    }

    if (lightning.active) {
      const elapsed = now - lightning.startTime

      if (elapsed < 120) {
        lightning.timer += 0.06
        const flashAlpha = Math.sin(lightning.timer * Math.PI) * lightning.intensity * 0.35
        if (flashAlpha > 0) {
          ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`
          ctx.fillRect(0, 0, width, height)
        }

        if (elapsed < 100 && elapsed > 30) {
          drawLightningBolt(ctx, width, height)
        }
      } else {
        lightning.active = false
      }
    }
  }

  const drawLightningBolt = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
  ): void => {
    const startX = width * (0.2 + Math.random() * 0.6)
    const startY = 0
    let x = startX
    let y = startY

    ctx.strokeStyle = 'rgba(255, 255, 220, 0.9)'
    ctx.lineWidth = 2
    ctx.shadowColor = 'rgba(200, 220, 255, 0.8)'
    ctx.shadowBlur = 15
    ctx.beginPath()
    ctx.moveTo(x, y)

    while (y < height * 0.8) {
      const dx = (Math.random() - 0.5) * 80
      const dy = 30 + Math.random() * 60
      x += dx
      y += dy
      ctx.lineTo(x, y)

      if (Math.random() < 0.3 && y < height * 0.6) {
        ctx.save()
        ctx.strokeStyle = 'rgba(255, 255, 200, 0.5)'
        ctx.lineWidth = 1
        ctx.shadowBlur = 8
        ctx.beginPath()
        ctx.moveTo(x, y)
        let bx = x
        let by = y
        for (let j = 0; j < 3; j++) {
          bx += (Math.random() - 0.5) * 40
          by += 20 + Math.random() * 30
          ctx.lineTo(bx, by)
        }
        ctx.stroke()
        ctx.restore()
      }
    }

    ctx.stroke()
    ctx.shadowBlur = 0
  }

  const drawSun = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    params: WeatherParams,
  ): void => {
    const sunX = width * 0.8
    const sunY = height * 0.25
    const sunRadius = Math.min(width, height) * 0.08
    const { lightLevel, preset } = params
    const intensity = lightLevel / 100

    const gradient = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunRadius * 4)
    if (preset === 'sunset') {
      gradient.addColorStop(0, `rgba(255, 200, 100, ${0.9 * intensity})`)
      gradient.addColorStop(0.2, `rgba(255, 140, 50, ${0.6 * intensity})`)
      gradient.addColorStop(0.5, `rgba(255, 80, 20, ${0.2 * intensity})`)
      gradient.addColorStop(1, 'rgba(255, 50, 0, 0)')
    } else {
      gradient.addColorStop(0, `rgba(255, 255, 230, ${0.95 * intensity})`)
      gradient.addColorStop(0.2, `rgba(255, 240, 180, ${0.5 * intensity})`)
      gradient.addColorStop(0.5, `rgba(255, 220, 130, ${0.15 * intensity})`)
      gradient.addColorStop(1, 'rgba(255, 200, 100, 0)')
    }

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)

    if (intensity > 0.3) {
      ctx.fillStyle = preset === 'sunset'
        ? `rgba(255, 220, 150, ${0.95 * intensity})`
        : `rgba(255, 255, 245, ${intensity})`
      ctx.beginPath()
      ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  )
})
