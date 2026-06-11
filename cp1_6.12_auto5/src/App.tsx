import { useEffect, useMemo, useState, useCallback } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { EditorPanel } from '@/editor/EditorPanel';
import { PreviewArea } from '@/preview/PreviewArea';
import { useThemeStore, initFromStorage } from '@/store/useThemeStore';
import type { ThemeColors, ShareableTheme } from '@/store/types';

const DEFAULT_COLORS: ThemeColors = {
  primary: '#6366f1',
  secondary: '#8b5cf6',
  background: '#ffffff',
  text: '#1f2937',
  accent: '#ec4899',
};

function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState<boolean>(
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );
  useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isDesktop;
}

function App() {
  const isDesktop = useIsDesktop();
  const [panelOpen, setPanelOpen] = useState<boolean>(isDesktop);

  const toast = useThemeStore((s) => s.toast);
  const loadFromHash = useThemeStore((s) => s.loadFromHash);
  const importSharedTheme = useThemeStore((s) => s.importSharedTheme);
  const activeTheme = useThemeStore((s) => s.getActiveTheme());

  const [previewColors, setPreviewColors] = useState<ThemeColors>(DEFAULT_COLORS);

  // 初始化
  useEffect(() => {
    initFromStorage();
    const shared = loadFromHash();
    if (shared) {
      const payload: ShareableTheme = {
        name: shared.name,
        colors: shared.colors,
        comments: shared.comments,
        exportedAt: Date.now(),
      };
      importSharedTheme(payload);
      // 清理 hash，避免重复导入
      history.replaceState(null, '', window.location.pathname);
    }
  }, [loadFromHash, importSharedTheme]);

  // 同步 activeTheme 的初始颜色
  useEffect(() => {
    if (activeTheme) {
      setPreviewColors(activeTheme.colors);
      // 同步设置 CSS 变量
      applyThemeToRoot(activeTheme.colors);
    }
  }, [activeTheme?.id]);

  // 响应式：桌面默认展开
  useEffect(() => {
    setPanelOpen(isDesktop);
  }, [isDesktop]);

  // EditorPanel 调用的 updateTheme 函数：更新预览颜色 + CSS 变量
  const updateTheme = useCallback((colors: ThemeColors) => {
    setPreviewColors(colors);
    applyThemeToRoot(colors);
  }, []);

  const handleOpenEditor = useCallback(() => setPanelOpen(true), []);
  const handleCloseEditor = useCallback(() => {
    if (!isDesktop) setPanelOpen(false);
  }, [isDesktop]);

  const showOverlay = useMemo(
    () => !isDesktop && panelOpen,
    [isDesktop, panelOpen]
  );

  return (
    <div className="app-container">
      <EditorPanel
        open={panelOpen}
        onClose={handleCloseEditor}
        updateTheme={updateTheme}
      />
      {showOverlay && (
        <div className="drawer-overlay" onClick={handleCloseEditor} />
      )}
      <PreviewArea colors={previewColors} onOpenEditor={handleOpenEditor} />
      {toast && (
        <div className="toast">
          <CheckCircle2 />
          {toast}
        </div>
      )}
    </div>
  );
}

function applyThemeToRoot(colors: ThemeColors) {
  const root = document.documentElement;
  root.style.setProperty('--theme-primary', colors.primary);
  root.style.setProperty('--theme-secondary', colors.secondary);
  root.style.setProperty('--theme-background', colors.background);
  root.style.setProperty('--theme-text', colors.text);
  root.style.setProperty('--theme-accent', colors.accent);
}

export default App;
