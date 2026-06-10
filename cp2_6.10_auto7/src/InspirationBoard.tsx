import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { X, Plus, Edit3, Trash2 } from 'lucide-react';
import { apiFetch, tagColorFor, Inspiration, InspirationCategory, AuthState } from './App';
import ColorPicker, { getComplementaryHex } from './ColorPicker';
import AudioRecorder from './AudioRecorder';

interface Props {
  auth: AuthState;
  onLogout: () => void;
}

interface HighlightCardData {
  index: number;
  position: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

const categoryLabels: Record<InspirationCategory, string> = {
  text: '文字',
  image: '图片',
  color: '颜色',
  audio: '声音',
};

const categories: InspirationCategory[] = ['text', 'image', 'color', 'audio'];

function uploadAudio(blob: Blob): Promise<string> {
  const form = new FormData();
  form.append('audio', blob, 'recording.webm');
  return apiFetch('/api/audio/upload', { method: 'POST', body: form })
    .then((r) => r.json())
    .then((d) => {
      if (d.success) return d.data.audioId;
      throw new Error(d.error || '上传失败');
    });
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="56" height="56" viewBox="0 0 24 24" fill="#FFD700">
      <polygon points="12,2 15,9 22,9 17,14 19,22 12,17 5,22 7,14 2,9 9,9" />
    </svg>
  );
}

function HighlightCard({ index }: { index: number }) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const rafRef = useRef(0);
  const counterRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loop = () => {
      setParticles((prev) => {
        const now = performance.now();
        const updated = prev
          .map((p) => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, life: p.life - 16 }))
          .filter((p) => p.life > 0);
        const container = containerRef.current;
        if (container) {
          const rect = container.getBoundingClientRect();
          const cx = rect.width / 2;
          const cy = rect.height / 2;
          for (let i = 0; i < 5; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 1.5 + 0.5;
            updated.push({
              id: ++counterRef.current,
              x: cx + (Math.random() - 0.5) * 4,
              y: cy + (Math.random() - 0.5) * 4,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              life: 800,
            });
          }
        }
        return updated;
      });
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div className="insp-card" style={{ border: 'none', background: 'transparent', boxShadow: 'none', padding: 0 }}>
      <div className="highlight-card" style={{ width: '100%', height: '100%' }}>
        <h3 className="highlight-title">今日灵感 #{index}</h3>
        <div className="highlight-star-wrap" ref={containerRef}>
          <StarIcon className="highlight-star" />
          {particles.map((p) => (
            <span
              key={p.id}
              className="highlight-particle"
              style={{
                left: p.x - 3,
                top: p.y - 3,
                opacity: Math.max(0, p.life / 800),
                transform: `scale(${0.3 + (1 - p.life / 800) * 0.7})`,
              }}
            />
          ))}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 500 }}>
          发现今日的创意火花
        </div>
      </div>
    </div>
  );
}

function ColorCardCard({ hex, complement }: { hex: string; complement: string }) {
  return (
    <div
      className="color-card"
      style={{
        background: hex,
        // @ts-ignore
        '--comp-color': complement,
      } as React.CSSProperties}
    >
      <div className="color-card-text">{hex.toUpperCase()}</div>
    </div>
  );
}

function AudioCardCard({ audioId }: { audioId: string }) {
  const url = `/api/audio/${audioId}`;
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <AudioRecorder existingAudioId={audioId} existingAudioUrl={url} onRecorded={() => {}} />
    </div>
  );
}

function CardContent({ insp }: { insp: Inspiration }) {
  switch (insp.category) {
    case 'text':
      return <div className="card-content" style={{ padding: '32px 16px 50px' }}>{insp.content}</div>;
    case 'image':
      return (
        <div className="card-content" style={{ padding: 0 }}>
          <img src={insp.content} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 16 }} />
        </div>
      );
    case 'color':
      return <ColorCardCard hex={insp.content} complement={insp.colorComplement || getComplementaryHex(insp.content)} />;
    case 'audio':
      return (
        <div className="card-content" style={{ padding: 0 }}>
          <AudioCardCard audioId={insp.content} />
        </div>
      );
    default:
      return null;
  }
}

function InspirationCard({
  insp,
  deleting,
  flipped,
  onDelete,
  onEdit,
  onSave,
  onCancelEdit,
  activeTag,
  onTagClick,
  editContent,
  setEditContent,
  editTags,
  setEditTags,
}: {
  insp: Inspiration;
  deleting: boolean;
  flipped: boolean;
  onDelete: (e: React.MouseEvent) => void;
  onEdit: (e: React.MouseEvent) => void;
  onSave: () => void;
  onCancelEdit: () => void;
  activeTag: string | null;
  onTagClick: (tag: string) => void;
  editContent: string;
  setEditContent: (s: string) => void;
  editTags: string;
  setEditTags: (s: string) => void;
}) {
  const animDelay = `${Math.min(Math.random() * 100, 40)}ms`;
  const allTags = useMemo(() => new Set<string>(), []);

  return (
    <div
      className={`insp-card ${deleting ? 'deleting' : ''} ${flipped ? 'flipped' : ''}`}
      style={{ animationDelay: animDelay }}
      onClick={(e) => {
        // only toggle flip when clicking card itself, not buttons
        const target = e.target as HTMLElement;
        if (target.closest('.card-delete-btn') || target.closest('.card-edit-btn') || target.closest('.tag-chip') || target.closest('.card-back')) {
          return;
        }
      }}
    >
      <div className="card-face card-front">
        <span className="card-category">{categoryLabels[insp.category]}</span>
        <button className="card-delete-btn" onClick={onDelete} title="删除">
          <Trash2 size={14} />
        </button>
        <button className="card-edit-btn" onClick={onEdit} title="编辑">
          <Edit3 size={14} />
        </button>
        <CardContent insp={insp} />
        <div className="card-tags">
          {insp.tags.map((tag) => (
            <span
              key={tag}
              className={`tag-chip ${activeTag && activeTag !== tag ? 'dimmed' : ''}`}
              style={{ background: tagColorFor(tag) }}
              onClick={(e) => {
                e.stopPropagation();
                onTagClick(tag);
              }}
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>

      <div className="card-face card-back">
        <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: -4 }}>内容</label>
        {insp.category === 'text' ? (
          <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} placeholder="输入文字灵感..." />
        ) : (
          <input value={editContent} onChange={(e) => setEditContent(e.target.value)} placeholder={insp.category === 'image' ? '图片URL' : 'HEX颜色'} />
        )}
        <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: -4 }}>标签（逗号分隔，最多3个）</label>
        <input value={editTags} onChange={(e) => setEditTags(e.target.value)} placeholder="创意, 设计, 灵感" />
        <div className="btn-row">
          <button className="btn-cancel" onClick={onCancelEdit}>取消</button>
          <button className="btn-save" onClick={onSave}>保存</button>
        </div>
      </div>
    </div>
  );
}

function AddModal({ onClose, onAdded }: { onClose: () => void; onAdded: (insp: Inspiration) => void }) {
  const [category, setCategory] = useState<InspirationCategory>('text');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [color, setColor] = useState('#5B7FFF');
  const [audioId, setAudioId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const tags = useMemo(
    () => tagsInput.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 3),
    [tagsInput]
  );

  const handleSubmit = async () => {
    setErr('');
    let finalContent = content;
    let colorComplement: string | undefined;

    if (category === 'color') {
      finalContent = color;
      colorComplement = getComplementaryHex(color);
    } else if (category === 'audio') {
      if (!audioId) { setErr('请先录制一段音频'); return; }
      finalContent = audioId;
    } else if (!finalContent.trim()) {
      setErr('请输入内容'); return;
    }

    setLoading(true);
    try {
      const r = await apiFetch('/api/inspirations', {
        method: 'POST',
        body: JSON.stringify({ category, content: finalContent, tags, colorComplement }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error);
      onAdded(d.data);
      onClose();
    } catch (e: any) {
      setErr(e.message);
    } finally { setLoading(false); }
  };

  const handleRecorded = async (blob: Blob) => {
    try {
      const id = await uploadAudio(blob);
      setAudioId(id);
    } catch {
      setErr('音频上传失败');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 className="modal-title" style={{ margin: 0 }}>添加灵感</h2>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)', border: 'none',
              color: '#fff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="category-tabs">
          {categories.map((c) => (
            <button
              key={c}
              className={`category-tab ${category === c ? 'active' : ''}`}
              onClick={() => setCategory(c)}
            >
              {categoryLabels[c]}
            </button>
          ))}
        </div>

        {category === 'text' && (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="写下你的灵感..."
            rows={5}
            style={{ resize: 'none', width: '100%' }}
          />
        )}

        {category === 'image' && (
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="粘贴图片URL..."
          />
        )}

        {category === 'color' && (
          <div>
            <ColorPicker value={color} onChange={setColor} />
            <div style={{ marginTop: 16, fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
              预览：<span style={{ display: 'inline-block', width: 18, height: 18, background: color, borderRadius: 4, verticalAlign: 'middle', marginLeft: 6, border: '1px solid rgba(255,255,255,0.3)' }} />
            </div>
          </div>
        )}

        {category === 'audio' && (
          <AudioRecorder onRecorded={handleRecorded} />
        )}

        <div style={{ marginTop: 16 }}>
          <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: 6 }}>
            标签（逗号分隔，最多3个）
          </label>
          <input
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="例如：创意, 设计, 参考"
          />
          <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {tags.map((t) => (
              <span key={t} className="tag-chip" style={{ background: tagColorFor(t) }}>#{t}</span>
            ))}
          </div>
        </div>

        {err && <div className="err-msg" style={{ marginTop: 16 }}>{err}</div>}

        <div className="modal-btn-row">
          <button className="btn-ghost" onClick={onClose}>取消</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? '保存中...' : '添加'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function InspirationBoard({ auth, onLogout }: Props) {
  const [inspirations, setInspirations] = useState<Inspiration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [flippedId, setFlippedId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editTags, setEditTags] = useState('');
  const [highlight, setHighlight] = useState<HighlightCardData | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const boardScrollRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    inspirations.forEach((i) => i.tags.forEach((t) => s.add(t)));
    return Array.from(s);
  }, [inspirations]);

  const filtered = useMemo(() => {
    if (!activeTag) return inspirations;
    return inspirations.filter((i) => i.tags.includes(activeTag));
  }, [inspirations, activeTag]);

  const finalList = useMemo(() => {
    if (!highlight) return filtered;
    const list = [...filtered];
    list.splice(highlight.position, 0, {
      id: '__highlight__',
      userId: auth.userId,
      category: 'text',
      content: '',
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    } as any);
    return list;
  }, [filtered, highlight]);

  useEffect(() => {
    apiFetch('/api/inspirations')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setInspirations(d.data || []);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (auth.isFirstLoginToday) {
      const pos = inspirations.length > 0 ? Math.floor(Math.random() * Math.min(inspirations.length, 5)) : 0;
      setHighlight({ index: auth.highlightIndex, position: pos });
    }
  }, [auth.isFirstLoginToday, auth.highlightIndex, inspirations.length]);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - lastScrollY.current) > 5) {
        setScrolled(y > 10);
        lastScrollY.current = y;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleAdd = (insp: Inspiration) => {
    setInspirations((prev) => [insp, ...prev]);
  };

  const handleDelete = (id: string) => async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingIds((prev) => new Set(prev).add(id));
    try {
      await apiFetch(`/api/inspirations/${id}`, { method: 'DELETE' });
      setTimeout(() => {
        setInspirations((prev) => prev.filter((i) => i.id !== id));
        setDeletingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }, 350);
    } catch {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleEdit = (insp: Inspiration) => (e: React.MouseEvent) => {
    e.stopPropagation();
    setFlippedId(insp.id);
    setEditContent(insp.content);
    setEditTags(insp.tags.join(', '));
  };

  const handleSaveEdit = async () => {
    if (!flippedId) return;
    const tags = editTags.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 3);
    try {
      const r = await apiFetch(`/api/inspirations/${flippedId}`, {
        method: 'PUT',
        body: JSON.stringify({ content: editContent, tags }),
      });
      const d = await r.json();
      if (d.success) {
        setInspirations((prev) => prev.map((i) => (i.id === flippedId ? d.data : i)));
      }
    } catch {}
    setFlippedId(null);
  };

  const handleCancelEdit = () => {
    setFlippedId(null);
  };

  const handleTagClick = useCallback((tag: string) => {
    setActiveTag((prev) => (prev === tag ? null : tag));
  }, []);

  const handleWheel = (e: React.WheelEvent) => {
    const el = boardScrollRef.current;
    if (!el) return;
    if (window.innerWidth <= 768) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      el.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  };

  return (
    <div>
      <nav className={`nav-bar ${scrolled ? 'scrolled' : ''}`}>
        <div className="nav-title">灵感切片板</div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button className="add-btn" onClick={() => setShowAdd(true)}>
            <Plus size={20} />
            <span className="btn-text">新建灵感</span>
          </button>
          <button className="logout-btn" onClick={onLogout}>退出</button>
        </div>
      </nav>

      <div className="board-wrap">
        <div style={{ width: '100%' }}>
          {allTags.length > 0 && (
            <div className="filter-bar">
              <span className="filter-label">筛选：</span>
              {allTags.map((tag) => (
                <span
                  key={tag}
                  className={`tag-chip ${activeTag && activeTag !== tag ? 'dimmed' : ''}`}
                  style={{ background: tagColorFor(tag) }}
                  onClick={() => handleTagClick(tag)}
                >
                  #{tag}
                </span>
              ))}
              {activeTag && (
                <button className="filter-clear" onClick={() => setActiveTag(null)}>
                  清除筛选
                </button>
              )}
            </div>
          )}

          <div
            className="board-scroll"
            ref={boardScrollRef}
            onWheel={handleWheel}
          >
            {loading ? (
              <div style={{ padding: '80px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                加载中...
              </div>
            ) : finalList.length === 0 ? (
              <div style={{ padding: '80px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                还没有灵感，点击右上角 + 添加你的第一个灵感吧！
              </div>
            ) : (
              <div className="board-inner">
                {finalList.map((insp, idx) =>
                  (insp as any).id === '__highlight__' ? (
                    <HighlightCard key="__highlight__" index={highlight!.index} />
                  ) : (
                    <InspirationCard
                      key={insp.id}
                      insp={insp}
                      deleting={deletingIds.has(insp.id)}
                      flipped={flippedId === insp.id}
                      onDelete={handleDelete(insp.id)}
                      onEdit={handleEdit(insp)}
                      onSave={handleSaveEdit}
                      onCancelEdit={handleCancelEdit}
                      activeTag={activeTag}
                      onTagClick={handleTagClick}
                      editContent={editContent}
                      setEditContent={setEditContent}
                      editTags={editTags}
                      setEditTags={setEditTags}
                    />
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showAdd && (
        <AddModal onClose={() => setShowAdd(false)} onAdded={handleAdd} />
      )}
    </div>
  );
}
