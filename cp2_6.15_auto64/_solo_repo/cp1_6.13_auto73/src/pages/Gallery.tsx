import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getPhotos,
  getHotPhotos,
  Photo,
  categoryColors,
  categoryNames,
  getRatingColor,
  getStarColor
} from '../apiClient';

const CARD_WIDTH = 320;
const CARD_GAP = 24;
const CARD_HEIGHT_ESTIMATE = 380;
const LOAD_THRESHOLD = 500;
const BUFFER_HEIGHT = 400;

const Gallery: React.FC = () => {
  const navigate = useNavigate();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [hotPhotos, setHotPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('all');
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState<'newest' | 'hottest' | 'topRated'>('newest');
  const [showRatingTooltip, setShowRatingTooltip] = useState(false);

  const galleryRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  const columnCount = useMemo(() => {
    if (containerWidth >= 1200) return 3;
    if (containerWidth >= 768) return 2;
    return 1;
  }, [containerWidth]);

  const loadPhotos = useCallback(async (reset: boolean = false) => {
    if (loading) return;
    if (reset) {
      setLoading(true);
    } else if (!hasMore) {
      return;
    }

    try {
      const currentPage = reset ? 1 : page;
      const response = await getPhotos({
        page: currentPage,
        limit: 10,
        category,
        minRating,
        sortBy
      });

      if (reset) {
        setPhotos(response.photos);
        setPage(2);
      } else {
        setPhotos(prev => [...prev, ...response.photos]);
        setPage(prev => prev + 1);
      }
      setHasMore(response.hasMore);
    } catch (error) {
      console.error('加载作品失败:', error);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, page, category, minRating, sortBy]);

  const loadHotPhotos = useCallback(async () => {
    try {
      const response = await getHotPhotos();
      setHotPhotos(response.photos);
    } catch (error) {
      console.error('加载热门榜单失败:', error);
    }
  }, []);

  useEffect(() => {
    setPhotos([]);
    setPage(1);
    setHasMore(true);
    loadPhotos(true);
  }, [category, minRating, sortBy]);

  useEffect(() => {
    loadHotPhotos();
  }, []);

  useEffect(() => {
    const updateWidth = () => {
      if (galleryRef.current) {
        setContainerWidth(galleryRef.current.clientWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  useEffect(() => {
    if (scrollContainerRef.current) {
      setContainerHeight(scrollContainerRef.current.clientHeight);
    }
  }, [containerWidth, photos.length]);

  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;

    const { scrollTop: st, scrollHeight, clientHeight } = scrollContainerRef.current;
    setScrollTop(st);

    if (scrollHeight - st - clientHeight < LOAD_THRESHOLD && !loading && hasMore) {
      loadPhotos(false);
    }
  }, [loading, hasMore, loadPhotos]);

  const visibleStart = Math.max(0, Math.floor((scrollTop - BUFFER_HEIGHT) / CARD_HEIGHT_ESTIMATE) * columnCount);
  const visibleEnd = Math.min(
    photos.length,
    Math.ceil((scrollTop + containerHeight + BUFFER_HEIGHT) / CARD_HEIGHT_ESTIMATE) * columnCount
  );

  const columnHeights = useMemo(() => {
    const heights = new Array(columnCount).fill(0);
    const positions: { top: number; left: number; column: number }[] = [];

    photos.forEach((_, index) => {
      const shortestColumn = heights.indexOf(Math.min(...heights));
      const left = shortestColumn * (CARD_WIDTH + CARD_GAP);
      const top = heights[shortestColumn];

      positions.push({ top, left, column: shortestColumn });
      heights[shortestColumn] += CARD_HEIGHT_ESTIMATE + CARD_GAP;
    });

    return { positions, maxHeight: Math.max(...heights) };
  }, [photos, columnCount]);

  const visiblePhotos = useMemo(() => {
    return photos.slice(visibleStart, visibleEnd).map((photo, index) => ({
      photo,
      position: columnHeights.positions[visibleStart + index],
      originalIndex: visibleStart + index
    }));
  }, [photos, visibleStart, visibleEnd, columnHeights]);

  const getRankBorder = (rank: number): string => {
    if (rank === 0) return '3px solid #fbbf24';
    if (rank === 1) return '2px solid #d1d5db';
    if (rank === 2) return '2px solid #cd7f32';
    return '1px solid #ffffff';
  };

  const getRankGlow = (rank: number): string => {
    if (rank === 0) return '0 0 20px rgba(251, 191, 36, 0.5)';
    if (rank === 1) return '0 0 15px rgba(209, 213, 219, 0.4)';
    if (rank === 2) return '0 0 12px rgba(205, 127, 50, 0.4)';
    return 'none';
  };

  const StarRating: React.FC<{ rating: number; size?: number }> = ({ rating, size = 14 }) => {
    return (
      <div style={{ display: 'flex', gap: '2px' }}>
        {[0, 1, 2, 3, 4].map(i => (
          <svg
            key={i}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={getStarColor(rating, i)}
          >
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
          </svg>
        ))}
      </div>
    );
  };

  const PhotoCard: React.FC<{ photo: Photo; rank?: number }> = ({ photo, rank }) => {
    const categoryColor = categoryColors[photo.category] || '#ffffff';
    const ratingColor = getRatingColor(photo.averageRating);
    const isRanked = rank !== undefined;

    return (
      <div
        className="photo-card"
        onClick={() => navigate(`/photo/${photo._id}`)}
        style={{
          width: isRanked ? 200 : CARD_WIDTH,
          height: isRanked ? 280 : 'auto',
          borderRadius: 12,
          backgroundColor: '#ffffff',
          boxShadow: isRanked ? getRankGlow(rank!) : '0 4px 16px rgba(0,0,0,0.08)',
          overflow: 'hidden',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          border: isRanked ? getRankBorder(rank!) : 'none',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.transform = isRanked ? 'scale(1.05)' : 'translateY(-4px)';
          (e.currentTarget as HTMLElement).style.boxShadow = isRanked
            ? '0 8px 24px rgba(0,0,0,0.25)'
            : '0 8px 24px rgba(0,0,0,0.15)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.transform = 'translateY(0) scale(1)';
          (e.currentTarget as HTMLElement).style.boxShadow = isRanked ? getRankGlow(rank!) : '0 4px 16px rgba(0,0,0,0.08)';
        }}
      >
        {isRanked && (
          <div
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              width: 28,
              height: 28,
              borderRadius: '50%',
              backgroundColor: rank === 0 ? '#fbbf24' : rank === 1 ? '#d1d5db' : rank === 2 ? '#cd7f32' : '#6b7280',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: 14,
              zIndex: 2
            }}
          >
            {rank! + 1}
          </div>
        )}

        <div
          style={{
            width: '100%',
            height: isRanked ? 180 : 'auto',
            overflow: 'hidden',
            position: 'relative',
            flex: isRanked ? 'none' : '1',
            minHeight: isRanked ? 180 : 200
          }}
        >
          <img
            src={photo.imageBase64}
            alt={photo.title}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block'
            }}
            loading="lazy"
          />
          {!isRanked && (
            <div
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                padding: '4px 10px',
                borderRadius: 12,
                backgroundColor: categoryColor,
                color: '#1f2937',
                fontSize: 12,
                fontWeight: 500
              }}
            >
              {categoryNames[photo.category]}
            </div>
          )}
        </div>

        <div
          style={{
            padding: isRanked ? '10px 12px' : '14px 16px',
            backgroundColor: '#ffffff',
            flex: isRanked ? 1 : 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: isRanked ? 4 : 8
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: isRanked ? 14 : 16,
              fontWeight: 600,
              color: '#111827',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {photo.title}
          </h3>

          {!isRanked && (
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: '#6b7280',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <img
                src={photo.authorAvatar}
                alt={photo.author}
                style={{ width: 20, height: 20, borderRadius: '50%' }}
              />
              {photo.author}
            </p>
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginTop: 'auto'
            }}
          >
            <StarRating rating={photo.averageRating} size={isRanked ? 12 : 14} />
            <span
              style={{
                fontSize: isRanked ? 12 : 13,
                fontWeight: 600,
                color: ratingColor
              }}
            >
              {photo.averageRating.toFixed(1)}
            </span>
            {isRanked && (
              <span style={{ fontSize: 11, color: '#9ca3af' }}>
                ({photo.reviewCount}评)
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const categories = [
    { id: 'all', name: '全部' },
    { id: 'portrait', name: '人像' },
    { id: 'landscape', name: '风光' },
    { id: 'street', name: '街拍' },
    { id: 'still', name: '静物' }
  ];

  const sortOptions = [
    { value: 'newest', label: '最新' },
    { value: 'hottest', label: '最热' },
    { value: 'topRated', label: '评分最高' }
  ];

  return (
    <div
      className="gallery-page"
      ref={scrollContainerRef}
      onScroll={handleScroll}
      style={{
        height: 'calc(100vh - 56px)',
        overflowY: 'auto',
        backgroundColor: '#1f2937',
        color: '#f9fafb',
        padding: '24px 32px',
        boxSizing: 'border-box'
      }}
    >
      <style>{`
        .gallery-page::-webkit-scrollbar {
          width: 8px;
        }
        .gallery-page::-webkit-scrollbar-track {
          background: #374151;
          border-radius: 4px;
        }
        .gallery-page::-webkit-scrollbar-thumb {
          background: #6b7280;
          border-radius: 4px;
        }
        .gallery-page::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
      `}</style>

      <section style={{ marginBottom: 32 }}>
        <h2
          style={{
            fontSize: 24,
            fontWeight: 700,
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}
        >
          <span style={{ color: '#fbbf24' }}>🔥</span>
          热门榜单 Top10
        </h2>
        <div
          style={{
            display: 'flex',
            gap: 16,
            overflowX: 'auto',
            paddingBottom: 8,
            padding: '8px 4px 16px 4px'
          }}
        >
          {hotPhotos.map((photo, index) => (
            <div key={photo._id} style={{ flexShrink: 0 }}>
              <PhotoCard photo={photo} rank={index} />
            </div>
          ))}
        </div>
      </section>

      <div
        className="filter-toolbar"
        style={{
          backgroundColor: '#374151',
          borderRadius: 12,
          padding: 12,
          marginBottom: 24,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 16
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, color: '#d1d5db' }}>分类：</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 16,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 500,
                  transition: 'all 0.2s ease',
                  backgroundColor: category === cat.id ? '#8b5cf6' : '#4b5563',
                  color: '#ffffff'
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            position: 'relative'
          }}
        >
          <span style={{ fontSize: 14, color: '#d1d5db' }}>最低评分：</span>
          <div
            style={{
              position: 'relative',
              width: 160,
              display: 'flex',
              alignItems: 'center'
            }}
            onMouseEnter={() => setShowRatingTooltip(true)}
            onMouseLeave={() => setShowRatingTooltip(false)}
          >
            <input
              type="range"
              min="0"
              max="5"
              step="0.5"
              value={minRating}
              onChange={e => setMinRating(parseFloat(e.target.value))}
              style={{
                width: '100%',
                height: 6,
                borderRadius: 3,
                background: '#e5e7eb',
                outline: 'none',
                appearance: 'none',
                cursor: 'pointer'
              }}
            />
            {showRatingTooltip && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: `${(minRating / 5) * 100}%`,
                  transform: 'translateX(-50%)',
                  marginBottom: 8,
                  padding: '4px 10px',
                  backgroundColor: '#8b5cf6',
                  color: '#ffffff',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none'
                }}
              >
                {minRating} 星
              </div>
            )}
          </div>
          <span style={{ fontSize: 13, color: '#fbbf24', fontWeight: 500, minWidth: 30 }}>
            {minRating.toFixed(1)}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          <span style={{ fontSize: 14, color: '#d1d5db' }}>排序：</span>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as 'newest' | 'hottest' | 'topRated')}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: '#4b5563',
              color: '#ffffff',
              fontSize: 13,
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            {sortOptions.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div ref={galleryRef} style={{ position: 'relative' }}>
        {loading && photos.length === 0 && (
          <div style={{ textAlign: 'center', padding: 48, color: '#9ca3af' }}>
            加载中...
          </div>
        )}

        {photos.length > 0 && (
          <div
            style={{
              position: 'relative',
              height: columnHeights.maxHeight,
              margin: '0 auto'
            }}
          >
            {visiblePhotos.map(({ photo, position, originalIndex }) => (
              <div
                key={photo._id}
                style={{
                  position: 'absolute',
                  top: position.top,
                  left: position.left,
                  width: CARD_WIDTH
                }}
              >
                <PhotoCard photo={photo} />
              </div>
            ))}
          </div>
        )}

        {!loading && photos.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: 64,
              color: '#9ca3af'
            }}
          >
            暂无作品
          </div>
        )}

        {loading && photos.length > 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: 24,
              color: '#9ca3af'
            }}
          >
            加载更多...
          </div>
        )}

        {!hasMore && photos.length > 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: 24,
              color: '#6b7280',
              fontSize: 13
            }}
          >
            — 已加载全部作品 —
          </div>
        )}
      </div>
    </div>
  );
};

export default Gallery;
