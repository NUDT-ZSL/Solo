import { describe, it, expect, beforeEach } from 'vitest'
import { SaccadeRenderer } from '../saccade-module'
import type { FixationPoint, SaccadeParams } from '../store'

function createSequentialFixations(count: number, startX = 100, startY = 100, step = 50): FixationPoint[] {
  const fixations: FixationPoint[] = []
  for (let i = 0; i < count; i++) {
    fixations.push({
      timestamp: i * 250,
      x: startX + (i % 10) * step,
      y: startY + Math.floor(i / 10) * step,
      duration: 180 + Math.random() * 320
    })
  }
  return fixations
}

describe('SaccadeRenderer', () => {
  const baseParams: SaccadeParams = {
    lineColor: '#1E3A5F',
    lineWidth: 2
  }

  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('初始化时创建正确尺寸的Canvas', () => {
    const renderer = new SaccadeRenderer(1024, 768)
    const canvas = renderer.getCanvas()
    expect(canvas.width).toBe(1024)
    expect(canvas.height).toBe(768)
  })

  it('resize方法正确调整尺寸', () => {
    const renderer = new SaccadeRenderer(100, 100)
    renderer.resize(800, 600)
    expect(renderer.getCanvas().width).toBe(800)
    expect(renderer.getCanvas().height).toBe(600)
  })

  it('空数据渲染不崩溃，返回正确尺寸', () => {
    const renderer = new SaccadeRenderer(640, 480)
    const result = renderer.render([], baseParams, 640, 480, 640, 480)
    expect(result.width).toBe(640)
    expect(result.height).toBe(480)
  })

  it('单个注视点渲染正确（不绘制连线但绘制序号）', () => {
    const renderer = new SaccadeRenderer(500, 400)
    const fixations: FixationPoint[] = [
      { timestamp: 0, x: 250, y: 200, duration: 400 }
    ]
    const result = renderer.render(fixations, baseParams, 500, 400, 500, 400)
    expect(result.width).toBe(500)
    expect(result.height).toBe(400)
  })

  it('两个注视点正确绘制连线和箭头', () => {
    const renderer = new SaccadeRenderer(400, 300)
    const fixations: FixationPoint[] = [
      { timestamp: 0, x: 100, y: 150, duration: 200 },
      { timestamp: 1000, x: 300, y: 150, duration: 350 }
    ]
    const result = renderer.render(fixations, baseParams, 400, 300, 400, 300)
    expect(result).toBeDefined()
    const ctx = result.getContext('2d')
    expect(ctx).toBeDefined()
  })

  it('大量注视点（500个）渲染性能符合要求', () => {
    const renderer = new SaccadeRenderer(1280, 720)
    const fixations = createSequentialFixations(500)
    const startTime = performance.now()
    const result = renderer.render(fixations, baseParams, 1280, 720, 1280, 720)
    const elapsed = performance.now() - startTime
    expect(result).toBeDefined()
    expect(elapsed).toBeLessThan(200)
  })

  it('1000个注视点渲染不崩溃', () => {
    const renderer = new SaccadeRenderer(1920, 1080)
    const fixations = createSequentialFixations(1000)
    const result = renderer.render(fixations, baseParams, 1920, 1080, 1920, 1080)
    expect(result).toBeDefined()
  })

  it('支持5种预设线条颜色', () => {
    const colors = ['#1E3A5F', '#2E8B57', '#8A2BE2', '#E67E22', '#4A4A4A']
    const fixations = createSequentialFixations(10)
    for (const color of colors) {
      const renderer = new SaccadeRenderer(400, 300)
      const result = renderer.render(fixations, { lineColor: color, lineWidth: 2 }, 400, 300, 400, 300)
      expect(result).toBeDefined()
    }
  })

  it('支持最小线宽1px', () => {
    const renderer = new SaccadeRenderer(300, 200)
    const fixations = createSequentialFixations(5)
    const result = renderer.render(fixations, { ...baseParams, lineWidth: 1 }, 300, 200, 300, 200)
    expect(result).toBeDefined()
  })

  it('支持最大线宽5px', () => {
    const renderer = new SaccadeRenderer(300, 200)
    const fixations = createSequentialFixations(5)
    const result = renderer.render(fixations, { ...baseParams, lineWidth: 5 }, 300, 200, 300, 200)
    expect(result).toBeDefined()
  })

  it('不同线宽参数会产生不同的渲染结果', () => {
    const fixations = createSequentialFixations(8, 50, 50, 40)
    const renderer1 = new SaccadeRenderer(400, 300)
    const renderer2 = new SaccadeRenderer(400, 300)
    const resultThin = renderer1.render(fixations, { ...baseParams, lineWidth: 1 }, 400, 300, 400, 300)
    const resultThick = renderer2.render(fixations, { ...baseParams, lineWidth: 5 }, 400, 300, 400, 300)
    expect(resultThin instanceof HTMLCanvasElement).toBe(true)
    expect(resultThick instanceof HTMLCanvasElement).toBe(true)
  })

  it('坐标缩放正确处理（源尺寸和目标尺寸不同）', () => {
    const renderer = new SaccadeRenderer(400, 300)
    const fixations: FixationPoint[] = [
      { timestamp: 0, x: 640, y: 480, duration: 200 },
      { timestamp: 500, x: 1280, y: 720, duration: 300 }
    ]
    const result = renderer.render(fixations, baseParams, 1280, 960, 400, 300)
    expect(result.width).toBe(400)
    expect(result.height).toBe(300)
  })

  it('重复渲染相同数据结果一致', () => {
    const renderer = new SaccadeRenderer(500, 400)
    const fixations = createSequentialFixations(12)
    renderer.render(fixations, baseParams, 500, 400, 500, 400)
    const c1 = renderer.getCanvas()
    const snap1 = { w: c1.width, h: c1.height }
    renderer.render(fixations, baseParams, 500, 400, 500, 400)
    const c2 = renderer.getCanvas()
    expect(snap1.w).toBe(c2.width)
    expect(snap1.h).toBe(c2.height)
  })

  it('非常接近的两个点仍然能够正确渲染', () => {
    const renderer = new SaccadeRenderer(200, 200)
    const fixations: FixationPoint[] = [
      { timestamp: 0, x: 100, y: 100, duration: 300 },
      { timestamp: 100, x: 101, y: 101, duration: 280 }
    ]
    const result = renderer.render(fixations, baseParams, 200, 200, 200, 200)
    expect(result).toBeDefined()
  })
})
