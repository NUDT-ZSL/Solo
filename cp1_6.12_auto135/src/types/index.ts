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
}

export type ComponentTemplate = 'bootstrap' | 'material'

export type ColorKey = keyof ThemeColors
