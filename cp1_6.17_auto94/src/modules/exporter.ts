import { toPng } from 'html-to-image'

export type ExportBackground = 'transparent' | 'white'

export interface ExportOptions {
  background?: ExportBackground
  pixelRatio?: number
}

export async function exportToPng(
  node: HTMLElement,
  options: ExportOptions = {}
): Promise<void> {
  const { background = 'white', pixelRatio = 2 } = options

  try {
    const dataUrl = await toPng(node, {
      quality: 1,
      pixelRatio,
      backgroundColor: background === 'white' ? '#ffffff' : undefined,
      cacheBust: true,
      style: {
        transform: 'scale(1)',
      },
    })

    const link = document.createElement('a')
    const timestamp = Date.now()
    link.download = `code-card-${timestamp}.png`
    link.href = dataUrl
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch (error) {
    console.error('导出图片失败:', error)
    throw new Error('导出图片失败，请重试')
  }
}
