import type { SelectedAroma } from '@/types'

export function mixPerfume(selectedAromas: SelectedAroma[]): [number, number, number] {
  if (selectedAromas.length === 0) {
    return [255, 255, 255]
  }

  const totalRatio = selectedAromas.reduce((sum, s) => sum + s.ratio, 0)
  let r = 0
  let g = 0
  let b = 0

  for (const s of selectedAromas) {
    const rgb = JSON.parse(s.aroma.rgb) as [number, number, number]
    const weight = s.ratio / totalRatio
    r += rgb[0] * weight
    g += rgb[1] * weight
    b += rgb[2] * weight
  }

  return [Math.round(r), Math.round(g), Math.round(b)]
}

export function rgbToHex(rgb: [number, number, number]): string {
  return (
    '#' +
    rgb
      .map((c) => Math.min(255, Math.max(0, c)).toString(16).padStart(2, '0'))
      .join('')
  )
}

const namePrefixes: Record<string, string[]> = {
  floral: ['晨曦', '月下', '春风', '芳华'],
  woody: ['暮色', '深林', '古韵', '沉香'],
  fruity: ['阳光', '果园', '甘露', '金辉'],
  fresh: ['清泉', '晨露', '碧波', '微风'],
  spicy: ['烈焰', '丝路', '琥珀', '暖阳'],
  herbal: ['绿野', '幽谷', '禅意', '青岚'],
}

const nameSuffixes: Record<string, string[]> = {
  floral: ['花语', '绮梦', '芳踪'],
  woody: ['木语', '禅心', '古意'],
  fruity: ['果韵', '甜香', '蜜意'],
  fresh: ['清韵', '澄净', '沁心'],
  spicy: ['辛香', '暖意', '浓情'],
  herbal: ['草香', '幽径', '自然'],
}

export function generatePerfumeName(selectedAromas: SelectedAroma[]): string {
  if (selectedAromas.length === 0) return '无名之香'

  const dominant = [...selectedAromas].sort((a, b) => b.ratio - a.ratio)[0]
  const category = dominant.aroma.category
  const prefixes = namePrefixes[category] || namePrefixes.floral
  const suffixes = nameSuffixes[category] || nameSuffixes.floral

  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)]
  const mainName = selectedAromas
    .slice(0, 2)
    .map((s) => s.aroma.name)
    .join('')

  return `${prefix}${mainName}${suffix}`
}
