import { useState, useEffect, useMemo } from 'react';
import { Card, STORAGE_KEYS } from '../card-module/CardData';

export interface VersionSnapshot {
  id: string;
  timestamp: number;
  card: Partial<Card>;
  label: string;
}

interface VersionHistoryProps {
  hasUnsavedChanges: boolean;
  onRestore: (snapshot: VersionSnapshot) => void;
  onCancelRestore: () => void;
  pendingRestore: VersionSnapshot | null;
  showConfirmDialog: boolean;
  onConfirmDiscard: () => void;
}

const PAGE_SIZE = 10;

export default function VersionHistory({
  hasUnsavedChanges,
  onRestore,
  onCancelRestore,
  pendingRestore,
  showConfirmDialog,
  onConfirmDiscard
}: VersionHistoryProps) {
  const [history, setHistory] = useState<VersionSnapshot[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadHistory();
    const handleStorage = () => loadHistory();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const loadHistory = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.VERSION_HISTORY);
      if (stored) {
        const parsed = JSON.parse(stored) as VersionSnapshot[];
        setHistory(parsed.sort((a, b) => b.timestamp - a.timestamp));
      }
    } catch (e) {
      console.error('加载版本历史失败:', e);
    }
  };

  const totalPages = Math.max(1, Math.ceil(history.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const pagedHistory = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    return history.slice(start, start + PAGE_SIZE);
  }, [history, safeCurrentPage]);

  const formatDateTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const handleClickVersion = (snapshot: VersionSnapshot) => {
    if (hasUnsavedChanges) {
      onRestore(snapshot);
    } else {
      onRestore(snapshot);
      onConfirmDiscard();
    }
  };

  const clearHistory = () => {
    if (window.confirm('确定要清除所有版本历史吗？此操作不可撤销。')) {
      localStorage.removeItem(STORAGE_KEYS.VERSION_HISTORY);
      setHistory([]);
      setCurrentPage(1);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <h2 style={styles.title}>版本历史</h2>
        {history.length > 0 && (
          <button onClick={clearHistory} style={styles.clearButton}>
            清空
          </button>
        )}
      </div>

      <div style={styles.historyContainer}>
        {history.length === 0 ? (
          <p style={styles.emptyText}>暂无版本记录</p>
        ) : (
          <>
            <div style={styles.historyList}>
              {pagedHistory.map((snapshot, idx) => (
                <div
                  key={snapshot.id}
                  onClick={() => handleClickVersion(snapshot)}
                  style={{
                    ...styles.historyItem,
                    opacity: 1 - idx * 0.08
                  }}
                >
                  <div style={styles.versionHeader}>
                    <span style={styles.versionLabel}>
                      #{history.length - (safeCurrentPage - 1) * PAGE_SIZE - idx}
                    </span>
                    <span style={styles.versionTime}>
                      {formatDateTime(snapshot.timestamp)}
                    </span>
                  </div>
                  <div style={styles.versionCard}>
                    <span style={styles.miniCost}>{snapshot.card.cost ?? 0}</span>
                    <span style={styles.miniName}>{snapshot.card.name || '未命名'}</span>
                    <span style={styles.miniStats}>
                      <span style={styles.attackColor}>⚔{snapshot.card.attack ?? 0}</span>
                      <span style={styles.healthColor}>❤{snapshot.card.health ?? 0}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div style={styles.pagination}>
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safeCurrentPage === 1}
                  style={{
                    ...styles.pageButton,
                    opacity: safeCurrentPage === 1 ? 0.4 : 1,
                    cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer'
                  }}
                >
                  上一页
                </button>
                <span style={styles.pageInfo}>
                  {safeCurrentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage === totalPages}
                  style={{
                    ...styles.pageButton,
                    opacity: safeCurrentPage === totalPages ? 0.4 : 1,
                    cursor:
                      safeCurrentPage === totalPages ? 'not-allowed' : 'pointer'
                  }}
                >
                  下一页
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {showConfirmDialog && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalDialog}>
            <h3 style={styles.modalTitle}>确认回溯</h3>
            <p style={styles.modalMessage}>
              当前编辑器有未保存的修改，恢复到历史版本将丢失这些修改。
              <br />
              是否放弃当前修改并继续？
            </p>
            {pendingRestore && (
              <div style={styles.modalSnapshot}>
                <span style={styles.modalSnapshotLabel}>即将恢复版本：</span>
                <span style={styles.modalSnapshotTime}>
                  {formatDateTime(pendingRestore.timestamp)}
                </span>
              </div>
            )}
            <div style={styles.modalButtons}>
              <button onClick={onCancelRestore} style={styles.cancelButton}>
                取消
              </button>
              <button onClick={onConfirmDiscard} style={styles.discardButton}>
                放弃修改
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    flex: 1,
    minHeight: 0,
    borderTop: '1px solid #334155'
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: {
    color: '#E2E8F0',
    fontSize: '18px',
    fontWeight: 600,
    margin: 0
  },
  clearButton: {
    backgroundColor: 'transparent',
    border: '1px solid #64748B',
    color: '#94A3B8',
    padding: '4px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  historyContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    gap: '12px'
  },
  emptyText: {
    color: '#64748B',
    fontSize: '13px',
    textAlign: 'center',
    padding: '24px 16px'
  },
  historyList: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    paddingRight: '4px',
    minHeight: 0
  },
  historyItem: {
    backgroundColor: '#0F3460',
    borderRadius: '10px',
    padding: '10px 12px',
    cursor: 'pointer',
    border: '1px solid #334155',
    transition: 'all 0.2s ease'
  },
  versionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
  },
  versionLabel: {
    color: '#FFD700',
    fontWeight: 700,
    fontSize: '12px'
  },
  versionTime: {
    color: '#94A3B8',
    fontSize: '11px'
  },
  versionCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 10px',
    backgroundColor: '#16213E',
    borderRadius: '6px'
  },
  miniCost: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: '#FFD700',
    color: '#1A1A2E',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '11px',
    flexShrink: 0
  },
  miniName: {
    flex: 1,
    color: '#FFFFFF',
    fontWeight: 600,
    fontSize: '13px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  miniStats: {
    display: 'flex',
    gap: '8px',
    fontSize: '11px',
    fontWeight: 600
  },
  attackColor: {
    color: '#FF4444'
  },
  healthColor: {
    color: '#44FF44'
  },
  pagination: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    paddingTop: '8px',
    borderTop: '1px solid #334155'
  },
  pageButton: {
    backgroundColor: '#0F3460',
    border: '1px solid #334155',
    color: '#E2E8F0',
    padding: '6px 14px',
    borderRadius: '6px',
    fontSize: '12px',
    transition: 'all 0.2s ease'
  },
  pageInfo: {
    color: '#94A3B8',
    fontSize: '12px'
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: '#00000066',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px'
  },
  modalDialog: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '24px',
    width: '100%',
    maxWidth: '400px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  modalTitle: {
    color: '#1A1A2E',
    fontSize: '18px',
    fontWeight: 700,
    margin: 0
  },
  modalMessage: {
    color: '#475569',
    fontSize: '14px',
    lineHeight: 1.6,
    margin: 0
  },
  modalSnapshot: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '12px',
    backgroundColor: '#F1F5F9',
    borderRadius: '8px'
  },
  modalSnapshotLabel: {
    color: '#64748B',
    fontSize: '12px'
  },
  modalSnapshotTime: {
    color: '#1A1A2E',
    fontSize: '14px',
    fontWeight: 600
  },
  modalButtons: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end'
  },
  cancelButton: {
    padding: '10px 20px',
    backgroundColor: '#9E9E9E',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.2s ease'
  },
  discardButton: {
    padding: '10px 20px',
    backgroundColor: '#F44336',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.2s ease'
  }
};
