import { eventBus, ArtworkData, SeriesChangePayload } from './eventBus'

const SERIES_NAMES = ['自然之韵', '城市印象', '抽象梦境']

const SERIES_DATA: Record<string, { titles: string[]; descriptions: string[] }> = {
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

  const seed = seriesName.charCodeAt(0) * 100 + index * 7
  const rng = createRNG(seed)

  if (seriesName === '自然之韵') {
    drawNatureArt(ctx, rng, index)
  } else if (seriesName === '城市印象') {
    drawCityArt(ctx, rng, index)
  } else {
    drawAbstractArt(ctx, rng, index)
  }

  return canvas
}

function createRNG(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

function drawNatureArt(ctx: CanvasRenderingContext2D, rng: () => number, _index: number): void {
  const palettes = [
    ['#2d5a27', '#6b8e23', '#90ee90', '#f0e68c', '#ffd700'],
    ['#1a5276', '#2e86c1', '#85c1e9', '#d4efdf', '#f9e79f'],
    ['#784212', '#b9770e', '#f39c12', '#f5b041', '#fad7a0'],
    ['#145a32', '#1e8449', '#82e0aa', '#d5f5e3', '#fef9e7'],
    ['#0e6655', '#1abc9c', '#76d7c4', '#d1f2eb', '#fdebd0'],
    ['#6c3483', '#af7ac5', '#d2b4de', '#f5eef8', '#fef5e7'],
    ['#1a5276', '#2980b9', '#7fb3d8', '#d6eaf8', '#fef9e7'],
    ['#0b5345', '#148f77', '#48c9b0', '#a3e4d7', '#fdebd0']
  ]
  const palette = palettes[_index % palettes.length]

  const gradient = ctx.createLinearGradient(0, 0, 1024, 768)
  gradient.addColorStop(0, palette[0])
  gradient.addColorStop(0.3, palette[1])
  gradient.addColorStop(0.6, palette[2])
  gradient.addColorStop(0.85, palette[3])
  gradient.addColorStop(1, palette[4])
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 1024, 768)

  for (let i = 0; i < 8; i++) {
    ctx.beginPath()
    const cx = rng() * 1024
    const cy = rng() * 768
    const rx = 40 + rng() * 200
    const ry = 40 + rng() * 150
    ctx.ellipse(cx, cy, rx, ry, rng() * Math.PI, 0, Math.PI * 2)
    ctx.fillStyle = palette[Math.floor(rng() * palette.length)] + '66'
    ctx.fill()
  }

  for (let i = 0; i < 5; i++) {
    ctx.beginPath()
    const sx = rng() * 1024
    const sy = rng() * 768
    const ex = sx + (rng() - 0.5) * 400
    const ey = sy + (rng() - 0.5) * 300
    const cpx = (sx + ex) / 2 + (rng() - 0.5) * 200
    const cpy = (sy + ey) / 2 + (rng() - 0.5) * 200
    ctx.moveTo(sx, sy)
    ctx.quadraticCurveTo(cpx, cpy, ex, ey)
    ctx.strokeStyle = palette[Math.floor(rng() * palette.length)] + '88'
    ctx.lineWidth = 2 + rng() * 4
    ctx.stroke()
  }

  for (let i = 0; i < 30; i++) {
    const x = rng() * 1024
    const y = rng() * 768
    const r = 2 + rng() * 8
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fillStyle = palette[3] + 'aa'
    ctx.fill()
  }
}

function drawCityArt(ctx: CanvasRenderingContext2D, rng: () => number, _index: number): void {
  const bgColors = ['#0c1445', '#1a1a2e', '#16213e', '#0f0f23', '#1b1b3a', '#141428', '#1c1c3c', '#101030']
  ctx.fillStyle = bgColors[_index % bgColors.length]
  ctx.fillRect(0, 0, 1024, 768)

  const skylineY = 300 + rng() * 100
  const buildingCount = 12 + Math.floor(rng() * 8)
  for (let i = 0; i < buildingCount; i++) {
    const bw = 30 + rng() * 80
    const bh = 100 + rng() * 300
    const bx = rng() * 1024
    const by = skylineY + (300 - bh)
    ctx.fillStyle = `rgba(${20 + rng() * 40}, ${20 + rng() * 40}, ${40 + rng() * 60}, 0.9)`
    ctx.fillRect(bx, by, bw, bh)

    for (let wy = by + 10; wy < by + bh - 10; wy += 15) {
      for (let wx = bx + 5; wx < bx + bw - 5; wx += 12) {
        if (rng() > 0.3) {
          const warmth = rng()
          ctx.fillStyle = `rgba(${200 + warmth * 55}, ${180 + warmth * 40}, ${80 + warmth * 50}, ${0.5 + rng() * 0.5})`
          ctx.fillRect(wx, wy, 6, 8)
        }
      }
    }
  }

  for (let i = 0; i < 6; i++) {
    const x1 = rng() * 1024
    const y1 = rng() * skylineY
    const x2 = x1 + (rng() - 0.5) * 200
    const y2 = y1 + rng() * 100
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    const neonColors = ['#ff0066', '#00ffcc', '#ff6600', '#cc00ff', '#00ccff', '#ffff00']
    ctx.strokeStyle = neonColors[Math.floor(rng() * neonColors.length)] + '88'
    ctx.lineWidth = 1 + rng() * 3
    ctx.shadowColor = ctx.strokeStyle
    ctx.shadowBlur = 15
    ctx.stroke()
    ctx.shadowBlur = 0
  }

  for (let i = 0; i < 60; i++) {
    const x = rng() * 1024
    const y = rng() * skylineY
    ctx.beginPath()
    ctx.arc(x, y, 0.5 + rng() * 1.5, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + rng() * 0.7})`
    ctx.fill()
  }

  const roadGrad = ctx.createLinearGradient(0, skylineY + 100, 0, 768)
  roadGrad.addColorStop(0, '#1a1a2e')
  roadGrad.addColorStop(1, '#2a2a4e')
  ctx.fillStyle = roadGrad
  ctx.fillRect(0, skylineY + 100, 1024, 768 - skylineY - 100)

  for (let i = 0; i < 10; i++) {
    const lx = rng() * 1024
    const ly = skylineY + 100 + rng() * (768 - skylineY - 100)
    const len = 20 + rng() * 80
    ctx.beginPath()
    ctx.moveTo(lx, ly)
    ctx.lineTo(lx + len, ly)
    ctx.strokeStyle = `rgba(255, 200, 100, ${0.3 + rng() * 0.4})`
    ctx.lineWidth = 1
    ctx.stroke()
  }
}

function drawAbstractArt(ctx: CanvasRenderingContext2D, rng: () => number, _index: number): void {
  const bgColors = ['#1a0a2e', '#0a1628', '#2e0a1a', '#0a2e1a', '#2e2e0a', '#1a1a0a', '#0a0a2e', '#2e0a2e']
  ctx.fillStyle = bgColors[_index % bgColors.length]
  ctx.fillRect(0, 0, 1024, 768)

  const accentColors = ['#ff3366', '#33ff99', '#6633ff', '#ff9933', '#33ccff', '#ff33cc', '#99ff33', '#ff6633']

  for (let i = 0; i < 6; i++) {
    const gradient = ctx.createRadialGradient(
      rng() * 1024, rng() * 768, 0,
      rng() * 1024, rng() * 768, 200 + rng() * 300
    )
    gradient.addColorStop(0, accentColors[Math.floor(rng() * accentColors.length)] + '44')
    gradient.addColorStop(1, 'transparent')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 1024, 768)
  }

  const shapeCount = 5 + Math.floor(rng() * 8)
  for (let i = 0; i < shapeCount; i++) {
    ctx.beginPath()
    const sides = 3 + Math.floor(rng() * 5)
    const cx = rng() * 1024
    const cy = rng() * 768
    const radius = 30 + rng() * 150
    const rotation = rng() * Math.PI * 2

    for (let s = 0; s <= sides; s++) {
      const angle = (s / sides) * Math.PI * 2 + rotation
      const px = cx + Math.cos(angle) * radius
      const py = cy + Math.sin(angle) * radius
      if (s === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.closePath()

    if (rng() > 0.5) {
      ctx.fillStyle = accentColors[Math.floor(rng() * accentColors.length)] + '55'
      ctx.fill()
    }
    ctx.strokeStyle = accentColors[Math.floor(rng() * accentColors.length)] + 'cc'
    ctx.lineWidth = 1 + rng() * 3
    ctx.stroke()
  }

  for (let i = 0; i < 15; i++) {
    ctx.beginPath()
    const x1 = rng() * 1024
    const y1 = rng() * 768
    const x2 = rng() * 1024
    const y2 = rng() * 768
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.strokeStyle = accentColors[Math.floor(rng() * accentColors.length)] + '66'
    ctx.lineWidth = 0.5 + rng() * 2
    ctx.stroke()
  }

  for (let i = 0; i < 40; i++) {
    const x = rng() * 1024
    const y = rng() * 768
    const r = 1 + rng() * 6
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fillStyle = accentColors[Math.floor(rng() * accentColors.length)] + '88'
    ctx.fill()
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
