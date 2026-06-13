export type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay' | 'soft-light' | 'difference'

export interface Layer {
  id: string
  name: string
  image: HTMLImageElement | null
  imageData: ImageData | null
  blendMode: BlendMode
  opacity: number
  width: number
  height: number
}

export type CompareMode = 'none' | 'divider' | 'blink'

export const BLEND_MODES: { value: BlendMode; label: string }[] = [
  { value: 'normal', label: '正常' },
  { value: 'multiply', label: '正片叠底' },
  { value: 'screen', label: '滤色' },
  { value: 'overlay', label: '叠加' },
  { value: 'soft-light', label: '柔光' },
  { value: 'difference', label: '差值' },
]
