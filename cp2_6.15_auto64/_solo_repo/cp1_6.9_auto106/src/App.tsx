import { useState, useEffect, useCallback } from 'react';
import { CardParams, DEFAULT_PARAMS, SavedCard } from './types';
import { fetchHistory, fetchCardById } from './utils';
import ControlPanel from './ControlPanel';
import Preview from './Preview';
import HistoryList from './HistoryList';
import './App.css';

type LayoutMode = 'desktop' | 'tablet' | 'mobile';

function App() {
  const [params, setParams] = useState<CardParams>(DEFAULT_PARAMS);
  const [history, setHistory] = useState<SavedCard[]>([]);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [layout, setLayout] = useState<LayoutMode>('desktop');
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const checkLayout = () => {
      const w = window.innerWidth;
      if (w >= 1024) setLayout('desktop');
      else if (w >= 768) setLayout('tablet');
      else setLayout('mobile');
    };
    checkLayout();
    window.addEventListener('resize', checkLayout);
    return () => window.removeEventListener('resize', checkLayout);
  }, []);

  useEffect(() => {
    const loadHistory = async () => {
      const data = await fetchHistory();
      setHistory(data as unknown as SavedCard[]);
    };
    loadHistory();
  }, []);

  useEffect(() => {
    const pathMatch = window.location.pathname.match(/\/share\/(.+)/);
    if (pathMatch) {
      const id = pathMatch[1];
      fetchCardById(id).then((card) => {
        if (card) {
          setParams(card);
          showToast('已加载分享的卡片');
        }
      });
    }
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }, []);

  const updateParam = useCallback(<K extends keyof CardParams>(key: K, value: CardParams[K]) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  }, []);

  const restoreCard = useCallback((card: CardParams) => {
    setParams(card);
    showToast('已恢复卡片样式');
  }, [showToast]);

  const addToHistory = useCallback((savedCard: SavedCard) => {
    setHistory((prev) => [savedCard, ...prev].slice(0, 50));
  }, []);

  const refreshHistory = useCallback(async () => {
    const data = await fetchHistory();
    setHistory(data as unknown as SavedCard[]);
  }, []);

  return (
    <div className={`app-container layout-${layout}`}>
      <header className="app-header">
        <div className="logo">
          <span className="logo-icon">✨</span>
          <h1>光晕卡片工坊</h1>
        </div>
        {layout === 'tablet' && (
          <button
            className={`toggle-btn ${panelCollapsed ? 'collapsed' : ''}`}
            onClick={() => setPanelCollapsed((p) => !p)}
          >
            {panelCollapsed ? '展开参数面板' : '收起参数面板'}
          </button>
        )}
        {layout === 'mobile' && (
          <button className="mobile-toggle-btn" onClick={() => setMobilePanelOpen(true)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </svg>
          </button>
        )}
      </header>

      <div className="main-layout">
        <ControlPanel
          params={params}
          onParamChange={updateParam}
          layout={layout}
          collapsed={panelCollapsed}
          mobileOpen={mobilePanelOpen}
          onMobileClose={() => setMobilePanelOpen(false)}
        />

        <main className="preview-wrapper">
          <Preview
            params={params}
            onShowToast={showToast}
            onAddToHistory={addToHistory}
          />
          <HistoryList
            history={history}
            onSelect={restoreCard}
            onRefresh={refreshHistory}
          />
        </main>
      </div>

      {toast && <div className="toast">{toast}</div>}

      {layout === 'mobile' && mobilePanelOpen && (
        <div className="mobile-overlay" onClick={() => setMobilePanelOpen(false)} />
      )}
    </div>
  );
}

export default App;
