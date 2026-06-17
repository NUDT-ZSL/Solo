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
  { pos: 0.00, color: { r: 0,   g: 0,   b: 255 } },
  { pos: 0.20, color: { r: 0,   g: 180, b: 255 } },
  { pos: 0.40, color: { r: 0,   g: 255, b: 180 } },
  { pos: 0.55, color: { r: 60,  g: 255, b: 60  } },
  { pos: 0.75, color: { r: 255, g: 230, b: 0   } },
  { pos: 0.90, color: { r: 255, g: 120, b: 0   } },
  { pos: 1.00, color: { r: 255, g: 0,   b: 0   } }
]

const BLUE_RED_STOPS: Array<{ pos: number; color: RGB }> = [
  { pos: 0.00, color: { r: 30,  g: 60,  b: 150 } },
  { pos: 0.15, color: { r: 55,  g: 110, b: 200 } },
  { pos: 0.30, color: { r: 100, g: 160, b: 235 } },
  { pos: 0.42, color: { r: 160, g: 185, b: 220 } },
  { pos: 0.50, color: { r: 205, g: 205, b: 205 } },
  { pos: 0.58, color: { r: 230, g: 185, b: 160 } },
  { pos: 0.72, color: { r: 245, g: 140, b: 95  } },
  { pos: 0.86, color: { r: 220, g: 70,  b: 40  } },
  { pos: 1.00, color: { r: 170, g: 10,  b: 10  } }
]

function getColorStops(type: ColorMapType): Array<{ pos: number; color: RGB }> {
  return type === 'greenYellowRed' ? GREEN_YELLOW_RED_STOPS : BLUE_RED_STOPS
}

function mapValueToColor(value: number, colorMap: ColorMapType): RGB {
  const stops = getColorStops(colorMap)
  const v = Math.max(0, Math.min(1, value))

  if (v <= stops[0].pos) return stops[0].color
  if (v >= stops[stops.length - 1].pos) return stops[stops.length - 1].color

  for (let i = 0; i < stops.length - 1; i++) {
    const s1 = stops[i]
    const s2 = stops[i + 1]
    if (v >= s1.pos && v <= s2.pos) {
      const t = s2.pos === s1.pos ? 0 : (v - s1.pos) / (s2.pos - s1.pos)
      const smoothT = t * t * (3 - 2 * t)
      return lerpRGB(s1.color, s2.color, smoothT)
    }
  }
  return stops[stops.length - 1].color
}

function buildColorLookupTable(colorMap: ColorMapType, size: number = 512): Uint8ClampedArray {
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

function generateGaussianKernel1D(sigma: number): number[] {
  const radius = Math.max(1, Math.ceil(sigma * 3))
  const size = radius * 2 + 1
  const kernel = new Array(size)
  const twoSigmaSq = 2 * sigma * sigma
  let sum = 0

  for (let i = 0; i < size; i++) {
    const x = i - radius
    const val = Math.exp(-(x * x) / twoSigmaSq)
    kernel[i] = val
    sum += val
  }

  for (let i = 0; i < size; i++) {
    kernel[i] /= sum
  }

  return kernel
}

function boxesForGauss(sigma: number, n: number): number[] {
  const wIdeal = Math.sqrt((12 * sigma * sigma / n) + 1)
  let wl = Math.floor(wIdeal)
  if (wl % 2 === 0) wl--
  const wu = wl + 2

  const mIdeal = (12 * sigma * sigma - n * wl * wl - 4 * n * wl - 3 * n) / (-4 * wl - 4)
  const m = Math.round(mIdeal)

  const sizes: number[] = []
  for (let i = 0; i < n; i++) {
    sizes.push(i < m ? wl : wu)
  }
  return sizes
}

export class HeatmapRenderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private weightCanvas: HTMLCanvasElement
  private weightCtx: CanvasRenderingContext2D
  private colorLUT: Uint8ClampedArray
  private currentColorMap: ColorMapType
  private lutSize: number

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
    this.lutSize = 512
    this.colorLUT = buildColorLookupTable(this.currentColorMap, this.lutSize)
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
    const sigma = Math.max(0.5, radius * 0.6)
    const twoSigmaSq = 2 * sigma * sigma
    const data = imageData.data

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = x - centerX
        const dy = y - centerY
        const distSq = dx * dx + dy * dy
        if (distSq > 9 * sigma * sigma) continue

        let gaussian = Math.exp(-distSq / twoSigmaSq)
        const normalizedDist = Math.sqrt(distSq) / (sigma * 3)
        const decayFactor = Math.pow(1 - Math.min(1, normalizedDist), 1.8)
        gaussian = gaussian * (0.25 + 0.75 * decayFactor)

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
      this.colorLUT = buildColorLookupTable(params.colorMap, this.lutSize)
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
        const baseWeight = Math.min(1.5, durationWeight * (0.5 + f.duration / 1500))

        this.getWeightDecayGaussian(
          x, y, radius, baseWeight,
          weightImageData, targetWidth, targetHeight
        )
      }
    }

    this.weightCtx.putImageData(weightImageData, 0, 0)

    const blurSigma = Math.max(0.6, params.blurRadius * 0.35 * Math.max(scaleX, scaleY))
    this.applyGaussianBlur(targetWidth, targetHeight, blurSigma)

    const blurredData = this.weightCtx.getImageData(0, 0, targetWidth, targetHeight)
    const outputImageData = this.ctx.createImageData(targetWidth, targetHeight)
    const src = blurredData.data
    const dst = outputImageData.data
    const alpha = Math.round(params.opacity * 255)
    const lutMax = this.lutSize - 1

    for (let i = 0; i < src.length; i += 4) {
      const intensity = src[i]
      if (intensity > 0) {
        const lutIdx = Math.min(lutMax, Math.round((intensity / 255) * lutMax)) * 3
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
    if (sigma < 0.3 || width < 2 || height < 2) return

    if (sigma < 1.2) {
      this.applyGaussianBlurKernel(width, height, sigma)
    } else {
      this.applyBoxBlurApprox(width, height, sigma, 4)
    }
  }

  private applyGaussianBlurKernel(width: number, height: number, sigma: number): void {
    const kernel = generateGaussianKernel1D(sigma)
    const radius = (kernel.length - 1) >> 1

    const src = this.weightCtx.getImageData(0, 0, width, height)
    const tmp = this.weightCtx.createImageData(width, height)
    const srcData = src.data
    const tmpData = tmp.data

    for (let y = 0; y < height; y++) {
      const rowOffset = y * width * 4
      for (let x = 0; x < width; x++) {
        let sum = 0
        for (let k = -radius; k <= radius; k++) {
          const nx = Math.min(width - 1, Math.max(0, x + k))
          sum += srcData[rowOffset + nx * 4] * kernel[k + radius]
        }
        const outIdx = rowOffset + x * 4
        tmpData[outIdx] = sum
        tmpData[outIdx + 1] = sum
        tmpData[outIdx + 2] = sum
        tmpData[outIdx + 3] = 255
      }
    }

    const result = this.weightCtx.createImageData(width, height)
    const resData = result.data
    const col = new Float32Array(height)

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        col[y] = tmpData[(y * width + x) * 4]
      }
      for (let y = 0; y < height; y++) {
        let sum = 0
        for (let k = -radius; k <= radius; k++) {
          const ny = Math.min(height - 1, Math.max(0, y + k))
          sum += col[ny] * kernel[k + radius]
        }
        const outIdx = (y * width + x) * 4
        resData[outIdx] = Math.min(255, sum)
        resData[outIdx + 1] = Math.min(255, sum)
        resData[outIdx + 2] = Math.min(255, sum)
        resData[outIdx + 3] = 255
      }
    }

    this.weightCtx.putImageData(result, 0, 0)
  }

  private applyBoxBlurApprox(width: number, height: number, sigma: number, passes: number): void {
    const boxes = boxesForGauss(sigma, passes)
    for (let i = 0; i < passes; i++) {
      const radius = (boxes[i] - 1) >> 1
      this.separableBoxBlur(width, height, radius)
    }
  }

  private separableBoxBlur(width: number, height: number, radius: number): void {
    if (radius <= 0) return

    const src = this.weightCtx.getImageData(0, 0, width, height)
    const tmp = this.weightCtx.createImageData(width, height)
    const srcData = src.data
    const tmpData = tmp.data
    const diam = radius + radius + 1

    for (let y = 0; y < height; y++) {
      const rowStart = y * width
      let sum = 0
      for (let i = -radius; i <= radius; i++) {
        const px = Math.min(width - 1, Math.max(0, i))
        sum += srcData[(rowStart + px) * 4]
      }
      for (let x = 0; x < width; x++) {
        const outIdx = (rowStart + x) * 4
        const avg = sum / diam
        tmpData[outIdx] = avg
        tmpData[outIdx + 1] = avg
        tmpData[outIdx + 2] = avg
        tmpData[outIdx + 3] = 255

        const xAdd = Math.min(width - 1, x + radius + 1)
        const xSub = Math.max(0, x - radius)
        sum += srcData[(rowStart + xAdd) * 4] - srcData[(rowStart + xSub) * 4]
      }
    }

    const result = this.weightCtx.createImageData(width, height)
    const resData = result.data
    const col = new Float32Array(width)

    for (let x = 0; x < width; x++) {
      let sum = 0
      for (let i = -radius; i <= radius; i++) {
        const py = Math.min(height - 1, Math.max(0, i))
        sum += tmpData[(py * width + x) * 4]
      }
      for (let y = 0; y < height; y++) {
        const outIdx = (y * width + x) * 4
        const avg = sum / diam
        resData[outIdx] = avg
        resData[outIdx + 1] = avg
        resData[outIdx + 2] = avg
        resData[outIdx + 3] = 255

        const yAdd = Math.min(height - 1, y + radius + 1)
        const ySub = Math.max(0, y - radius)
        sum += tmpData[(yAdd * width + x) * 4] - tmpData[(ySub * width + x) * 4]
      }
      void col
    }

    this.weightCtx.putImageData(result, 0, 0)
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas
  }
}
