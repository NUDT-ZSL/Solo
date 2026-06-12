import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { KeymapBoard } from './components/KeymapBoard';
import { PreviewPanel } from './components/PreviewPanel';
import {
  KeymapItem,
  ScopeType,
  DEFAULT_KEYMAPS,
  SCOPE_LABELS,
  loadFromStorage,
  saveToStorage,
  exportToJSON,
  validateImportedJSON,
  detectConflicts,
} from './utils/keyboardLayout';

type ToastType = 'success' | 'error' | 'warning';
interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

const TABS: { key: ScopeType | 'all'; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'common', label: '常用' },
  { key: 'edit', label: '编辑' },
  { key: 'nav', label: '导航' },
  { key: 'window', label: '窗口管理' },
];

export const App: React.FC = () => {
  const [keymaps, setKeymaps] = useState<KeymapItem[]>(() => {
    const saved = loadFromStorage();
    return saved || DEFAULT_KEYMAPS;
  });
  const [activeTab, setActiveTab] = useState<ScopeType | 'all'>('all');
  const [activeTabIndex, setActiveTabIndex] = useState<number>(0);
  const [indicatorStyle, setIndicatorStyle] = useState<React.CSSProperties>({});
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [recentlyChangedId, setRecentlyChangedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [isSmallScreen, setIsSmallScreen] = useState<boolean>(false);

  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastIdRef = useRef<number>(0);
  const changeTimerRef = useRef<number | null>(null);

  const conflicts = useMemo(() => detectConflicts(keymaps), [keymaps]);

  useEffect(() => {
    saveToStorage(keymaps);
  }, [keymaps]);

  useEffect(() => {
    const check = () => {
      setIsSmallScreen(window.innerWidth < 1024);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    const idx = TABS.findIndex(t => t.key === activeTab);
    setActiveTabIndex(idx >= 0 ? idx : 0);
  }, [activeTab]);

  useEffect(() => {
    const update = () => {
      const btn = tabRefs.current[activeTabIndex];
      const parent = btn?.parentElement;
      if (btn && parent) {
        const parentRect = parent.getBoundingClientRect();
        const btnRect = btn.getBoundingClientRect();
        setIndicatorStyle({
          left: btnRect.left - parentRect.left,
          width: btnRect.width,
          opacity: 1,
        });
      }
    };
    update();
    window.addEventListener('resize', update);
    const t = setTimeout(update, 50);
    return () => {
      window.removeEventListener('resize', update);
      clearTimeout(t);
    };
  }, [activeTabIndex]);

  const showToast = useCallback((type: ToastType, message: string) => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const handleKeymapsChange = useCallback((items: KeymapItem[]) => {
    const changedItem = items.find((it, i) => {
      const old = keymaps[i];
      return old && (it.boundKey !== old.boundKey || it.description !== old.description);
    });
    setKeymaps(items);
    if (changedItem) {
      setRecentlyChangedId(changedItem.id);
      if (changeTimerRef.current !== null) {
        window.clearTimeout(changeTimerRef.current);
      }
      changeTimerRef.current = window.setTimeout(() => {
        setRecentlyChangedId(null);
      }, 600);
    }
  }, [keymaps]);

  const handleExport = useCallback(() => {
    try {
      exportToJSON(keymaps);
      showToast('success', '✅ 配置已导出 keymap.json');
    } catch (e) {
      showToast('error', '❌ 导出失败，请重试');
    }
  }, [keymaps, showToast]);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.json')) {
      showToast('error', '❌ 文件格式错误，请上传.json文件');
      return;
    }

    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        const validated = validateImportedJSON(data);
        if (!validated) {
          showToast('error', '❌ 文件格式错误，JSON内容不合法');
          return;
        }
        setKeymaps(validated);
        showToast('success', '✅ 配置已导入并更新');
      } catch (err) {
        showToast('error', '❌ 文件解析失败');
      }
    };
    reader.onerror = () => {
      showToast('error', '❌ 文件读取失败');
    };
    reader.readAsText(file);
  }, [showToast]);

  const getToastIcon = (type: ToastType) => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
    }
  };

  const previewContent = (
    <PreviewPanel keymaps={keymaps} recentlyChangedId={recentlyChangedId} />
  );

  return (
    <div className="app-root">
      <nav className="navbar">
        <div className="navbar-brand">
          <div className="navbar-title">ShapeSync</div>
          <div className="navbar-tabs" ref={el => {}}>
            {TABS.map((tab, idx) => (
              <button
                key={tab.key}
                ref={el => { tabRefs.current[idx] = el; }}
                className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
            <div className="tab-indicator" style={indicatorStyle} />
          </div>
        </div>
        <div className="navbar-actions">
          <button className="btn-primary" onClick={handleExport}>
            导出 JSON
          </button>
          <button className="btn-secondary" onClick={handleImportClick}>
            导入配置
          </button>
          <input
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            ref={fileInputRef}
            onChange={handleFileChange}
          />
        </div>
      </nav>

      <div className="main-layout">
        <KeymapBoard
          keymaps={keymaps}
          onKeymapsChange={handleKeymapsChange}
          activeTab={activeTab}
          conflicts={conflicts}
          recentlyChangedId={recentlyChangedId}
        />

        {!isSmallScreen && (
          <>
            <div className="preview-divider" />
            <div className="preview-container">
              {previewContent}
            </div>
          </>
        )}
      </div>

      {isSmallScreen && (
        <>
          <button
            className="mobile-drawer-toggle"
            onClick={() => setDrawerOpen(true)}
          >
            ⌨
          </button>
          <div
            className={`mobile-drawer-overlay ${drawerOpen ? 'show' : ''}`}
            onClick={() => setDrawerOpen(false)}
          />
          <div className={`mobile-drawer ${drawerOpen ? 'open' : ''}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1F2A44' }}>⌨️ 实时键盘预览</div>
              <button
                onClick={() => setDrawerOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: 20,
                  cursor: 'pointer',
                  color: '#666',
                }}
              >
                ×
              </button>
            </div>
            <PreviewPanel keymaps={keymaps} recentlyChangedId={recentlyChangedId} />
          </div>
        </>
      )}

      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <span className="toast-icon">{getToastIcon(toast.type)}</span>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
