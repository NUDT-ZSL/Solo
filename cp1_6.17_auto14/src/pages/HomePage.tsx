import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import MixCard from '../components/MixCard';
import type { Mixtape } from '../types';

const CARD_WIDTH = 280;
const CARD_GAP = 20;
const CARD_BASE_HEIGHT = 380;

const HomePage: React.FC = () => {
  const [mixtapes, setMixtapes] = useState<Mixtape[]>([]);
  const [stickerCounts, setStickerCounts] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const fetchMixtapes = async () => {
      try {
        const response = await fetch('/api/mixtapes');
        if (response.ok) {
          const data: Mixtape[] = await response.json();
          setMixtapes(data);

          const counts: Record<string, number> = {};
          for (const mixtape of data) {
            try {
              const detailResponse = await fetch(`/api/mixtapes/${mixtape.id}`);
              if (detailResponse.ok) {
                const detail = await detailResponse.json();
                counts[mixtape.id] = detail.stickers?.reduce((acc: number, s: { count: number }) => acc + s.count, 0) || 0;
              }
            } catch (e) {
              counts[mixtape.id] = 0;
            }
          }
          setStickerCounts(counts);
        }
      } catch (error) {
        console.error('Failed to fetch mixtapes:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMixtapes();
  }, []);

  const filteredMixtapes = useMemo(() => {
    if (!debouncedQuery.trim()) return mixtapes;
    const query = debouncedQuery.toLowerCase();
    return mixtapes.filter(
      m => m.title.toLowerCase().includes(query) || m.description.toLowerCase().includes(query)
    );
  }, [mixtapes, debouncedQuery]);

  const columnCount = useMemo(() => {
    if (containerWidth === 0) return 4;
    return Math.max(1, Math.floor((containerWidth + CARD_GAP) / (CARD_WIDTH + CARD_GAP)));
  }, [containerWidth]);

  const cardPositions = useMemo(() => {
    const positions: Array<{ top: number; left: number; height: number }> = [];
    const columnHeights = new Array(columnCount).fill(0);

    filteredMixtapes.forEach((mixtape) => {
      const shortestColumn = columnHeights.indexOf(Math.min(...columnHeights));
      const descriptionLines = Math.min(3, Math.ceil(mixtape.description.length / 30));
      const cardHeight = CARD_BASE_HEIGHT + (descriptionLines - 2) * 20;

      positions.push({
        top: columnHeights[shortestColumn],
        left: shortestColumn * (CARD_WIDTH + CARD_GAP),
        height: cardHeight
      });

      columnHeights[shortestColumn] += cardHeight + CARD_GAP;
    });

    return { positions, totalHeight: Math.max(...columnHeights, 0) };
  }, [filteredMixtapes, columnCount]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      animation: 'fadeIn 0.5s ease'
    }}>
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(15, 15, 15, 0.95)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '24px'
        }}>
          <Link to="/" style={{
            fontSize: '24px',
            fontWeight: 700,
            color: 'var(--accent)',
            flexShrink: 0
          }}>
            🎵 混音带工坊
          </Link>

          <div style={{
            flex: 1,
            position: 'relative',
            maxWidth: '500px'
          }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索混音带..."
              style={{
                width: '100%',
                padding: '12px 16px 12px 44px',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--border-radius)',
                fontSize: '14px',
                transition: 'all var(--transition-fast)'
              }}
              onFocus={(e) => {
                e.currentTarget.style.boxShadow = '0 0 0 2px var(--accent)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            <span style={{
              position: 'absolute',
              left: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '16px'
            }}>
              🔍
            </span>
          </div>

          <Link to="/create" style={{
            padding: '12px 24px',
            background: 'var(--accent)',
            borderRadius: 'var(--border-radius)',
            fontSize: '14px',
            fontWeight: 500,
            color: '#fff',
            flexShrink: 0,
            transition: 'all var(--transition-fast)'
          }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(255, 107, 107, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            + 创建混音带
          </Link>
        </div>
      </div>

      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '32px 24px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '4px' }}>
              {debouncedQuery ? `搜索结果: "${debouncedQuery}"` : '混音带广场'}
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              共 {filteredMixtapes.length} 个混音带
            </p>
          </div>
        </div>

        {isLoading ? (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '400px',
            fontSize: '16px',
            color: 'var(--text-secondary)'
          }}>
            <span style={{ animation: 'pulse 1s infinite' }}>加载中...</span>
          </div>
        ) : filteredMixtapes.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '80px 20px',
            color: 'var(--text-secondary)'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎧</div>
            <p style={{ fontSize: '18px', marginBottom: '8px' }}>
              {debouncedQuery ? '没有找到匹配的混音带' : '还没有混音带'}
            </p>
            <p style={{ fontSize: '14px' }}>
              {debouncedQuery ? '试试其他关键词吧' : '点击上方按钮创建第一个混音带'}
            </p>
          </div>
        ) : (
          <div
            ref={containerRef}
            style={{
              position: 'relative',
              width: '100%',
              height: cardPositions.totalHeight,
              margin: '0 auto',
              maxWidth: columnCount * (CARD_WIDTH + CARD_GAP) - CARD_GAP
            }}
          >
            {filteredMixtapes.map((mixtape, index) => {
              const pos = cardPositions.positions[index];
              if (!pos) return null;
              return (
                <div
                  key={mixtape.id}
                  style={{
                    position: 'absolute',
                    top: pos.top,
                    left: pos.left,
                    width: CARD_WIDTH,
                    animation: `fadeIn 0.3s ease ${index * 0.05}s both`
                  }}
                >
                  <MixCard
                    mixtape={mixtape}
                    stickerCount={stickerCounts[mixtape.id] || 0}
                    searchQuery={debouncedQuery}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <footer style={{
        textAlign: 'center',
        padding: '32px 20px',
        color: 'var(--text-secondary)',
        fontSize: '12px',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        <p>混音带工坊 © 2024 · 让音乐分享更有温度</p>
      </footer>
    </div>
  );
};

export default HomePage;
