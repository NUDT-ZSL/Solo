export interface CompressionOptions {
  maxWidth?: number
  maxHeight?: number
  maxSizeKB?: number
  initialQuality?: number
  minQuality?: number
  qualityStep?: number
  mimeType?: string
}

export interface CompressionResult {
  dataUrl: string
  originalSizeKB: number
  compressedSizeKB: number
  compressionRatio: number
  width: number
  height: number
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  maxWidth: 800,
  maxHeight: 600,
  maxSizeKB: 500,
  initialQuality: 0.85,
  minQuality: 0.2,
  qualityStep: 0.1,
  mimeType: 'image/jpeg'
}

const fileToImage = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = URL.createObjectURL(file)
  })
}

const calculateSize = (dataUrl: string): number => {
  const base64 = dataUrl.split(',')[1]
  if (!base64) return 0
  return (base64.length * 0.75) / 1024
}

const resizeDimensions = (
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } => {
  const ratio = Math.min(maxWidth / originalWidth, maxHeight / originalHeight, 1)
  return {
    width: Math.round(originalWidth * ratio),
    height: Math.round(originalHeight * ratio)
  }
}

const compressToCanvas = (
  img: HTMLImageElement,
  width: number,
  height: number,
  quality: number,
  mimeType: string
): string => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Canvas context not available')
  }

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(img, 0, 0, width, height)

  return canvas.toDataURL(mimeType, quality)
}

export const compressImage = async (
  file: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> => {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const originalSizeKB = file.size / 1024

  if (file.type.startsWith('image/svg')) {
    const reader = new FileReader()
    return new Promise((resolve, reject) => {
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string
        resolve({
          dataUrl,
          originalSizeKB,
          compressedSizeKB: originalSizeKB,
          compressionRatio: 1,
          width: opts.maxWidth,
          height: opts.maxHeight
        })
      }
      reader.onerror = () => reject(new Error('SVG读取失败'))
      reader.readAsDataURL(file)
    })
  }

  const img = await fileToImage(file)
  const { width: targetWidth, height: targetHeight } = resizeDimensions(
    img.naturalWidth,
    img.naturalHeight,
    opts.maxWidth,
    opts.maxHeight
  )

  let quality = opts.initialQuality
  let dataUrl = compressToCanvas(img, targetWidth, targetHeight, quality, opts.mimeType)
  let compressedSizeKB = calculateSize(dataUrl)

  while (compressedSizeKB > opts.maxSizeKB && quality > opts.minQuality) {
    quality = Math.max(quality - opts.qualityStep, opts.minQuality)
    dataUrl = compressToCanvas(img, targetWidth, targetHeight, quality, opts.mimeType)
    compressedSizeKB = calculateSize(dataUrl)
  }

  if (compressedSizeKB > opts.maxSizeKB) {
    const scaledDown = resizeDimensions(
      targetWidth,
      targetHeight,
      Math.floor(targetWidth * 0.8),
      Math.floor(targetHeight * 0.8)
    )
    dataUrl = compressToCanvas(img, scaledDown.width, scaledDown.height, opts.minQuality, opts.mimeType)
    compressedSizeKB = calculateSize(dataUrl)
  }

  if (compressedSizeKB > opts.maxSizeKB * 1.2) {
    console.warn(
      `[ImageCompress] 图片仍超过目标大小: ${compressedSizeKB.toFixed(1)}KB > ${opts.maxSizeKB}KB`
    )
  }

  URL.revokeObjectURL(img.src)

  return {
    dataUrl,
    originalSizeKB,
    compressedSizeKB,
    compressionRatio: originalSizeKB > 0 ? compressedSizeKB / originalSizeKB : 1,
    width: targetWidth,
    height: targetHeight
  }
}

export const createThumbnail = async (
  file: File,
  width: number = 400,
  height: number = 300
): Promise<string> => {
  const result = await compressImage(file, {
    maxWidth: width,
    maxHeight: height,
    maxSizeKB: 200,
    initialQuality: 0.9
  })
  return result.dataUrl
}

export const validateImageFile = (file: File): { valid: boolean; message?: string } => {
  const maxOriginalSize = 10 * 1024 * 1024
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']

  if (!file.type.startsWith('image/')) {
    return { valid: false, message: '请选择图片文件' }
  }

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, message: `不支持的图片格式: ${file.type}，支持JPG/PNG/WebP/GIF/SVG` }
  }

  if (file.size > maxOriginalSize) {
    return { valid: false, message: '原始图片不能超过10MB' }
  }

  return { valid: true }
}

export default {
  compressImage,
  createThumbnail,
  validateImageFile
}
