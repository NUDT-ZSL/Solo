import React, { useState, useEffect, useCallback, useRef } from 'react';
import RecordPanel from './components/RecordPanel';
import TasteGraph from './components/TasteGraph';

interface SeasoningPortion {
  name: string;
  portion: number;
}

interface Particle {
  x: number;
  y: number;
  color: string;
  radius: number;
  isGold?: boolean;
}

interface TasteRecord {
  id: string;
  dishName: string;
  seasonings: SeasoningPortion[];
  particles: Particle[];
  createdAt: string;
}

type ToastType = 'warn' | 'lucky';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

const App: React.FC = () => {
  const [records, setRecords] = useState<TasteRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currentRecord, setCurrentRecord] = useState<TasteRecord | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const toastIdRef = useRef(0);

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setHistoryOpen(false);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'warn') => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const fetchRecords = useCallback(async () => {
    try {
      const res = await fetch('/api/list');
      const data = (await res.json()) as TasteRecord[];
      setRecords(data);
    } catch (err) {
      console.error('Failed to fetch records:', err);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleSubmit = useCallback(
    async (dishName: string, seasonings: SeasoningPortion[]) => {
      try {
        const res = await fetch('/api/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dishName, seasonings }),
        });
        const record = (await res.json()) as TasteRecord;
        setRecords((prev) => [record, ...prev]);
        setCurrentRecord(record);
        setSelectedId(record.id);

        const hasGold = record.particles.some((p) => p.isGold);
        if (hasGold) {
          showToast('✨ 幸运料理！金色粒子出现了 ✨', 'lucky');
        }
      } catch (err) {
        console.error('Failed to create record:', err);
      }
    },
    [showToast]
  );

  const handleSelect = useCallback(
    async (id: string) => {
      if (isDeleting) return;
      if (selectedId === id) return;
      setSelectedId(id);
      try {
        const res = await fetch(`/api/detail/${id}`);
        const data = (await res.json()) as TasteRecord;
        setCurrentRecord(data);
      } catch (err) {
        console.error('Failed to fetch detail:', err);
      }
    },
    [selectedId, isDeleting]
  );

  const handleDelete = useCallback(
    async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setIsDeleting(id);
      setTimeout(async () => {
        try {
          await fetch(`/api/delete/${id}`, { method: 'DELETE' });
          setRecords((prev) => prev.filter((r) => r.id !== id));
          if (selectedId === id) {
            setSelectedId(null);
            setCurrentRecord(null);
          }
        } catch (err) {
          console.error('Failed to delete record:', err);
        } finally {
          setIsDeleting(null);
        }
      }, 300);
    },
    [selectedId]
  );

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;
  };

  return (
    <div style={{ ...styles.container, ...(isMobile ? styles.containerMobile : {}) }}>
      <div style={styles.toastContainer}>
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              ...styles.toast,
              ...(t.type === 'lucky' ? styles.toastLucky : styles.toastWarn),
            }}
          >
            {t.message}
          </div>
        ))}
      </div>

      <div
        style={{
          ...styles.historyPanel,
          ...(isMobile ? styles.historyPanelMobile : { display: 'flex' }),
          ...(isMobile && !historyOpen ? styles.historyPanelClosed : {}),
        }}
      >
        <div style={styles.historyHeader}>
          <h3 style={styles.historyTitle}>📖 历史记录</h3>
          <button
            onClick={() => setHistoryOpen((v) => !v)}
            style={{ ...styles.toggleBtn, ...(isMobile ? styles.toggleBtnShow : {}) }}
          >
            {historyOpen ? '▼' : '▶'}
          </button>
        </div>

        <div
          style={{
            ...styles.historyList,
            ...(isMobile && !historyOpen ? styles.historyListClosed : {}),
          }}
        >
          {records.length === 0 ? (
            <div style={styles.emptyHistory}>暂无记录</div>
          ) : (
            records.map((r) => (
              <div
                key={r.id}
                onClick={() => handleSelect(r.id)}
                style={{
                  ...styles.historyCard,
                  ...(selectedId === r.id ? styles.historyCardSelected : {}),
                  ...(isDeleting === r.id ? styles.cardDeleting : {}),
                }}
              >
                <div style={styles.cardThumb}>
                  <TasteGraph particles={r.particles} size={60} thumbnail />
                </div>
                <div style={styles.cardInfo}>
                  <div style={styles.cardName}>{r.dishName}</div>
                  <div style={styles.cardTime}>{formatTime(r.createdAt)}</div>
                </div>
                <button
                  onClick={(e) => handleDelete(r.id, e)}
                  style={styles.deleteBtn}
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{ ...styles.mainContent, ...(isMobile ? styles.mainContentMobile : {}) }}>
        <RecordPanel onSubmit={handleSubmit} onOverflow={() => showToast('⚠️ 总份量不能超过10份！')} />
        <div style={{ ...styles.graphSection, ...(isMobile ? styles.graphSectionMobile : {}) }}>
          {currentRecord ? (
            <>
              <div
                style={{
                  ...styles.graphWrapper,
                  ...(isDeleting === currentRecord.id ? styles.graphDeleting : {}),
                }}
              >
                <TasteGraph particles={currentRecord.particles} size={300} />
              </div>
              <div style={styles.dishNameLabel}>🍽️ {currentRecord.dishName}</div>
            </>
          ) : (
            <div style={styles.graphPlaceholder}>
              <div style={styles.placeholderIcon}>👨‍🍳</div>
              <div style={styles.placeholderText}>选择调料并生成味觉图谱</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    width: '100vw',
    height: '100vh',
    backgroundColor: '#FFF8F0',
    fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
    overflow: 'hidden',
  },
  containerMobile: {
    flexDirection: 'column',
    height: 'auto',
    minHeight: '100vh',
    overflowY: 'auto',
  },
  toastContainer: {
    position: 'fixed',
    top: 20,
    right: 20,
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    pointerEvents: 'none',
  },
  toast: {
    padding: '12px 24px',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    animation: 'toastIn 0.3s ease',
  },
  toastWarn: {
    backgroundColor: '#FFF3E0',
    color: '#E65100',
    border: '1px solid #FFB74D',
  },
  toastLucky: {
    backgroundColor: '#FFD700',
    color: '#7B4F00',
    border: '2px solid #FFA000',
    fontSize: 17,
    boxShadow: '0 0 20px rgba(255,215,0,0.6)',
  },
  historyPanel: {
    width: 300,
    flexShrink: 0,
    backgroundColor: '#FFEBD6',
    borderRight: '1px solid #E8D5BE',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  historyPanelMobile: {
    width: '100%',
    borderRight: 'none',
    borderBottom: '1px solid #E8D5BE',
    flexDirection: 'column',
    display: 'flex',
    maxHeight: '60vh',
  },
  historyPanelClosed: {
    maxHeight: 60,
    overflow: 'hidden',
  },
  historyHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 16px 12px',
    borderBottom: '1px solid #E8D5BE',
  },
  historyTitle: {
    margin: 0,
    fontSize: 18,
    color: '#5C4033',
    fontWeight: 700,
  },
  toggleBtn: {
    display: 'none',
    background: 'none',
    border: 'none',
    fontSize: 14,
    color: '#FF8C42',
    cursor: 'pointer',
    padding: 4,
  },
  toggleBtnShow: {
    display: 'block',
  },
  historyList: {
    flex: 1,
    overflowY: 'auto',
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  historyListClosed: {
    display: 'none',
  },
  emptyHistory: {
    textAlign: 'center',
    color: '#A0896E',
    padding: '40px 0',
    fontSize: 14,
  },
  historyCard: {
    height: 120,
    backgroundColor: '#FFF8F0',
    borderRadius: 10,
    padding: 10,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    cursor: 'pointer',
    position: 'relative',
    transition: 'all 0.2s ease, transform 0.3s ease, opacity 0.3s ease',
    boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
    border: '2px solid transparent',
  },
  historyCardSelected: {
    borderColor: '#FF8C42',
    boxShadow: '0 4px 12px rgba(255,140,66,0.2)',
  },
  cardDeleting: {
    transform: 'translateX(-110%)',
    opacity: 0,
  },
  cardThumb: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#FFF',
    overflow: 'hidden',
    flexShrink: 0,
  },
  cardInfo: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  cardName: {
    fontSize: 15,
    fontWeight: 600,
    color: '#3E2723',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  cardTime: {
    fontSize: 12,
    color: '#8D6E63',
  },
  deleteBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: '50%',
    border: 'none',
    backgroundColor: '#FFCCBC',
    color: '#BF360C',
    fontSize: 12,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s',
    opacity: 0.7,
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  mainContentMobile: {
    overflow: 'visible',
    minHeight: '60vh',
  },
  graphSection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    position: 'relative',
  },
  graphSectionMobile: {
    padding: 20,
    minHeight: 360,
  },
  graphWrapper: {
    transition: 'all 0.3s ease',
  },
  graphDeleting: {
    transform: 'scale(0)',
    opacity: 0,
  },
  dishNameLabel: {
    marginTop: 20,
    fontSize: 22,
    fontWeight: 700,
    color: '#5C4033',
  },
  graphPlaceholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
  },
  placeholderIcon: {
    fontSize: 64,
    opacity: 0.5,
  },
  placeholderText: {
    fontSize: 16,
    color: '#8D6E63',
  },
};

const globalStyle = `
  @keyframes toastIn {
    from { transform: translateX(120%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; }
  @media (max-width: 768px) {
    ${'' /* 响应式适配会在组件内通过window监听实现 */}
  }
`;

const styleEl = document.createElement('style');
styleEl.textContent = globalStyle;
document.head.appendChild(styleEl);

export default App;
