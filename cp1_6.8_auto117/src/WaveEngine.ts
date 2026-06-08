import type { EmotionTag, EmotionColorSet, WaveParams } from '@/types'

class WaveEngine {
  static emotionColors: Record<EmotionTag, EmotionColorSet> = {
    calm: {
      primary: '#4FC3F7',
      secondary: '#0288D1',
      gradient: ['#01579B', '#0288D1', '#4FC3F7', '#81D4FA'],
      rgb: [79, 195, 247],
    },
    excited: {
      primary: '#FF8F00',
      secondary: '#E65100',
      gradient: ['#BF360C', '#E65100', '#FF8F00', '#FFB74D'],
      rgb: [255, 143, 0],
    },
    sad: {
      primary: '#7E57C2',
      secondary: '#4527A0',
      gradient: ['#311B92', '#4527A0', '#7E57C2', '#B39DDB'],
      rgb: [126, 87, 194],
    },
    curious: {
      primary: '#26A69A',
      secondary: '#00695C',
      gradient: ['#004D40', '#00695C', '#26A69A', '#80CBC4'],
      rgb: [38, 166, 154],
    },
    nostalgic: {
      primary: '#FFB74D',
      secondary: '#E65100',
      gradient: ['#4E342E', '#6D4C41', '#FFB74D', '#FFE0B2'],
      rgb: [255, 183, 77],
    },
  }

  static emotionWaveParams: Record<EmotionTag, WaveParams> = {
    calm: { amplitude: 30, frequency: 0.008, speed: 0.015, layers: 4, opacity: 0.3 },
    excited: { amplitude: 50, frequency: 0.015, speed: 0.04, layers: 4, opacity: 0.35 },
    sad: { amplitude: 20, frequency: 0.006, speed: 0.01, layers: 3, opacity: 0.25 },
    curious: { amplitude: 35, frequency: 0.012, speed: 0.025, layers: 4, opacity: 0.3 },
    nostalgic: { amplitude: 25, frequency: 0.007, speed: 0.012, layers: 3, opacity: 0.28 },
  }

  static getDominantEmotion(emotions: EmotionTag[]): EmotionTag {
    if (emotions.length === 0) return 'calm'
    const counts: Record<string, number> = {}
    emotions.forEach((e) => {
      counts[e] = (counts[e] || 0) + 1
    })
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] as EmotionTag
  }

  static renderWaves(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    time: number,
    emotions: EmotionTag[],
    isMobile: boolean
  ) {
    const dominant = WaveEngine.getDominantEmotion(emotions)
    const colors = WaveEngine.emotionColors[dominant]
    const params = WaveEngine.emotionWaveParams[dominant]
    const maxLayers = isMobile ? 2 : params.layers

    for (let layer = 0; layer < maxLayers; layer++) {
      const layerProgress = layer / maxLayers
      const amplitude = params.amplitude * (1 - layerProgress * 0.3)
      const frequency = params.frequency * (1 + layerProgress * 0.5)
      const speed = params.speed * (1 + layerProgress * 0.2)
      const yOffset = height * 0.5 + layerProgress * height * 0.15
      const alpha = params.opacity * (1 - layerProgress * 0.4)

      ctx.beginPath()
      ctx.moveTo(0, height)

      for (let x = 0; x <= width; x += 2) {
        const y =
          yOffset +
          Math.sin(x * frequency + time * speed * 60 + layer * 1.5) * amplitude +
          Math.sin(x * frequency * 0.5 + time * speed * 30 + layer) * amplitude * 0.5
        ctx.lineTo(x, y)
      }

      ctx.lineTo(width, height)
      ctx.closePath()

      const gradient = ctx.createLinearGradient(0, yOffset - amplitude, 0, height)
      const colorIdx = Math.min(layer, colors.gradient.length - 1)
      const color = colors.gradient[colorIdx]
      gradient.addColorStop(0, WaveEngine.hexToRgba(color, alpha))
      gradient.addColorStop(1, WaveEngine.hexToRgba(color, alpha * 0.1))

      ctx.fillStyle = gradient
      ctx.fill()
    }
  }

  static renderSpectrum(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    data: Uint8Array,
    emotion: EmotionTag
  ) {
    const colors = WaveEngine.emotionColors[emotion]
    const barCount = 64
    const barWidth = width / barCount
    const gap = 2
    const step = Math.floor(data.length / barCount)

    ctx.clearRect(0, 0, width, height)

    for (let i = 0; i < barCount; i++) {
      const value = data[i * step] / 255
      const barHeight = value * height * 0.85
      const x = i * barWidth + gap / 2
      const y = height - barHeight

      const gradient = ctx.createLinearGradient(x, height, x, y)
      gradient.addColorStop(0, WaveEngine.hexToRgba(colors.secondary, 0.6))
      gradient.addColorStop(1, WaveEngine.hexToRgba(colors.primary, 0.9))

      ctx.fillStyle = gradient
      ctx.beginPath()
      const radius = Math.min(barWidth - gap, barHeight) / 2
      if (barHeight > 0 && radius > 0) {
        ctx.moveTo(x, height)
        ctx.lineTo(x, y + radius)
        ctx.quadraticCurveTo(x, y, x + radius, y)
        ctx.lineTo(x + barWidth - gap - radius, y)
        ctx.quadraticCurveTo(x + barWidth - gap, y, x + barWidth - gap, y + radius)
        ctx.lineTo(x + barWidth - gap, height)
      }
      ctx.fill()
    }
  }

  static renderMiniWave(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    time: number,
    emotion: EmotionTag
  ) {
    const colors = WaveEngine.emotionColors[emotion]
    const params = WaveEngine.emotionWaveParams[emotion]

    ctx.clearRect(0, 0, width, height)
    ctx.beginPath()

    for (let x = 0; x <= width; x += 1) {
      const y =
        height / 2 +
        Math.sin(x * params.frequency * 3 + time * params.speed * 120) * (height * 0.3) +
        Math.sin(x * params.frequency * 1.5 + time * params.speed * 60) * (height * 0.15)
      if (x === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }

    ctx.strokeStyle = colors.primary
    ctx.lineWidth = 1.5
    ctx.stroke()
  }

  static hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r},${g},${b},${alpha})`
  }
}

export default WaveEngine
