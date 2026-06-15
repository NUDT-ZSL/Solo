import type { Annotation, Vector3, UVCoord } from '@/types'
import { eventBus } from '@/utils/EventBus'
import { generateUUID } from '@/utils/uuid'

/**
 * AnnotationEngine - 批注数据管理模块
 *
 * 数据流向：
 * 1. 接收事件总线的 'annotation:create' 事件（来自 ThreeViewer）
 *    包含：worldPosition, uvCoord, faceIndex, modelId
 * 2. 校验 UV 坐标范围（0-1），生成完整批注数据（含 faceIndex）
 * 3. 存储批注数据后，发射 'annotation:created' 事件（给 ThreeViewer 渲染标记球）
 * 4. 同时发射 'annotation:changed' 事件（给 AnnotationPanel 更新列表）
 * 5. 接收 'annotation:delete' / 'annotation:update' 事件（来自 UI 层）
 *    更新数据后发射对应事件通知 ThreeViewer 和 AnnotationPanel
 */

class AnnotationEngine {
  private annotations: Map<string, Annotation> = new Map()
  private currentUser: string = '设计师'
  private currentAvatarUrl: string = 'https://api.dicebear.com/7.x/avataaars/svg?seed=designer'

  constructor() {
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    eventBus.on('annotation:create', (data) => {
      try {
        this.addAnnotation(
          data.modelId,
          data.worldPosition,
          data.uvCoord,
          data.faceIndex
        )
      } catch (error) {
        eventBus.emit('error', {
          source: 'AnnotationEngine',
          message: error instanceof Error ? error.message : '创建批注失败',
          details: error,
        })
      }
    })

    eventBus.on('annotation:delete', (id) => {
      try {
        const success = this.deleteAnnotation(id)
        if (!success) {
          eventBus.emit('error', {
            source: 'AnnotationEngine',
            message: `删除批注失败：未找到 ID 为 ${id} 的批注`,
          })
        }
      } catch (error) {
        eventBus.emit('error', {
          source: 'AnnotationEngine',
          message: error instanceof Error ? error.message : '删除批注失败',
          details: error,
        })
      }
    })

    eventBus.on('annotation:update', (data) => {
      try {
        const result = this.updateAnnotationText(data.id, data.text)
        if (!result) {
          eventBus.emit('error', {
            source: 'AnnotationEngine',
            message: `更新批注失败：未找到 ID 为 ${data.id} 的批注`,
          })
        }
      } catch (error) {
        eventBus.emit('error', {
          source: 'AnnotationEngine',
          message: error instanceof Error ? error.message : '更新批注失败',
          details: error,
        })
      }
    })
  }

  setCurrentUser(name: string, avatarUrl?: string): void {
    this.currentUser = name
    if (avatarUrl) {
      this.currentAvatarUrl = avatarUrl
    }
  }

  getCurrentUser(): { name: string; avatarUrl: string } {
    return {
      name: this.currentUser,
      avatarUrl: this.currentAvatarUrl,
    }
  }

  addAnnotation(
    modelId: string,
    worldPosition: Vector3,
    uvCoord: UVCoord,
    faceIndex: number,
    text: string = ''
  ): Annotation {
    if (
      uvCoord.u < 0 ||
      uvCoord.u > 1 ||
      uvCoord.v < 0 ||
      uvCoord.v > 1
    ) {
      throw new Error(
        `UV 坐标超出范围：u=${uvCoord.u.toFixed(4)}, v=${uvCoord.v.toFixed(4)}，必须在 0-1 之间`
      )
    }

    if (faceIndex < 0) {
      throw new Error(`面片索引无效：faceIndex=${faceIndex}`)
    }

    const annotation: Annotation = {
      id: generateUUID(),
      modelId,
      worldPosition: { ...worldPosition },
      uvCoord: { ...uvCoord },
      faceIndex,
      text,
      author: this.currentUser,
      avatarUrl: this.currentAvatarUrl,
      timestamp: Date.now(),
    }

    this.annotations.set(annotation.id, annotation)
    this.emitAnnotationCreated(annotation)
    this.emitAnnotationChanged()

    return annotation
  }

  deleteAnnotation(id: string): boolean {
    const existed = this.annotations.has(id)
    if (existed) {
      this.annotations.delete(id)
      this.emitAnnotationDeleted(id)
      this.emitAnnotationChanged()
    }
    return existed
  }

  updateAnnotationText(id: string, text: string): Annotation | null {
    const annotation = this.annotations.get(id)
    if (!annotation) return null

    annotation.text = text
    annotation.timestamp = Date.now()

    this.emitAnnotationUpdated(annotation)
    this.emitAnnotationChanged()

    return annotation
  }

  getAnnotation(id: string): Annotation | undefined {
    return this.annotations.get(id)
  }

  getAnnotationsByModelId(modelId: string): Annotation[] {
    const result: Annotation[] = []
    this.annotations.forEach((annotation) => {
      if (annotation.modelId === modelId) {
        result.push(annotation)
      }
    })
    return result.sort((a, b) => b.timestamp - a.timestamp)
  }

  getAllAnnotations(): Annotation[] {
    return Array.from(this.annotations.values()).sort(
      (a, b) => b.timestamp - a.timestamp
    )
  }

  clearAnnotationsByModelId(modelId: string): void {
    const toDelete: string[] = []
    this.annotations.forEach((annotation, id) => {
      if (annotation.modelId === modelId) {
        toDelete.push(id)
      }
    })
    toDelete.forEach((id) => this.annotations.delete(id))
    this.emitAnnotationChanged()
  }

  clearAll(): void {
    this.annotations.clear()
    this.emitAnnotationChanged()
  }

  private emitAnnotationCreated(annotation: Annotation): void {
    eventBus.emit('annotation:created', annotation)
  }

  private emitAnnotationDeleted(id: string): void {
    eventBus.emit('annotation:deleted', id)
  }

  private emitAnnotationUpdated(annotation: Annotation): void {
    eventBus.emit('annotation:updated', annotation)
  }

  private emitAnnotationChanged(): void {
    eventBus.emit('annotation:changed', this.getAllAnnotations())
  }
}

export const annotationEngine = new AnnotationEngine()
export default AnnotationEngine
