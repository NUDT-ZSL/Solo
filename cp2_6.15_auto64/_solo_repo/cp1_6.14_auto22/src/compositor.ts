import type { Layer, BlendMode } from './types'

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function blendNormal(_base: number, blend: number): number {
  return blend
}

function blendMultiply(base: number, blend: number): number {
  return (base * blend) / 255
}

function blendScreen(base: number, blend: number): number {
  return 255 - ((255 - base) * (255 - blend)) / 255
}

function blendOverlay(base: number, blend: number): number {
  if (base < 128) {
    return (2 * base * blend) / 255
  }
  return 255 - (2 * (255 - base) * (255 - blend)) / 255
}

function blendSoftLight(base: number, blend: number): number {
  const baseN = base / 255
  const blendN = blend / 255
  
  if (blendN < 0.5) {
    return 255 * (baseN - (1 - 2 * blendN) * baseN * (1 - baseN))
  }
  return 255 * (baseN + (2 * blendN - 1) * (Math.sqrt(baseN) - baseN))
}

function blendDifference(base: number, blend: number): number {
  return Math.abs(base - blend)
}

function getBlendFunction(mode: BlendMode): (base: number, blend: number) => number {
  switch (mode) {
    case 'normal': return blendNormal
    case 'multiply': return blendMultiply
    case 'screen': return blendScreen
    case 'overlay': return blendOverlay
    case 'soft-light': return blendSoftLight
    case 'difference': return blendDifference
    default: return blendNormal
  }
}

export function compositeLayers(
  layers: Layer[],
  width: number,
  height: number,
  startLayerIndex = 0,
  endLayerIndex = layers.length
): ImageData {
  const output = new Uint8ClampedArray(width * height * 4)
  
  for (let i = 0; i < output.length; i += 4) {
    output[i] = 0
    output[i + 1] = 0
    output[i + 2] = 0
    output[i + 3] = 0
  }

  for (let layerIdx = startLayerIndex; layerIdx < endLayerIndex; layerIdx++) {
    const layer = layers[layerIdx]
    if (!layer.imageData || layer.opacity <= 0) continue

    const srcData = layer.imageData.data
    const blendFn = getBlendFunction(layer.blendMode)
    const layerOpacity = layer.opacity / 100

    if (layer.blendMode === 'normal' && layerOpacity >= 1) {
      for (let i = 0; i < output.length; i += 4) {
        const srcA = srcData[i + 3]
        if (srcA === 0) continue
        if (srcA === 255) {
          output[i] = srcData[i]
          output[i + 1] = srcData[i + 1]
          output[i + 2] = srcData[i + 2]
          output[i + 3] = 255
        } else {
          const srcAlpha = srcA / 255
          const dstAlpha = output[i + 3] / 255
          const outAlpha = srcAlpha + dstAlpha * (1 - srcAlpha)
          
          if (outAlpha > 0) {
            output[i] = (srcData[i] * srcAlpha + output[i] * dstAlpha * (1 - srcAlpha)) / outAlpha
            output[i + 1] = (srcData[i + 1] * srcAlpha + output[i + 1] * dstAlpha * (1 - srcAlpha)) / outAlpha
            output[i + 2] = (srcData[i + 2] * srcAlpha + output[i + 2] * dstAlpha * (1 - srcAlpha)) / outAlpha
          }
          output[i + 3] = outAlpha * 255
        }
      }
    } else {
      for (let i = 0; i < output.length; i += 4) {
        const srcA = srcData[i + 3]
        if (srcA === 0) continue

        const srcAlpha = (srcA / 255) * layerOpacity
        const dstAlpha = output[i + 3] / 255
        const outAlpha = srcAlpha + dstAlpha * (1 - srcAlpha)

        if (outAlpha > 0) {
          for (let c = 0; c < 3; c++) {
            const blended = blendFn(output[i + c], srcData[i + c])
            output[i + c] = clamp(
              (blended * srcAlpha + output[i + c] * dstAlpha * (1 - srcAlpha)) / outAlpha,
              0,
              255
            )
          }
        }
        output[i + 3] = outAlpha * 255
      }
    }
  }

  return new ImageData(output, width, height)
}

export function getLayerImageData(
  image: HTMLImageElement,
  targetWidth: number,
  targetHeight: number
): ImageData {
  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight
  const ctx = canvas.getContext('2d')!
  
  const imgAspect = image.width / image.height
  const targetAspect = targetWidth / targetHeight
  
  let drawWidth = targetWidth
  let drawHeight = targetHeight
  let offsetX = 0
  let offsetY = 0
  
  if (imgAspect > targetAspect) {
    drawHeight = targetWidth / imgAspect
    offsetY = (targetHeight - drawHeight) / 2
  } else {
    drawWidth = targetHeight * imgAspect
    offsetX = (targetWidth - drawWidth) / 2
  }
  
  ctx.clearRect(0, 0, targetWidth, targetHeight)
  ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight)
  
  return ctx.getImageData(0, 0, targetWidth, targetHeight)
}
