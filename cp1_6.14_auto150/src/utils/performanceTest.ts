/**
 * 性能测试工具模块
 *
 * 用于在开发环境中监控性能指标，包括：
 * 1. FPS 帧率监控（目标 >= 30fps）
 * 2. 虚拟滚动性能测试（50+ 条批注）
 * 3. 大模型加载后的帧率稳定性测试
 */

import type { Annotation } from '@/types'
import { annotationEngine } from '@/modules/annotation/AnnotationEngine'

let fpsMonitorId: number | null = null
let frameCount = 0
let lastFpsUpdateTime = 0
let currentFps = 0

export interface PerformanceMetrics {
  fps: number
  fpsHistory: number[]
  avgFps: number
  minFps: number
  maxFps: number
}

const metrics: PerformanceMetrics = {
  fps: 0,
  fpsHistory: [],
  avgFps: 0,
  minFps: Infinity,
  maxFps: 0,
}

export function startFpsMonitor(onUpdate?: (metrics: PerformanceMetrics) => void): void {
  if (fpsMonitorId !== null) {
    console.warn('[Performance] FPS 监控已在运行中')
    return
  }

  frameCount = 0
  lastFpsUpdateTime = performance.now()
  metrics.fpsHistory = []
  metrics.minFps = Infinity
  metrics.maxFps = 0

  const measureFrame = () => {
    frameCount++
    const now = performance.now()

    if (now - lastFpsUpdateTime >= 1000) {
      currentFps = Math.round((frameCount * 1000) / (now - lastFpsUpdateTime))
      metrics.fps = currentFps
      metrics.fpsHistory.push(currentFps)
      metrics.minFps = Math.min(metrics.minFps, currentFps)
      metrics.maxFps = Math.max(metrics.maxFps, currentFps)

      if (metrics.fpsHistory.length > 60) {
        metrics.fpsHistory.shift()
      }

      const total = metrics.fpsHistory.reduce((a, b) => a + b, 0)
      metrics.avgFps = Math.round(total / metrics.fpsHistory.length)

      if (currentFps < 30) {
        console.warn(
          `[Performance] FPS 低于阈值 30，当前: ${currentFps}`
        )
      }

      if (onUpdate) {
        onUpdate({ ...metrics })
      }

      frameCount = 0
      lastFpsUpdateTime = now
    }

    fpsMonitorId = requestAnimationFrame(measureFrame)
  }

  fpsMonitorId = requestAnimationFrame(measureFrame)
  console.log('[Performance] FPS 监控已启动')
}

export function stopFpsMonitor(): PerformanceMetrics {
  if (fpsMonitorId !== null) {
    cancelAnimationFrame(fpsMonitorId)
    fpsMonitorId = null
  }
  console.log('[Performance] FPS 监控已停止', metrics)
  return { ...metrics }
}

export function generateTestAnnotations(
  count: number,
  modelId: string = 'test-model'
): Annotation[] {
  const annotations: Annotation[] = []

  for (let i = 0; i < count; i++) {
    annotations.push({
      id: `test-annotation-${i}`,
      modelId,
      worldPosition: {
        x: (Math.random() - 0.5) * 2,
        y: (Math.random() - 0.5) * 2,
        z: (Math.random() - 0.5) * 2,
      },
      uvCoord: {
        u: Math.random(),
        v: Math.random(),
      },
      faceIndex: i,
      text: `测试批注 #${i + 1}: 这是一条用于性能测试的批注内容，包含一些测试文字。`,
      author: `测试用户${(i % 5) + 1}`,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=user${i}`,
      timestamp: Date.now() - i * 60000,
    })
  }

  return annotations
}

export async function runAnnotationPerformanceTest(
  count: number = 60
): Promise<{ createTime: number; updateTime: number; deleteTime: number }> {
  console.log(`[Performance] 开始 ${count} 条批注性能测试...`)

  const testAnnotations = generateTestAnnotations(count)
  annotationEngine.clearAll()

  const createStart = performance.now()
  for (let i = 0; i < testAnnotations.length; i++) {
    annotationEngine.addAnnotation(
      testAnnotations[i].modelId,
      testAnnotations[i].worldPosition,
      testAnnotations[i].uvCoord,
      testAnnotations[i].faceIndex,
      testAnnotations[i].text
    )
  }
  const createTime = performance.now() - createStart
  console.log(`[Performance] 创建 ${count} 条批注耗时: ${createTime.toFixed(2)}ms`)

  const allAnnotations = annotationEngine.getAllAnnotations()

  const updateStart = performance.now()
  for (let i = 0; i < allAnnotations.length; i++) {
    annotationEngine.updateAnnotationText(
      allAnnotations[i].id,
      `更新后的批注内容 #${i + 1}`
    )
  }
  const updateTime = performance.now() - updateStart
  console.log(`[Performance] 更新 ${count} 条批注耗时: ${updateTime.toFixed(2)}ms`)

  const deleteStart = performance.now()
  for (let i = 0; i < allAnnotations.length; i++) {
    annotationEngine.deleteAnnotation(allAnnotations[i].id)
  }
  const deleteTime = performance.now() - deleteStart
  console.log(`[Performance] 删除 ${count} 条批注耗时: ${deleteTime.toFixed(2)}ms`)

  annotationEngine.clearAll()
  console.log('[Performance] 批注性能测试完成')

  return { createTime, updateTime, deleteTime }
}

export function simulateLargeModelLoading(
  meshCount: number = 1000,
  vertexCount: number = 10000
): void {
  console.log(
    `[Performance] 模拟大模型加载：${meshCount} 个网格，${vertexCount} 个顶点...`
  )

  const startTime = performance.now()

  for (let i = 0; i < meshCount; i++) {
    const positions = new Float32Array(vertexCount * 3)
    const uvs = new Float32Array(vertexCount * 2)

    for (let j = 0; j < vertexCount; j++) {
      positions[j * 3] = Math.random()
      positions[j * 3 + 1] = Math.random()
      positions[j * 3 + 2] = Math.random()
      uvs[j * 2] = Math.random()
      uvs[j * 2 + 1] = Math.random()
    }
  }

  const loadTime = performance.now() - startTime
  console.log(`[Performance] 大模型模拟加载耗时: ${loadTime.toFixed(2)}ms`)

  if (loadTime > 1000) {
    console.warn(`[Performance] 模型加载时间超过 1 秒: ${loadTime.toFixed(2)}ms`)
  }
}

export function getCurrentMetrics(): PerformanceMetrics {
  return { ...metrics }
}

export function logMetricsSummary(): void {
  console.log('[Performance] 性能指标汇总:')
  console.log(`  当前 FPS: ${metrics.fps}`)
  console.log(`  平均 FPS: ${metrics.avgFps}`)
  console.log(`  最低 FPS: ${metrics.minFps}`)
  console.log(`  最高 FPS: ${metrics.maxFps}`)
  console.log(`  FPS 历史样本数: ${metrics.fpsHistory.length}`)

  if (metrics.avgFps < 30) {
    console.warn('[Performance] ⚠️  平均 FPS 低于 30，存在性能问题')
  } else if (metrics.avgFps >= 60) {
    console.log('[Performance] ✅ 平均 FPS 达到 60，性能优秀')
  } else {
    console.log('[Performance] ✅ 平均 FPS 达标 (>=30)')
  }
}

export default {
  startFpsMonitor,
  stopFpsMonitor,
  generateTestAnnotations,
  runAnnotationPerformanceTest,
  simulateLargeModelLoading,
  getCurrentMetrics,
  logMetricsSummary,
}
