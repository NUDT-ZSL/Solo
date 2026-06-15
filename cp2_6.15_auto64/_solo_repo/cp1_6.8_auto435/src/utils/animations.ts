export function createRipple(
  canvas: HTMLCanvasElement,
  x: number,
  y: number,
  color: string,
  onFrame?: () => void
): Promise<void> {
  return new Promise((resolve) => {
    const ctx = canvas.getContext('2d')!
    let radius = 0
    const maxRadius = 80
    const speed = 1.5

    function animate() {
      radius += speed
      const alpha = 1 - radius / maxRadius
      if (alpha <= 0) {
        resolve()
        return
      }
      ctx.save()
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.strokeStyle = color.replace(')', `,${alpha * 0.5})`).replace('rgb', 'rgba')
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.restore()
      onFrame?.()
      if (radius < maxRadius) {
        requestAnimationFrame(animate)
      } else {
        resolve()
      }
    }
    requestAnimationFrame(animate)
  })
}

export function createGlowPulse(
  canvas: HTMLCanvasElement,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  duration: number = 1500
): Promise<void> {
  return new Promise((resolve) => {
    const ctx = canvas.getContext('2d')!
    const startTime = performance.now()

    function animate(now: number) {
      const elapsed = now - startTime
      const progress = elapsed / duration
      if (progress >= 1) {
        resolve()
        return
      }
      const pulseAlpha = Math.sin(progress * Math.PI * 2) * 0.3 + 0.3
      const glowSize = Math.sin(progress * Math.PI * 2) * 4 + 6
      ctx.save()
      ctx.shadowColor = color
      ctx.shadowBlur = glowSize * 2
      ctx.fillStyle = color.replace(')', `,${pulseAlpha})`).replace('rgb', 'rgba')
      if (!color.startsWith('rgb')) {
        ctx.fillStyle = hexToRgba(color, pulseAlpha)
        ctx.shadowColor = color
      }
      const cx = x + width / 2
      const cy = y + height / 2
      const rx = width / 2 + glowSize
      const ry = height / 2 + glowSize
      ctx.beginPath()
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  })
}

export function createGoldFoilEffect(
  canvas: HTMLCanvasElement,
  x: number,
  y: number,
  duration: number = 2500
): Promise<void> {
  return new Promise((resolve) => {
    const ctx = canvas.getContext('2d')!
    const startTime = performance.now()
    const sparkles: Array<{ sx: number; sy: number; size: number; speed: number; angle: number }> = []

    for (let i = 0; i < 8; i++) {
      sparkles.push({
        sx: x + Math.random() * 40 - 20,
        sy: y + Math.random() * 40 - 20,
        size: 1 + Math.random() * 2,
        speed: 0.5 + Math.random() * 1,
        angle: Math.random() * Math.PI * 2,
      })
    }

    function animate(now: number) {
      const elapsed = now - startTime
      const progress = elapsed / duration
      if (progress >= 1) {
        resolve()
        return
      }

      const fadeIn = Math.min(progress * 4, 1)
      const fadeOut = progress > 0.7 ? 1 - (progress - 0.7) / 0.3 : 1
      const alpha = fadeIn * fadeOut

      ctx.save()
      ctx.shadowColor = '#ffd700'
      ctx.shadowBlur = 12
      ctx.fillStyle = `rgba(255, 215, 0, ${alpha * 0.9})`
      ctx.beginPath()
      const s = 6 + Math.sin(progress * Math.PI) * 4
      ctx.moveTo(x, y - s)
      ctx.lineTo(x + s * 0.6, y)
      ctx.lineTo(x, y + s)
      ctx.lineTo(x - s * 0.6, y)
      ctx.closePath()
      ctx.fill()

      for (const sp of sparkles) {
        const t = progress * sp.speed * 3
        const sparkleAlpha = alpha * Math.sin(t * Math.PI) * 0.8
        if (sparkleAlpha > 0) {
          ctx.fillStyle = `rgba(255, 223, 100, ${sparkleAlpha})`
          ctx.beginPath()
          ctx.arc(
            sp.sx + Math.cos(sp.angle + t) * 15,
            sp.sy + Math.sin(sp.angle + t) * 15,
            sp.size,
            0,
            Math.PI * 2
          )
          ctx.fill()
        }
      }
      ctx.restore()
      requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  })
}

export function createFilmGrain(
  canvas: HTMLCanvasElement,
  duration: number,
  intensity: number = 0.08
): () => void {
  const ctx = canvas.getContext('2d')!
  let running = true
  let lastTime = 0
  const interval = 1000 / 12

  function animate(now: number) {
    if (!running) return
    if (now - lastTime < interval) {
      requestAnimationFrame(animate)
      return
    }
    lastTime = now

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data
    for (let i = 0; i < data.length; i += 16) {
      const noise = (Math.random() - 0.5) * 255 * intensity
      data[i] += noise
      data[i + 1] += noise
      data[i + 2] += noise
    }
    ctx.putImageData(imageData, 0, 0)
    requestAnimationFrame(animate)
  }
  requestAnimationFrame(animate)

  return () => {
    running = false
  }
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

export function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t)
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

export function createSmoothTransition(
  from: number,
  to: number,
  duration: number,
  onUpdate: (value: number) => void,
  onComplete?: () => void
): () => void {
  const startTime = performance.now()
  let cancelled = false

  function animate(now: number) {
    if (cancelled) return
    const elapsed = now - startTime
    const progress = Math.min(elapsed / duration, 1)
    const eased = easeInOutCubic(progress)
    onUpdate(lerp(from, to, eased))
    if (progress < 1) {
      requestAnimationFrame(animate)
    } else {
      onComplete?.()
    }
  }
  requestAnimationFrame(animate)

  return () => {
    cancelled = true
  }
}

export function drawWornEdges(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  ctx.save()
  ctx.strokeStyle = 'rgba(160, 140, 110, 0.3)'
  ctx.lineWidth = 1

  for (let i = 0; i < 30; i++) {
    const side = Math.floor(Math.random() * 4)
    let sx, sy, ex, ey
    const len = 10 + Math.random() * 40
    switch (side) {
      case 0:
        sx = Math.random() * width
        sy = 0
        ex = sx + (Math.random() - 0.5) * 20
        ey = sy + len
        break
      case 1:
        sx = width
        sy = Math.random() * height
        ex = sx - len
        ey = sy + (Math.random() - 0.5) * 20
        break
      case 2:
        sx = Math.random() * width
        sy = height
        ex = sx + (Math.random() - 0.5) * 20
        ey = sy - len
        break
      default:
        sx = 0
        sy = Math.random() * height
        ex = sx + len
        ey = sy + (Math.random() - 0.5) * 20
        break
    }
    ctx.beginPath()
    ctx.moveTo(sx, sy)
    ctx.lineTo(ex, ey)
    ctx.stroke()
  }

  for (let i = 0; i < 5; i++) {
    const fx = Math.random() * width
    const fy = Math.random() * height
    ctx.beginPath()
    ctx.moveTo(fx, fy)
    ctx.quadraticCurveTo(
      fx + (Math.random() - 0.5) * 60,
      fy + (Math.random() - 0.5) * 60,
      fx + (Math.random() - 0.5) * 30,
      fy + (Math.random() - 0.5) * 30
    )
    ctx.strokeStyle = 'rgba(140, 120, 90, 0.15)'
    ctx.lineWidth = 0.5
    ctx.stroke()
  }
  ctx.restore()
}
