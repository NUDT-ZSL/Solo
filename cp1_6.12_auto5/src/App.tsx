import { useEffect, useState, useCallback, useMemo } from 'react';
import { CheckCircle2, Palette, History, Share2, MessageSquareText } from 'lucide-react';
import { EditorPanel } from '@/editor/EditorPanel';
import { PreviewArea } from '@/preview/PreviewArea';
import { useThemeStore, initFromStorage } from '@/store/useThemeStore';
import type { ThemeColors, ShareableTheme, ColorKey } from '@/store/types';
import { COLOR_KEYS } from '@/store/types';

const DEFAULT_COLORS: ThemeColors = {
  primary: '#6366f1',
  secondary: '#8b5cf6',
  background: '#ffffff',
  text: '#1f2937',
  accent: '#ec4899',
};

type ViewportMode = 'desktop' | 'tablet' | 'mobile';

function getViewportMode(): ViewportMode {
  if (typeof window === 'undefined') return 'desktop';
  const w = window.innerWidth;
  if (w >= 1025) return 'desktop';
  if (w >= 769) return 'tablet';
  return 'mobile';
}

function App() {
  const [viewportMode, setViewportMode] = useState<ViewportMode>(getViewportMode());
  const [panelOpen, setPanelOpen] = useState<boolean>(viewportMode === 'desktop');

  const toast = useThemeStore((s) => s.toast);
  const loadFromHash = useThemeStore((s) => s.loadFromHash);
  const importSharedTheme = useThemeStore((s) => s.importSharedTheme);
  const activeTheme = useThemeStore((s) => s.getActiveTheme());

  const [previewColors, setPreviewColors] = useState<ThemeColors>(DEFAULT_COLORS);

  useEffect(() => {
    const handler = () => {
      const mode = getViewportMode();
      setViewportMode(mode);
      if (mode === 'desktop') setPanelOpen(true);
      if (mode === 'mobile') setPanelOpen(false);
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

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
      history.replaceState(null, '', window.location.pathname);
    }
  }, [loadFromHash, importSharedTheme]);

  useEffect(() => {
    if (activeTheme) {
      setPreviewColors(activeTheme.colors);
      applyThemeToRoot(activeTheme.colors);
    }
  }, [activeTheme?.id]);

  const updateTheme = useCallback((colors: ThemeColors) => {
    setPreviewColors(colors);
    applyThemeToRoot(colors);
  }, []);

  const handleOpenPanel = useCallback(() => setPanelOpen(true), []);
  const handleClosePanel = useCallback(() => {
    if (viewportMode !== 'desktop') setPanelOpen(false);
  }, [viewportMode]);

  const showOverlay = useMemo(
    () => (viewportMode === 'tablet' || viewportMode === 'mobile') && panelOpen,
    [viewportMode, panelOpen]
  );

  const isTablet = viewportMode === 'tablet';

  return (
    <div className="app-container">
      {isTablet && (
        <aside className="editor-rail" aria-label="快捷工具栏">
          <button
            type="button"
            className={`editor-rail__icon-btn ${
              panelOpen ? 'editor-rail__icon-btn--active' : ''
            }`}
            onClick={handleOpenPanel}
            title="打开主题编辑面板"
          >
            <Palette />
          </button>
          <button
            type="button"
            className="editor-rail__icon-btn"
            onClick={() => useThemeStore.getState().saveSnapshot()}
            title="保存版本快照"
          >
            <History />
          </button>
          <button
            type="button"
            className="editor-rail__icon-btn"
            onClick={async () => {
              const link = useThemeStore.getState().generateShareLink();
              try {
                await navigator.clipboard.writeText(link);
                useThemeStore.getState().setToast('✓ 分享链接已复制');
              } catch {
                window.prompt('复制链接：', link);
              }
            }}
            title="生成分享链接"
          >
            <Share2 />
          </button>
          <button
            type="button"
            className="editor-rail__icon-btn"
            onClick={handleOpenPanel}
            title="添加注释"
          >
            <MessageSquareText />
          </button>
          <div className="editor-rail__swatches">
            {(COLOR_KEYS as ColorKey[]).map((k) => (
              <div
                key={k}
                className="editor-rail__swatch"
                style={{ backgroundColor: previewColors[k] }}
              />
            ))}
          </div>
        </aside>
      )}

      <EditorPanel
        open={panelOpen}
        onClose={handleClosePanel}
        updateTheme={updateTheme}
      />

      {showOverlay && (
        <div
          className="drawer-overlay"
          onClick={handleClosePanel}
          aria-hidden="true"
        />
      )}

      <PreviewArea colors={previewColors} onOpenEditor={handleOpenPanel} />

      {toast && (
        <div className="toast" role="status">
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
