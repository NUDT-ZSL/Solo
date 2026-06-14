export interface Vector3 {
  x: number
  y: number
  z: number
}

export interface UVCoord {
  u: number
  v: number
}

export interface Annotation {
  id: string
  modelId: string
  worldPosition: Vector3
  uvCoord: UVCoord
  faceIndex: number
  text: string
  author: string
  avatarUrl: string
  timestamp: number
}

export interface ModelData {
  id: string
  name: string
  scene: any
  materials: any[]
  hasUVs: boolean
  fileSize: number
}

export interface EventBusEventMap {
  'model:loaded': ModelData
  'model:error': { message: string }
  'annotation:create': {
    worldPosition: Vector3
    uvCoord: UVCoord
    faceIndex: number
    modelId: string
  }
  'annotation:created': Annotation
  'annotation:delete': string
  'annotation:deleted': string
  'annotation:update': { id: string; text: string }
  'annotation:updated': Annotation
  'annotation:changed': Annotation[]
  'report:export': void
  'report:exported': { success: boolean; message?: string }
  'viewer:request-snapshot': { width: number; height: number }
  'viewer:snapshot-ready': string
  'error': { source: string; message: string; details?: any }
}

export type EventBusCallback<T = any> = (data: T) => void

export interface EventBusInterface {
  on<K extends keyof EventBusEventMap>(
    event: K,
    callback: EventBusCallback<EventBusEventMap[K]>
  ): void
  off<K extends keyof EventBusEventMap>(
    event: K,
    callback: EventBusCallback<EventBusEventMap[K]>
  ): void
  emit<K extends keyof EventBusEventMap>(
    event: K,
    data: EventBusEventMap[K]
  ): void
  once<K extends keyof EventBusEventMap>(
    event: K,
    callback: EventBusCallback<EventBusEventMap[K]>
  ): void
}
