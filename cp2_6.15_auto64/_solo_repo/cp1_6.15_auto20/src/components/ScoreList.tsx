import { useState, useEffect, useCallback } from 'react';
import { Search, Trash2, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { Score, PITCH_NAMES } from '../types';

const STORAGE_KEY = 'score-mark-scores';

function ScoreThumbnail({ notes }: { notes: (Score['notes'][0])[] }) {
  const measures = notes.slice(0, 8);
  return (
    <div
      style={{
        display: 'flex',
        gap: 2,
        padding: '6px 4px',
        overflow: 'hidden',
      }}
    >
      {measures.map((measure, mi) => (
        <div
          key={mi}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            minWidth: 24,
            borderRight: mi < 7 ? '1px solid #2a2a4e' : 'none',
            paddingRight: 2,
          }}
        >
          {measure.map((note, bi) => (
            <div
              key={bi}
              style={{
                width: 20,
                height: 8,
                borderRadius: 2,
                background: note ? 'rgba(233,69,96,0.6)' : 'rgba(255,255,255,0.05)',
              }}
            >
              {note && (
                <span style={{ fontSize: 6, color: '#fff', lineHeight: '8px', paddingLeft: 2 }}>
                  {PITCH_NAMES[note.pitch - 1]}
                  {note.sharp ? '#' : ''}
                </span>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function ScoreList({
  refreshKey,
  showToast,
}: {
  refreshKey: number;
  showToast: (msg: string) => void;
}) {
  const [scores, setScores] = useState<Score[]>([]);
  const [search, setSearch] = useState('');
  const [sortAsc, setSortAsc] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [animatingDelete, setAnimatingDelete] = useState<string | null>(null);
  const [searchAnimKey, setSearchAnimKey] = useState(0);

  const loadScores = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      setScores(stored ? JSON.parse(stored) : []);
    } catch {
      setScores([]);
    }
  }, []);

  useEffect(() => {
    loadScores();
  }, [refreshKey, loadScores]);

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setSearchAnimKey(k => k + 1);
  }, []);

  const filteredScores = scores
    .filter(s => s.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) =>
      sortAsc ? a.createdAt - b.createdAt : b.createdAt - a.createdAt
    );

  const handleDelete = useCallback(
    (id: string) => {
      setAnimatingDelete(id);
      setTimeout(() => {
        try {
          const stored = localStorage.getItem(STORAGE_KEY);
          const all: Score[] = stored ? JSON.parse(stored) : [];
          const updated = all.filter(s => s.id !== id);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          setScores(updated);
          showToast('乐谱已删除');
        } catch { /* ignore */ }
        setAnimatingDelete(null);
        setConfirmDelete(null);
        setDeletingId(null);
      }, 300);
    },
    [showToast]
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: '#16213e',
            borderRadius: 8,
            padding: '6px 12px',
            border: '1px solid #2a2a4e',
            flex: '0 1 320px',
          }}
        >
          <Search size={16} color="#8888aa" />
          <input
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="搜索乐谱..."
            style={{
              background: 'none',
              border: 'none',
              color: '#e0e0e0',
              outline: 'none',
              fontSize: 14,
              flex: 1,
              fontFamily: 'inherit',
            }}
          />
        </div>

        <button
          onClick={() => setSortAsc(!sortAsc)}
          style={{
            background: '#16213e',
            border: '1px solid #2a2a4e',
            borderRadius: 8,
            padding: '6px 12px',
            color: '#8888aa',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 13,
            fontFamily: 'inherit',
          }}
        >
          <Clock size={14} />
          时间排序
          {sortAsc ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {filteredScores.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '48px 0',
            color: '#8888aa',
            fontSize: 15,
          }}
        >
          {search ? '没有找到匹配的乐谱' : '暂无乐谱，去新建一个吧！'}
        </div>
      )}

      <div
        key={searchAnimKey}
        className="fade-in"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
        }}
      >
        {filteredScores.map(score => (
          <div
            key={score.id}
            className={animatingDelete === score.id ? 'scale-disappear' : undefined}
            style={{
              background: '#16213e',
              borderRadius: 12,
              padding: 16,
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              transition: 'transform 0.2s, box-shadow 0.2s',
              cursor: 'default',
              position: 'relative',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
              (e.currentTarget as HTMLElement).style.boxShadow =
                '0 8px 20px rgba(0,0,0,0.5)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLElement).style.boxShadow =
                '0 4px 12px rgba(0,0,0,0.3)';
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 8,
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 15, color: '#e0e0e0' }}>
                {score.title}
              </div>
              <button
                onClick={() => setConfirmDelete(score.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 4,
                  color: '#8888aa',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={e =>
                  ((e.currentTarget as HTMLElement).style.color = '#e94560')
                }
                onMouseLeave={e =>
                  ((e.currentTarget as HTMLElement).style.color = '#8888aa')
                }
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div
              style={{
                fontSize: 11,
                color: '#8888aa',
                marginBottom: 8,
              }}
            >
              {new Date(score.createdAt).toLocaleString('zh-CN')}
            </div>

            <div
              style={{
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 6,
                overflow: 'hidden',
              }}
            >
              <ScoreThumbnail notes={score.notes} />
            </div>
          </div>
        ))}
      </div>

      {confirmDelete && (
        <div
          className="overlay-fade-in"
          onClick={() => setConfirmDelete(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="fade-in"
            style={{
              background: '#16213e',
              borderRadius: 12,
              padding: 24,
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              maxWidth: 360,
              width: '90%',
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#e0e0e0' }}>
              确认删除
            </div>
            <div style={{ fontSize: 14, color: '#8888aa', marginBottom: 20 }}>
              删除后无法恢复，确定要删除这个乐谱吗？
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmDelete(null)}
                style={{
                  background: '#1a1a2e',
                  border: '1px solid #2a2a4e',
                  borderRadius: 8,
                  padding: '8px 16px',
                  color: '#8888aa',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontFamily: 'inherit',
                }}
              >
                取消
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                style={{
                  background: '#e94560',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 16px',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 13,
                  fontFamily: 'inherit',
                }}
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
