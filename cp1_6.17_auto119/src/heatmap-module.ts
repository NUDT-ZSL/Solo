import type { FixationPoint, HeatmapParams, ColorMapType } from './store'

interface RGB {
  r: number
  g: number
  b: number
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function lerpRGB(c1: RGB, c2: RGB, t: number): RGB {
  return {
    r: Math.round(lerp(c1.r, c2.r, t)),
    g: Math.round(lerp(c1.g, c2.g, t)),
    b: Math.round(lerp(c1.b, c2.b, t))
  }
}

const GREEN_YELLOW_RED_STOPS: Array<{ pos: number; color: RGB }> = [
  { pos: 0.0, color: { r: 0, g: 0, b: 255 } },
  { pos: 0.35, color: { r: 0, g: 255, b: 200 } },
  { pos: 0.5, color: { r: 0, g: 255, b: 0 } },
  { pos: 0.75, color: { r: 255, g: 230, b: 0 } },
  { pos: 1.0, color: { r: 255, g: 0, b: 0 } }
]

const BLUE_RED_STOPS: Array<{ pos: number; color: RGB }> = [
  { pos: 0.0, color: { r: 0, g: 50, b: 150 } },
  { pos: 0.2, color: { r: 30, g: 120, b: 220 } },
  { pos: 0.4, color: { r: 100, g: 180, b: 255 } },
  { pos: 0.5, color: { r: 200, g: 200, b: 200 } },
  { pos: 0.6, color: { r: 255, g: 150, b: 100 } },
  { pos: 0.8, color: { r: 230, g: 80, b: 50 } },
  { pos: 1.0, color: { r: 180, g: 0, b: 0 } }
]

function getColorStops(type: ColorMapType): Array<{ pos: number; color: RGB }> {
  return type === 'greenYellowRed' ? GREEN_YELLOW_RED_STOPS : BLUE_RED_STOPS
}

function mapValueToColor(value: number, colorMap: ColorMapType): RGB {
  const stops = getColorStops(colorMap)
  const v = Math.max(0, Math.min(1, value))

  for (let i = 0; i < stops.length - 1; i++) {
    const s1 = stops[i]
    const s2 = stops[i + 1]
    if (v >= s1.pos && v <= s2.pos) {
      const t = s2.pos === s1.pos ? 0 : (v - s1.pos) / (s2.pos - s1.pos)
      return lerpRGB(s1.color, s2.color, t)
    }
  }
  return stops[stops.length - 1].color
}

function buildColorLookupTable(colorMap: ColorMapType, size: number = 256): Uint8ClampedArray {
  const lut = new Uint8ClampedArray(size * 3)
  for (let i = 0; i < size; i++) {
    const v = i / (size - 1)
    const rgb = mapValueToColor(v, colorMap)
    lut[i * 3] = rgb.r
    lut[i * 3 + 1] = rgb.g
    lut[i * 3 + 2] = rgb.b
  }
  return lut
}

export class HeatmapRenderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private weightCanvas: HTMLCanvasElement
  private weightCtx: CanvasRenderingContext2D
  private colorLUT: Uint8ClampedArray
  private currentColorMap: ColorMapType

  constructor(width: number, height: number) {
    this.canvas = document.createElement('canvas')
    this.canvas.width = width
    this.canvas.height = height
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!

    this.weightCanvas = document.createElement('canvas')
    this.weightCanvas.width = width
    this.weightCanvas.height = height
    this.weightCtx = this.weightCanvas.getContext('2d', { willReadFrequently: true })!

    this.currentColorMap = 'greenYellowRed'
    this.colorLUT = buildColorLookupTable(this.currentColorMap)
  }

  resize(width: number, height: number): void {
    this.canvas.width = width
    this.canvas.height = height
    this.weightCanvas.width = width
    this.weightCanvas.height = height
  }

  private getWeightDecayGaussian(
    centerX: number,
    centerY: number,
    radius: number,
    weight: number,
    imageData: ImageData,
    width: number,
    height: number
  ): void {
    const r = Math.ceil(radius * 3)
    const minX = Math.max(0, Math.floor(centerX - r))
    const maxX = Math.min(width - 1, Math.ceil(centerX + r))
    const minY = Math.max(0, Math.floor(centerY - r))
    const maxY = Math.min(height - 1, Math.ceil(centerY + r))
    const sigma = radius
    const twoSigmaSq = 2 * sigma * sigma
    const data = imageData.data

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = x - centerX
        const dy = y - centerY
        const distSq = dx * dx + dy * dy
        if (distSq > 9 * sigma * sigma) continue

        let gaussian = Math.exp(-distSq / twoSigmaSq)
        const normalizedDist = Math.sqrt(distSq) / sigma
        const decayFactor = Math.pow(1 - Math.min(1, normalizedDist / 3), 2)
        gaussian = gaussian * (0.3 + 0.7 * decayFactor)

        const value = gaussian * weight * 255
        const idx = (y * width + x) * 4
        const current = data[idx]
        const newVal = Math.min(255, current + value)
        data[idx] = newVal
        data[idx + 1] = newVal
        data[idx + 2] = newVal
        data[idx + 3] = 255
      }
    }
  }

  render(
    fixations: FixationPoint[],
    params: HeatmapParams,
    sourceWidth: number,
    sourceHeight: number,
    targetWidth: number,
    targetHeight: number
  ): HTMLCanvasElement {
    const scaleX = targetWidth / sourceWidth
    const scaleY = targetHeight / sourceHeight

    this.resize(targetWidth, targetHeight)

    if (this.currentColorMap !== params.colorMap) {
      this.currentColorMap = params.colorMap
      this.colorLUT = buildColorLookupTable(params.colorMap)
    }

    this.weightCtx.clearRect(0, 0, targetWidth, targetHeight)
    this.ctx.clearRect(0, 0, targetWidth, targetHeight)

    const weightImageData = this.weightCtx.createImageData(targetWidth, targetHeight)

    if (fixations.length > 0) {
      const maxDuration = Math.max(...fixations.map(f => f.duration))
      const radius = params.blurRadius * Math.max(scaleX, scaleY)

      for (let i = 0; i < fixations.length; i++) {
        const f = fixations[i]
        const x = f.x * scaleX
        const y = f.y * scaleY
        const durationWeight = maxDuration > 0 ? f.duration / maxDuration : 1
        const baseWeight = durationWeight * (f.duration / 1000)

        this.getWeightDecayGaussian(
          x, y, radius, baseWeight,
          weightImageData, targetWidth, targetHeight
        )
      }
    }

    this.weightCtx.putImageData(weightImageData, 0, 0)

    this.applyGaussianBlur(targetWidth, targetHeight, params.blurRadius * 0.3)

    const blurredData = this.weightCtx.getImageData(0, 0, targetWidth, targetHeight)
    const outputImageData = this.ctx.createImageData(targetWidth, targetHeight)
    const src = blurredData.data
    const dst = outputImageData.data
    const alpha = Math.round(params.opacity * 255)

    for (let i = 0; i < src.length; i += 4) {
      const intensity = src[i]
      if (intensity > 0) {
        const lutIdx = Math.min(255, intensity) * 3
        dst[i] = this.colorLUT[lutIdx]
        dst[i + 1] = this.colorLUT[lutIdx + 1]
        dst[i + 2] = this.colorLUT[lutIdx + 2]
        const intensityAlpha = (intensity / 255) * alpha
        dst[i + 3] = Math.round(intensityAlpha)
      }
    }

    this.ctx.putImageData(outputImageData, 0, 0)
    return this.canvas
  }

  private applyGaussianBlur(width: number, height: number, sigma: number): void {
    if (sigma < 0.5) return
    const passes = 2
    for (let p = 0; p < passes; p++) {
      this.boxBlur(width, height, sigma)
    }
  }

  private boxBlur(width: number, height: number, sigma: number): void {
    const radius = Math.max(1, Math.round(sigma))
    const src = this.weightCtx.getImageData(0, 0, width, height)
    const tmp = this.weightCtx.createImageData(width, height)
    const srcData = src.data
    const tmpData = tmp.data

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0
        let count = 0
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx
          if (nx >= 0 && nx < width) {
            const idx = (y * width + nx) * 4
            sum += srcData[idx]
            count++
          }
        }
        const avg = count > 0 ? sum / count : 0
        const idx = (y * width + x) * 4
        tmpData[idx] = avg
        tmpData[idx + 1] = avg
        tmpData[idx + 2] = avg
        tmpData[idx + 3] = 255
      }
    }

    const result = this.weightCtx.createImageData(width, height)
    const resData = result.data

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0
        let count = 0
        for (let dy = -radius; dy <= radius; dy++) {
          const ny = y + dy
          if (ny >= 0 && ny < height) {
            const idx = (ny * width + x) * 4
            sum += tmpData[idx]
            count++
          }
        }
        const avg = count > 0 ? sum / count : 0
        const idx = (y * width + x) * 4
        resData[idx] = avg
        resData[idx + 1] = avg
        resData[idx + 2] = avg
        resData[idx + 3] = 255
      }
    }

    this.weightCtx.putImageData(result, 0, 0)
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas
  }
}
