export interface Theme {
  name: string
  primary: string
  background: string
  titleColor: string
  textColor: string
  buttonBg: string
  buttonText: string
  accent: string
}

export const themes: Theme[] = [
  {
    name: '蓝灰',
    primary: '#4A90D9',
    background: '#F5F7FA',
    titleColor: '#2C3E50',
    textColor: '#34495E',
    buttonBg: '#4A90D9',
    buttonText: '#FFFFFF',
    accent: '#357ABD'
  },
  {
    name: '森林绿',
    primary: '#5CB85C',
    background: '#F0F8F0',
    titleColor: '#1E5631',
    textColor: '#2D6A4F',
    buttonBg: '#5CB85C',
    buttonText: '#FFFFFF',
    accent: '#4CAF50'
  },
  {
    name: '暗黑紫',
    primary: '#6A0DAD',
    background: '#F8F5FC',
    titleColor: '#4B0082',
    textColor: '#5A189A',
    buttonBg: '#6A0DAD',
    buttonText: '#FFFFFF',
    accent: '#9D4EDD'
  },
  {
    name: '暖橙',
    primary: '#FF9800',
    background: '#FFF8F0',
    titleColor: '#E65100',
    textColor: '#BF360C',
    buttonBg: '#FF9800',
    buttonText: '#FFFFFF',
    accent: '#FB8C00'
  },
  {
    name: '海洋青',
    primary: '#00BCD4',
    background: '#F0FCFD',
    titleColor: '#006064',
    textColor: '#00838F',
    buttonBg: '#00BCD4',
    buttonText: '#FFFFFF',
    accent: '#0097A7'
  }
]

export function getTheme(index: number): Theme {
  return themes[index % themes.length]
}

export function getAllThemes(): Theme[] {
  return themes
}
