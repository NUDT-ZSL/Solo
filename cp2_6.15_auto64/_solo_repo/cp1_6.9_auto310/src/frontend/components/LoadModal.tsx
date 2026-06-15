import React, { useEffect, useState } from 'react';
import { usePoem } from '../App';

interface SavedPoem {
  id: string;
  cards: any[];
  connections: any[];
  emotionMap: Record<string, number>;
  title?: string;
  createdAt: number;
}

const LoadModal: React.FC = () => {
  const { setShowLoadModal, loadPoem } = usePoem();
  const [poems, setPoems] = useState<SavedPoem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');

  useEffect(() => {
    const fetchPoems = async () => {
      try {
        const res = await fetch('/api/poems');
        if (res.ok) {
          const data = await res.json();
          setPoems(data || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchPoems();
  }, []);

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const handleLoad = async () => {
    if (!selectedId) return;
    const ok = await loadPoem(selectedId);
    if (ok) {
      setStatus('✓ 已成功加载作品');
      setTimeout(() => setShowLoadModal(false), 600);
    } else {
      setStatus('✗ 加载失败');
    }
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(6px)',
    zIndex: 2000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    animation: 'fadeIn 0.25s ease'
  };

  const modalStyle: React.CSSProperties = {
    width: 560,
    maxWidth: '92vw',
    maxHeight: '80vh',
    borderRadius: 20,
    background: 'linear-gradient(160deg, rgba(40,40,100,0.95) 0%, rgba(20,20,60,0.95) 100%)',
    border: '1px solid rgba(255,255,255,0.12)',
    boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
    padding: 28,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    animation: 'modalIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 22,
    fontWeight: 600,
    color: '#fff',
    letterSpacing: 2
  };

  const closeBtnStyle: React.CSSProperties = {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 18,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  const listStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(0,0,0,0.2)',
    padding: 8
  };

  const itemStyle = (selected: boolean): React.CSSProperties => ({
    padding: '14px 16px',
    borderRadius: 10,
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    background: selected
      ? 'linear-gradient(135deg, rgba(255,215,0,0.2), rgba(138,180,255,0.15))'
      : 'rgba(255,255,255,0.02)',
    border: selected ? '1px solid rgba(255,215,0,0.4)' : '1px solid rgba(255,255,255,0.05)',
    transition: 'all 0.2s ease'
  });

  const footerStyle: React.CSSProperties = {
    marginTop: 20,
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 12
  };

  const btnBase: React.CSSProperties = {
    padding: '10px 22px',
    borderRadius: 16,
    border: 'none',
    cursor: 'pointer',
    fontSize: 14,
    letterSpacing: 1,
    fontWeight: 500
  };

  return (
    <div style={overlayStyle} onClick={(e) => { if (e.target === e.currentTarget) setShowLoadModal(false); }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalIn {
          from { opacity: 0; transform: translateY(20px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <div style={titleStyle}>📂 历史作品</div>
          <button style={closeBtnStyle} onClick={() => setShowLoadModal(false)}>×</button>
        </div>

        <div style={listStyle}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>加载中...</div>
          ) : poems.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🌙</div>
              <div>暂无保存的作品</div>
              <div style={{ fontSize: 12, marginTop: 6, opacity: 0.6 }}>先创作一首，然后保存吧</div>
            </div>
          ) : (
            poems.map((poem) => (
              <div
                key={poem.id}
                style={itemStyle(selectedId === poem.id)}
                onClick={() => setSelectedId(poem.id)}
                onMouseOver={(e) => {
                  if (selectedId !== poem.id) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                  }
                }}
                onMouseOut={(e) => {
                  if (selectedId !== poem.id) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                  }
                }}
              >
                <div>
                  <div style={{ color: '#fff', fontSize: 15, marginBottom: 4 }}>
                    {poem.title || '未命名作品'}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: 1 }}>
                    {poem.cards.length} 词 · {formatDate(poem.createdAt)}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>
                  {poem.id.slice(0, 8)}
                </div>
              </div>
            ))
          )}
        </div>

        {status && (
          <div
            style={{
              marginTop: 14,
              textAlign: 'center',
              fontSize: 13,
              color: status.startsWith('✓') ? 'rgba(180,255,180,0.9)' : 'rgba(255,180,180,0.9)'
            }}
          >
            {status}
          </div>
        )}

        <div style={footerStyle}>
          <button
            style={{
              ...btnBase,
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.7)',
              border: '1px solid rgba(255,255,255,0.1)'
            }}
            onClick={() => setShowLoadModal(false)}
          >
            取消
          </button>
          <button
            style={{
              ...btnBase,
              background: 'linear-gradient(135deg, rgba(255,215,0,0.4), rgba(138,180,255,0.4))',
              color: '#fff',
              opacity: selectedId ? 1 : 0.4,
              pointerEvents: selectedId ? 'auto' : 'none'
            }}
            onClick={handleLoad}
            disabled={!selectedId}
          >
            加载到画布
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoadModal;
