import { describe, it, expect } from 'vitest'
import {
  type Shape,
  type Point,
  type Bounds,
  type HandlePosition,
  handlePositions,
  getShapeBounds,
  getHandlePoint,
  pointInShape,
  pointNearHandle,
  findHandleAtPoint,
  findShapeAtPoint,
  normalizeRect,
} from './geometry'

function createRect(x: number, y: number, width: number, height: number, rotation = 0): Shape {
  return { id: 'rect1', type: 'rect', x, y, width, height, rotation, fill: 'red' }
}

function createCircle(x: number, y: number, width: number, height: number, rotation = 0): Shape {
  return { id: 'circle1', type: 'circle', x, y, width, height, rotation, fill: 'blue' }
}

function createTriangle(x: number, y: number, width: number, height: number, rotation = 0): Shape {
  return { id: 'triangle1', type: 'triangle', x, y, width, height, rotation, fill: 'green' }
}

describe('getShapeBounds', () => {
  it('未旋转矩形的边界', () => {
    const shape = createRect(10, 20, 100, 50)
    const bounds = getShapeBounds(shape)
    expect(bounds).toEqual<Bounds>({
      minX: 10,
      minY: 20,
      maxX: 110,
      maxY: 70,
    })
  })

  it('旋转45度后的矩形边界（应比原来大）', () => {
    const shape = createRect(0, 0, 100, 100, 45)
    const bounds = getShapeBounds(shape)
    const expectedSize = 100 * Math.abs(Math.cos(Math.PI / 4)) + 100 * Math.abs(Math.sin(Math.PI / 4))
    expect(bounds.maxX - bounds.minX).toBeCloseTo(expectedSize)
    expect(bounds.maxY - bounds.minY).toBeCloseTo(expectedSize)
    expect(bounds.maxX - bounds.minX).toBeGreaterThan(100)
    expect(bounds.maxY - bounds.minY).toBeGreaterThan(100)
  })

  it('旋转90度后的矩形边界（宽高互换效果）', () => {
    const shape = createRect(10, 20, 100, 50, 90)
    const bounds = getShapeBounds(shape)
    expect(bounds.maxX - bounds.minX).toBeCloseTo(50)
    expect(bounds.maxY - bounds.minY).toBeCloseTo(100)
    expect(bounds.minX).toBeCloseTo(35)
    expect(bounds.maxX).toBeCloseTo(85)
    expect(bounds.minY).toBeCloseTo(-5)
    expect(bounds.maxY).toBeCloseTo(95)
  })
})

describe('pointInShape - 矩形', () => {
  it('点在矩形内部', () => {
    const shape = createRect(0, 0, 100, 100)
    expect(pointInShape({ x: 50, y: 50 }, shape)).toBe(true)
    expect(pointInShape({ x: 10, y: 10 }, shape)).toBe(true)
    expect(pointInShape({ x: 90, y: 90 }, shape)).toBe(true)
  })

  it('点在矩形外部', () => {
    const shape = createRect(0, 0, 100, 100)
    expect(pointInShape({ x: -1, y: 50 }, shape)).toBe(false)
    expect(pointInShape({ x: 101, y: 50 }, shape)).toBe(false)
    expect(pointInShape({ x: 50, y: -1 }, shape)).toBe(false)
    expect(pointInShape({ x: 50, y: 101 }, shape)).toBe(false)
    expect(pointInShape({ x: 200, y: 200 }, shape)).toBe(false)
  })

  it('点在矩形边缘', () => {
    const shape = createRect(0, 0, 100, 100)
    expect(pointInShape({ x: 0, y: 50 }, shape)).toBe(true)
    expect(pointInShape({ x: 100, y: 50 }, shape)).toBe(true)
    expect(pointInShape({ x: 50, y: 0 }, shape)).toBe(true)
    expect(pointInShape({ x: 50, y: 100 }, shape)).toBe(true)
    expect(pointInShape({ x: 0, y: 0 }, shape)).toBe(true)
    expect(pointInShape({ x: 100, y: 100 }, shape)).toBe(true)
  })

  it('旋转45度后的命中检测', () => {
    const shape = createRect(0, 0, 100, 100, 45)
    const cx = 50
    const cy = 50
    expect(pointInShape({ x: cx, y: cy }, shape)).toBe(true)
    expect(pointInShape({ x: cx + 40, y: cy }, shape)).toBe(true)
    expect(pointInShape({ x: cx, y: cy + 40 }, shape)).toBe(true)
    expect(pointInShape({ x: cx + 70, y: cy + 70 }, shape)).toBe(false)
    expect(pointInShape({ x: cx - 70, y: cy - 70 }, shape)).toBe(false)
  })
})

describe('pointInShape - 圆形（椭圆）', () => {
  it('圆心点', () => {
    const shape = createCircle(0, 0, 100, 100)
    expect(pointInShape({ x: 50, y: 50 }, shape)).toBe(true)
  })

  it('圆内点', () => {
    const shape = createCircle(0, 0, 100, 100)
    expect(pointInShape({ x: 50, y: 30 }, shape)).toBe(true)
    expect(pointInShape({ x: 30, y: 50 }, shape)).toBe(true)
    expect(pointInShape({ x: 70, y: 50 }, shape)).toBe(true)
    expect(pointInShape({ x: 50, y: 70 }, shape)).toBe(true)
  })

  it('圆外点', () => {
    const shape = createCircle(0, 0, 100, 100)
    expect(pointInShape({ x: 0, y: 0 }, shape)).toBe(false)
    expect(pointInShape({ x: 100, y: 0 }, shape)).toBe(false)
    expect(pointInShape({ x: 0, y: 100 }, shape)).toBe(false)
    expect(pointInShape({ x: 100, y: 100 }, shape)).toBe(false)
    expect(pointInShape({ x: 200, y: 50 }, shape)).toBe(false)
  })

  it('边界点', () => {
    const shape = createCircle(0, 0, 100, 100)
    expect(pointInShape({ x: 50, y: 0 }, shape)).toBe(true)
    expect(pointInShape({ x: 50, y: 100 }, shape)).toBe(true)
    expect(pointInShape({ x: 0, y: 50 }, shape)).toBe(true)
    expect(pointInShape({ x: 100, y: 50 }, shape)).toBe(true)
  })

  it('椭圆（宽高不等）', () => {
    const shape = createCircle(0, 0, 200, 100)
    expect(pointInShape({ x: 100, y: 50 }, shape)).toBe(true)
    expect(pointInShape({ x: 0, y: 50 }, shape)).toBe(true)
    expect(pointInShape({ x: 200, y: 50 }, shape)).toBe(true)
    expect(pointInShape({ x: 100, y: 0 }, shape)).toBe(true)
    expect(pointInShape({ x: 100, y: 100 }, shape)).toBe(true)
    expect(pointInShape({ x: 100, y: 50 }, shape)).toBe(true)
    expect(pointInShape({ x: 50, y: 70 }, shape)).toBe(true)
    expect(pointInShape({ x: 190, y: 70 }, shape)).toBe(false)
  })
})

describe('pointInShape - 三角形', () => {
  it('重心点（内部）', () => {
    const shape = createTriangle(0, 0, 100, 100)
    const centroidX = 50
    const centroidY = 200 / 3
    expect(pointInShape({ x: centroidX, y: centroidY }, shape)).toBe(true)
  })

  it('三个顶点', () => {
    const shape = createTriangle(0, 0, 100, 100)
    expect(pointInShape({ x: 50, y: 0 }, shape)).toBe(true)
    expect(pointInShape({ x: 0, y: 100 }, shape)).toBe(true)
    expect(pointInShape({ x: 100, y: 100 }, shape)).toBe(true)
  })

  it('外部点', () => {
    const shape = createTriangle(0, 0, 100, 100)
    expect(pointInShape({ x: 0, y: 0 }, shape)).toBe(false)
    expect(pointInShape({ x: 100, y: 0 }, shape)).toBe(false)
    expect(pointInShape({ x: 50, y: 150 }, shape)).toBe(false)
    expect(pointInShape({ x: -50, y: 50 }, shape)).toBe(false)
    expect(pointInShape({ x: 150, y: 50 }, shape)).toBe(false)
  })

  it('旋转后三角形', () => {
    const shape = createTriangle(0, 0, 100, 100, 90)
    const cx = 50
    const cy = 50
    expect(pointInShape({ x: cx, y: cy }, shape)).toBe(true)
    expect(pointInShape({ x: cx + 20, y: cy }, shape)).toBe(true)
    expect(pointInShape({ x: cx + 40, y: cy }, shape)).toBe(true)
    expect(pointInShape({ x: cx, y: cy + 60 }, shape)).toBe(false)
    expect(pointInShape({ x: cx + 20, y: cy + 40 }, shape)).toBe(false)
  })
})

describe('findShapeAtPoint', () => {
  it('多个图形堆叠时，后添加的图形优先被命中（倒序遍历）', () => {
    const rect1 = { ...createRect(0, 0, 100, 100), id: 'rect1' }
    const rect2 = { ...createRect(20, 20, 100, 100), id: 'rect2' }
    const rect3 = { ...createRect(40, 40, 100, 100), id: 'rect3' }
    const shapes = [rect1, rect2, rect3]
    const result = findShapeAtPoint({ x: 60, y: 60 }, shapes)
    expect(result).not.toBeNull()
    expect(result?.id).toBe('rect3')
  })

  it('点不在任何图形内返回 null', () => {
    const rect1 = createRect(0, 0, 50, 50)
    const rect2 = createRect(100, 100, 50, 50)
    const shapes = [rect1, rect2]
    const result = findShapeAtPoint({ x: 200, y: 200 }, shapes)
    expect(result).toBeNull()
  })

  it('空数组返回 null', () => {
    const result = findShapeAtPoint({ x: 50, y: 50 }, [])
    expect(result).toBeNull()
  })

  it('点在第一个（底层）图形内但不在上层图形内', () => {
    const rect1 = { ...createRect(0, 0, 100, 100), id: 'bottom' }
    const rect2 = { ...createRect(200, 200, 100, 100), id: 'top' }
    const shapes = [rect1, rect2]
    const result = findShapeAtPoint({ x: 50, y: 50 }, shapes)
    expect(result?.id).toBe('bottom')
  })
})

describe('normalizeRect', () => {
  it('从左上到右下拖拽', () => {
    const result = normalizeRect(10, 20, 100, 80)
    expect(result).toEqual({ x: 10, y: 20, width: 90, height: 60 })
  })

  it('从右下到左上拖拽（应自动归一化）', () => {
    const result = normalizeRect(100, 80, 10, 20)
    expect(result).toEqual({ x: 10, y: 20, width: 90, height: 60 })
  })

  it('从右上到左下拖拽', () => {
    const result = normalizeRect(100, 20, 10, 80)
    expect(result).toEqual({ x: 10, y: 20, width: 90, height: 60 })
  })

  it('从左下到右上拖拽', () => {
    const result = normalizeRect(10, 80, 100, 20)
    expect(result).toEqual({ x: 10, y: 20, width: 90, height: 60 })
  })

  it('起点和终点相同（零尺寸）', () => {
    const result = normalizeRect(50, 50, 50, 50)
    expect(result).toEqual({ x: 50, y: 50, width: 0, height: 0 })
  })

  it('只有 x 不同（水平线）', () => {
    const result = normalizeRect(10, 50, 100, 50)
    expect(result).toEqual({ x: 10, y: 50, width: 90, height: 0 })
  })

  it('只有 y 不同（垂直线）', () => {
    const result = normalizeRect(50, 10, 50, 100)
    expect(result).toEqual({ x: 50, y: 10, width: 0, height: 90 })
  })

  it('负数坐标', () => {
    const result = normalizeRect(-100, -80, -10, -20)
    expect(result).toEqual({ x: -100, y: -80, width: 90, height: 60 })
  })
})

describe('pointNearHandle 和 findHandleAtPoint', () => {
  const shape = createRect(0, 0, 100, 100)

  const testHandle = (handle: HandlePosition, expectedPoint: Point) => {
    const hp = getHandlePoint(shape, handle)
    expect(hp).toEqual(expectedPoint)

    expect(pointNearHandle(expectedPoint, shape, handle)).toBe(true)
    expect(pointNearHandle({ x: expectedPoint.x + 5, y: expectedPoint.y }, shape, handle)).toBe(true)
    expect(pointNearHandle({ x: expectedPoint.x, y: expectedPoint.y + 5 }, shape, handle)).toBe(true)
    expect(pointNearHandle({ x: expectedPoint.x + 10, y: expectedPoint.y }, shape, handle)).toBe(true)
    expect(pointNearHandle({ x: expectedPoint.x, y: expectedPoint.y + 10 }, shape, handle)).toBe(true)
    expect(pointNearHandle({ x: expectedPoint.x + 11, y: expectedPoint.y }, shape, handle)).toBe(false)
    expect(pointNearHandle({ x: expectedPoint.x, y: expectedPoint.y + 11 }, shape, handle)).toBe(false)

    expect(findHandleAtPoint(expectedPoint, shape)).toBe(handle)
    expect(findHandleAtPoint({ x: expectedPoint.x + 5, y: expectedPoint.y }, shape)).toBe(handle)
  }

  it('top-left 控制点', () => {
    testHandle('top-left', { x: 0, y: 0 })
  })

  it('top-center 控制点', () => {
    testHandle('top-center', { x: 50, y: 0 })
  })

  it('top-right 控制点', () => {
    testHandle('top-right', { x: 100, y: 0 })
  })

  it('middle-left 控制点', () => {
    testHandle('middle-left', { x: 0, y: 50 })
  })

  it('middle-right 控制点', () => {
    testHandle('middle-right', { x: 100, y: 50 })
  })

  it('bottom-left 控制点', () => {
    testHandle('bottom-left', { x: 0, y: 100 })
  })

  it('bottom-center 控制点', () => {
    testHandle('bottom-center', { x: 50, y: 100 })
  })

  it('bottom-right 控制点', () => {
    testHandle('bottom-right', { x: 100, y: 100 })
  })

  it('距离超过阈值时返回 null', () => {
    const result = findHandleAtPoint({ x: -100, y: -100 }, shape)
    expect(result).toBeNull()
  })

  it('自定义阈值', () => {
    const handlePoint = getHandlePoint(shape, 'top-left')
    expect(pointNearHandle({ x: handlePoint.x + 15, y: handlePoint.y }, shape, 'top-left', 20)).toBe(true)
    expect(pointNearHandle({ x: handlePoint.x + 25, y: handlePoint.y }, shape, 'top-left', 20)).toBe(false)
  })

  it('handlePositions 包含所有8个位置', () => {
    expect(handlePositions).toHaveLength(8)
    expect(handlePositions).toContain('top-left')
    expect(handlePositions).toContain('top-center')
    expect(handlePositions).toContain('top-right')
    expect(handlePositions).toContain('middle-left')
    expect(handlePositions).toContain('middle-right')
    expect(handlePositions).toContain('bottom-left')
    expect(handlePositions).toContain('bottom-center')
    expect(handlePositions).toContain('bottom-right')
  })
})
