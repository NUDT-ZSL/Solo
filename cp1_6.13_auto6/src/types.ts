export interface Contour {
  id: string
  x: number
  y: number
  width: number
  height: number
  parentId: string | null
  depth: number
}

export interface NestedNode {
  contour: Contour
  children: NestedNode[]
}

export type DragMode = 'move' | 'resize' | null
