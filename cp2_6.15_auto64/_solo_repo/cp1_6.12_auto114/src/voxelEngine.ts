import * as THREE from 'three'
import type { SliceData } from './store'

export const MAX_VOXELS = 200000
export const MAX_SLICES = 50

export interface VoxelGeometryData {
  positions: Float32Array
  colors: Float32Array
  alphas: Float32Array
  count: number
  boundingBox: { x: number; y: number; z: number }
  isCapped: boolean
}

export function extractNumberFromFilename(filename: string): number {
  const match = filename.match(/(\d+)/)
  return match ? parseInt(match[1], 10) : 0
}

export function sortSlicesByNumber(files: File[]): File[] {
  return [...files].sort((a, b) => {
    const numA = extractNumberFromFilename(a.name)
    const numB = extractNumberFromFilename(b.name)
    return numA - numB
  })
}

export function loadImageFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

export function imageToImageDataOffscreen(img: HTMLImageElement): ImageData {
  let canvas: OffscreenCanvas | HTMLCanvasElement

  if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(img.width, img.height)
  } else {
    canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
  }

  const ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null
  if (!ctx) throw new Error('无法获取 canvas 上下文')
  ctx.drawImage(img, 0, 0)

  if (canvas instanceof OffscreenCanvas) {
    const bitmap = canvas.transferToImageBitmap()
    const readCanvas = new OffscreenCanvas(bitmap.width, bitmap.height)
    const readCtx = readCanvas.getContext('2d')!
    readCtx.drawImage(bitmap, 0, 0)
    bitmap.close()
    return readCtx.getImageData(0, 0, img.width, img.height)
  }

  return (ctx as CanvasRenderingContext2D).getImageData(0, 0, img.width, img.height)
}

export function createImageBitmapFromFile(file: File): Promise<ImageBitmap> {
  return createImageBitmap(file)
}

export async function imageBitmapToSliceData(
  bitmap: ImageBitmap,
  file: File,
  index: number
): Promise<SliceData> {
  const offscreen = new OffscreenCanvas(bitmap.width, bitmap.height)
  const ctx = offscreen.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0)
  const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height)
  bitmap.close()

  return {
    id: `slice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: file.name,
    imageData,
    width: offscreen.width,
    height: offscreen.height,
    index,
  }
}

export async function fileToSliceData(file: File, index: number): Promise<SliceData> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmapFromFile(file)
      return await imageBitmapToSliceData(bitmap, file, index)
    } catch {
      const img = await loadImageFile(file)
      const imageData = imageToImageDataOffscreen(img)
      URL.revokeObjectURL(img.src)
      return {
        id: `slice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        imageData,
        width: img.width,
        height: img.height,
        index,
      }
    }
  }

  const img = await loadImageFile(file)
  const imageData = imageToImageDataOffscreen(img)
  URL.revokeObjectURL(img.src)
  return {
    id: `slice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: file.name,
    imageData,
    width: img.width,
    height: img.height,
    index,
  }
}

export async function processFiles(files: File[]): Promise<SliceData[]> {
  const validFiles = files.filter((f) => /\.(png|jpe?g)$/i.test(f.name))
  if (validFiles.length === 0) {
    throw new Error('请上传 PNG 或 JPEG 格式的图片')
  }
  if (validFiles.length > MAX_SLICES) {
    throw new Error(`最多只能上传 ${MAX_SLICES} 张切片`)
  }

  const sortedFiles = sortSlicesByNumber(validFiles)

  const concurrency = Math.min(navigator.hardwareConcurrency || 4, sortedFiles.length)
  const results: SliceData[] = []

  for (let i = 0; i < sortedFiles.length; i += concurrency) {
    const batch = sortedFiles.slice(i, i + concurrency)
    const batchResults = await Promise.all(
      batch.map((file, batchIdx) => fileToSliceData(file, i + batchIdx))
    )
    results.push(...batchResults)
  }

  return results
}

function estimateVoxelStep(width: number, height: number, depth: number): number {
  const totalPixels = width * height * depth
  if (totalPixels <= MAX_VOXELS) return 1

  const ratio = totalPixels / MAX_VOXELS
  let step = Math.ceil(Math.cbrt(ratio))
  step = Math.max(1, step)

  const estimated = Math.ceil(width / step) * Math.ceil(height / step) * depth
  while (estimated > MAX_VOXELS && step < 100) {
    step++
  }

  return step
}

export function generateVoxelData(
  slices: SliceData[],
  sliceSpacing: number,
  opacity: number
): VoxelGeometryData {
  const empty: VoxelGeometryData = {
    positions: new Float32Array(0),
    colors: new Float32Array(0),
    alphas: new Float32Array(0),
    count: 0,
    boundingBox: { x: 0, y: 0, z: 0 },
    isCapped: false,
  }

  if (slices.length === 0) return empty

  const firstSlice = slices[0]
  const width = firstSlice.width
  const height = firstSlice.height
  const depth = slices.length

  const step = estimateVoxelStep(width, height, depth)
  const isCapped = step > 1

  const maxPossibleCount = Math.ceil(width / step) * Math.ceil(height / step) * depth
  const bufferCount = Math.min(maxPossibleCount, MAX_VOXELS)

  const positions = new Float32Array(bufferCount * 3)
  const colors = new Float32Array(bufferCount * 3)
  const alphas = new Float32Array(bufferCount)

  let voxelIndex = 0
  const alphaThreshold = 10

  const halfW = width / 2
  const halfH = height / 2
  const halfD = (depth * sliceSpacing) / 2

  for (let z = 0; z < depth && voxelIndex < MAX_VOXELS; z++) {
    const slice = slices[z]
    const data = slice.imageData.data
    const zPos = z * sliceSpacing - halfD

    for (let y = 0; y < height && voxelIndex < MAX_VOXELS; y += step) {
      for (let x = 0; x < width && voxelIndex < MAX_VOXELS; x += step) {
        const pixelIndex = (y * width + x) * 4
        const r = data[pixelIndex]
        const g = data[pixelIndex + 1]
        const b = data[pixelIndex + 2]
        const a = data[pixelIndex + 3]

        if (a < alphaThreshold) continue

        const idx = voxelIndex * 3
        positions[idx] = x - halfW
        positions[idx + 1] = -(y - halfH)
        positions[idx + 2] = zPos

        colors[idx] = r / 255
        colors[idx + 1] = g / 255
        colors[idx + 2] = b / 255

        const nx = (x - halfW) / halfW
        const ny = (y - halfH) / halfH
        const nz = zPos / (halfD || 1)
        const distFromCenter = Math.sqrt(nx * nx + ny * ny + nz * nz)
        const edgeFactor = Math.min(1, Math.max(0, 1 - distFromCenter * 0.5))
        alphas[voxelIndex] = (a / 255) * opacity * (0.4 + 0.6 * edgeFactor)

        voxelIndex++
      }
    }
  }

  return {
    positions: positions.slice(0, voxelIndex * 3),
    colors: colors.slice(0, voxelIndex * 3),
    alphas: alphas.slice(0, voxelIndex),
    count: voxelIndex,
    boundingBox: {
      x: width,
      y: height,
      z: depth * sliceSpacing,
    },
    isCapped,
  }
}

export function applyClipPlaneToGeometry(
  geometry: THREE.BufferGeometry,
  clipPlaneZ: number,
  sliceSpacing: number,
  sliceCount: number
): void {
  if (!geometry.attributes.position) return

  const positions = geometry.attributes.position.array as Float32Array
  const totalPoints = positions.length / 3

  const halfD = (sliceCount * sliceSpacing) / 2
  const clipWorldZ = clipPlaneZ * sliceSpacing - halfD

  const visibleIndices: number[] = []
  for (let i = 0; i < totalPoints; i++) {
    if (positions[i * 3 + 2] >= clipWorldZ) {
      visibleIndices.push(i)
    }
  }

  if (visibleIndices.length > 0 && visibleIndices.length < totalPoints) {
    geometry.setIndex(visibleIndices)
    geometry.drawRange.start = 0
    geometry.drawRange.count = Infinity
  } else if (visibleIndices.length === totalPoints) {
    geometry.setIndex(null)
    geometry.drawRange.start = 0
    geometry.drawRange.count = totalPoints
  } else {
    geometry.drawRange.start = 0
    geometry.drawRange.count = 0
  }

  geometry.attributes.position.needsUpdate = true
}
