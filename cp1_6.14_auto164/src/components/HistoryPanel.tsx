import React, { useState, useEffect } from 'react';
import { loadRecords, deleteRecord, restoreRecord, type HistoryRecord } from '../modules/historyManager';

interface HistoryPanelProps {
  visible: boolean;
  onClose: () => void;
  onRestore: (record: HistoryRecord) => void;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ visible, onClose, onRestore }) => {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await loadRecords();
      setRecords(data);
    } catch (e) {
      console.error('Failed to load history:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteRecord(id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      console.error('Failed to delete record:', e);
    }
  };

  const handleRestore = async (record: HistoryRecord) => {
    try {
      const restored = await restoreRecord(record.id);
      if (restored) {
        onRestore(restored);
        onClose();
      }
    } catch (e) {
      console.error('Failed to restore record:', e);
    }
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day} ${h}:${min}`;
  };

  if (!visible) return null;

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 1000,
          animation: 'fadeIn 0.2s ease-out',
        }}
        onClick={onClose}
      />
      <div
        className="history-panel"
        style={{
          position: 'fixed',
          right: 12,
          top: 76,
          bottom: 12,
          width: 360,
          background: 'var(--color-bg-secondary)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-md)',
          zIndex: 1001,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'slideInRight var(--transition-slow)',
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)' }}>
            历史记录
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-secondary)',
              fontSize: 20,
              cursor: 'pointer',
              padding: 0,
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 6,
            }}
            className="action-btn"
          >
            ×
          </button>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 12,
          }}
        >
          {loading ? (
            <div
              style={{
                textAlign: 'center',
                padding: 40,
                color: 'var(--color-text-secondary)',
                fontSize: 14,
              }}
            >
              加载中...
            </div>
          ) : records.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: 40,
                color: 'var(--color-text-secondary)',
                fontSize: 14,
              }}
            >
              <div style={{ fontSize: 36, opacity: 0.3, marginBottom: 12 }}>📋</div>
              暂无历史记录
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              {records.map((record) => (
                <div
                  key={record.id}
                  onClick={() => handleRestore(record)}
                  className="history-item"
                  style={{
                    height: 60,
                    background: 'var(--color-bg-tertiary)',
                    borderRadius: 'var(--radius-sm)',
                    padding: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-out',
                  }}
                >
                  <div
                    style={{
                      width: 44,
                    height: 44,
                    borderRadius: 6,
                    background: 'var(--color-bg-hover)',
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}
                >
                  {record.thumbnail && (
                    <img
                      src={record.thumbnail}
                      alt=""
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      color: 'var(--color-text-primary)',
                      fontWeight: 500,
                      marginBottom: 4,
                    }}
                  >
                    提取记录
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--color-text-secondary)',
                      display: 'flex',
                      gap: 12,
                    }}
                    >
                      <span>{formatDate(record.timestamp)}</span>
                      <span>{record.regionCount} 个区域</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, record.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--color-bg-active)',
                      fontSize: 16,
                      cursor: 'pointer',
                      padding: '4px 8px',
                      borderRadius: 4,
                      transition: 'all 0.2s ease-out',
                    }}
                    className="action-btn"
                  >
                    🗑
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default HistoryPanel;
