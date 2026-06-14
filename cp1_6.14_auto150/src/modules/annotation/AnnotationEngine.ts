import type { Annotation, Vector3, UVCoord } from '@/types'
import { eventBus } from '@/utils/EventBus'
import { generateUUID } from '@/utils/uuid'

class AnnotationEngine {
  private annotations: Map<string, Annotation> = new Map()
  private currentUser: string = '设计师'
  private currentAvatarUrl: string = 'https://api.dicebear.com/7.x/avataaars/svg?seed=designer'

  constructor() {
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    eventBus.on('annotation:create', (data) => {
      this.addAnnotation(
        data.modelId,
        data.worldPosition,
        data.uvCoord,
        data.faceIndex
      )
    })

    eventBus.on('annotation:delete', (id) => {
      this.deleteAnnotation(id)
    })

    eventBus.on('annotation:update', (data) => {
      this.updateAnnotationText(data.id, data.text)
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
