import { eventBus, ArtworkData, SeriesChangePayload } from './eventBus'

export const SERIES_NAMES = ['自然之韵', '城市印象', '抽象梦境']

export type PatternType = 'gradient-stripes' | 'concentric-circles' | 'checkerboard' | 'radial-gradient' | 'diagonal-lines' | 'geometric-grid'

export const SERIES_PATTERN_CONFIG: Record<string, { patterns: PatternType[]; palette: string[] }> = {
  '自然之韵': {
    patterns: ['gradient-stripes', 'radial-gradient', 'concentric-circles', 'diagonal-lines', 'gradient-stripes', 'radial-gradient', 'concentric-circles', 'diagonal-lines'],
    palette: ['#2d5a27', '#6b8e23', '#90ee90', '#f0e68c', '#85c1e9', '#f5deb3', '#8fbc8f', '#ffe4b5']
  },
  '城市印象': {
    patterns: ['geometric-grid', 'checkerboard', 'diagonal-lines', 'geometric-grid', 'checkerboard', 'diagonal-lines', 'geometric-grid', 'checkerboard'],
    palette: ['#1a1a2e', '#16213e', '#0f3460', '#e94560', '#0f0f23', '#2c3e50', '#34495e', '#95a5a6']
  },
  '抽象梦境': {
    patterns: ['concentric-circles', 'radial-gradient', 'checkerboard', 'concentric-circles', 'radial-gradient', 'checkerboard', 'concentric-circles', 'radial-gradient'],
    palette: ['#6c3483', '#8e44ad', '#a569bd', '#bb8fce', '#d2b4de', '#e8daef', '#f5eef8', '#fef5e7']
  }
}

export const SERIES_DATA: Record<string, { titles: string[]; descriptions: string[] }> = {
  '自然之韵': {
    titles: ['晨曦微露', '溪流低语', '秋叶归根', '云海翻涌', '翠竹幽径', '落日余晖', '雨后新芽', '碧波荡漾'],
    descriptions: [
      '清晨第一缕阳光穿透薄雾，唤醒沉睡的山谷，万物在温柔的光辉中缓缓苏醒。',
      '山间溪流绕过鹅卵石，发出清脆悦耳的低语，似在诉说古老的森林秘闻。',
      '金红色的枫叶在秋风中翩翩起舞，最终归于大地，完成生命的轮回与传承。',
      '层叠的云海在山巅翻涌，如梦似幻，仿佛天地之间只有呼吸与光影的交织。',
      '幽深的竹林小径蜿蜒而去，竹影婆娑，清风拂面，步履间尽是禅意与宁静。',
      '夕阳将天空染成橙红与紫金，最后一抹余晖映照大地，温暖而辽远。',
      '春雨过后，嫩绿的新芽破土而出，晶莹的水珠挂在叶尖，折射出彩虹般的光芒。',
      '碧绿的湖水在微风中泛起层层涟漪，水天一色，宁静得仿佛时间停滞。'
    ]
  },
  '城市印象': {
    titles: ['霓虹街巷', '地铁众生', '天际轮廓', '老城弄堂', '午后咖啡馆', '夜行高架', '雨中行人', '旧书店角'],
    descriptions: [
      '霓虹灯在湿润的路面上映出斑斓倒影，城市的夜晚从不真正入眠，每个角落都有故事。',
      '早高峰的地铁车厢里，一张张疲惫而坚定的面孔，各自怀揣着不同的梦想与归途。',
      '摩天大楼勾勒出独特的天际线，钢铁与玻璃的森林里，是人类对天空最浪漫的征服。',
      '斑驳的砖墙和晾晒的衣物，老弄堂里弥漫着烟火气，这是城市最真实的肌理与温度。',
      '午后阳光透过落地窗洒在木质桌面上，咖啡的醇香与翻书声交织，时间在此放慢脚步。',
      '深夜的高架桥上车流如织，车灯画出光的轨迹，城市在夜色中展露另一种脉搏与节奏。',
      '细雨中撑伞的行人匆匆走过斑马线，雨滴与脚步声构成城市最温柔的交响。',
      '转角的老书店里，泛黄的书页与墨香，在数字时代坚守着纸质阅读最后的温存。'
    ]
  },
  '抽象梦境': {
    titles: ['意识流', '色彩碰撞', '几何冥想', '时间碎片', '维度之门', '混沌之初', '镜像世界', '无限回廊'],
    descriptions: [
      '意识如流水般自由游走，在现实与梦境的边界处，思绪化作色彩与形状的舞蹈。',
      '对比色在画布上激烈碰撞，张力与和谐并存，视觉的冲击引发内心的共鸣与震颤。',
      '简洁的几何形态在冥想中浮现，三角、圆、方——最纯粹的形中蕴含宇宙的秩序。',
      '时间在此刻碎裂成无数碎片，过去、现在与未来交织，每一片都映射着不同的可能。',
      '一扇门通往另一个维度，空间的法则在此改写，重力、光线、声音都拥有新的意义。',
      '混沌之初，万物未分，原始的能量在虚空中涌动，等待第一次创造性的爆发。',
      '镜像中的世界与现实微妙不同，左右颠倒中隐藏着对称之美与深层自我的映照。',
      '无限延伸的回廊中，空间自我复制，每一步都是对永恒的逼近与对未知的探索。'
    ]
  }
}

function generateArtworkCanvas(seriesName: string, index: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 768
  const ctx = canvas.getContext('2d')!

  const config = SERIES_PATTERN_CONFIG[seriesName] || SERIES_PATTERN_CONFIG['抽象梦境']
  const pattern = config.patterns[index % config.patterns.length]
  const palette = config.palette

  switch (pattern) {
    case 'gradient-stripes':
      drawGradientStripes(ctx, palette, index)
      break
    case 'concentric-circles':
      drawConcentricCircles(ctx, palette, index)
      break
    case 'checkerboard':
      drawCheckerboard(ctx, palette, index)
      break
    case 'radial-gradient':
      drawRadialGradient(ctx, palette, index)
      break
    case 'diagonal-lines':
      drawDiagonalLines(ctx, palette, index)
      break
    case 'geometric-grid':
      drawGeometricGrid(ctx, palette, index)
      break
    default:
      drawGradientStripes(ctx, palette, index)
  }

  return canvas
}

function drawGradientStripes(ctx: CanvasRenderingContext2D, palette: string[], index: number): void {
  const angle = (index * Math.PI / 4) % (Math.PI / 2)
  const gradient = ctx.createLinearGradient(
    0, 0,
    1024 * Math.cos(angle), 768 * Math.sin(angle)
  )

  const colorCount = 5
  for (let i = 0; i <= colorCount; i++) {
    const colorIdx = (index + i) % palette.length
    gradient.addColorStop(i / colorCount, palette[colorIdx])
  }

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 1024, 768)

  const stripeCount = 8 + index % 4
  const stripeWidth = 1024 / stripeCount
  for (let i = 0; i < stripeCount; i++) {
    const x = i * stripeWidth
    const colorIdx = (index + i + 2) % palette.length
    ctx.fillStyle = palette[colorIdx] + (i % 2 === 0 ? '1a' : '33')
    ctx.fillRect(x, 0, stripeWidth, 768)
  }

  for (let i = 0; i < 6; i++) {
    const x = (index * 100 + i * 150) % 1024
    const y = (index * 80 + i * 120) % 768
    const r = 30 + index * 3
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fillStyle = palette[(index + i) % palette.length] + '44'
    ctx.fill()
  }
}

function drawConcentricCircles(ctx: CanvasRenderingContext2D, palette: string[], index: number): void {
  const bgGradient = ctx.createRadialGradient(
    512, 384, 0,
    512, 384, 600
  )
  bgGradient.addColorStop(0, palette[(index + 1) % palette.length])
  bgGradient.addColorStop(0.5, palette[(index + 2) % palette.length])
  bgGradient.addColorStop(1, palette[index % palette.length])
  ctx.fillStyle = bgGradient
  ctx.fillRect(0, 0, 1024, 768)

  const centerX = 512 + (index - 3.5) * 30
  const centerY = 384 + (index % 4 - 1.5) * 20
  const maxRadius = 700
  const circleCount = 12 + index % 4

  for (let i = circleCount; i >= 0; i--) {
    const r = (i / circleCount) * maxRadius
    const colorIdx = (index + i) % palette.length
    ctx.beginPath()
    ctx.arc(centerX, centerY, r, 0, Math.PI * 2)
    ctx.strokeStyle = palette[colorIdx] + 'aa'
    ctx.lineWidth = 6 + (i % 3) * 3
    ctx.stroke()
  }

  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + (index * Math.PI / 8)
    const dist = 200
    const x = centerX + Math.cos(angle) * dist
    const y = centerY + Math.sin(angle) * dist
    const r = 40 + index * 2
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fillStyle = palette[(index + i + 3) % palette.length] + '66'
    ctx.fill()
  }
}

function drawCheckerboard(ctx: CanvasRenderingContext2D, palette: string[], index: number): void {
  const bgColor = palette[index % palette.length]
  const gradient = ctx.createLinearGradient(0, 0, 1024, 768)
  gradient.addColorStop(0, bgColor)
  gradient.addColorStop(1, palette[(index + 3) % palette.length])
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 1024, 768)

  const cols = 8 + index % 4
  const rows = 6 + index % 3
  const cellW = 1024 / cols
  const cellH = 768 / rows

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if ((r + c) % 2 === 0) {
        const colorIdx = (index + r + c) % palette.length
        ctx.fillStyle = palette[colorIdx] + (60 + index * 5).toString(16)
        ctx.fillRect(c * cellW, r * cellH, cellW, cellH)
      }
    }
  }

  for (let i = 0; i < 3; i++) {
    const x = (index * 120 + i * 300) % 1024
    const y = (index * 90 + i * 200) % 768
    const size = 60 + index * 5
    const colorIdx = (index + i + 2) % palette.length
    ctx.fillStyle = palette[colorIdx] + 'cc'
    ctx.fillRect(x - size / 2, y - size / 2, size, size)

    ctx.strokeStyle = palette[(colorIdx + 2) % palette.length]
    ctx.lineWidth = 4
    ctx.strokeRect(x - size / 2, y - size / 2, size, size)
  }
}

function drawRadialGradient(ctx: CanvasRenderingContext2D, palette: string[], index: number): void {
  const x1 = 200 + (index * 80) % 600
  const y1 = 150 + (index * 60) % 400
  const x2 = 800 - (index * 70) % 600
  const y2 = 600 - (index * 50) % 400

  for (let layer = 0; layer < 4; layer++) {
    const ox = (layer % 2) * 100 - 50
    const oy = Math.floor(layer / 2) * 100 - 50
    const gradient = ctx.createRadialGradient(
      x1 + ox, y1 + oy, 0,
      x2 + ox, y2 + oy, 600
    )
    gradient.addColorStop(0, palette[(index + layer) % palette.length] + 'ff')
    gradient.addColorStop(0.4, palette[(index + layer + 1) % palette.length] + 'aa')
    gradient.addColorStop(0.7, palette[(index + layer + 2) % palette.length] + '55')
    gradient.addColorStop(1, 'transparent')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 1024, 768)
  }

  for (let i = 0; i < 5; i++) {
    const x = (x1 + i * 100 + index * 30) % 1024
    const y = (y1 + i * 80 + index * 25) % 768
    const r = 15 + index * 2
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fillStyle = palette[(index + i + 4) % palette.length] + 'dd'
    ctx.fill()
    ctx.strokeStyle = '#ffffff44'
    ctx.lineWidth = 2
    ctx.stroke()
  }
}

function drawDiagonalLines(ctx: CanvasRenderingContext2D, palette: string[], index: number): void {
  const bgGradient = ctx.createLinearGradient(0, 768, 1024, 0)
  bgGradient.addColorStop(0, palette[index % palette.length])
  bgGradient.addColorStop(0.5, palette[(index + 2) % palette.length])
  bgGradient.addColorStop(1, palette[(index + 4) % palette.length])
  ctx.fillStyle = bgGradient
  ctx.fillRect(0, 0, 1024, 768)

  const lineCount = 20 + index % 10
  const spacing = (1024 + 768) / lineCount
  const angle = Math.PI / 4 + (index % 4) * (Math.PI / 12)

  for (let i = -lineCount; i < lineCount * 2; i++) {
    const offset = i * spacing
    const colorIdx = (index + Math.abs(i)) % palette.length

    ctx.beginPath()
    const x1 = offset - 768 * Math.tan(angle)
    const y1 = 0
    const x2 = offset
    const y2 = 768
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)

    ctx.strokeStyle = palette[colorIdx] + (i % 2 === 0 ? '66' : '44')
    ctx.lineWidth = 8 + (index % 4) * 2
    ctx.stroke()
  }

  for (let i = 0; i < 3; i++) {
    const x = (index * 150 + i * 250) % 1024
    const y = (index * 100 + i * 180) % 768
    const sides = 3 + (index + i) % 4
    const r = 50 + index * 3

    ctx.beginPath()
    for (let s = 0; s <= sides; s++) {
      const a = (s / sides) * Math.PI * 2 + index * 0.3
      const px = x + Math.cos(a) * r
      const py = y + Math.sin(a) * r
      if (s === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.closePath()
    ctx.fillStyle = palette[(index + i + 5) % palette.length] + '55'
    ctx.fill()
    ctx.strokeStyle = palette[(index + i) % palette.length]
    ctx.lineWidth = 3
    ctx.stroke()
  }
}

function drawGeometricGrid(ctx: CanvasRenderingContext2D, palette: string[], index: number): void {
  ctx.fillStyle = palette[index % palette.length]
  ctx.fillRect(0, 0, 1024, 768)

  const cols = 6 + index % 3
  const rows = 5 + index % 2
  const cellW = 1024 / cols
  const cellH = 768 / rows

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = c * cellW + cellW / 2
      const cy = r * cellH + cellH / 2
      const shapeType = (r + c + index) % 3
      const colorIdx = (index + r * cols + c) % palette.length
      const size = Math.min(cellW, cellH) * 0.35

      ctx.fillStyle = palette[colorIdx] + 'bb'
      ctx.strokeStyle = palette[(colorIdx + 3) % palette.length]
      ctx.lineWidth = 2

      ctx.beginPath()
      if (shapeType === 0) {
        ctx.arc(cx, cy, size, 0, Math.PI * 2)
      } else if (shapeType === 1) {
        ctx.rect(cx - size, cy - size, size * 2, size * 2)
      } else {
        for (let s = 0; s < 3; s++) {
          const a = (s / 3) * Math.PI * 2 - Math.PI / 2
          const px = cx + Math.cos(a) * size
          const py = cy + Math.sin(a) * size
          if (s === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.closePath()
      }
      ctx.fill()
      ctx.stroke()
    }
  }

  ctx.strokeStyle = '#ffffff22'
  ctx.lineWidth = 1
  for (let c = 0; c <= cols; c++) {
    ctx.beginPath()
    ctx.moveTo(c * cellW, 0)
    ctx.lineTo(c * cellW, 768)
    ctx.stroke()
  }
  for (let r = 0; r <= rows; r++) {
    ctx.beginPath()
    ctx.moveTo(0, r * cellH)
    ctx.lineTo(1024, r * cellH)
    ctx.stroke()
  }
}

export class ArtworkManager {
  private currentSeries: string = SERIES_NAMES[0]
  private currentArtworks: ArtworkData[] = []

  constructor() {
    this.setupEventListeners()
    this.switchSeries(this.currentSeries)
  }

  private setupEventListeners(): void {
    eventBus.on('series-change-request', (payload: SeriesChangePayload) => {
      this.switchSeries(payload.seriesName)
    })
  }

  private switchSeries(seriesName: string): void {
    this.currentSeries = seriesName
    this.currentArtworks = []

    const data = SERIES_DATA[seriesName]
    for (let i = 0; i < 8; i++) {
      this.currentArtworks.push({
        title: data.titles[i],
        author: '数字艺术家',
        year: 2024 + Math.floor(i / 4),
        description: data.descriptions[i],
        imageCanvas: generateArtworkCanvas(seriesName, i),
        seriesName: seriesName
      })
    }

    eventBus.emit('frame-texture-update', { frames: this.currentArtworks })
    eventBus.emit('series-changed', { seriesName })
  }

  getArtwork(index: number): ArtworkData | null {
    if (index < 0 || index >= this.currentArtworks.length) return null
    return this.currentArtworks[index]
  }

  getCurrentSeries(): string {
    return this.currentSeries
  }

  getSeriesNames(): string[] {
    return [...SERIES_NAMES]
  }

  getArtworkCount(): number {
    return this.currentArtworks.length
  }
}
