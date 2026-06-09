import { useState, useEffect, useMemo } from 'react';
import { Routes, Route } from 'react-router-dom';
import Ocean from './components/Ocean';
import BottleModal from './components/BottleModal';
import { api, wsManager, type Bottle, type Emotion } from './utils/api';

const EMOTION_LABELS: Record<Emotion, { label: string; color: string }> = {
  happy: { label: '开心', color: '#FFD93D' },
  sad: { label: '忧郁', color: '#9B59B6' },
  calm: { label: '平静', color: '#3498DB' },
  wild: { label: '狂想', color: '#FF6B35' },
};

export default function App() {
  const [bottles, setBottles] = useState<Bottle[]>([]);
  const [selectedBottle, setSelectedBottle] = useState<Bottle | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newEmotion, setNewEmotion] = useState<Emotion>('calm');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchEmotion, setSearchEmotion] = useState<Emotion | 'all'>('all');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [newlyCreatedId, setNewlyCreatedId] = useState<string | null>(null);

  useEffect(() => {
    api.getBottles().then((data) => {
      setBottles(data);
      if (data.length === 0) {
        seedDemoBottles();
      }
    });

    const cleanup = wsManager.onNewBottle((bottle) => {
      setBottles((prev) => {
        const updated = [bottle, ...prev];
        return updated.slice(0, 100);
      });
    });

    return cleanup;
  }, []);

  const seedDemoBottles = async () => {
    const demos: Array<{ content: string; emotion: Emotion }> = [
      { content: '今夜星空格外璀璨，想起童年追逐萤火虫的夏天。', emotion: 'calm' },
      { content: '明天的演讲有点紧张，但我准备好了！', emotion: 'happy' },
      { content: '有些话只能写在漂流瓶里，让大海替我保守秘密。', emotion: 'sad' },
      { content: '如果我能拥有一双翅膀，我要飞去彩虹的尽头。', emotion: 'wild' },
      { content: '海边的风，带走了我的思念，也带来了远方的气息。', emotion: 'calm' },
      { content: '今天收到了一封久违的来信，眼眶瞬间湿润了。', emotion: 'sad' },
      { content: '人生就像一场漂流，我们都是彼此岸边的风景。', emotion: 'calm' },
      { content: '梦想是不会发光的，发光的是追梦的你自己！', emotion: 'happy' },
      { content: '如果时间能倒流，我想对十年前的自己说一声抱歉。', emotion: 'sad' },
      { content: '在这个深夜，让文字化作星辰，点亮每个孤独的灵魂。', emotion: 'wild' },
      { content: '月亮不睡我不睡，我是秃头小宝贝～', emotion: 'happy' },
      { content: '愿所有漂流瓶都能找到归岸，愿所有等待都不被辜负。', emotion: 'calm' },
      { content: '把烦恼扔进大海，让浪花替我洗刷一切。', emotion: 'wild' },
      { content: '今天收到了offer！三年的努力终于有了回报！', emotion: 'happy' },
      { content: '在无人知晓的角落，我偷偷爱着这个世界。', emotion: 'sad' },
      { content: '想象力是人类最伟大的超能力。', emotion: 'wild' },
      { content: '凌晨三点的城市，只剩下路灯和我作伴。', emotion: 'sad' },
      { content: '希望漂流瓶里的文字，能温暖到某个陌生人。', emotion: 'happy' },
      { content: '海浪声是最好的催眠曲。', emotion: 'calm' },
      { content: '如果我是一只海鸥，就永远在自由的蓝天上翱翔。', emotion: 'wild' },
    ];

    for (const demo of demos) {
      try {
        const b = await api.createBottle(demo.content, demo.emotion);
        setBottles((prev) => [b, ...prev].slice(0, 100));
        const relays = [
          { content: '感同身受，写下这句话时我也在看海。', emotion: 'calm' as Emotion },
          { content: '抱抱你，陌生人。', emotion: 'happy' as Emotion },
        ];
        if (Math.random() > 0.5) {
          const r = relays[Math.floor(Math.random() * relays.length)];
          await api.addRelay(b.id, r.content, r.emotion);
        }
      } catch {}
    }
  };

  const filteredBottles = useMemo(() => {
    if (!searchQuery && searchEmotion === 'all') return bottles;
    const q = searchQuery.toLowerCase();
    return bottles.filter((b) => {
      const matchEmotion = searchEmotion === 'all' || b.emotion === searchEmotion;
      const matchQuery =
        !q ||
        b.content.toLowerCase().includes(q) ||
        b.relays.some((r) => r.content.toLowerCase().includes(q));
      return matchEmotion && matchQuery;
    });
  }, [bottles, searchQuery, searchEmotion]);

  const handleBottleClick = (bottle: Bottle) => {
    setSelectedBottle(bottle);
  };

  const handleCloseModal = () => {
    setSelectedBottle(null);
    setShowCreateModal(false);
    setNewContent('');
    setNewEmotion('calm');
  };

  const handleSubmitBottle = async () => {
    if (!newContent.trim()) return;
    try {
      const bottle = await api.createBottle(newContent.trim(), newEmotion);
      setNewlyCreatedId(bottle.id);
      setTimeout(() => setNewlyCreatedId(null), 500);
      setBottles((prev) => [bottle, ...prev].slice(0, 100));
      wsManager.broadcastNewBottle(bottle);
      handleCloseModal();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddRelay = async (bottleId: string, content: string, emotion: Emotion) => {
    try {
      const updated = await api.addRelay(bottleId, content, emotion);
      setBottles((prev) => prev.map((b) => (b.id === bottleId ? updated : b)));
      setSelectedBottle(updated);
      wsManager.broadcastNewRelay(bottleId, updated.relays[updated.relays.length - 1]);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background:
          'linear-gradient(180deg, #0a1628 0%, #1a2a4a 50%, #2a3a5a 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 星星背景 */}
      <Stars />

      {/* 搜索框 */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 20,
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          width: '90%',
          maxWidth: 600,
        }}
      >
        <input
          placeholder="搜索漂流瓶中的关键词..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (e.target.value) setShowSearchResults(true);
          }}
          style={{
            flex: 1,
            padding: '12px 20px',
            borderRadius: 30,
            border: '1px solid rgba(100, 180, 255, 0.3)',
            background: 'rgba(26, 42, 74, 0.7)',
            backdropFilter: 'blur(10px)',
            color: '#e0f0ff',
            fontSize: 14,
            outline: 'none',
            transition: 'all 0.2s',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = 'rgba(100, 180, 255, 0.6)';
            e.target.style.boxShadow = '0 0 20px rgba(100, 180, 255, 0.2)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'rgba(100, 180, 255, 0.3)';
            e.target.style.boxShadow = 'none';
          }}
        />
        <select
          value={searchEmotion}
          onChange={(e) => {
            setSearchEmotion(e.target.value as Emotion | 'all');
            if (e.target.value !== 'all') setShowSearchResults(true);
          }}
          style={{
            padding: '12px 16px',
            borderRadius: 30,
            border: '1px solid rgba(100, 180, 255, 0.3)',
            background: 'rgba(26, 42, 74, 0.7)',
            backdropFilter: 'blur(10px)',
            color: '#e0f0ff',
            fontSize: 14,
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="all" style={{ background: '#1a2a4a' }}>
            全部情绪
          </option>
          {(Object.keys(EMOTION_LABELS) as Emotion[]).map((e) => (
            <option key={e} value={e} style={{ background: '#1a2a4a' }}>
              {EMOTION_LABELS[e].label}
            </option>
          ))}
        </select>
      </div>

      {/* 搜索结果 */}
      {showSearchResults && (searchQuery || searchEmotion !== 'all') && (
        <div
          style={{
            position: 'absolute',
            top: 80,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 25,
            width: '90%',
            maxWidth: 600,
            maxHeight: '60vh',
            overflowY: 'auto',
            background: 'rgba(26, 42, 74, 0.92)',
            backdropFilter: 'blur(15px)',
            borderRadius: 16,
            border: '1px solid rgba(100, 180, 255, 0.2)',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
            }}
          >
            <span style={{ color: '#e0f0ff', fontWeight: 600 }}>
              找到 {filteredBottles.length} 个漂流瓶
            </span>
            <button
              onClick={() => {
                setShowSearchResults(false);
                setSearchQuery('');
                setSearchEmotion('all');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#8ab4d8',
                cursor: 'pointer',
                fontSize: 18,
              }}
            >
              ✕
            </button>
          </div>
          {filteredBottles.map((b, i) => (
            <div
              key={b.id}
              onClick={() => {
                setSelectedBottle(b);
                setShowSearchResults(false);
              }}
              style={{
                padding: 14,
                borderRadius: 12,
                borderLeft: `4px solid ${EMOTION_LABELS[b.emotion].color}`,
                background: 'rgba(42, 58, 90, 0.5)',
                cursor: 'pointer',
                animation: `fadeIn 0.3s ease ${i * 0.03}s both`,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(42, 58, 90, 0.8)';
                e.currentTarget.style.transform = 'translateX(4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(42, 58, 90, 0.5)';
                e.currentTarget.style.transform = 'translateX(0)';
              }}
            >
              <div
                style={{
                  color: '#e0f0ff',
                  fontSize: 14,
                  marginBottom: 6,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {b.content}
              </div>
              <div style={{ display: 'flex', gap: 10, fontSize: 12, color: '#8ab4d8' }}>
                <span
                  style={{
                    border: `1px solid ${EMOTION_LABELS[b.emotion].color}`,
                    padding: '2px 8px',
                    borderRadius: 10,
                    color: EMOTION_LABELS[b.emotion].color,
                    boxShadow: `0 0 8px ${EMOTION_LABELS[b.emotion].color}55`,
                  }}
                >
                  {EMOTION_LABELS[b.emotion].label}
                </span>
                <span>接力 {b.relays.length} 次</span>
              </div>
            </div>
          ))}
          {filteredBottles.length === 0 && (
            <div style={{ color: '#8ab4d8', textAlign: 'center', padding: 20 }}>
              没有找到匹配的漂流瓶
            </div>
          )}
        </div>
      )}

      <Routes>
        <Route
          path="/"
          element={
            <Ocean
              bottles={bottles}
              onBottleClick={handleBottleClick}
              newlyCreatedId={newlyCreatedId}
            />
          }
        />
        <Route
          path="/bottle/:id"
          element={
            <Ocean
              bottles={bottles}
              onBottleClick={handleBottleClick}
              newlyCreatedId={newlyCreatedId}
            />
          }
        />
      </Routes>

      {/* 投放漂流瓶按钮 */}
      <button
        onClick={() => setShowCreateModal(true)}
        style={{
          position: 'absolute',
          bottom: 40,
          right: 40,
          zIndex: 30,
          width: 80,
          height: 80,
          borderRadius: '50%',
          border: '2px solid rgba(100, 200, 255, 0.4)',
          background:
            'radial-gradient(circle, rgba(52, 152, 219, 0.3) 0%, rgba(10, 22, 40, 0.8) 100%)',
          backdropFilter: 'blur(10px)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 36,
          transition: 'all 0.2s',
          boxShadow: '0 0 30px rgba(52, 152, 219, 0.3)',
          animation: 'float 3s ease-in-out infinite',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.boxShadow = '0 0 40px rgba(52, 152, 219, 0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.transform = 'scale(0.95)';
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
        }}
      >
        🍾
      </button>

      {/* 创建漂流瓶模态框 */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(5px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            animation: 'fadeIn 0.3s ease',
          }}
          onClick={handleCloseModal}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 460,
              background:
                'linear-gradient(135deg, rgba(26, 42, 74, 0.95) 0%, rgba(42, 58, 90, 0.95) 100%)',
              borderRadius: 24,
              border: '1px solid rgba(100, 180, 255, 0.3)',
              padding: 32,
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
              animation: 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              style={{
                color: '#e0f0ff',
                margin: 0,
                marginBottom: 20,
                fontSize: 22,
                textAlign: 'center',
              }}
            >
              🌊 投放你的漂流瓶
            </h2>
            <textarea
              maxLength={140}
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="写下此刻的心情或灵感（140字以内）..."
              style={{
                width: '100%',
                minHeight: 120,
                padding: 16,
                borderRadius: 16,
                border: '1px solid rgba(100, 180, 255, 0.3)',
                background: 'rgba(10, 22, 40, 0.6)',
                color: '#e0f0ff',
                fontSize: 15,
                resize: 'none',
                outline: 'none',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
                lineHeight: 1.6,
                transition: 'all 0.2s',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(100, 180, 255, 0.6)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(100, 180, 255, 0.3)';
              }}
            />
            <div
              style={{
                textAlign: 'right',
                color: newContent.length >= 140 ? '#FF6B35' : '#8ab4d8',
                fontSize: 12,
                marginTop: 6,
                marginBottom: 16,
              }}
            >
              {newContent.length}/140
            </div>

            <div style={{ marginBottom: 24 }}>
              <div
                style={{
                  color: '#8ab4d8',
                  fontSize: 13,
                  marginBottom: 10,
                }}
              >
                选择情绪标签
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {(Object.keys(EMOTION_LABELS) as Emotion[]).map((em) => {
                  const active = newEmotion === em;
                  return (
                    <button
                      key={em}
                      onClick={() => setNewEmotion(em)}
                      style={{
                        flex: 1,
                        minWidth: 80,
                        padding: '10px 14px',
                        borderRadius: 20,
                        border: `2px solid ${EMOTION_LABELS[em].color}${
                          active ? '' : '55'
                        }`,
                        background: active
                          ? `${EMOTION_LABELS[em].color}22`
                          : 'transparent',
                        color: EMOTION_LABELS[em].color,
                        fontSize: 14,
                        fontWeight: active ? 600 : 400,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: active
                          ? `0 0 15px ${EMOTION_LABELS[em].color}55`
                          : 'none',
                      }}
                      onMouseDown={(e) => {
                        e.currentTarget.style.transform = 'scale(0.96)';
                      }}
                      onMouseUp={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      {EMOTION_LABELS[em].label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={handleCloseModal}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  borderRadius: 16,
                  border: '1px solid rgba(100, 180, 255, 0.3)',
                  background: 'transparent',
                  color: '#8ab4d8',
                  fontSize: 15,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'scale(0.97)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                取消
              </button>
              <button
                onClick={handleSubmitBottle}
                disabled={!newContent.trim()}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  borderRadius: 16,
                  border: 'none',
                  background: newContent.trim()
                    ? 'linear-gradient(135deg, #3498DB 0%, #9B59B6 100%)'
                    : 'rgba(100, 100, 100, 0.3)',
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: newContent.trim() ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s',
                  boxShadow: newContent.trim()
                    ? '0 4px 20px rgba(52, 152, 219, 0.4)'
                    : 'none',
                }}
                onMouseDown={(e) => {
                  if (newContent.trim())
                    e.currentTarget.style.transform = 'scale(0.97)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                投放 🌊
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 查看漂流瓶详情模态框 */}
      {selectedBottle && (
        <BottleModal
          bottle={selectedBottle}
          emotionLabels={EMOTION_LABELS}
          onClose={handleCloseModal}
          onAddRelay={handleAddRelay}
        />
      )}

      {/* CSS动画 */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          0% { opacity: 0; transform: scale(0.85); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @media (max-width: 768px) {
          .ocean-wave-canvas {
            height: 150px !important;
          }
        }
      `}</style>
    </div>
  );
}

function Stars() {
  const stars = useMemo(() => {
    return Array.from({ length: 80 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 40,
      size: Math.random() * 2 + 0.5,
      delay: Math.random() * 4,
      duration: 2 + Math.random() * 3,
    }));
  }, []);

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1 }}>
      {stars.map((s) => (
        <div
          key={s.id}
          style={{
            position: 'absolute',
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            borderRadius: '50%',
            background: '#fff',
            opacity: 0.8,
            animation: `twinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.3); }
        }
      `}</style>
      {/* 月亮 */}
      <div
        style={{
          position: 'absolute',
          top: 60,
          right: '10%',
          width: 60,
          height: 60,
          borderRadius: '50%',
          background:
            'radial-gradient(circle at 35% 35%, #fffbe6 0%, #f0e6c8 50%, #d4c89a 100%)',
          boxShadow:
            '0 0 60px rgba(255, 251, 230, 0.4), 0 0 120px rgba(255, 251, 230, 0.2)',
        }}
      />
    </div>
  );
}
