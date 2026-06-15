/**
 * themeStore.tsx - 主题状态管理模块
 *
 * ============================================================
 * 模块职责
 * ============================================================
 * 管理全局主题状态（主色、圆角、阴影强度、字体族），
 * 通过 React Context 向下分发，并将主题变量同步到
 * document.documentElement 的 CSS 自定义属性（CSS Variables）。
 *
 * ============================================================
 * 数据流向图
 * ============================================================
 *
 *   ThemeEditor 用户操作
 *         │
 *         ▼
 *   updateTheme(partial)  ─── 来自 ThemeEditor 的回调
 *         │
 *         ▼
 *   setTheme(prev => ({...prev, ...updates}))
 *         │  (React state 更新)
 *         ▼
 *   theme state 变化
 *         │
 *         ▼
 *   useEffect 监听 theme 依赖
 *         │
 *         ▼
 *   document.documentElement.style.setProperty(...)
 *         │  (写入 CSS 变量到 :root)
 *         ▼
 *   所有 UI 组件的 CSS var(--xxx) 自动更新
 *   (Button / Input / Alert / Switch ...)
 *
 * ============================================================
 * 与 componentStore 的关系
 * ============================================================
 * - themeStore 和 componentStore 是两个**平行独立**的 Context，互不依赖
 * - themeStore 只管「主题样式」，componentStore 只管「组件数据」
 * - 两者通过 Provider 在 App.tsx 中嵌套，子组件可以同时消费两者
 * - UI 组件不直接读取 themeStore Context，而是通过 CSS 变量间接消费主题
 *   （这样主题更新时不会触发 React 重渲染，性能更好）
 *
 * ============================================================
 * 调用关系一览
 * ============================================================
 * 上游（Provider 层）：
 *   - App.tsx: 用 <ThemeProvider> 包裹整个应用树
 *
 * 消费方（读取 theme）：
 *   - ThemeEditor.tsx: 通过 useTheme() 读取 theme 用于展示
 *   - ComponentPreview.tsx: 不直接消费，通过 CSS 变量间接生效
 *   - 所有 UI 组件 (Button/Input/Alert/Switch): 通过 CSS var() 读取
 *
 * 操作方（修改 theme）：
 *   - ThemeEditor.tsx: 调用 updateTheme / resetTheme
 *
 * ============================================================
 * 性能说明
 * ============================================================
 * - 主题变更通过 CSS 变量生效，浏览器原生级别的样式更新
 * - 只有 ThemeEditor 组件会因为 theme state 变化而重渲染
 * - ComponentPreview 和 UI 组件不会因为主题变化触发 React 重渲染
 * - 因此滑块拖动等高频操作能保持 500ms 内响应，且无布局偏移
 */

import { createContext, useContext, useState, useCallback, useMemo, useEffect, type ReactNode } from 'react';
import { type Theme, DEFAULT_THEME, FONT_FAMILIES, type FontFamilyOption } from '@/types/theme';

/**
 * ThemeContext 类型定义
 * - theme: 当前主题对象
 * - updateTheme: 部分更新主题（接收 Partial<Theme>）
 * - resetTheme: 重置为默认主题
 */
interface ThemeContextType {
  theme: Theme;
  updateTheme: (updates: Partial<Theme>) => void;
  resetTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * ThemeProvider - 主题提供者
 *
 * 内部实现：
 *   1. useState 管理 theme 对象
 *   2. useCallback 包装 updateTheme/resetTheme 保持引用稳定
 *   3. useEffect 监听 theme 变化，同步到 CSS 变量
 *   4. useMemo 包装 context value，避免不必要的消费组件重渲染
 */
export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);

  /**
   * updateTheme - 部分更新主题
   * @param updates - 要更新的主题字段（浅合并）
   * 数据流向：调用方 → setTheme → state 更新 → useEffect 写 CSS 变量
   */
  const updateTheme = useCallback((updates: Partial<Theme>) => {
    setTheme(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * resetTheme - 重置为默认主题
   * 数据流向：调用方 → setTheme(DEFAULT_THEME) → 回到初始状态
   */
  const resetTheme = useCallback(() => {
    setTheme(DEFAULT_THEME);
  }, []);

  /**
   * 将主题状态同步到 DOM 的 CSS 变量
   *
   * 这是关键的性能优化点：
   * - 主题变更不通过 React props 层层传递
   * - 而是直接写到 document.documentElement.style
   * - 所有组件通过 CSS var() 读取，浏览器原生级更新
   * - 完全跳过 React 的 reconciliation 过程
   */
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

  // 用 useMemo 缓存 context value，只有 theme 或方法变化时才更新
  // （方法用 useCallback 包裹后引用稳定，所以实际只随 theme 变化）
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

/**
 * useTheme - 消费主题的 Hook
 * @throws 如果在 ThemeProvider 外部使用会抛出错误
 * @returns { theme, updateTheme, resetTheme }
 */
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
