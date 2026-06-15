export interface TreeNode {
  id: string
  text: string
  level: number
  children: TreeNode[]
  collapsed: boolean
  isList?: boolean
}

export interface NoteData {
  id: string
  content: string
  tree: TreeNode[]
  updatedAt: number
}
