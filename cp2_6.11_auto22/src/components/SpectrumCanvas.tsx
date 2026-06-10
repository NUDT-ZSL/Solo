import { useRef, useEffect } from "react"

interface SpectrumCanvasProps {
  spectrum: { high: number; mid: number; low: number; mfcc: number[] }
  width: number
  height: number
}

function seededRandom(seed: number): () => number {
  let s = seed | 0 || 1
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashMfcc(mfcc: number[]): number {
  let h = 0
  for (let i = 0; i < mfcc.length; i++) {
    h = ((h << 5) - h + Math.round(mfcc[i] * 1000)) | 0
  }
  return Math.abs(h) || 42
}

export default function SpectrumCanvas({ spectrum, width, height }: SpectrumCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = width
    canvas.height = height

    const rand = seededRandom(hashMfcc(spectrum.mfcc))
    const cx = width / 2
    const cy = height / 2

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 0.7)
    const lowIntensity = 0.3 + spectrum.low * 0.7
    grad.addColorStop(0, `rgba(26, 0, 51, ${lowIntensity})`)
    grad.addColorStop(1, `rgba(13, 27, 42, ${lowIntensity})`)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, width, height)

    ctx.globalCompositeOperation = "screen"

    const waveCount = 5 + Math.floor(rand() * 4)
    const greenShades = ["#4CAF50", "#2E7D32", "#66BB6A", "#388E3C"]
    const blueShades = ["#1976D2", "#1565C0", "#42A5F5", "#1E88E5"]
    for (let i = 0; i < waveCount; i++) {
      const mfccOffset = spectrum.mfcc[i % spectrum.mfcc.length] || 0
      ctx.beginPath()
      const baseY = cy + (i - waveCount / 2) * (height / (waveCount + 1)) + mfccOffset * 20
      const amplitude = spectrum.mid * 30 + rand() * 20
      const color = rand() > 0.5 ? greenShades[i % greenShades.length] : blueShades[i % blueShades.length]
      ctx.strokeStyle = color
      ctx.lineWidth = 1.5 + rand()
      ctx.globalAlpha = 0.5 + spectrum.mid * 0.5

      ctx.moveTo(0, baseY)
      for (let x = 0; x <= width; x += 4) {
        const t = x / width
        const y =
          baseY +
          Math.sin(t * Math.PI * (2 + i) + mfccOffset * 3) * amplitude +
          Math.cos(t * Math.PI * (1 + i * 0.7)) * amplitude * 0.3
        ctx.lineTo(x, y)
      }
      ctx.stroke()
    }

    const rayCount = 20 + Math.floor(spectrum.high * 20)
    const yellowShades = ["#FFD600", "#FFC107", "#FFEB3B"]
    const orangeShades = ["#FF9800", "#F57C00", "#FFB74D"]
    for (let i = 0; i < rayCount; i++) {
      const angleBase = (i / rayCount) * Math.PI * 2
      const mfccAngle = spectrum.mfcc[i % spectrum.mfcc.length] || 0
      const angle = angleBase + mfccAngle * 0.5
      const len = (30 + spectrum.high * 120 + rand() * 60)
      const color = rand() > 0.5 ? yellowShades[i % yellowShades.length] : orangeShades[i % orangeShades.length]
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len)
      ctx.strokeStyle = color
      ctx.lineWidth = 0.5 + rand() * 1.5
      ctx.globalAlpha = 0.3 + spectrum.high * 0.6
      ctx.stroke()
    }

    ctx.globalCompositeOperation = "source-over"
    ctx.globalAlpha = 1
    const imageData = ctx.getImageData(0, 0, width, height)
    const pixels = imageData.data
    for (let i = 0; i < pixels.length; i += 16) {
      const noise = (rand() - 0.5) * 15
      pixels[i] = Math.min(255, Math.max(0, pixels[i] + noise))
      pixels[i + 1] = Math.min(255, Math.max(0, pixels[i + 1] + noise))
      pixels[i + 2] = Math.min(255, Math.max(0, pixels[i + 2] + noise))
    }
    ctx.putImageData(imageData, 0, 0)
  }, [spectrum, width, height])

  return <canvas ref={canvasRef} style={{ width, height }} className="rounded-lg" />
}
