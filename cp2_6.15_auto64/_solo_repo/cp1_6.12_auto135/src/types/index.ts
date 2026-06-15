/**
 * ============================================================
 *  types/index.ts - 全局类型定义
 * ============================================================
 *
 * 【被引用文件】
 *    - src/components/App.tsx          :  ThemeScheme[] state 管理
 *    - src/components/ThemePanel.tsx   :  调色板 props 类型
 *    - src/components/ComponentGrid.tsx:  组件看板 props 及内部组件
 * ============================================================
 */
export interface ThemeColors {
  primary: string
  secondary: string
  background: string
  text: string
}

export interface ThemeScheme {
  id: string
  name: string
  colors: ThemeColors
  collapsed?: boolean
  deleting?: boolean
}

export type ComponentTemplate = 'bootstrap' | 'material'

export type ColorKey = keyof ThemeColors
