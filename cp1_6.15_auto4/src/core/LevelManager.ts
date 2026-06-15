import { v4 as uuidv4 } from 'uuid'
import {
  LevelData,
  LevelObject,
  ObjectType,
  TrianglePlatform,
  MovingPlatform,
  DEFAULT_COLOR,
  MAX_HISTORY,
  CollisionRect
} from './types'

export function createLevelData(name: string = '未命名关卡'): LevelData {
  return {
    version: '1.0',
    name,
    objects: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
}

export function deepCopyLevelObjects(objects: LevelObject[]): LevelObject[] {
  return JSON.parse(JSON.stringify(objects))
}

export function createObject(
  type: ObjectType,
  x: number,
  y: number
): LevelObject {
  const base = {
    id: uuidv4(),
    x,
    y,
    rotation: 0,
    color: DEFAULT_COLOR
  }

  switch (type) {
    case 'platform-rect':
      return { ...base, type, width: 100, height: 30 }
    case 'platform-triangle':
      return {
        ...base,
        type,
        width: 100,
        height: 80,
        baseWidth: 100,
        triangleHeight: 80
      } as TrianglePlatform
    case 'trap-spike':
      return { ...base, type, width: 60, height: 40, color: '#FF6B6B' }
    case 'trap-moving':
      return {
        ...base,
        type,
        width: 100,
        height: 25,
        color: '#533483',
        moveRangeX: 100,
        moveRangeY: 0,
        moveSpeed: 2
      } as MovingPlatform
    case 'player-start':
      return { ...base, type, width: 30, height: 40, color: '#00FF88' }
    case 'goal-flag':
      return { ...base, type, width: 30, height: 60, color: '#FFD700' }
    default:
      return { ...base, type: 'platform-rect', width: 100, height: 30 }
  }
}

export function serializeLevel(level: LevelData): string {
  const toSave = { ...level, updatedAt: new Date().toISOString() }
  return JSON.stringify(toSave, null, 2)
}

export function deserializeLevel(json: string): LevelData {
  const parsed = JSON.parse(json)
  if (!parsed.objects || !Array.isArray(parsed.objects)) {
    throw new Error('无效的关卡文件格式')
  }
  return parsed as LevelData
}

export function downloadLevelFile(level: LevelData): void {
  const json = serializeLevel(level)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${level.name || 'level'}.level`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function readLevelFile(file: File): Promise<LevelData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        resolve(deserializeLevel(text))
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

export function getObjectCollisionRect(obj: LevelObject): CollisionRect {
  const halfW = obj.width / 2
  const halfH = obj.height / 2
  return {
    x: obj.x - halfW,
    y: obj.y - halfH,
    width: obj.width,
    height: obj.height
  }
}

export function getTriangleCollisionPoints(
  obj: TrianglePlatform
): { x: number; y: number }[] {
  const halfBase = obj.baseWidth / 2
  const h = obj.triangleHeight
  const angle = (obj.rotation * Math.PI) / 180
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)

  const points = [
    { x: -halfBase, y: h / 2 },
    { x: halfBase, y: h / 2 },
    { x: 0, y: -h / 2 }
  ]

  return points.map((p) => ({
    x: obj.x + (p.x * cos - p.y * sin),
    y: obj.y + (p.x * sin + p.y * cos)
  }))
}

export class HistoryManager {
  private undoStack: LevelObject[][] = []
  private redoStack: LevelObject[][] = []
  private maxSize: number = MAX_HISTORY

  pushSnapshot(objects: LevelObject[]): void {
    const snapshot = deepCopyLevelObjects(objects)
    this.undoStack.push(snapshot)
    if (this.undoStack.length > this.maxSize) {
      this.undoStack.shift()
    }
    this.redoStack = []
  }

  undo(currentObjects: LevelObject[]): LevelObject[] | null {
    if (this.undoStack.length === 0) return null
    const snapshot = this.undoStack.pop()!
    this.redoStack.push(deepCopyLevelObjects(currentObjects))
    if (this.redoStack.length > this.maxSize) {
      this.redoStack.shift()
    }
    return deepCopyLevelObjects(snapshot)
  }

  redo(currentObjects: LevelObject[]): LevelObject[] | null {
    if (this.redoStack.length === 0) return null
    const snapshot = this.redoStack.pop()!
    this.undoStack.push(deepCopyLevelObjects(currentObjects))
    if (this.undoStack.length > this.maxSize) {
      this.undoStack.shift()
    }
    return deepCopyLevelObjects(snapshot)
  }

  canUndo(): boolean {
    return this.undoStack.length > 0
  }

  canRedo(): boolean {
    return this.redoStack.length > 0
  }

  clear(): void {
    this.undoStack = []
    this.redoStack = []
  }
}

export function findObjectById(
  objects: LevelObject[],
  id: string
): LevelObject | undefined {
  return objects.find((o) => o.id === id)
}

export function updateObjectInList(
  objects: LevelObject[],
  id: string,
  updates: Partial<LevelObject>
): LevelObject[] {
  return objects.map((o) =>
    o.id === id ? { ...o, ...updates } : o
  ) as LevelObject[]
}

export function removeObjectFromList(
  objects: LevelObject[],
  id: string
): LevelObject[] {
  return objects.filter((o) => o.id !== id)
}
