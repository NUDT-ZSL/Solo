import React, { useState, useCallback } from 'react';
import { MathJax, MathJaxContext } from 'mathjax-react';

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

const HistoryPanel: React.FC<HistoryPanelProps> = ({ entries, onSelect, onDelete }) => {
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const handleDelete = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingIds(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setTimeout(() => {
      onDelete(id);
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 200);
  }, [onDelete]);

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
        const isDeleting = deletingIds.has(entry.id);
        return (
          <div
            key={entry.id}
            onClick={() => onSelect(entry)}
            style={{
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
              transform: isDeleting ? 'translateX(-100%)' : 'translateX(0)',
              opacity: isDeleting ? 0 : 1,
              transition: 'transform 0.2s ease-out, opacity 0.2s ease-out',
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
              <MathJaxContext>
                <div style={{ transform: 'scale(0.75)', transformOrigin: 'left center', whiteSpace: 'nowrap' }}>
                  <MathJax>{entry.latex || '?'}</MathJax>
                </div>
              </MathJaxContext>
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
