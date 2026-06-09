import { useState, useEffect, useCallback } from 'react';
import RecommendationPanel from './components/RecommendationPanel';
import PreferencePanel from './components/PreferencePanel';
import {
  Book,
  InteractionType,
  PreferencesResponse,
  RecommendationResponse,
} from './types';

export default function App() {
  const [books, setBooks] = useState<Book[]>([]);
  const [prefs, setPrefs] = useState<PreferencesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [progressing, setProgressing] = useState(false);
  const [progressKey, setProgressKey] = useState(0);

  const fetchRecommendations = useCallback(async () => {
    try {
      const res = await fetch('/api/recommendations');
      const data: RecommendationResponse = await res.json();
      setBooks(data.books);
    } catch (err) {
      console.error('获取推荐失败', err);
    }
  }, []);

  const fetchPreferences = useCallback(async () => {
    try {
      const res = await fetch('/api/preferences');
      const data: PreferencesResponse = await res.json();
      setPrefs(data);
    } catch (err) {
      console.error('获取偏好失败', err);
    }
  }, []);

  const triggerProgress = useCallback(() => {
    setProgressing(true);
    setProgressKey((k) => k + 1);
    window.setTimeout(() => setProgressing(false), 1050);
  }, []);

  const handleInteraction = useCallback(
    async (bookId: string, action: InteractionType) => {
      triggerProgress();
      try {
        const res = await fetch('/api/interact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookId, action }),
        });
        const data: RecommendationResponse = await res.json();
        setBooks(data.books);
        if (panelOpen) {
          await fetchPreferences();
        }
      } catch (err) {
        console.error('交互失败', err);
      }
    },
    [panelOpen, triggerProgress, fetchPreferences]
  );

  const handleReset = useCallback(async () => {
    triggerProgress();
    try {
      const res = await fetch('/api/preferences/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.books) setBooks(data.books);
      setPrefs({
        weights: data.weights,
        allTags: data.allTags,
      });
    } catch (err) {
      console.error('重置失败', err);
    }
  }, [triggerProgress]);

  const togglePanel = useCallback(async () => {
    if (!panelOpen) {
      await fetchPreferences();
    }
    setPanelOpen((o) => !o);
  }, [panelOpen, fetchPreferences]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await Promise.all([fetchRecommendations(), fetchPreferences()]);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchRecommendations, fetchPreferences]);

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="header-title">
          <h1>书海导览 · 个性推荐引擎</h1>
          <p>通过互动发现你的专属阅读偏好</p>
        </div>
        <div className="header-actions">
          <button className="pref-toggle-btn" onClick={togglePanel}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="21" x2="4" y2="14" />
              <line x1="4" y1="10" x2="4" y2="3" />
              <line x1="12" y1="21" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12" y2="3" />
              <line x1="20" y1="21" x2="20" y2="16" />
              <line x1="20" y1="12" x2="20" y2="3" />
            </svg>
            {panelOpen ? '关闭偏好面板' : '查看偏好权重'}
          </button>
        </div>
      </header>

      <div className="progress-bar-wrap">
        {progressing && (
          <div key={progressKey} className="progress-bar animate" />
        )}
      </div>

      <main className="app-main">
        <div className={`content-area ${panelOpen ? 'shifted' : ''}`}>
          {loading ? (
            <div className="loading-wrap">
              <span>
                正在加载推荐引擎<span className="loading-dots" />
              </span>
            </div>
          ) : (
            <>
              <div className="section-header">
                <h2 className="section-title">
                  为你精选
                  <span>共 {books.length} 本</span>
                </h2>
              </div>
              <RecommendationPanel books={books} onInteract={handleInteraction} />
              <div className="page-hint">
                点赞 +10% · 收藏 +20% · 忽略 -15% · 系统会根据你的操作实时调整推荐策略
              </div>
            </>
          )}
        </div>

        <div
          className={`panel-overlay ${panelOpen ? 'visible' : ''}`}
          onClick={() => setPanelOpen(false)}
        />

        {prefs && (
          <PreferencePanel
            open={panelOpen}
            weights={prefs.weights}
            allTags={prefs.allTags}
            onClose={() => setPanelOpen(false)}
            onReset={handleReset}
          />
        )}
      </main>
    </div>
  );
}
