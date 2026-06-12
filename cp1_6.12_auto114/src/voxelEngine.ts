import * as THREE from 'three'
import type { SliceData, VoxelPoint } from './store'

export const MAX_VOXELS = 200000
export const MAX_SLICES = 50

export interface VoxelGeometryData {
  positions: Float32Array
  colors: Float32Array
  alphas: Float32Array
  count: number
  boundingBox: { x: number; y: number; z: number }
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

export function imageToImageData(img: HTMLImageElement): ImageData {
  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法获取 canvas 上下文')
  ctx.drawImage(img, 0, 0)
  return ctx.getImageData(0, 0, img.width, img.height)
}

export async function fileToSliceData(file: File, index: number): Promise<SliceData> {
  const img = await loadImageFile(file)
  const imageData = imageToImageData(img)
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
  const validFiles = files.filter((f) =>
    /\.(png|jpe?g)$/i.test(f.name)
  )
  if (validFiles.length === 0) {
    throw new Error('请上传 PNG 或 JPEG 格式的图片')
  }
  if (validFiles.length > MAX_SLICES) {
    throw new Error(`最多只能上传 ${MAX_SLICES} 张切片`)
  }

  const sortedFiles = sortSlicesByNumber(validFiles)
  const slicePromises = sortedFiles.map((file, i) =>
    fileToSliceData(file, i)
  )
  return Promise.all(slicePromises)
}

export function generateVoxelData(
  slices: SliceData[],
  sliceSpacing: number,
  opacity: number
): VoxelGeometryData {
  if (slices.length === 0) {
    return {
      positions: new Float32Array(),
      colors: new Float32Array(),
      alphas: new Float32Array(),
      count: 0,
      boundingBox: { x: 0, y: 0, z: 0 },
    }
  }

  const firstSlice = slices[0]
  const width = firstSlice.width
  const height = firstSlice.height
  const depth = slices.length

  const totalPixels = width * height * depth
  let step = 1

  if (totalPixels > MAX_VOXELS) {
    step = Math.ceil(Math.sqrt(totalPixels / MAX_VOXELS))
    step = Math.max(1, step)
  }

  const estimatedCount = Math.ceil(width / step) * Math.ceil(height / step) * depth
  const actualCount = Math.min(estimatedCount, MAX_VOXELS)

  const positions = new Float32Array(actualCount * 3)
  const colors = new Float32Array(actualCount * 3)
  const alphas = new Float32Array(actualCount)

  let voxelIndex = 0
  const alphaThreshold = 10

  const halfW = width / 2
  const halfH = height / 2
  const halfD = (depth * sliceSpacing) / 2

  for (let z = 0; z < depth && voxelIndex < actualCount; z++) {
    const slice = slices[z]
    const data = slice.imageData.data
    const zPos = z * sliceSpacing - halfD

    for (let y = 0; y < height && voxelIndex < actualCount; y += step) {
      for (let x = 0; x < width && voxelIndex < actualCount; x += step) {
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

        const distFromCenter = Math.sqrt(
          Math.pow((x - halfW) / halfW, 2) +
          Math.pow((y - halfH) / halfH, 2) +
          Math.pow((zPos) / halfD, 2)
        )
        const edgeFactor = Math.min(1, Math.max(0, 1 - distFromCenter * 0.5))
        alphas[voxelIndex] = (a / 255) * opacity * (0.4 + 0.6 * edgeFactor)

        voxelIndex++
      }
    }
  }

  const finalCount = voxelIndex

  return {
    positions: positions.slice(0, finalCount * 3),
    colors: colors.slice(0, finalCount * 3),
    alphas: alphas.slice(0, finalCount),
    count: finalCount,
    boundingBox: {
      x: width,
      y: height,
      z: depth * sliceSpacing,
    },
  }
}

export function createPointsMaterial(opacity: number): THREE.PointsMaterial {
  return new THREE.PointsMaterial({
    size: 1.2,
    vertexColors: true,
    transparent: true,
    opacity: opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  })
}

export function updatePointsGeometry(
  geometry: THREE.BufferGeometry,
  voxelData: VoxelGeometryData
): void {
  geometry.setAttribute('position', new THREE.BufferAttribute(voxelData.positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(voxelData.colors, 3))
  geometry.attributes.position.needsUpdate = true
  geometry.attributes.color.needsUpdate = true
}

export function applyClipPlane(
  geometry: THREE.BufferGeometry,
  clipZ: number,
  sliceSpacing: number,
  sliceCount: number
): void {
  const positions = geometry.attributes.position.array as Float32Array
  const count = positions.length / 3

  const halfD = (sliceCount * sliceSpacing) / 2
  const clipWorldZ = clipZ - halfD

  const visible: boolean[] = new Array(count)
  for (let i = 0; i < count; i++) {
    const z = positions[i * 3 + 2]
    visible[i] = z >= clipWorldZ
  }

  const drawRange = 0
  const indices: number[] = []
  for (let i = 0; i < count; i++) {
    if (visible[i]) {
      indices.push(i)
    }
  }

  if (indices.length > 0) {
    geometry.setIndex(indices)
  }
}
