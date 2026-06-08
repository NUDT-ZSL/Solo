import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { HistoryEntry } from './types';

interface HistoryPanelProps {
  history: HistoryEntry[];
  isOpen: boolean;
  isMobile?: boolean;
  onToggle: () => void;
  onReplay: (entry: HistoryEntry) => void;
}

const ITEM_HEIGHT = 72;
const VISIBLE_COUNT = 20;
const BUFFER = 5;

export default function HistoryPanel(props: HistoryPanelProps) {
  const { history, isOpen, isMobile, onToggle, onReplay } = props;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  };

  const getOperationIcon = (entry: HistoryEntry) => {
    if (entry.operation === 'clear') return '🗑️';
    if (entry.operation === 'move') return '↔️';
    if (!entry.element) return '📝';
    switch (entry.element.type) {
      case 'path': return '✏️';
      case 'sticky': return '📝';
      case 'emoji': return entry.element.emoji;
      default: return '📝';
    }
  };

  const getOperationLabel = (entry: HistoryEntry) => {
    if (entry.operation === 'clear') return '清空画布';
    if (entry.operation === 'move') return '移动元素';
    if (!entry.element) return '添加元素';
    switch (entry.element.type) {
      case 'path': return '绘制线条';
      case 'sticky': return '添加便签';
      case 'emoji': return '添加表情';
      default: return '操作';
    }
  };

  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      setScrollTop(scrollRef.current.scrollTop);
    }
  }, []);

  const visibleItems = useMemo(() => {
    const startIdx = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER);
    const endIdx = Math.min(history.length, startIdx + VISIBLE_COUNT + BUFFER * 2);
    return history.slice(startIdx, endIdx).map((entry, i) => ({
      entry,
      index: startIdx + i
    }));
  }, [history, scrollTop]);

  const totalHeight = history.length * ITEM_HEIGHT;

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="btn-animate"
        style={{
          position: 'absolute',
          right: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 32,
          height: 80,
          background: '#2D3748',
          color: '#A0AEC0',
          border: 'none',
          borderTopLeftRadius: 16,
          borderBottomLeftRadius: 16,
          cursor: 'pointer',
          fontSize: 18,
          zIndex: 20
        }}
      >
        ◀
      </button>
    );
  }

  return (
    <div style={{
      width: isMobile ? '100%' : 280,
      height: isMobile ? '100%' : '100vh',
      background: '#2D3748',
      borderTopLeftRadius: isMobile ? 16 : 0,
      borderBottomLeftRadius: isMobile ? 0 : 16,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      flexShrink: 0
    }}>
      <div style={{
        padding: '16px 16px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #4A5568'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>📋</span>
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>操作历史</h2>
          <span style={{
            fontSize: 11,
            color: '#A0AEC0',
            background: '#4A5568',
            padding: '2px 8px',
            borderRadius: 10
          }}>
            {history.length}
          </span>
        </div>
        {!isMobile && (
          <button
            onClick={onToggle}
            className="btn-animate"
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: 'transparent',
              border: 'none',
              color: '#A0AEC0',
              cursor: 'pointer',
              fontSize: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ▶
          </button>
        )}
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          overflowY: 'auto',
          position: 'relative'
        }}
      >
        {history.length === 0 ? (
          <div style={{
            padding: 32,
            textAlign: 'center',
            color: '#718096',
            fontSize: 14
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🎨</div>
            暂无操作记录
          </div>
        ) : (
          <div style={{ height: totalHeight, position: 'relative' }}>
            {visibleItems.map(({ entry, index }) => (
              <div
                key={entry.id}
                onClick={() => entry.elementId && onReplay(entry)}
                className={index === 0 ? 'history-enter' : ''}
                style={{
                  position: 'absolute',
                  top: index * ITEM_HEIGHT,
                  left: 0,
                  right: 0,
                  height: ITEM_HEIGHT,
                  padding: '10px 12px',
                  display: 'flex',
                  gap: 10,
                  cursor: entry.elementId ? 'pointer' : 'default',
                  borderBottom: '1px solid rgba(74, 85, 104, 0.5)',
                  transition: 'background 0.15s',
                  background: 'transparent'
                }}
                onMouseEnter={(e) => {
                  if (entry.elementId) {
                    (e.currentTarget as HTMLDivElement).style.background = 'rgba(99, 179, 237, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                }}
              >
                <div style={{
                  position: 'relative',
                  flexShrink: 0
                }}>
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: '#1A202C',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                    border: `2px solid ${entry.userColor}`
                  }}>
                    {entry.userAnimal}
                  </div>
                  <div style={{
                    position: 'absolute',
                    bottom: -2,
                    right: -2,
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: '#4A5568',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    border: '2px solid #2D3748'
                  }}>
                    {getOperationIcon(entry)}
                  </div>
                </div>

                <div style={{
                  flex: 1,
                  minWidth: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 2
                  }}>
                    <span style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: '#E2E8F0'
                    }}>
                      {entry.userName}
                    </span>
                    <span style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: entry.userColor,
                      flexShrink: 0
                    }} />
                  </div>
                  <div style={{
                    fontSize: 12,
                    color: '#A0AEC0',
                    marginBottom: 4
                  }}>
                    {getOperationLabel(entry)}
                  </div>
                  <div style={{
                    fontSize: 11,
                    color: '#718096'
                  }}>
                    {formatTime(entry.timestamp)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{
        padding: '10px 16px',
        borderTop: '1px solid #4A5568',
        fontSize: 11,
        color: '#718096',
        textAlign: 'center'
      }}>
        {history.length > 0 ? '点击条目回放操作（仅保留最近200条）' : '开始在画布上创作吧！'}
      </div>
    </div>
  );
}
