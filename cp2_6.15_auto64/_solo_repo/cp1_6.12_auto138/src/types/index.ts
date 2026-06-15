export interface StyleConfig {
  color: string
  backgroundColor: string
  fontSize: number
  borderRadius: number
  padding: number
  boxShadow: string
  width: number
  height: number
}

export interface ComponentMeta {
  id: string
  name: string
  version: string
  category: string
  tags: string[]
  defaultProps: Record<string, unknown>
  styleConfig: StyleConfig
}

export interface FolderNode {
  id: string
  name: string
  type: 'folder'
  children: TreeNode[]
  expanded?: boolean
}

export interface ComponentNode {
  id: string
  name: string
  type: 'component'
  componentId: string
  tags: string[]
  version: string
}

export type TreeNode = FolderNode | ComponentNode
