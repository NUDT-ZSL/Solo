import React, { useState, useCallback, useRef, useEffect } from 'react';
import { MathComponent } from 'mathjax-react';

export interface HistoryEntry {
  id: string;
  latex: string;
  timestamp: number;
}

interface HistoryPanelProps {
  entries: HistoryEntry[];
  onSelect: (entry: HistoryEntry) => void;
  onDelete: (id: string) => void;
}

const formatTime = (ts: number): string => {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
};

interface DeletingState {
  phase: 'slide' | 'shrink';
  height: number;
}

const MATHJAX_SRC = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js';

const HistoryPanel: React.FC<HistoryPanelProps> = ({ entries, onSelect, onDelete }) => {
  const [deleting, setDeleting] = useState<Map<string, DeletingState>>(new Map());
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const handleDelete = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const el = itemRefs.current.get(id);
    const height = el?.offsetHeight ?? 48;

    setDeleting(prev => {
      const next = new Map(prev);
      next.set(id, { phase: 'slide', height });
      return next;
    });

    setTimeout(() => {
      setDeleting(prev => {
        const next = new Map(prev);
        const state = next.get(id);
        if (state) {
          next.set(id, { ...state, phase: 'shrink' });
        }
        return next;
      });
    }, 200);

    setTimeout(() => {
      onDelete(id);
      setDeleting(prev => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
    }, 200 + 200);
  }, [onDelete]);

  const setItemRef = useCallback((id: string) => (el: HTMLDivElement | null) => {
    if (el) {
      itemRefs.current.set(id, el);
    } else {
      itemRefs.current.delete(id);
    }
  }, []);

  useEffect(() => {
    return () => {
      itemRefs.current.clear();
    };
  }, []);

  const getItemStyle = (id: string): React.CSSProperties => {
    const state = deleting.get(id);
    if (!state) {
      return {
        transform: 'translateX(0)',
        opacity: 1,
        maxHeight: 48,
        marginTop: 0,
        marginBottom: 0,
        paddingTop: 0,
        paddingBottom: 0
      };
    }
    if (state.phase === 'slide') {
      return {
        transform: 'translateX(-100%)',
        opacity: 0,
        maxHeight: state.height,
        marginTop: 0,
        marginBottom: 0,
        paddingTop: 0,
        paddingBottom: 0
      };
    }
    return {
      transform: 'translateX(-100%)',
      opacity: 0,
      maxHeight: 0,
      marginTop: 0,
      marginBottom: 0,
      paddingTop: 0,
      paddingBottom: 0
    };
  };

  return (
    <div
      style={{
        width: '100%',
        maxHeight: 160,
        overflowY: 'auto',
        padding: 8,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        marginTop: 8
      }}
    >
      {entries.length === 0 && (
        <div
          style={{
            color: '#999',
            fontSize: 13,
            textAlign: 'center',
            padding: '16px 0'
          }}
        >
          暂无历史记录
        </div>
      )}
      {entries.map(entry => {
        const style = getItemStyle(entry.id);
        return (
          <div
            key={entry.id}
            ref={setItemRef(entry.id)}
            onClick={() => onSelect(entry)}
            style={{
              ...style,
              height: 48,
              borderRadius: 8,
              backgroundColor: '#fff',
              border: '1px solid #eee',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 12px',
              cursor: 'pointer',
              overflow: 'hidden',
              boxSizing: 'border-box',
              transition: 'transform 0.2s ease-out, opacity 0.2s ease-out, max-height 0.2s ease-out, margin 0.2s ease-out, padding 0.2s ease-out',
              flexShrink: 0
            }}
          >
            <div
              style={{
                flex: 1,
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                minWidth: 0,
                fontSize: 13
              }}
            >
              <div style={{ transform: 'scale(0.7)', transformOrigin: 'left center', whiteSpace: 'nowrap' }}>
                <MathComponent tex={entry.latex || '?'} settings={{ src: MATHJAX_SRC }} />
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flexShrink: 0,
                marginLeft: 8
              }}
            >
              <span style={{ color: '#999', fontSize: 12, fontFamily: 'monospace' }}>
                {formatTime(entry.timestamp)}
              </span>
              <button
                onClick={(e) => handleDelete(entry.id, e)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#e74c3c',
                  cursor: 'pointer',
                  fontSize: 14,
                  padding: '2px 6px',
                  borderRadius: 4,
                  transition: 'background-color 0.15s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fdecea'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                ✕
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default HistoryPanel;
