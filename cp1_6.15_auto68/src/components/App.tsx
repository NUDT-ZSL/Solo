import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Idea,
  Category,
  CATEGORY_COLORS,
  sortByScore,
  sortByTime,
  groupByCategory,
  computeStats,
  formatRelativeTime,
  getScoreColor,
  getRandomName,
  Stats,
} from '../modules/ideaEngine';

type SortMode = 'score' | 'time' | 'category';

const CATEGORIES: Category[] = ['增长', '效率', '体验', '技术'];

const STYLES = `
  @keyframes slideDown {
    from { transform: translateY(-100%); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes fadeOut {
    from { opacity: 1; transform: scale(1); }
    to { opacity: 0; transform: scale(0.8); }
  }
  @keyframes breathe {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }
  @keyframes barGrow {
    from { height: 0; }
  }
  @keyframes commentFadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .idea-card:hover {
    box-shadow: 0 8px 24px rgba(0,0,0,0.4);
    transform: translateY(-2px);
  }
  .modal-overlay {
    animation: fadeIn 0.2s ease-in-out;
  }
  .modal-content {
    animation: slideDown 0.3s ease-out;
  }
  .card-removing {
    animation: fadeOut 0.2s ease-in-out forwards;
  }
  .comment-enter {
    animation: commentFadeIn 0.15s ease-in-out;
  }
  .score-breathing {
    animation: breathe 3s ease-in-out infinite;
  }
  .bar-animate {
    animation: barGrow 0.3s ease-in-out;
  }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #444; border-radius: 3px; }
`;

function App() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>('score');
  const [showModal, setShowModal] = useState(false);
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState<Stats | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [listFadeKey, setListFadeKey] = useState(0);
  const statsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchIdeas = useCallback(async () => {
    try {
      const res = await fetch('/api/ideas');
      const data = await res.json();
      setIdeas(data);
    } catch {
      setIdeas([]);
    }
  }, []);

  const refreshStats = useCallback(() => {
    setStats(computeStats(ideas));
  }, [ideas]);

  useEffect(() => {
    fetchIdeas();
  }, [fetchIdeas]);

  useEffect(() => {
    refreshStats();
  }, [ideas, refreshStats]);

  useEffect(() => {
    statsTimerRef.current = setInterval(refreshStats, 30000);
    return () => {
      if (statsTimerRef.current) clearInterval(statsTimerRef.current);
    };
  }, [refreshStats]);

  const handleSortChange = (mode: SortMode) => {
    setSortMode(mode);
    setListFadeKey((k) => k + 1);
  };

  const getSortedIdeas = (): Idea[] | Record<Category, Idea[]> => {
    if (sortMode === 'score') return sortByScore(ideas);
    if (sortMode === 'time') return sortByTime(ideas);
    return groupByCategory(ideas);
  };

  const handleAddIdea = async (data: { title: string; description: string; category: Category; intuitionScore: number }) => {
    await fetch('/api/ideas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setShowModal(false);
    fetchIdeas();
  };

  const handleEditIdea = async (idea: Idea, updates: Partial<Idea>) => {
    await fetch(`/api/ideas/${idea.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    setEditingIdea(null);
    fetchIdeas();
  };

  const handleDeleteIdea = (id: string) => {
    setRemovingId(id);
    setTimeout(async () => {
      await fetch(`/api/ideas/${id}`, { method: 'DELETE' });
      setRemovingId(null);
      fetchIdeas();
    }, 200);
  };

  const handleAddComment = async (ideaId: string) => {
    const content = commentInputs[ideaId]?.trim();
    if (!content) return;
    const author = getRandomName();
    await fetch(`/api/ideas/${ideaId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author, content }),
    });
    setCommentInputs((prev) => ({ ...prev, [ideaId]: '' }));
    fetchIdeas();
  };

  const toggleComments = (id: string) => {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderCard = (idea: Idea) => {
    const isRemoving = removingId === idea.id;
    const isExpanded = expandedComments.has(idea.id);
    const visibleComments = idea.comments.slice(-3).reverse();
    const hasMore = idea.comments.length > 3;

    return (
      <div
        key={idea.id}
        className={`idea-card ${isRemoving ? 'card-removing' : ''}`}
        style={{
          background: '#1E1E2E',
          borderRadius: 12,
          padding: 20,
          transition: 'box-shadow 0.15s ease-in-out, transform 0.15s ease-in-out',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#E0E0E0', flex: 1, marginRight: 8, lineHeight: 1.4 }}>
            {idea.title}
          </h3>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button
              onClick={() => setEditingIdea(idea)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 14, padding: 2 }}
              title="编辑"
            >
              ✏️
            </button>
            <button
              onClick={() => handleDeleteIdea(idea.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 14, padding: 2 }}
              title="删除"
            >
              🗑️
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              background: CATEGORY_COLORS[idea.category] + '22',
              color: CATEGORY_COLORS[idea.category],
              padding: '3px 10px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 500,
              border: `1px solid ${CATEGORY_COLORS[idea.category]}44`,
            }}
          >
            {idea.category}
          </span>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: getScoreColor(idea.intuitionScore) + '22',
              border: `2px solid ${getScoreColor(idea.intuitionScore)}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 700,
              color: getScoreColor(idea.intuitionScore),
              flexShrink: 0,
            }}
          >
            {idea.intuitionScore}
          </div>
          <span style={{ fontSize: 12, color: '#888', marginLeft: 'auto' }}>
            {formatRelativeTime(idea.createdAt)}
          </span>
        </div>

        <p style={{ fontSize: 13, color: '#AAA', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {idea.description}
        </p>

        <div style={{ borderTop: '1px solid #333', paddingTop: 10 }}>
          <button
            onClick={() => toggleComments(idea.id)}
            style={{
              background: 'none',
              border: 'none',
              color: '#8B5CF6',
              cursor: 'pointer',
              fontSize: 13,
              padding: 0,
            }}
          >
            💬 讨论 ({idea.comments.length})
          </button>

          {isExpanded && (
            <div style={{ marginTop: 10 }}>
              {hasMore && (
                <div style={{ fontSize: 12, color: '#6C63FF', marginBottom: 8, cursor: 'pointer' }}>
                  查看全部 {idea.comments.length} 条
                </div>
              )}
              {visibleComments.map((c) => (
                <div key={c.id} className="comment-enter" style={{ marginBottom: 8, padding: '8px 10px', background: '#2A2A3E', borderRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#B0B0C0' }}>{c.author}</span>
                    <span style={{ fontSize: 11, color: '#666' }}>{formatRelativeTime(c.createdAt)}</span>
                  </div>
                  <p style={{ fontSize: 13, color: '#C0C0C0', lineHeight: 1.5 }}>{c.content}</p>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <input
                  value={commentInputs[idea.id] || ''}
                  onChange={(e) => setCommentInputs((prev) => ({ ...prev, [idea.id]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddComment(idea.id); }}
                  placeholder="输入评论，回车提交..."
                  style={{
                    flex: 1,
                    background: '#2A2A3E',
                    border: '1px solid #444',
                    borderRadius: 8,
                    padding: '8px 12px',
                    color: '#E0E0E0',
                    fontSize: 13,
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderIdeaGrid = () => {
    const sorted = getSortedIdeas();
    let cards: React.ReactNode[];

    if (sortMode === 'category') {
      const grouped = sorted as Record<Category, Idea[]>;
      cards = CATEGORIES.filter((cat) => grouped[cat].length > 0).map((cat) => (
        <div key={cat} style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: CATEGORY_COLORS[cat], marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: CATEGORY_COLORS[cat], display: 'inline-block' }} />
            {cat}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {grouped[cat].map((idea) => renderCard(idea))}
          </div>
        </div>
      ));
    } else {
      const list = sorted as Idea[];
      cards = [
        <div key="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {list.map((idea) => renderCard(idea))}
        </div>,
      ];
    }

    return (
      <div key={listFadeKey} style={{ animation: 'fadeIn 0.2s ease-in-out' }}>
        {cards}
      </div>
    );
  };

  const maxCategoryCount = stats ? Math.max(...stats.categoryStats.map((c) => c.count), 1) : 1;

  const sidebarContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <h3 style={{ fontSize: 13, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
        排序方式
      </h3>
      {([
        { mode: 'score' as SortMode, label: '🏆 按直觉评分', desc: '评分高优先' },
        { mode: 'time' as SortMode, label: '🕐 按提交时间', desc: '最新优先' },
        { mode: 'category' as SortMode, label: '📂 按分类分组', desc: '分类展示' },
      ]).map((item) => (
        <button
          key={item.mode}
          onClick={() => {
            handleSortChange(item.mode);
            if (isMobile) setShowSidebar(false);
          }}
          style={{
            background: sortMode === item.mode ? 'linear-gradient(135deg, #6C63FF22, #8B5CF622)' : 'transparent',
            border: sortMode === item.mode ? '1px solid #6C63FF44' : '1px solid transparent',
            borderRadius: 8,
            padding: '10px 12px',
            cursor: 'pointer',
            textAlign: 'left',
            color: sortMode === item.mode ? '#B0B0FF' : '#AAA',
            transition: 'all 0.2s ease-in-out',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 500 }}>{item.label}</div>
          <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{item.desc}</div>
        </button>
      ))}
    </div>
  );

  const statsContent = stats && (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h3 style={{ fontSize: 13, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>
        统计面板
      </h3>

      <div>
        <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>总创意数</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: '#E0E0E0' }}>{stats.totalIdeas}</div>
      </div>

      <div>
        <div style={{ fontSize: 11, color: '#666', marginBottom: 8 }}>分类分布</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 80 }}>
          {stats.categoryStats.map((cs) => (
            <div key={cs.category} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div
                className="bar-animate"
                style={{
                  width: '100%',
                  height: `${(cs.count / maxCategoryCount) * 60}px`,
                  background: cs.color,
                  borderRadius: 4,
                  minHeight: 4,
                  transition: 'height 0.3s ease-in-out',
                }}
              />
              <span style={{ fontSize: 10, color: '#888' }}>{cs.category}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: cs.color }}>{cs.count}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>平均直觉评分</div>
        <div className="score-breathing" style={{ fontSize: 36, fontWeight: 700, color: getScoreColor(stats.averageScore) }}>
          {stats.averageScore}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <style>{STYLES}</style>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#121212' }}>
        {!isMobile && (
          <aside style={{ width: 220, background: '#1A1A2E', padding: 20, borderRight: '1px solid #2A2A3E', flexShrink: 0 }}>
            {sidebarContent}
          </aside>
        )}

        <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #2A2A3E', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {isMobile && (
                <button
                  onClick={() => setShowSidebar(true)}
                  style={{ background: 'none', border: 'none', color: '#E0E0E0', fontSize: 20, cursor: 'pointer', padding: 4 }}
                >
                  ☰
                </button>
              )}
              <h1 style={{ fontSize: 20, fontWeight: 700, background: 'linear-gradient(135deg, #6C63FF, #8B5CF6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                💡 创意看板
              </h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {isMobile && (
                <button
                  onClick={() => setShowStats(true)}
                  style={{ background: 'none', border: 'none', color: '#E0E0E0', fontSize: 18, cursor: 'pointer', padding: 4 }}
                >
                  📊
                </button>
              )}
              <button
                onClick={() => setShowModal(true)}
                style={{
                  background: 'linear-gradient(135deg, #FF6584, #FF8A65)',
                  border: 'none',
                  color: '#fff',
                  padding: '8px 20px',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                }}
              >
                + 添加创意
              </button>
            </div>
          </header>

          <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
            {renderIdeaGrid()}
          </div>
        </main>

        {!isMobile && (
          <aside
            style={{
              width: 240,
              background: 'rgba(30, 30, 46, 0.85)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              padding: 20,
              borderLeft: '1px solid #2A2A3E',
              flexShrink: 0,
              overflowY: 'auto',
            }}
          >
            {statsContent}
          </aside>
        )}

        {isMobile && showSidebar && (
          <div className="modal-overlay" onClick={() => setShowSidebar(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex' }}>
            <aside onClick={(e) => e.stopPropagation()} style={{ width: 260, background: '#1A1A2E', padding: 20, height: '100%' }}>
              {sidebarContent}
            </aside>
          </div>
        )}

        {isMobile && showStats && (
          <div className="modal-overlay" onClick={() => setShowStats(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', justifyContent: 'flex-end' }}>
            <aside onClick={(e) => e.stopPropagation()} style={{ width: 260, background: '#1E1E2E', padding: 20, height: '100%', backdropFilter: 'blur(12px)' }}>
              {statsContent}
            </aside>
          </div>
        )}

        {showModal && (
          <IdeaModal
            onSubmit={handleAddIdea}
            onClose={() => setShowModal(false)}
          />
        )}

        {editingIdea && (
          <EditModal
            idea={editingIdea}
            onSubmit={(updates) => handleEditIdea(editingIdea, updates)}
            onClose={() => setEditingIdea(null)}
          />
        )}
      </div>
    </>
  );
}

function IdeaModal({ onSubmit, onClose }: { onSubmit: (data: { title: string; description: string; category: Category; intuitionScore: number }) => void; onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>('增长');
  const [score, setScore] = useState(50);
  const [descExpanded, setDescExpanded] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({ title: title.trim(), description: description.trim(), category, intuitionScore: score });
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 60 }}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ background: '#1E1E2E', borderRadius: 16, padding: 28, width: 480, maxWidth: '90vw', maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#E0E0E0' }}>添加新创意</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, color: '#AAA', marginBottom: 6, display: 'block' }}>创意标题</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 50))}
              maxLength={50}
              placeholder="输入创意标题（最多50字）"
              style={{ width: '100%', background: '#2A2A3E', border: '1px solid #444', borderRadius: 8, padding: '10px 14px', color: '#E0E0E0', fontSize: 14, outline: 'none', transition: 'border-color 0.2s' }}
              onFocus={(e) => (e.target.style.borderColor = '#6C63FF')}
              onBlur={(e) => (e.target.style.borderColor = '#444')}
            />
            <div style={{ fontSize: 11, color: '#666', marginTop: 4, textAlign: 'right' }}>{title.length}/50</div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 13, color: '#AAA' }}>详细描述</label>
              <button
                type="button"
                onClick={() => setDescExpanded(!descExpanded)}
                style={{ background: 'none', border: 'none', color: '#6C63FF', fontSize: 12, cursor: 'pointer' }}
              >
                {descExpanded ? '收起' : '展开'}
              </button>
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 500))}
              maxLength={500}
              placeholder="描述你的创意想法（最多500字）"
              rows={descExpanded ? 6 : 3}
              style={{ width: '100%', background: '#2A2A3E', border: '1px solid #444', borderRadius: 8, padding: '10px 14px', color: '#E0E0E0', fontSize: 14, outline: 'none', resize: 'vertical', transition: 'border-color 0.2s', fontFamily: 'inherit' }}
              onFocus={(e) => (e.target.style.borderColor = '#6C63FF')}
              onBlur={(e) => (e.target.style.borderColor = '#444')}
            />
            <div style={{ fontSize: 11, color: '#666', marginTop: 4, textAlign: 'right' }}>{description.length}/500</div>
          </div>

          <div>
            <label style={{ fontSize: 13, color: '#AAA', marginBottom: 8, display: 'block' }}>选择分类</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  style={{
                    background: category === cat ? CATEGORY_COLORS[cat] + '33' : 'transparent',
                    border: `1px solid ${category === cat ? CATEGORY_COLORS[cat] : '#444'}`,
                    borderRadius: 20,
                    padding: '6px 16px',
                    color: category === cat ? CATEGORY_COLORS[cat] : '#AAA',
                    fontSize: 13,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 13, color: '#AAA', marginBottom: 8, display: 'block' }}>
              直觉评分: <span style={{ color: getScoreColor(score), fontWeight: 600 }}>{score}</span>
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={score}
              onChange={(e) => setScore(Number(e.target.value))}
              style={{
                width: '100%',
                height: 6,
                appearance: 'none',
                background: `linear-gradient(to right, #888, #6C63FF, #00C9A7)`,
                borderRadius: 3,
                outline: 'none',
                cursor: 'pointer',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#666', marginTop: 4 }}>
              <span>0</span>
              <span>50</span>
              <span>100</span>
            </div>
          </div>

          <button
            type="submit"
            style={{
              background: 'linear-gradient(135deg, #6C63FF, #8B5CF6)',
              border: 'none',
              color: '#fff',
              padding: '12px 24px',
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
              marginTop: 4,
            }}
          >
            提交创意
          </button>
        </form>
      </div>
    </div>
  );
}

function EditModal({ idea, onSubmit, onClose }: { idea: Idea; onSubmit: (updates: Partial<Idea>) => void; onClose: () => void }) {
  const [title, setTitle] = useState(idea.title);
  const [description, setDescription] = useState(idea.description);
  const [score, setScore] = useState(idea.intuitionScore);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({ title: title.trim(), description: description.trim(), intuitionScore: score });
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ background: '#1E1E2E', borderRadius: 16, padding: 28, width: 440, maxWidth: '90vw' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#E0E0E0' }}>编辑创意</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, color: '#AAA', marginBottom: 6, display: 'block' }}>创意标题</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 50))}
              maxLength={50}
              style={{ width: '100%', background: '#2A2A3E', border: '1px solid #444', borderRadius: 8, padding: '10px 14px', color: '#E0E0E0', fontSize: 14, outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ fontSize: 13, color: '#AAA', marginBottom: 6, display: 'block' }}>详细描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 500))}
              maxLength={500}
              rows={4}
              style={{ width: '100%', background: '#2A2A3E', border: '1px solid #444', borderRadius: 8, padding: '10px 14px', color: '#E0E0E0', fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          <div style={{ padding: '8px 12px', background: '#2A2A3E', borderRadius: 8, border: '1px solid #444' }}>
            <span style={{ fontSize: 12, color: '#666' }}>分类：</span>
            <span style={{ fontSize: 13, color: CATEGORY_COLORS[idea.category] }}>{idea.category}</span>
            <span style={{ fontSize: 11, color: '#555', marginLeft: 8 }}>（不可修改）</span>
          </div>

          <div>
            <label style={{ fontSize: 13, color: '#AAA', marginBottom: 8, display: 'block' }}>
              直觉评分: <span style={{ color: getScoreColor(score), fontWeight: 600 }}>{score}</span>
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={score}
              onChange={(e) => setScore(Number(e.target.value))}
              style={{ width: '100%', height: 6, appearance: 'none', background: 'linear-gradient(to right, #888, #6C63FF, #00C9A7)', borderRadius: 3, outline: 'none', cursor: 'pointer' }}
            />
          </div>

          <button
            type="submit"
            style={{
              background: 'linear-gradient(135deg, #6C63FF, #8B5CF6)',
              border: 'none',
              color: '#fff',
              padding: '12px 24px',
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'transform 0.2s',
              marginTop: 4,
            }}
          >
            保存修改
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;
