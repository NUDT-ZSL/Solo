/*
 * App.tsx — 主布局组件（全局状态与数据流中枢）
 *
 * 【整体数据流 / 调用关系图】
 *
 *                    ┌─────────────────────┐
 *                    │  eventsData.ts      │
 *                    │  (纯数据 + 工具函数) │
 *                    └─────────┬───────────┘
 *                              │ 导入类型/常量/mockEvents
 *                              ▼
 *                    ┌─────────────────────┐
 *                    │     App.tsx         │
 *                    │  (全局 State 容器)   │
 *                    │  - events[]         │
 *                    │  - selectedEventId  │
 *                    │  - playingEventId   │
 *                    │  - isPlaying        │
 *                    │  - sidebarOpen      │
 *                    └──┬───────────────┬──┘
 *                       │ 下发 props    │ 接收 callbacks
 *                       ▼               ▲
 *         ┌───────────────┐         ┌──────────────┐
 *         │ TimelineBar   │         │ StagePlayer  │
 *         │ (D3 时间轴)   │         │ (舞台+播放)  │
 *         └───────┬───────┘         └──────┬───────┘
 *                 │  onEventsChange        │  onPlayToggle
 *                 │  onEventSelect         │  onProgressUpdate
 *                 └───────────► App ◄──────┘
 *
 * 【子组件输出 → App 响应】
 *   TimelineBar.onEventsChange → App.setEvents(排序避让后事件数组)
 *   TimelineBar.onEventSelect  → App.setSelectedEventId
 *   StagePlayer.onPlayToggle   → App.setIsPlaying + setPlayingEventId(起始)
 *   StagePlayer.onProgressUpdate → App.setPlayingEventId(下一段/结束)
 *
 * 【App → 子组件输入】
 *   → TimelineBar: events, selectedEventId, playingEventId, totalDuration
 *   → StagePlayer: sortedEvents(useMemo排序), selectedEvent, playingEventId, isPlaying
 *
 * 【性能优化】
 *   - useMemo 缓存 sortedEvents / totalDuration / avgDuration 等派生数据
 *   - useCallback 包装所有子组件回调 (onEventsChange/onEventSelect/onPlayToggle...)
 *   - 子组件统一用 React.memo 包裹 (TimelineBar / StagePlayer)
 *   - 窗口尺寸变化通过 matchMedia 监听，避免频繁 setState
 */
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import TimelineBar from './TimelineBar';
import StagePlayer from './StagePlayer';
import {
  TimelineEvent,
  mockEvents,
  DEFAULT_TOTAL_DURATION,
  sortEventsByTime,
  calculateTotalDuration,
  calculateAverageDuration,
  getLongestEvent,
  getShortestEvent,
  getDurationPercentage,
  EVENT_TYPE_COLORS,
  EVENT_TYPE_LABELS
} from './eventsData';

const App: React.FC = () => {
  /* ========== 全局状态 ========== */
  const [events, setEvents] = useState<TimelineEvent[]>(mockEvents);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [playingEventId, setPlayingEventId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /* ========== 响应式断点 (仅用于判断汉堡按钮是否显示) ========== */
  const [isTablet, setIsTablet] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      setIsTablet(w >= 768 && w <= 1279);
      setIsMobile(w < 768);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  /* ========== 派生数据 (useMemo) ========== */
  const sortedEvents = useMemo(() => sortEventsByTime(events), [events]);

  const totalDuration = useMemo(() => {
    const d = calculateTotalDuration(events);
    return Math.max(DEFAULT_TOTAL_DURATION, d);
  }, [events]);

  const selectedEvent = useMemo(
    () => events.find(ev => ev.id === selectedEventId) || null,
    [events, selectedEventId]
  );

  const stats = useMemo(() => {
    const total = calculateTotalDuration(events);
    const avg = calculateAverageDuration(events);
    const longest = getLongestEvent(events);
    const shortest = getShortestEvent(events);
    return { total, avg, longest, shortest };
  }, [events]);

  /* ========== 子组件回调 (useCallback) ========== */
  const handleEventsChange = useCallback((next: TimelineEvent[]) => {
    setEvents(next);
  }, []);

  const handleEventSelect = useCallback((id: string | null) => {
    setSelectedEventId(id);
    if (id !== null) {
      /* 选中事件时停止自动播放 */
      setIsPlaying(false);
      setPlayingEventId(null);
    }
  }, []);

  const handlePlayToggle = useCallback(() => {
    setIsPlaying(prev => {
      if (!prev) {
        /* 开始播放：优先从当前选中/正在播放的事件开始，否则从第一个开始 */
        const startId = playingEventId
          || selectedEventId
          || (sortedEvents[0]?.id ?? null);
        if (startId) setPlayingEventId(startId);
        return true;
      } else {
        /* 暂停 */
        return false;
      }
    });
  }, [playingEventId, selectedEventId, sortedEvents]);

  const handleProgressUpdate = useCallback((nextId: string | null) => {
    if (nextId === null) {
      /* 播放完毕 */
      setIsPlaying(false);
      setPlayingEventId(null);
    } else {
      setPlayingEventId(nextId);
    }
  }, []);

  /* ========== 导出 JSON ========== */
  const handleExport = useCallback(() => {
    const sorted = sortEventsByTime(events);
    const exportData = sorted.map(ev => ({
      name: ev.name,
      type: ev.type,
      startTime: ev.startTime,
      endTime: ev.startTime + ev.duration,
      duration: ev.duration
    }));
    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timelineflow-schedule-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [events]);

  /* ========== 侧边栏开关 (tablet/mobile) ========== */
  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  /* ========== 渲染 ========== */
  return (
    <div className="app-container">
      {/* ======= 顶部工具栏 ======= */}
      <header className="top-toolbar">
        <button
          className="hamburger-btn"
          onClick={toggleSidebar}
          title="菜单"
        >
          ☰
        </button>
        <h1 className="app-title">TimelineFlow</h1>
        <button className="toolbar-btn" onClick={() => setEvents(mockEvents)}>
          重置时间线
        </button>
      </header>

      {/* ======= 时间轴 (TimelineBar 输出 → onEventsChange / onEventSelect → App) ======= */}
      <TimelineBar
        events={events}
        selectedEventId={selectedEventId}
        playingEventId={playingEventId}
        totalDuration={totalDuration}
        onEventsChange={handleEventsChange}
        onEventSelect={handleEventSelect}
      />

      {/* ======= 主内容区 ======= */}
      <div className="stage-sidebar-container">
        {/* ======= 舞台播放器 (StagePlayer 输出 → onPlayToggle / onProgressUpdate → App) ======= */}
        <StagePlayer
          sortedEvents={sortedEvents}
          selectedEvent={selectedEvent}
          playingEventId={playingEventId}
          isPlaying={isPlaying}
          onPlayToggle={handlePlayToggle}
          onProgressUpdate={handleProgressUpdate}
        />

        {/* ======= 侧边栏遮罩 (tablet/mobile) ======= */}
        {(isTablet || isMobile) && (
          <div
            className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
            onClick={closeSidebar}
          />
        )}

        {/* ======= 耗时统计侧边栏 ======= */}
        <aside className={`sidebar-panel ${(isTablet || isMobile) && sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <div className="stat-total">{stats.total.toFixed(1)}s</div>
            <div className="stat-total-label">总时长</div>

            <div className="stat-meta">
              <div className="stat-meta-item">
                <span>平均每环节</span>
                <span className="stat-meta-value">{stats.avg.toFixed(1)}s</span>
              </div>
              <div className="stat-meta-item">
                <span>最长环节</span>
                <span className="stat-meta-tag tag-longest">
                  {stats.longest ? `${stats.longest.name} (${stats.longest.duration}s)` : '—'}
                </span>
              </div>
              <div className="stat-meta-item">
                <span>最短环节</span>
                <span className="stat-meta-tag tag-shortest">
                  {stats.shortest ? `${stats.shortest.name} (${stats.shortest.duration}s)` : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* 事件占比列表 */}
          <div className="events-list">
            {sortedEvents.map(ev => {
              const percent = getDurationPercentage(ev, calculateTotalDuration(events));
              return (
                <div
                  key={ev.id}
                  className="event-list-item"
                  onClick={() => handleEventSelect(ev.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="event-list-header">
                    <span
                      className="event-type-icon"
                      style={{ backgroundColor: EVENT_TYPE_COLORS[ev.type] }}
                    />
                    <span className="event-list-name">{ev.name}</span>
                    <span className="event-list-duration">{ev.duration}s · {EVENT_TYPE_LABELS[ev.type]}</span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${percent}%`,
                        backgroundColor: EVENT_TYPE_COLORS[ev.type]
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* 导出按钮 */}
          <button className="export-btn" onClick={handleExport}>
            导出时间表
          </button>
        </aside>
      </div>
    </div>
  );
};

export default App;
