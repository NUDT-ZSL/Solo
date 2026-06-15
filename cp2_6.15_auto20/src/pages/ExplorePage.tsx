import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGarden } from '@/hooks/useGarden';
import type { Garden } from '@/types';

const avatars = ['👨‍🌾', '👩‍🌾', '🧑‍🌾', '👨‍🔬', '👩‍🎨', '🧙‍♂️', '🧚‍♀️', '🦊'];

interface ExplorePageProps {
  onSelectGarden?: (garden: Garden) => void;
}

const ExplorePage: React.FC<ExplorePageProps> = ({ onSelectGarden }) => {
  const navigate = useNavigate();
  const { gardens, fetchGardens, likeGarden } = useGarden();
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());
  const [showLikeAnim, setShowLikeAnim] = useState<number | null>(null);
  const [messageGardenId, setMessageGardenId] = useState<number | null>(null);
  const [messageText, setMessageText] = useState('');
  const [tempMessages, setTempMessages] = useState<Record<number, string[]>>({});

  useEffect(() => {
    fetchGardens();
  }, []);

  const handleLike = useCallback(async (gardenId: number) => {
    if (likedIds.has(gardenId)) return;
    setShowLikeAnim(gardenId);
    setLikedIds(prev => new Set(prev).add(gardenId));
    await likeGarden(gardenId);
    setTimeout(() => setShowLikeAnim(null), 1000);
  }, [likedIds, likeGarden]);

  const handleSendMessage = useCallback((gardenId: number) => {
    if (!messageText.trim()) return;
    setTempMessages(prev => ({
      ...prev,
      [gardenId]: [...(prev[gardenId] || []), messageText.trim()],
    }));
    setMessageText('');
    setMessageGardenId(null);
  }, [messageText]);

  const sortedGardens = useMemo(() => [...gardens].sort((a, b) => b.likes - a.likes), [gardens]);

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto', animation: 'fadeIn 0.4s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ color: '#fff', fontSize: '24px', marginBottom: '4px' }}>🔍 探索广场</h2>
          <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px' }}>
            发现 {gardens.length} 个精彩植物园，点击进入探索
          </div>
        </div>
        <button
          onClick={() => navigate('/garden')}
          style={{
            padding: '8px 16px',
            borderRadius: '20px',
            background: 'rgba(255,255,255,0.15)',
            color: '#fff',
            fontSize: '14px',
          }}
        >
          🌱 回我的花园
        </button>
      </div>

      <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
        {sortedGardens.map((garden, idx) => (
          <div
            key={garden.id}
            style={{
              width: '100%',
              maxWidth: '280px',
              height: '300px',
              borderRadius: '16px',
              background: 'var(--card-bg)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              justifySelf: 'center',
              cursor: 'pointer',
              transition: 'transform 0.25s ease, box-shadow 0.25s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
              (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
            }}
            onClick={() => {
              if (onSelectGarden) {
                onSelectGarden(garden);
              } else {
                navigate(`/plant/${garden.id}`);
              }
            }}
          >
            <div
              style={{
                padding: '14px',
                borderBottom: '1px solid var(--border-light)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '22px',
                  }}
                >
                  {avatars[idx % avatars.length]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {garden.name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                    🌿 {(garden as any).plants?.length || Math.floor(Math.random() * 30 + 5)} 株植物
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                flex: 1,
                background: `linear-gradient(135deg, #1a3a1a, #3a6a3a)`,
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gridTemplateRows: 'repeat(4, 1fr)',
                gap: '2px',
                padding: '10px',
              }}
            >
              {Array.from({ length: 20 }).map((_, i) => {
                const hasPlant = i < (10 + (garden.id * 3) % 10);
                const emojis = ['🌻', '🌹', '🌵', '🌷', '🌸', '🌿', '🌱', '💮', '🎋', '💜'];
                return (
                  <div
                    key={i}
                    style={{
                      background: hasPlant ? '#ffffff20' : '#00000020',
                      borderRadius: '3px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                    }}
                  >
                    {hasPlant ? emojis[(garden.id + i) % emojis.length] : ''}
                  </div>
                );
              })}
            </div>

            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                padding: '12px',
                display: 'flex',
                gap: '8px',
                borderTop: '1px solid var(--border-light)',
              }}
            >
              <button
                onClick={() => handleLike(garden.id)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '20px',
                  background: likedIds.has(garden.id) ? '#ffe5ea' : 'var(--progress-bg)',
                  color: likedIds.has(garden.id) ? '#ff4757' : 'var(--text-secondary)',
                  fontSize: '13px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  position: 'relative',
                }}
              >
                <span style={{ fontSize: '16px' }}>{likedIds.has(garden.id) ? '❤️' : '🤍'}</span>
                <span>{garden.likes}</span>
                {showLikeAnim === garden.id && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-10px',
                      right: '30%',
                      color: '#ff4757',
                      fontWeight: 'bold',
                      fontSize: '14px',
                      animation: 'likeRise 1s ease-out forwards',
                    }}
                  >
                    +1
                  </span>
                )}
              </button>
              <button
                onClick={() => setMessageGardenId(messageGardenId === garden.id ? null : garden.id)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '20px',
                  background: messageGardenId === garden.id ? '#e8f4e8' : 'var(--progress-bg)',
                  color: messageGardenId === garden.id ? 'var(--accent-green)' : 'var(--text-secondary)',
                  fontSize: '13px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                }}
              >
                💬 留言
              </button>
            </div>

            {messageGardenId === garden.id && (
              <div
                style={{
                  padding: '12px',
                  borderTop: '1px solid var(--border-light)',
                  background: 'var(--card-bg)',
                }}
              >
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="写下你的留言..."
                  rows={2}
                  style={{
                    width: '80%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-light)',
                    fontSize: '13px',
                    resize: 'none',
                    marginRight: '8px',
                    background: 'var(--card-bg)',
                    color: 'var(--text-primary)',
                  }}
                />
                <button
                  onClick={() => handleSendMessage(garden.id)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: '500',
                    verticalAlign: 'top',
                  }}
                >
                  发送
                </button>
                {tempMessages[garden.id]?.length > 0 && (
                  <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--accent-green)' }}>
                    ✓ 留言发送成功
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {gardens.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(255,255,255,0.7)' }}>
          暂无植物园数据
        </div>
      )}
    </div>
  );
};

export default ExplorePage;
