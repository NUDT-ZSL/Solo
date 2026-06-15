import { useState, useEffect, useCallback, useRef } from 'react';
import type { SessionSummary, FlashSession, ChartSession } from './types';
import { getSessions, getSessionDetail } from './services/api';
import { CHART_COLORS } from './utils/colorUtils';
import DragPanel from './ui/DragPanel';
import ComparisonChart from './chart/ComparisonChart';
import './App.css';

function App() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [chartSessions, setChartSessions] = useState<ChartSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [leftWidth, setLeftWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loadingSessionId, setLoadingSessionId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth >= 1024) {
        setDrawerOpen(false);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setLoading(true);
        const data = await getSessions();
        setSessions(data);
      } catch (err) {
        console.error('获取场次列表失败:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, []);

  const getNextAvailableColor = useCallback((): string => {
    const usedColors = new Set(chartSessions.map((s) => s.color));
    for (const color of CHART_COLORS) {
      if (!usedColors.has(color)) {
        return color;
      }
    }
    return CHART_COLORS[0];
  }, [chartSessions]);

  const addSessionToChart = useCallback(
    async (sessionId: string) => {
      if (chartSessions.find((s) => s.session.id === sessionId)) {
        return;
      }
      if (chartSessions.length >= 6) {
        alert('最多支持同时对比6个场次');
        return;
      }
      try {
        setLoadingSessionId(sessionId);
        const session: FlashSession = await getSessionDetail(sessionId);
        const color = getNextAvailableColor();
        setChartSessions((prev) => [...prev, { session, color, visible: true }]);
      } catch (err) {
        console.error('加载场次数据失败:', err);
      } finally {
        setLoadingSessionId(null);
      }
    },
    [chartSessions, getNextAvailableColor]
  );

  const removeSessionFromChart = useCallback((sessionId: string) => {
    setChartSessions((prev) => prev.filter((s) => s.session.id !== sessionId));
  }, []);

  const toggleSessionVisibility = useCallback((sessionId: string) => {
    setChartSessions((prev) =>
      prev.map((s) =>
        s.session.id === sessionId ? { ...s, visible: !s.visible } : s
      )
    );
  }, []);

  const reorderSessions = useCallback((fromIndex: number, toIndex: number) => {
    setChartSessions((prev) => {
      const result = [...prev];
      const [removed] = result.splice(fromIndex, 1);
      result.splice(toIndex, 0, removed);
      return result;
    });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = e.clientX - containerRect.left;
      const minWidth = 240;
      const maxWidth = containerRect.width * 0.5;
      setLeftWidth(Math.max(minWidth, Math.min(maxWidth, newWidth)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  const handleDropOnChart = useCallback(
    (sessionId: string) => {
      addSessionToChart(sessionId);
    },
    [addSessionToChart]
  );

  return (
    <div className="app-container" ref={containerRef}>
      <header className="app-header">
        {isMobile && (
          <button
            className="hamburger-btn"
            onClick={() => setDrawerOpen(!drawerOpen)}
            aria-label="切换菜单"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        )}
        <h1 className="app-title">
          <span className="title-icon">⚡</span>
          FlashAnalytics
          <span className="title-sub">秒杀活动对比分析</span>
        </h1>
      </header>

      <div className="app-body">
        {isMobile && drawerOpen && (
          <div
            className="drawer-overlay"
            onClick={() => setDrawerOpen(false)}
          />
        )}

        <aside
          className={`left-panel ${isMobile ? 'drawer' : ''} ${
            isMobile && drawerOpen ? 'drawer-open' : ''
          }`}
          style={{ width: isMobile ? '280px' : `${leftWidth}px` }}
        >
          <DragPanel
            sessions={sessions}
            loading={loading}
            onAddSession={addSessionToChart}
            addedSessionIds={chartSessions.map((s) => s.session.id)}
            loadingSessionId={loadingSessionId}
          />
        </aside>

        {!isMobile && (
          <div
            className={`resizer ${isResizing ? 'resizing' : ''}`}
            onMouseDown={handleMouseDown}
          >
            <div className="resizer-handle" />
          </div>
        )}

        <main className="right-panel">
          <ComparisonChart
            chartSessions={chartSessions}
            onRemoveSession={removeSessionFromChart}
            onToggleVisibility={toggleSessionVisibility}
            onReorderSessions={reorderSessions}
            onDropSession={handleDropOnChart}
            addedSessionIds={chartSessions.map((s) => s.session.id)}
          />
        </main>
      </div>
    </div>
  );
}

export default App;
