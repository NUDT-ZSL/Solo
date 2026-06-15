export interface MindMap {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  collaborators: string[]
}

export interface MapNode {
  id: string
  mapId: string
  parentId: string | null
  text: string
  x: number
  y: number
  width: number
  height: number
  color?: string
}

export interface NotificationItem {
  id: string
  message: string
  type: 'info' | 'success' | 'invite'
}
