/**
 * themeStore.tsx - 主题状态管理模块
 *
 * 职责：
 *   1. 管理全局主题状态（主色、圆角、阴影强度、字体族）
 *   2. 通过 React Context 向消费组件下发主题数据和操作方法
 *   3. 将主题变量同步到 document.documentElement 的 CSS 变量
 *
 * 数据流向：
 *   ThemeEditor（用户编辑）
 *       ↓ 调用 updateTheme(partial)
 *   setTheme → 更新 theme state
 *       ↓ useEffect 监听 theme 变化
 *   document.documentElement 设置 CSS 变量 (--primary-color, --border-radius 等)
 *       ↓ 浏览器原生 CSS 变量继承
 *   所有 UI 组件 (Button, Input, Alert, Switch) 的样式自动更新
 *
 * 调用关系：
 *   - App.tsx: 用 <ThemeProvider> 包裹整个应用树
 *   - ThemeEditor.tsx: 通过 useTheme() 读取 theme，调用 updateTheme/resetTheme
 *   - 所有 UI 组件: 通过 CSS 变量 var(--xxx) 间接消费主题
 */

import { createContext, useContext, useState, useCallback, useMemo, useEffect, type ReactNode } from 'react';
import { type Theme, DEFAULT_THEME, FONT_FAMILIES, type FontFamilyOption } from '@/types/theme';

interface ThemeContextType {
  theme: Theme;
  updateTheme: (updates: Partial<Theme>) => void;
  resetTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);

  const updateTheme = useCallback((updates: Partial<Theme>) => {
    setTheme(prev => ({ ...prev, ...updates }));
  }, []);

  const resetTheme = useCallback(() => {
    setTheme(DEFAULT_THEME);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--primary-color', theme.primaryColor);
    root.style.setProperty('--border-radius', `${theme.borderRadius}px`);
    root.style.setProperty('--box-shadow-strength', `${theme.boxShadow}`);
    root.style.setProperty(
      '--box-shadow',
      theme.boxShadow > 0
        ? `0 ${theme.boxShadow}px ${theme.boxShadow * 2}px rgba(0, 0, 0, ${theme.boxShadow * 0.03})`
        : 'none'
    );
    root.style.setProperty(
      '--font-family',
      FONT_FAMILIES[theme.fontFamily as FontFamilyOption] || FONT_FAMILIES['sans-serif']
    );
  }, [theme]);

  const value = useMemo(
    () => ({ theme, updateTheme, resetTheme }),
    [theme, updateTheme, resetTheme]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
