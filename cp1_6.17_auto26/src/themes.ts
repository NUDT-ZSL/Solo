import type { ThemeColor, ThemeConfig } from './types';

export const THEMES: Record<ThemeColor, ThemeConfig> = {
  warm: {
    main: '#E65100',
    light: '#FF8A65',
    lighter: '#FFAB91',
    lightest: '#FBE9E7'
  },
  cool: {
    main: '#1565C0',
    light: '#64B5F6',
    lighter: '#90CAF9',
    lightest: '#E3F2FD'
  },
  nature: {
    main: '#2E7D32',
    light: '#81C784',
    lighter: '#A5D6A7',
    lightest: '#E8F5E9'
  },
  soft: {
    main: '#F48FB1',
    light: '#F8BBD0',
    lighter: '#FCE4EC',
    lightest: '#FCE4EC'
  },
  dark: {
    main: '#424242',
    light: '#757575',
    lighter: '#BDBDBD',
    lightest: '#EEEEEE'
  },
  vintage: {
    main: '#795548',
    light: '#A1887F',
    lighter: '#BCAAA4',
    lightest: '#EFEBE9'
  }
};

export const THEME_LABELS: Record<ThemeColor, string> = {
  warm: '暖橙',
  cool: '冷蓝',
  nature: '自然绿',
  soft: '柔和粉',
  dark: '暗黑',
  vintage: '复古棕'
};
