import { useState, useRef, useEffect } from 'react';
import type { SessionSummary } from '../types';
import { getConversionRateColor, getCardBackground } from '../utils/colorUtils';
import './DragPanel.css';

interface DragPanelProps {
  sessions: SessionSummary[];
  loading: boolean;
  onAddSession: (sessionId: string) => void;
  addedSessionIds: string[];
  loadingSessionId: string | null;
}

function DragPanel({
  sessions,
  loading,
  onAddSession,
  addedSessionIds,
  loadingSessionId,
}: DragPanelProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const handleDragStart = (e: React.DragEvent, session: SessionSummary) => {
    if (addedSessionIds.includes(session.id)) {
      e.preventDefault();
      return;
    }

    e.dataTransfer.setData('sessionId', session.id);
    e.dataTransfer.effectAllowed = 'copy';

    const card = e.currentTarget as HTMLDivElement;
    const rect = card.getBoundingClientRect();
    dragOffsetRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    setDraggedId(session.id);
    setDragPosition({ x: e.clientX, y: e.clientY });

    const dragImage = document.createElement('div');
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    dragImage.style.left = '-1000px';
    dragImage.style.width = rect.width + 'px';
    dragImage.style.height = rect.height + 'px';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    setTimeout(() => document.body.removeChild(dragImage), 0);
  };

  const handleDrag = (e: React.DragEvent) => {
    if (e.clientX && e.clientY) {
      setDragPosition({ x: e.clientX, y: e.clientY });
    }
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  const formatNumber = (num: number): string => {
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + '万';
    }
    return num.toLocaleString();
  };

  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      if (draggedId) {
        setDragPosition({ x: e.clientX, y: e.clientY });
      }
    };

    if (draggedId) {
      document.addEventListener('dragover', handleDragOver);
    }

    return () => {
      document.removeEventListener('dragover', handleDragOver);
    };
  }, [draggedId]);

  return (
    <div className="drag-panel">
      <div className="panel-header">
        <h2 className="panel-title">秒杀场次</h2>
        <span className="session-count">{sessions.length} 个场次</span>
      </div>

      <div className="panel-tip">
        <span className="tip-icon">💡</span>
        拖拽场次卡片到右侧进行对比
      </div>

      <div className="session-list">
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner" />
            <span>加载中...</span>
          </div>
        ) : sessions.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📊</span>
            <span>暂无场次数据</span>
          </div>
        ) : (
          sessions.map((session) => {
            const isAdded = addedSessionIds.includes(session.id);
            const isLoading = loadingSessionId === session.id;
            const rateColor = getConversionRateColor(session.conversionRate);
            const bgColor = getCardBackground(session.conversionRate);

            return (
              <div
                key={session.id}
                className={`session-card ${isAdded ? 'added' : ''} ${
                  isLoading ? 'loading' : ''
                } ${draggedId === session.id ? 'dragging' : ''}`}
                style={{
                  backgroundColor: bgColor,
                  borderColor: rateColor,
                }}
                draggable={!isAdded && !isLoading}
                onDragStart={(e) => handleDragStart(e, session)}
                onDrag={handleDrag}
                onDragEnd={handleDragEnd}
                onClick={() => !isAdded && !isLoading && onAddSession(session.id)}
              >
                <div className="card-header">
                  <span className="card-name" title={session.name}>
                    {session.name}
                  </span>
                  {isAdded && <span className="added-badge">已添加</span>}
                  {isLoading && <span className="loading-dots">加载中</span>}
                </div>

                <div className="card-meta">
                  <span className="meta-item">
                    <span className="meta-label">开始时间</span>
                    <span className="meta-value">{session.startTime}</span>
                  </span>
                </div>

                <div className="card-stats">
                  <div className="stat-item">
                    <span className="stat-label">总PV</span>
                    <span className="stat-value">{formatNumber(session.totalPv)}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">转化率</span>
                    <span
                      className="stat-value rate-value"
                      style={{ color: rateColor }}
                    >
                      {(session.conversionRate * 100).toFixed(2)}%
                    </span>
                  </div>
                </div>

                <div className="card-bar">
                  <div
                    className="card-bar-fill"
                    style={{
                      width: `${Math.min(100, session.conversionRate * 1500)}%`,
                      backgroundColor: rateColor,
                    }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {draggedId && (
        <div
          className="drag-ghost"
          style={{
            left: dragPosition.x - dragOffsetRef.current.x,
            top: dragPosition.y - dragOffsetRef.current.y,
          }}
        >
          {sessions.find((s) => s.id === draggedId)?.name}
        </div>
      )}
    </div>
  );
}

export default DragPanel;
