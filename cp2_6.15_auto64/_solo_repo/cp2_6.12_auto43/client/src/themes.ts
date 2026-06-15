export interface ThemeColor {
  name: string;
  primary: string;
  primaryLight: string;
  primaryDark: string;
  buttonBg: string;
  buttonHover: string;
  textOnButton: string;
  tagBg: string;
  tagText: string;
  accent: string;
}

export const THEME_COLORS: Record<string, ThemeColor> = {
  '暖阳橙': {
    name: '暖阳橙',
    primary: '#FF8C42',
    primaryLight: '#FFB080',
    primaryDark: '#E67326',
    buttonBg: '#FF8C42',
    buttonHover: '#FF7A26',
    textOnButton: '#FFFFFF',
    tagBg: '#FFF0E5',
    tagText: '#E67326',
    accent: '#FFD4B5',
  },
  '深海蓝': {
    name: '深海蓝',
    primary: '#2E86AB',
    primaryLight: '#5BA8CC',
    primaryDark: '#1E6B8C',
    buttonBg: '#2E86AB',
    buttonHover: '#256E8C',
    textOnButton: '#FFFFFF',
    tagBg: '#E5F3FA',
    tagText: '#1E6B8C',
    accent: '#B8DDEF',
  },
  '森林绿': {
    name: '森林绿',
    primary: '#4CAF50',
    primaryLight: '#7CCD7F',
    primaryDark: '#388E3C',
    buttonBg: '#4CAF50',
    buttonHover: '#43A047',
    textOnButton: '#FFFFFF',
    tagBg: '#E8F5E9',
    tagText: '#2E7D32',
    accent: '#B8E0BA',
  },
  '暗夜紫': {
    name: '暗夜紫',
    primary: '#6A5ACD',
    primaryLight: '#8B7ED8',
    primaryDark: '#5548B0',
    buttonBg: '#6A5ACD',
    buttonHover: '#5D4FC0',
    textOnButton: '#FFFFFF',
    tagBg: '#EDEAF9',
    tagText: '#483D8B',
    accent: '#C8C0F0',
  },
  '樱花粉': {
    name: '樱花粉',
    primary: '#FF69B4',
    primaryLight: '#FF9BC9',
    primaryDark: '#E64D9C',
    buttonBg: '#FF69B4',
    buttonHover: '#FF50A6',
    textOnButton: '#FFFFFF',
    tagBg: '#FFEBF5',
    tagText: '#DB3A8A',
    accent: '#FFC2DE',
  },
  '极光青': {
    name: '极光青',
    primary: '#00BFA5',
    primaryLight: '#33D4BE',
    primaryDark: '#009688',
    buttonBg: '#00BFA5',
    buttonHover: '#00A58E',
    textOnButton: '#FFFFFF',
    tagBg: '#E0F7F4',
    tagText: '#00796B',
    accent: '#9EDED3',
  },
  '熔岩红': {
    name: '熔岩红',
    primary: '#E53935',
    primaryLight: '#EF6A67',
    primaryDark: '#C62828',
    buttonBg: '#E53935',
    buttonHover: '#D32F2F',
    textOnButton: '#FFFFFF',
    tagBg: '#FFEBEE',
    tagText: '#B71C1C',
    accent: '#F0B0AE',
  },
  '星空白': {
    name: '星空白',
    primary: '#4A5568',
    primaryLight: '#718096',
    primaryDark: '#2D3748',
    buttonBg: '#4A5568',
    buttonHover: '#3D4756',
    textOnButton: '#FFFFFF',
    tagBg: '#EDF2F7',
    tagText: '#2D3748',
    accent: '#CBD5E0',
  },
};

export const getTheme = (name: string): ThemeColor => {
  return THEME_COLORS[name] || THEME_COLORS['暖阳橙'];
};

export const ALL_THEMES = Object.keys(THEME_COLORS);

export const TAG_COLORS = [
  { bg: '#FFF0E5', text: '#E67326' },
  { bg: '#E5F3FA', text: '#1E6B8C' },
  { bg: '#E8F5E9', text: '#2E7D32' },
  { bg: '#EDEAF9', text: '#483D8B' },
  { bg: '#FFEBF5', text: '#DB3A8A' },
  { bg: '#E0F7F4', text: '#00796B' },
  { bg: '#FFEBEE', text: '#B71C1C' },
  { bg: '#EDF2F7', text: '#2D3748' },
];

export const getTagColor = (index: number) => {
  return TAG_COLORS[index % TAG_COLORS.length];
};
