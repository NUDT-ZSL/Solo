import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import type { WeatherParams, PresetName } from '../types'

export interface WeatherCanvasHandle {
  captureScreenshot: () => string
}

interface WeatherCanvasProps {
  params: WeatherParams
  transitionDuration?: number
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  life: number
  maxLife: number
  type: 'snow' | 'rain' | 'sand' | 'cloud'
  rotation: number
  seed: number
}

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value))

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

const lerpColor = (c1: number[], c2: number[], t: number): number[] => [
  lerp(c1[0] + (c2[0] - c1[0]) * t,
  lerp(c1[1] + (c2[1] - c1[1]) * t,
  lerp(c1[2] + (c2[2] - c1[2]) * t,
]

const rgbToString = (rgb: number[], alpha = 1): string =>
  `rgba(${Math.round(rgb[0])},${Math.round(rgb[1])},${Math.round(rgb[2])},${alpha})`

const MAX_PARTICLES = 5000

export const WeatherCanvas = forwardRef<WeatherCanvasHandle, WeatherCanvasProps>(function WeatherCanvas(
  { params, transitionDuration = 1500 },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const particlesRef = useRef<Particle[]>([])
  const currentParamsRef = useRef<WeatherParams>({ ...params })
  const targetParamsRef = useRef<WeatherParams>({ ...params })
  const lightningRef = useRef({ active: false, intensity: 0, timer: 0 })
  const transitionStartRef = useRef<number>(0)
  const sizeRef = useRef({ width: 0, height: 0, dpr: 1 })
  const lightningTimerRef = useRef<number>(0)

  useImperativeHandle(ref, () => ({
    captureScreenshot: (): string => {
      const canvas = canvasRef.current
      if (!canvas) return ''
      return canvas.toDataURL('image/png')
    },
  }))

  useEffect(() => {
    targetParamsRef.current = { ...params }
    transitionStartRef.current = performance.now()
  }, [params])

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
      const { width, height } = sizeRef.current
      particlesRef.current = particlesRef.current.map((p) => ({
        ...p,
        x: Math.random() * width,
        y: Math.random() * height,
      }))
    }
    window.addEventListener('resize', handleResize)

    const initParticles = (): void => {
      particlesRef.current = []
    }
    initParticles()

    const animate = (now: number): void => {
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        animationRef.current = requestAnimationFrame(animate)
        return
      }

      const { width, height } = sizeRef.current

      const transitionProgress = clamp(
        (now - transitionStartRef.current) / transitionDuration,
        0,
        1,
      )
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

      if (transitionProgress >= 1) {
        currentParamsRef.current = { ...tp }
      }

      drawBackground(ctx, width, height, curParams)

      const particleCounts = calculateParticleCounts(curParams)
      manageParticles(width, height, particleCounts, curParams)
      updateAndDrawParticles(ctx, width, height, curParams, now)
      drawEffects(ctx, width, height, curParams, now)

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationRef.current)
    }
  }, [transitionDuration])

  const drawBackground = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    params: WeatherParams,
  ): void => {
    const { temperature, lightLevel, humidity,
    preset = params.preset
    const tempRatio = (temperature + 10) / 50

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
      const coldTop = [10, 22, 40]
      const hotTop2 = [10, 16, 40]
      const warmTop = [255, 107, 53]
      const coldBottom = [30, 60, 110]
      const warmBottom = [255, 200, 150]

      if (tempRatio < 0.5) {
        const t = tempRatio * 2
        topColor = lerpColor(coldTop, hotTop2, t)
        bottomColor = lerpColor(coldBottom, [100, 150, 200], t)
      } else {
        const t = (tempRatio - 0.5) * 2
        topColor = lerpColor(hotTop2, warmTop, t)
        bottomColor = lerpColor([100, 150, 200], warmBottom, t)
      }
    }

    const lightFactor = lightLevel / 100
    topColor = topColor.map((c) => Math.round(c * (0.4 + lightFactor * 0.6)) as number[]
    bottomColor = bottomColor.map((c) => Math.round(c * (0.5 + lightFactor * 0.5)) as number[]

    const mistFactor = humidity / 100
    const grayOverlay = [128
    topColor = topColor.map((c, i) => Math.round(lerp(c, grayOverlay[i] || 128, mistFactor * 0.3)) as number[]
    bottomColor = bottomColor.map((c, i) => Math.round(lerp(c, grayOverlay[i] || 128, mistFactor * 0.3)) as number[]

    const gradient = ctx.createLinearGradient(0, 0, 0, height)
    gradient.addColorStop(0, rgbToString(topColor))
    gradient.addColorStop(1, rgbToString(bottomColor))
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)
  }

  const calculateParticleCounts = (params: WeatherParams) => {
    const { temperature, humidity, windSpeed } = params
    const counts = { snow: 0, rain: 0, sand: 0, cloud: 0 }

    if (temperature < 5 && humidity > 40) {
      const intensity = ((5 - temperature) / 15 + humidity / 200
      counts.snow = Math.round(MAX_PARTICLES * 0.6 * clamp(intensity, 0, 1))
    }

    if (temperature >= 5 && temperature <= 30 && humidity > 60) {
      const intensity = humidity / 100
      counts.rain = Math.round(MAX_PARTICLES * 0.7 * clamp(intensity, 0, 1))
    }

    if (temperature > 25 && humidity < 40 && windSpeed > 5) {
      const intensity = (temperature - 25) / 15 + (windSpeed - 5) / 30
      counts.sand = Math.round(MAX_PARTICLES * 0.5 * clamp(intensity, 0, 1))
    }

    if (humidity > 50 && humidity < 90 && windSpeed < 10) {
      counts.cloud = Math.round(MAX_PARTICLES * 0.08 * clamp(humidity / 100, 0.2, 1))
    }

    return counts
  }

  const manageParticles = (
    width: number,
    height: number,
    counts: { snow: number; rain: number; sand: number; cloud: number },
    params: WeatherParams,
  ): void => {
    const particles = particlesRef.current
    const total = counts.snow + counts.rain + counts.sand + counts.cloud
    const currentCounts = { snow: 0, rain: 0, sand: 0, cloud: 0 }

    particles.forEach((p) => {
      currentCounts[p.type]++
    })

    const addParticle = (type: Particle['type']): void => {
      const baseSpeed = 0.5 + params.windSpeed / 10
      let p: Particle

      if (type === 'snow') {
        p = {
          x: Math.random() * width,
          y: -10 - Math.random() * height * 0.3,
          vx: (Math.random() - 0.5) * baseSpeed * 0.5,
          vy: 0.5 + Math.random() * 1.5 * baseSpeed,
          size: 2 + Math.random() * 4,
          life: 1,
          maxLife: 1,
          type,
          rotation: Math.random() * Math.PI * 2,
          seed: Math.random(),
        }
      } else if (type === 'rain') {
        p = {
          x: Math.random() * width,
          y: -10 - Math.random() * height * 0.2,
          vx: params.windSpeed * 0.15,
          vy: 8 + Math.random() * 6 * baseSpeed,
          size: 1 + Math.random() * 2,
          life: 1,
          maxLife: 1,
          type,
          rotation: 0,
          seed: Math.random(),
        }
      } else if (type === 'sand') {
        const fromLeft = params.windSpeed > 0
        p = {
          x: fromLeft ? -10 : width + 10,
          y: Math.random() * height,
          vx: (fromLeft ? 1 : -1) * (3 + Math.random() * 5 * (params.windSpeed / 10)),
          vy: (Math.random() - 0.5) * 2,
          size: 1 + Math.random() * 3,
          life: 1,
          maxLife: 1,
          type,
          rotation: 0,
          seed: Math.random(),
        }
      } else {
        p = {
          x: -100 - Math.random() * width,
          y: Math.random() * height * 0.6,
          vx: 0.2 + Math.random() * 0.5 + params.windSpeed * 0.05,
          vy: (Math.random() - 0.5) * 0.1,
          size: 60 + Math.random() * 120,
          life: 1,
          maxLife: 1,
          type,
          rotation: 0,
          seed: Math.random(),
        }
      }
      particles.push(p)
    }

    const removeExcess = (type: Particle['type'], excess: number): void => {
      for (let i = particles.length - 1; i >= 0 && excess > 0; i--) {
        if (particles[i].type === type) {
          particles.splice(i, 1)
          excess--
        }
      }
    }

    const types: Particle['type'][] = ['snow', 'rain', 'sand', 'cloud']
    types.forEach((type) => {
      const count = counts[type]
      const current = currentCounts[type]
      if (current < count) {
        const toAdd = Math.min(count - current, Math.ceil((count - current) * 0.1) + 5)
        for (let i = 0; i < toAdd && particles.length < MAX_PARTICLES; i++) {
          addParticle(type)
        }
      } else if (current > count) {
        removeExcess(type, current - count)
      }
    })

    if (particles.length > MAX_PARTICLES) {
      particles.length = MAX_PARTICLES
    }
    void total
  }

  const updateAndDrawParticles = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    params: WeatherParams,
    now: number,
  ): void => {
    const particles = particlesRef.current
    const { lightLevel, preset } = params
    const brightness = 0.3 + (lightLevel / 100) * 0.7

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]
      p.x += p.vx
      p.y += p.vy

      let remove = false

      if (p.type === 'snow') {
        if (p.y > height + 10) remove = true
        if (p.x < -20 || p.x > width + 20) remove = true
        p.rotation += 0.02

        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation)
        ctx.fillStyle = `rgba(255, 255, 255, ${0.7 * brightness})`
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
      } else if (p.type === 'rain') {
        if (p.y > height + 20) remove = true
        if (p.x < -50 || p.x > width + 50) remove = true

        const length = p.size * 8
        const alpha = 0.4 + p.seed * 0.3
        const isThunder = preset === 'thunder'
        const strokeColor = isThunder
          ? `rgba(180, 200, 255, ${alpha * brightness})`
          : `rgba(150, 180, 230, ${alpha * brightness})`

        ctx.strokeStyle = strokeColor
        ctx.lineWidth = p.size * 0.8
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(p.x, p.y)
        ctx.lineTo(p.x + p.vx * 0.3, p.y + length)
        ctx.stroke()
      } else if (p.type === 'sand') {
        if (p.x < -50 || p.x > width + 50) remove = true
        if (p.y < -50 || p.y > height + 50) remove = true

        const colors = [
          [210, 180, 140],
          [205, 163, 115],
          [222, 184, 135],
        ]
        const color = colors[Math.floor(p.seed * colors.length)]
        ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${0.6 * brightness})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      } else if (p.type === 'cloud') {
        if (p.x - p.size > width + 100) remove = true

        const cloudAlpha = 0.12 * brightness * (params.humidity / 100)
        const cloudColor = preset === 'thunder' ? [80, 80, 100] : [255, 255, 255]
        drawCloud(ctx, p.x, p.y, p.size, cloudColor, cloudAlpha)
      }

      if (remove) {
        particles.splice(i, 1)
      }
    }
    void now
  }

  const drawCloud = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    color: number[],
    alpha: number,
  ): void => {
    ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`
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
    const { preset, humidity } = params

    if (preset === 'rainbow') {
      drawRainbow(ctx, width, height)
    }

    if (preset === 'thunder') {
      drawLightning(ctx, width, height, now)
    }

    if (preset === 'sunset' || params.temperature > 20) {
      drawSun(ctx, width, height, params)
    }

    void humidity
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
      { color: [255, 0, 0, alpha: 0.18 },
      { color: [255, 127, 0, alpha: 0.18 },
      { color: [255, 255, 0, alpha: 0.18 },
      { color: [0, 255, 0, alpha: 0.18 },
      { color: [0, 0, 255, alpha: 0.18 },
      { color: [75, 0, 130, alpha: 0.18 },
      { color: [148, 0, 211, alpha: 0.18 },
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

    if (now - lightningTimerRef.current > 3000 + Math.random() * 5000
) {
      lightningTimerRef.current = now
      lightning.active = true
      lightning.intensity = 0.7 + Math.random() * 0.3

    }

    if (lightning.active) {
      const elapsed = now - lightningTimerRef.current

      if (elapsed < 80) {
        lightning.timer += 0.08

        const flashAlpha = Math.sin(lightning.timer * Math.PI) * lightning.intensity * 0.35
        if (flashAlpha > 0) {
          ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`
          ctx.fillRect(0, 0, width, height)
        }

        if (elapsed < 60 && elapsed > 20) {
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
        for (let j = 0 j < 3 j++) {
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
        : `rgba(255, 255, 245, ${intensity})`,
      ctx.beginPath()
      ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
      }}
    />
  )
})
