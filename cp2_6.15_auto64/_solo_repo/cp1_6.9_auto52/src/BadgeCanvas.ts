export interface BadgeDrawOptions {
  color: string
  emoji: string
  rotation: number
  size: number
  shape: 'circle' | 'square' | 'triangle' | 'diamond' | 'hexagon' | 'star' | 'heart' | 'wave'
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const bigint = parseInt(
    h.length === 3
      ? h.split('').map((c) => c + c).join('')
      : h,
    16,
  )
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255]
}

function noise2D(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed * 43.1234) * 43758.5453
  return n - Math.floor(n)
}

function drawShape(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  shape: BadgeDrawOptions['shape'],
) {
  ctx.beginPath()
  switch (shape) {
    case 'circle':
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      break
    case 'square':
      ctx.rect(cx - r, cy - r, r * 2, r * 2)
      break
    case 'triangle':
      ctx.moveTo(cx, cy - r)
      ctx.lineTo(cx + r * 0.9, cy + r * 0.75)
      ctx.lineTo(cx - r * 0.9, cy + r * 0.75)
      ctx.closePath()
      break
    case 'diamond':
      ctx.moveTo(cx, cy - r)
      ctx.lineTo(cx + r, cy)
      ctx.lineTo(cx, cy + r)
      ctx.lineTo(cx - r, cy)
      ctx.closePath()
      break
    case 'hexagon': {
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6
        const x = cx + r * Math.cos(a)
        const y = cy + r * Math.sin(a)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()
      break
    }
    case 'star': {
      for (let i = 0; i < 10; i++) {
        const a = (Math.PI / 5) * i - Math.PI / 2
        const rr = i % 2 === 0 ? r : r * 0.45
        const x = cx + rr * Math.cos(a)
        const y = cy + rr * Math.sin(a)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()
      break
    }
    case 'heart': {
      ctx.moveTo(cx, cy + r * 0.85)
      ctx.bezierCurveTo(
        cx - r * 1.1, cy + r * 0.1,
        cx - r * 0.5, cy - r,
        cx, cy - r * 0.3,
      )
      ctx.bezierCurveTo(
        cx + r * 0.5, cy - r,
        cx + r * 1.1, cy + r * 0.1,
        cx, cy + r * 0.85,
      )
      ctx.closePath()
      break
    }
    case 'wave': {
      const waves = 4
      ctx.moveTo(cx - r, cy)
      for (let i = 0; i <= waves; i++) {
        const x = cx - r + (r * 2 * i) / waves
        const y = cy + (i % 2 === 0 ? -r * 0.7 : r * 0.7)
        ctx.quadraticCurveTo(x + r / waves, y, x + (r * 2) / waves, cy)
      }
      for (let i = waves; i >= 0; i--) {
        const x = cx - r + (r * 2 * i) / waves
        const y = cy + (i % 2 === 0 ? r * 0.7 : -r * 0.7) + r * 0.3
        ctx.quadraticCurveTo(x - r / waves, y, x - (r * 2) / waves, cy + r * 0.3)
      }
      ctx.closePath()
      break
    }
  }
}

export function drawBadgeToCanvas(
  canvas: HTMLCanvasElement,
  opts: BadgeDrawOptions,
) {
  const size = opts.size
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const cx = size / 2
  const cy = size / 2
  const r = size * 0.42

  const [R, G, B] = hexToRgb(opts.color)

  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate((opts.rotation * Math.PI) / 180)
  ctx.translate(-cx, -cy)

  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.4)
  glow.addColorStop(0, `rgba(${R},${G},${B},0.45)`)
  glow.addColorStop(0.6, `rgba(${R},${G},${B},0.12)`)
  glow.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(cx, cy, r * 1.4, 0, Math.PI * 2)
  ctx.fill()

  const mainGrad = ctx.createRadialGradient(
    cx - r * 0.3, cy - r * 0.3, r * 0.1,
    cx, cy, r,
  )
  mainGrad.addColorStop(0, `rgba(255,255,255,0.6)`)
  mainGrad.addColorStop(0.35, `rgba(${R},${G},${B},0.55)`)
  mainGrad.addColorStop(1, `rgba(${R},${G},${B},0.8)`)

  drawShape(ctx, cx, cy, r, opts.shape)
  ctx.fillStyle = mainGrad
  ctx.fill()

  ctx.strokeStyle = `rgba(${R},${G},${B},0.9)`
  ctx.lineWidth = 1
  ctx.stroke()

  const imgData = ctx.getImageData(0, 0, size, size)
  const data = imgData.data
  const seed = opts.rotation + R * 0.1 + G * 0.01
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      const alpha = data[idx + 3]
      if (alpha > 0) {
        const n = noise2D(x / size, y / size, seed)
        const add = (n - 0.5) * 28
        data[idx] = Math.max(0, Math.min(255, data[idx] + add))
        data[idx + 1] = Math.max(0, Math.min(255, data[idx + 1] + add))
        data[idx + 2] = Math.max(0, Math.min(255, data[idx + 2] + add))
      }
    }
  }
  ctx.putImageData(imgData, 0, 0)

  ctx.restore()

  ctx.save()
  ctx.font = `${Math.floor(size * 0.42)}px serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.shadowColor = 'rgba(0,0,0,0.15)'
  ctx.shadowBlur = 2
  ctx.fillText(opts.emoji, cx, cy + 1)
  ctx.restore()
}

export function createBadgeDataURL(opts: BadgeDrawOptions): string {
  const canvas = document.createElement('canvas')
  drawBadgeToCanvas(canvas, opts)
  return canvas.toDataURL('image/png')
}
