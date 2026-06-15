import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Inspiration, TagType, ALL_TAGS, TAG_STYLES } from './types';
import InspirationCard from './InspirationCard';

type SortType = 'newest' | 'hottest';

export default function App() {
  const [items, setItems] = useState<Inspiration[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTags, setSelectedTags] = useState<TagType[]>([]);
  const [filterTags, setFilterTags] = useState<TagType[]>([]);
  const [sortType, setSortType] = useState<SortType>('newest');
  const [newItemId, setNewItemId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playDingSound = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1800, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch (_e) {
      /* ignore audio errors */
    }
  }, []);

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch('/api/inspirations');
      const data = await res.json();
      setItems(data);
    } catch (err) {
      console.error('加载灵感失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (title.trim().length === 0 || description.trim().length === 0) return;
      if (selectedTags.length === 0) return;

      try {
        const res = await fetch('/api/inspirations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
            tags: selectedTags,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error || '发布失败');
          return;
        }
        const newItem: Inspiration = await res.json();
        setItems((prev) => [newItem, ...prev]);
        setNewItemId(newItem.id);
        playDingSound();
        setTitle('');
        setDescription('');
        setSelectedTags([]);
        setTimeout(() => setNewItemId(null), 600);
      } catch (err) {
        console.error('发布失败:', err);
        alert('发布失败，请重试');
      }
    },
    [title, description, selectedTags, playDingSound]
  );

  const handleVote = useCallback(async (id: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, votes: it.votes + 1 } : it))
    );
    try {
      await fetch(`/api/inspirations/${id}/vote`, { method: 'POST' });
    } catch (err) {
      console.error('投票失败:', err);
      setItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, votes: it.votes - 1 } : it))
      );
    }
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    try {
      await fetch(`/api/inspirations/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('删除失败:', err);
      fetchItems();
    }
  }, [fetchItems]);

  const toggleTag = (tag: TagType) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const toggleFilterTag = (tag: TagType) => {
    setFilterTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const displayedItems = useMemo(() => {
    let result = [...items];
    if (filterTags.length > 0) {
      result = result.filter((it) =>
        filterTags.some((ft) => it.tags.includes(ft))
      );
    }
    if (sortType === 'newest') {
      result.sort((a, b) => b.createdAt - a.createdAt);
    } else {
      result.sort((a, b) => b.votes - a.votes || b.createdAt - a.createdAt);
    }
    return result;
  }, [items, filterTags, sortType]);

  const hotThreshold = useMemo(() => {
    if (items.length === 0) return 20;
    const sorted = [...items].sort((a, b) => b.votes - a.votes);
    const topIdx = Math.max(1, Math.floor(sorted.length * 0.15));
    return Math.max(sorted[Math.min(topIdx, sorted.length - 1)]?.votes || 0, 10);
  }, [items]);

  const gridColsStyle = useMemo<React.CSSProperties>(() => ({
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
    alignItems: 'start',
  }), []);

  return (
    <div style={{ minHeight: '100vh' }}>
      <header
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '28px 24px 0',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            fontSize: '36px',
            fontWeight: 700,
            background: 'linear-gradient(135deg, #2d7a5a 0%, #4a90b8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '6px',
            letterSpacing: '4px',
          }}
        >
          🌳 灵感之森
        </h1>
        <p style={{ color: '#6b8578', fontSize: '14px', marginBottom: '24px' }}>
          种下一颗灵感的种子，让它在森林中发光
        </p>
      </header>

      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 24px 40px',
          display: 'flex',
          gap: '24px',
          position: 'relative',
        }}
      >
        <button
          onClick={() => setSidebarOpen((o) => !o)}
          style={{
            display: 'none',
            position: 'fixed',
            left: '12px',
            bottom: '20px',
            zIndex: 100,
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            border: 'none',
            background: 'linear-gradient(135deg, #5ba985, #4a90b8)',
            color: '#fff',
            fontSize: '20px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            cursor: 'pointer',
          }}
        >
          🏷
        </button>

        <aside
          style={{
            width: '180px',
            flexShrink: 0,
            position: 'sticky',
            top: '24px',
            alignSelf: 'flex-start',
            height: 'fit-content',
            padding: '20px',
            background: 'rgba(255, 255, 255, 0.75)',
            backdropFilter: 'blur(12px)',
            borderRadius: '16px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.06)',
            transform: sidebarOpen ? 'translateX(0)' : undefined,
            transition: 'transform 0.3s ease-out',
          }}
        >
          <h4
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#2d5a45',
              marginBottom: '14px',
            }}
          >
            标签筛选
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {ALL_TAGS.map((tag) => {
              const isSelected = filterTags.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => toggleFilterTag(tag)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: isSelected ? 'none' : '1px solid rgba(0,0,0,0.08)',
                    background: isSelected
                      ? TAG_STYLES[tag].background
                      : 'rgba(255,255,255,0.6)',
                    color: isSelected ? TAG_STYLES[tag].color : '#666',
                    fontWeight: isSelected ? 600 : 400,
                    cursor: 'pointer',
                    fontSize: '13px',
                    textAlign: 'left',
                    transition: 'all 0.25s ease-out',
                  }}
                >
                  {tag}
                </button>
              );
            })}
            {filterTags.length > 0 && (
              <button
                onClick={() => setFilterTags([])}
                style={{
                  marginTop: '6px',
                  padding: '6px',
                  background: 'transparent',
                  border: '1px dashed rgba(0,0,0,0.15)',
                  borderRadius: '8px',
                  color: '#888',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                清除筛选
              </button>
            )}
          </div>

          <div style={{ marginTop: '22px' }}>
            <h4
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#2d5a45',
                marginBottom: '10px',
              }}
            >
              森林统计
            </h4>
            <div style={{ fontSize: '12px', color: '#7a8a80', lineHeight: 1.8 }}>
              <div>灵感数量：{items.length}</div>
              <div>
                光点总数：
                {items.reduce((sum, it) => sum + it.votes, 0)}
              </div>
            </div>
          </div>
        </aside>

        <main style={{ flex: 1, minWidth: 0 }}>
          <section
            style={{
              padding: '24px',
              background: 'rgba(255, 255, 255, 0.65)',
              backdropFilter: 'blur(16px)',
              borderRadius: '20px',
              boxShadow: '0 6px 24px rgba(0,0,0,0.07)',
              marginBottom: '28px',
              border: '1px solid rgba(255,255,255,0.5)',
            }}
          >
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                value={title}
                onChange={(e) =>
                  setTitle(e.target.value.slice(0, 20))
                }
                placeholder="灵感标题（不超过20字）"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid rgba(0,0,0,0.08)',
                  background: 'rgba(255,255,255,0.9)',
                  fontSize: '15px',
                  marginBottom: '12px',
                  outline: 'none',
                  transition: 'border-color 0.25s ease-out, box-shadow 0.25s ease-out',
                  fontFamily: 'inherit',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#5ba985';
                  e.currentTarget.style.boxShadow =
                    '0 0 0 3px rgba(91, 169, 133, 0.15)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              <textarea
                value={description}
                onChange={(e) =>
                  setDescription(e.target.value.slice(0, 140))
                }
                placeholder="描述你的灵感闪念（不超过140字）"
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid rgba(0,0,0,0.08)',
                  background: 'rgba(255,255,255,0.9)',
                  fontSize: '14px',
                  marginBottom: '12px',
                  resize: 'vertical',
                  outline: 'none',
                  transition: 'border-color 0.25s ease-out, box-shadow 0.25s ease-out',
                  fontFamily: 'inherit',
                  lineHeight: 1.5,
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#5ba985';
                  e.currentTarget.style.boxShadow =
                    '0 0 0 3px rgba(91, 169, 133, 0.15)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                  marginBottom: '4px',
                }}
              >
                <div style={{ fontSize: '12px', color: '#999' }}>
                  {title.length}/20 · {description.length}/140
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {ALL_TAGS.map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        type="button"
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '16px',
                          border: isSelected ? 'none' : '1px solid rgba(0,0,0,0.1)',
                          background: isSelected
                            ? TAG_STYLES[tag].background
                            : 'rgba(255,255,255,0.7)',
                          color: isSelected ? TAG_STYLES[tag].color : '#777',
                          fontWeight: isSelected ? 600 : 400,
                          fontSize: '13px',
                          cursor: 'pointer',
                          transition: 'all 0.25s ease-out',
                        }}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
                <button
                  type="submit"
                  disabled={
                    title.trim().length === 0 ||
                    description.trim().length === 0 ||
                    selectedTags.length === 0
                  }
                  style={{
                    padding: '11px 28px',
                    borderRadius: '14px',
                    border: 'none',
                    cursor:
                      title.trim() && description.trim() && selectedTags.length
                        ? 'pointer'
                        : 'not-allowed',
                    background:
                      title.trim() && description.trim() && selectedTags.length
                        ? 'linear-gradient(135deg, #5ba985 0%, #4a90b8 100%)'
                        : 'rgba(180,180,180,0.3)',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '14px',
                    letterSpacing: '2px',
                    boxShadow:
                      title.trim() && description.trim() && selectedTags.length
                        ? '0 4px 15px rgba(91, 169, 133, 0.35)'
                        : 'none',
                    transition: 'all 0.3s ease-out',
                  }}
                >
                  🌱 播种灵感
                </button>
              </div>
            </form>
          </section>

          <section
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '18px',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div style={{ fontSize: '13px', color: '#6b8578', fontWeight: 500 }}>
              共 <strong style={{ color: '#2d5a45' }}>{displayedItems.length}</strong>{' '}
              颗灵感正在萌芽
              {filterTags.length > 0 && (
                <span style={{ marginLeft: '6px', color: '#888' }}>
                  （已筛选）
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {([
                { key: 'newest', label: '🕒 最新发布' },
                { key: 'hottest', label: '✨ 光点热度' },
              ] as { key: SortType; label: string }[]).map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setSortType(opt.key)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '10px',
                    border:
                      sortType === opt.key
                        ? 'none'
                        : '1px solid rgba(0,0,0,0.08)',
                    background:
                      sortType === opt.key
                        ? 'linear-gradient(135deg, #5ba985, #4a90b8)'
                        : 'rgba(255,255,255,0.7)',
                    color: sortType === opt.key ? '#fff' : '#666',
                    fontSize: '12.5px',
                    fontWeight: sortType === opt.key ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.3s ease-out',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          {loading ? (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 0',
                color: '#8aaa9a',
                fontSize: '14px',
              }}
            >
              🌿 正在浇灌灵感森林...
            </div>
          ) : displayedItems.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '70px 20px',
                background: 'rgba(255,255,255,0.5)',
                borderRadius: '16px',
                color: '#7a9a8a',
              }}
            >
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🌱</div>
              <div style={{ fontSize: '15px', marginBottom: '6px' }}>
                {filterTags.length > 0
                  ? '当前标签下还没有灵感'
                  : '森林里还是一片空地'}
              </div>
              <div style={{ fontSize: '12px', color: '#9aada0' }}>
                播种第一颗灵感种子吧
              </div>
            </div>
          ) : (
            <div key={`${sortType}-${filterTags.join(',')}`} style={gridColsStyle}>
              {displayedItems.map((item, idx) => (
                <InspirationCard
                  key={item.id}
                  inspiration={item}
                  index={idx}
                  isNew={item.id === newItemId}
                  isHot={item.votes >= hotThreshold}
                  onVote={handleVote}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      <style>{`
        @media (max-width: 768px) {
          aside {
            position: fixed !important;
            top: 0;
            left: 0;
            height: 100vh !important;
            width: 220px !important;
            z-index: 99;
            transform: translateX(-110%);
            border-radius: 0 16px 16px 0 !important;
          }
          body {
            --sidebar-offset: 0px;
          }
        }
      `}</style>
    </div>
  );
}
