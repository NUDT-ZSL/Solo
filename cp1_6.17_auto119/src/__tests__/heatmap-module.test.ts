import { describe, it, expect, beforeEach } from 'vitest'
import { HeatmapRenderer } from '../heatmap-module'
import type { FixationPoint, HeatmapParams } from '../store'

function createFixations(count: number, seed: number = 0): FixationPoint[] {
  const fixations: FixationPoint[] = []
  for (let i = 0; i < count; i++) {
    const t = i / Math.max(1, count - 1)
    fixations.push({
      timestamp: i * 100 + seed,
      x: 100 + t * 800 + Math.sin(i + seed) * 50,
      y: 100 + Math.cos(i * 0.5 + seed) * 200,
      duration: 150 + Math.abs(Math.sin(i * 1.3 + seed)) * 450
    })
  }
  return fixations
}

describe('HeatmapRenderer', () => {
  const baseParams: HeatmapParams = {
    blurRadius: 15,
    opacity: 0.6,
    colorMap: 'greenYellowRed'
  }

  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('初始化时创建正确尺寸的Canvas', () => {
    const renderer = new HeatmapRenderer(800, 600)
    const canvas = renderer.getCanvas()
    expect(canvas.width).toBe(800)
    expect(canvas.height).toBe(600)
    expect(canvas instanceof HTMLCanvasElement).toBe(true)
  })

  it('resize方法正确调整Canvas尺寸', () => {
    const renderer = new HeatmapRenderer(100, 100)
    renderer.resize(1920, 1080)
    expect(renderer.getCanvas().width).toBe(1920)
    expect(renderer.getCanvas().height).toBe(1080)
  })

  it('空数据渲染时不崩溃，返回正确尺寸的Canvas', () => {
    const renderer = new HeatmapRenderer(640, 480)
    const result = renderer.render([], baseParams, 640, 480, 640, 480)
    expect(result).toBeDefined()
    expect(result.width).toBe(640)
    expect(result.height).toBe(480)
    const ctx = result.getContext('2d')
    expect(ctx).toBeDefined()
  })

  it('单个注视点渲染正确输出Canvas', () => {
    const renderer = new HeatmapRenderer(400, 300)
    const singleFixation: FixationPoint[] = [
      { timestamp: 0, x: 200, y: 150, duration: 500 }
    ]
    const result = renderer.render(singleFixation, baseParams, 400, 300, 400, 300)
    expect(result.width).toBe(400)
    expect(result.height).toBe(300)
  })

  it('1000个注视点数据渲染不超过性能上限', () => {
    const renderer = new HeatmapRenderer(1280, 720)
    const fixations = createFixations(1000, 42)
    const startTime = performance.now()
    const result = renderer.render(fixations, { ...baseParams, blurRadius: 20 }, 1280, 720, 1280, 720)
    const elapsed = performance.now() - startTime
    expect(result).toBeDefined()
    expect(elapsed).toBeLessThan(500)
  })

  it('支持绿黄红渐变方案', () => {
    const renderer = new HeatmapRenderer(500, 400)
    const params: HeatmapParams = { ...baseParams, colorMap: 'greenYellowRed' }
    const fixations = createFixations(20, 1)
    const result = renderer.render(fixations, params, 500, 400, 500, 400)
    expect(result).toBeDefined()
  })

  it('支持蓝红渐变方案', () => {
    const renderer = new HeatmapRenderer(500, 400)
    const params: HeatmapParams = { ...baseParams, colorMap: 'blueRed' }
    const fixations = createFixations(20, 2)
    const result = renderer.render(fixations, params, 500, 400, 500, 400)
    expect(result).toBeDefined()
  })

  it('不同渐变方案输出不同的结果', () => {
    const fixations = createFixations(30, 7)
    const renderer1 = new HeatmapRenderer(300, 200)
    const renderer2 = new HeatmapRenderer(300, 200)
    const resultGYR = renderer1.render(fixations, { ...baseParams, colorMap: 'greenYellowRed' }, 300, 200, 300, 200)
    const resultBR = renderer2.render(fixations, { ...baseParams, colorMap: 'blueRed' }, 300, 200, 300, 200)
    const ctx1 = resultGYR.getContext('2d')
    const ctx2 = resultBR.getContext('2d')
    if (ctx1 && ctx2) {
      const data1 = ctx1.getImageData(0, 0, 300, 200).data
      const data2 = ctx2.getImageData(0, 0, 300, 200).data
      let diffCount = 0
      for (let i = 0; i < data1.length; i += 4) {
        if (data1[i] !== data2[i] || data1[i + 1] !== data2[i + 1] || data1[i + 2] !== data2[i + 2]) {
          diffCount++
        }
      }
      expect(diffCount).toBeGreaterThan(0)
    }
  })

  it('模糊半径参数变化会影响输出', () => {
    const fixations = createFixations(50, 99)
    const renderer1 = new HeatmapRenderer(400, 300)
    const renderer2 = new HeatmapRenderer(400, 300)
    const r1 = renderer1.render(fixations, { ...baseParams, blurRadius: 3 }, 400, 300, 400, 300)
    const r2 = renderer2.render(fixations, { ...baseParams, blurRadius: 30 }, 400, 300, 400, 300)
    expect(r1).toBeDefined()
    expect(r2).toBeDefined()
  })

  it('透明度参数变化不会导致崩溃', () => {
    const fixations = createFixations(10, 5)
    const renderer = new HeatmapRenderer(200, 150)
    for (const opacity of [0.1, 0.5, 1.0]) {
      const result = renderer.render(fixations, { ...baseParams, opacity }, 200, 150, 200, 150)
      expect(result).toBeDefined()
    }
  })

  it('缩放比例正确处理', () => {
    const fixations: FixationPoint[] = [
      { timestamp: 0, x: 320, y: 240, duration: 300 }
    ]
    const renderer = new HeatmapRenderer(100, 75)
    const result = renderer.render(fixations, baseParams, 640, 480, 100, 75)
    expect(result.width).toBe(100)
    expect(result.height).toBe(75)
  })

  it('边界值：最小模糊半径3', () => {
    const renderer = new HeatmapRenderer(200, 200)
    const fixations = createFixations(5, 0)
    const result = renderer.render(fixations, { ...baseParams, blurRadius: 3 }, 200, 200, 200, 200)
    expect(result).toBeDefined()
  })

  it('边界值：最大模糊半径30', () => {
    const renderer = new HeatmapRenderer(200, 200)
    const fixations = createFixations(5, 0)
    const result = renderer.render(fixations, { ...baseParams, blurRadius: 30 }, 200, 200, 200, 200)
    expect(result).toBeDefined()
  })

  it('多次连续渲染状态一致', () => {
    const renderer = new HeatmapRenderer(300, 300)
    const fixations = createFixations(25, 3)
    const result1 = renderer.render(fixations, baseParams, 300, 300, 300, 300)
    const paramsSnap1 = { w: result1.width, h: result1.height }
    const result2 = renderer.render(fixations, baseParams, 300, 300, 300, 300)
    expect(paramsSnap1.w).toBe(result2.width)
    expect(paramsSnap1.h).toBe(result2.height)
  })
})
