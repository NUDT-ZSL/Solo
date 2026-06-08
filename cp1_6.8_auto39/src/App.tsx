import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StarField } from './StarField';
import InspirationCard from './InspirationCard';

interface InspirationData {
  id: string;
  content: string;
  emoji: string;
  sentiment: string;
  created_at: string;
  resonance_count: number;
  has_resonance?: boolean;
  user_id: string;
}

const EMOJI_OPTIONS = ['✨', '💡', '🌙', '🔥', '💫', '🌊', '🌸', '🎯', '❤️', '🌈'];
const USER_ID = `user_${Math.random().toString(36).slice(2, 8)}`;
const API_BASE = '/api';

type Page = 'starmap' | 'mystars';

const App: React.FC = () => {
  const [page, setPage] = useState<Page>('starmap');
  const [inspirations, setInspirations] = useState<InspirationData[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [editorContent, setEditorContent] = useState('');
  const [editorEmoji, setEditorEmoji] = useState('✨');
  const [selectedStar, setSelectedStar] = useState<InspirationData | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{ data: InspirationData; x: number; y: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingStar, setEditingStar] = useState<InspirationData | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editEmoji, setEditEmoji] = useState('✨');

  const starFieldRef = useRef<StarField | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (canvasRef.current && !starFieldRef.current) {
      starFieldRef.current = new StarField(
        canvasRef.current,
        handleHover,
        handleStarClick
      );
      starFieldRef.current.start();
    }

    return () => {
      if (starFieldRef.current) {
        starFieldRef.current.stop();
        starFieldRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    fetchInspirations();
  }, []);

  const fetchInspirations = async () => {
    try {
      const res = await fetch(`${API_BASE}/inspirations`);
      if (res.ok) {
        const data: InspirationData[] = await res.json();
        setInspirations(data);
        syncStarsToField(data);
      }
    } catch {
      const mockData = generateMockData();
      setInspirations(mockData);
      syncStarsToField(mockData);
    }
  };

  const generateMockData = (): InspirationData[] => {
    const sentiments = ['positive', 'neutral', 'negative'];
    const contents = [
      '今天的日落好美，感觉世界都温柔了',
      '突然想到了一个绝妙的创意',
      '在雨中散步，感觉很宁静',
      '代码终于跑通了，太开心了',
      '有些迷茫，但还在前行',
      '遇见了老朋友，温暖如初',
    ];
    return contents.map((content, i) => ({
      id: `mock_${i}_${Date.now()}`,
      content,
      emoji: EMOJI_OPTIONS[i % EMOJI_OPTIONS.length],
      sentiment: sentiments[i % 3],
      created_at: new Date(Date.now() - i * 3600000).toISOString(),
      resonance_count: Math.floor(Math.random() * 5),
      user_id: i < 3 ? USER_ID : 'other_user',
    }));
  };

  const syncStarsToField = (data: InspirationData[]) => {
    if (!starFieldRef.current) return;

    const existingIds = new Set<string>();
    data.forEach((item) => {
      existingIds.add(item.id);
      if (!starFieldRef.current!.getStarData(item.id)) {
        starFieldRef.current.addStar(item);
      }
    });
  };

  const handleHover = useCallback((data: InspirationData | null, x: number, y: number) => {
    if (data) {
      setHoverInfo({ data, x, y });
    } else {
      setHoverInfo(null);
    }
  }, []);

  const handleStarClick = useCallback((data: InspirationData) => {
    setSelectedStar(data);
    if (starFieldRef.current) {
      starFieldRef.current.triggerBurst(data.id);
    }
  }, []);

  const handleSubmit = async () => {
    if (!editorContent.trim() || submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch(`${API_BASE}/inspirations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: editorContent.trim(),
          emoji: editorEmoji,
          user_id: USER_ID,
        }),
      });

      if (res.ok) {
        const newInspiration: InspirationData = await res.json();
        setInspirations((prev) => [...prev, newInspiration]);
        if (starFieldRef.current) {
          starFieldRef.current.addStar(newInspiration);
        }
      } else {
        const sentiment = simpleLocalSentiment(editorContent);
        const newInspiration: InspirationData = {
          id: `local_${Date.now()}`,
          content: editorContent.trim(),
          emoji: editorEmoji,
          sentiment,
          created_at: new Date().toISOString(),
          resonance_count: 0,
          user_id: USER_ID,
        };
        setInspirations((prev) => [...prev, newInspiration]);
        if (starFieldRef.current) {
          starFieldRef.current.addStar(newInspiration);
        }
      }
    } catch {
      const sentiment = simpleLocalSentiment(editorContent);
      const newInspiration: InspirationData = {
        id: `local_${Date.now()}`,
        content: editorContent.trim(),
        emoji: editorEmoji,
        sentiment,
        created_at: new Date().toISOString(),
        resonance_count: 0,
        user_id: USER_ID,
      };
      setInspirations((prev) => [...prev, newInspiration]);
      if (starFieldRef.current) {
        starFieldRef.current.addStar(newInspiration);
      }
    }

    setEditorContent('');
    setEditorEmoji('✨');
    setShowEditor(false);
    setSubmitting(false);
  };

  const handleResonance = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/resonance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inspiration_id: id, user_id: USER_ID }),
      });

      if (res.ok) {
        const updated: InspirationData = await res.json();
        setInspirations((prev) =>
          prev.map((ins) => (ins.id === id ? { ...ins, resonance_count: updated.resonance_count, has_resonance: true } : ins))
        );
      }
    } catch {
      setInspirations((prev) =>
        prev.map((ins) =>
          ins.id === id
            ? { ...ins, resonance_count: ins.resonance_count + 1, has_resonance: true }
            : ins
        )
      );
    }

    if (starFieldRef.current) {
      starFieldRef.current.triggerResonance(id);
      setTimeout(() => {
        const star = inspirations.find((ins) => ins.id === id);
        if (star && starFieldRef.current) {
          starFieldRef.current.updateStarColor(id, star.sentiment, true);
        }
      }, 1200);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`${API_BASE}/inspirations/${id}?user_id=${USER_ID}`, {
        method: 'DELETE',
      });
    } catch {}

    setInspirations((prev) => prev.filter((ins) => ins.id !== id));
    if (starFieldRef.current) {
      starFieldRef.current.removeStar(id);
    }
    setEditingStar(null);
  };

  const handleEdit = async () => {
    if (!editingStar || !editContent.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/inspirations/${editingStar.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: editContent.trim(),
          emoji: editEmoji,
          user_id: USER_ID,
        }),
      });

      if (res.ok) {
        const updated: InspirationData = await res.json();
        setInspirations((prev) =>
          prev.map((ins) => (ins.id === editingStar.id ? updated : ins))
        );
        if (starFieldRef.current) {
          starFieldRef.current.removeStar(editingStar.id);
          starFieldRef.current.addStar(updated);
        }
      }
    } catch {
      const sentiment = simpleLocalSentiment(editContent);
      const updated: InspirationData = {
        ...editingStar,
        content: editContent.trim(),
        emoji: editEmoji,
        sentiment,
      };
      setInspirations((prev) =>
        prev.map((ins) => (ins.id === editingStar.id ? updated : ins))
      );
      if (starFieldRef.current) {
        starFieldRef.current.removeStar(editingStar.id);
        starFieldRef.current.addStar(updated);
      }
    }

    setEditingStar(null);
  };

  const openEditModal = (star: InspirationData) => {
    setEditingStar(star);
    setEditContent(star.content);
    setEditEmoji(star.emoji);
  };

  const myStars = inspirations.filter((ins) => ins.user_id === USER_ID);

  const formatTime = (isoStr: string) => {
    try {
      return new Date(isoStr).toLocaleString('zh-CN', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="app-container">
      <div ref={canvasRef} className="star-canvas" style={{
        opacity: page === 'starmap' ? 1 : 0.3,
        transition: 'opacity 0.3s ease',
      }} />

      {page === 'starmap' && (
        <>
          <button className="fab" onClick={() => setShowEditor(true)}>+</button>

          {hoverInfo && (
            <div className="hover-tooltip" style={{
              left: hoverInfo.x + 12,
              top: hoverInfo.y - 40,
            }}>
              <span className="hover-tooltip-emoji">{hoverInfo.data.emoji}</span>
              {hoverInfo.data.content.slice(0, 12)}...
            </div>
          )}

          {selectedStar && (
            <InspirationCard
              data={selectedStar}
              onResonance={handleResonance}
              onClose={() => setSelectedStar(null)}
            />
          )}

          {showEditor && (
            <div className="modal-overlay" onClick={(e) => {
              if (e.target === e.currentTarget) setShowEditor(false);
            }}>
              <div className="editor-modal">
                <div className="editor-title">写下你的灵感 ✧</div>
                <textarea
                  className="editor-textarea"
                  placeholder="在这里写下你的灵感火花..."
                  maxLength={200}
                  value={editorContent}
                  onChange={(e) => setEditorContent(e.target.value)}
                  autoFocus
                />
                <div className="editor-footer">
                  <div className="emoji-picker">
                    {EMOJI_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        className={`emoji-btn ${editorEmoji === emoji ? 'selected' : ''}`}
                        onClick={() => setEditorEmoji(emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  <span className="char-count">{editorContent.length}/200</span>
                </div>
                <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button
                    className="submit-btn"
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid var(--glass-border)' }}
                    onClick={() => setShowEditor(false)}
                  >
                    取消
                  </button>
                  <button
                    className="submit-btn"
                    onClick={handleSubmit}
                    disabled={!editorContent.trim() || submitting}
                  >
                    {submitting ? '发射中...' : '发射星尘 ✧'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {page === 'mystars' && (
        <div className="my-stars-page">
          <h1 className="my-stars-title">我的星群 ✧</h1>
          {myStars.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🌌</div>
              <div className="empty-state-text">你还没有星星，去发射第一颗灵感吧</div>
            </div>
          ) : (
            <div className="stars-grid">
              {myStars.map((star) => (
                <div key={star.id} className="star-card" onClick={() => openEditModal(star)}>
                  <div className="star-card-header">
                    <span className="star-card-emoji">{star.emoji}</span>
                    <span className={`star-card-sentiment sentiment-${star.sentiment}`}>
                      {star.sentiment === 'positive' ? '积极' : star.sentiment === 'negative' ? '消极' : '中性'}
                    </span>
                  </div>
                  <div className="star-card-content">{star.content}</div>
                  <div className="star-card-meta">
                    <span>{formatTime(star.created_at)}</span>
                    <span>♥ {star.resonance_count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {editingStar && (
            <div className="modal-overlay" onClick={(e) => {
              if (e.target === e.currentTarget) setEditingStar(null);
            }}>
              <div className="editor-modal">
                <div className="editor-title">编辑星星 ✧</div>
                <textarea
                  className="editor-textarea"
                  maxLength={200}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                />
                <div className="editor-footer">
                  <div className="emoji-picker">
                    {EMOJI_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        className={`emoji-btn ${editEmoji === emoji ? 'selected' : ''}`}
                        onClick={() => setEditEmoji(emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  <span className="char-count">{editContent.length}/200</span>
                </div>
                <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
                  <button
                    className="card-action-btn delete"
                    style={{ flex: 1, padding: '10px 16px', fontSize: 14 }}
                    onClick={() => handleDelete(editingStar.id)}
                  >
                    删除
                  </button>
                  <button
                    className="submit-btn"
                    style={{ flex: 2 }}
                    onClick={handleEdit}
                  >
                    保存
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <nav className="bottom-nav">
        <button
          className={`nav-item ${page === 'starmap' ? 'active' : ''}`}
          onClick={() => setPage('starmap')}
        >
          <span className="nav-icon">🌌</span>
          <span>星图浏览</span>
        </button>
        <button
          className={`nav-item ${page === 'mystars' ? 'active' : ''}`}
          onClick={() => setPage('mystars')}
        >
          <span className="nav-icon">⭐</span>
          <span>我的星群</span>
        </button>
      </nav>
    </div>
  );
};

function simpleLocalSentiment(text: string): string {
  const positiveWords = ['开心', '快乐', '幸福', '美好', '喜欢', '爱', '温暖', '阳光', '希望', '梦想', '棒', '好', '美', '成功', '自由', '勇敢', 'happy', 'love', 'hope', 'joy'];
  const negativeWords = ['难过', '伤心', '痛苦', '失望', '孤独', '绝望', '悲伤', '焦虑', '恐惧', '愤怒', '累', '烦', '哭', '痛', '苦', 'sad', 'pain', 'hurt', 'angry', 'fear'];

  let pos = 0;
  let neg = 0;
  for (const w of positiveWords) { if (text.includes(w)) pos++; }
  for (const w of negativeWords) { if (text.includes(w)) neg++; }

  if (pos > neg) return 'positive';
  if (neg > pos) return 'negative';
  return 'neutral';
}

export default App;
