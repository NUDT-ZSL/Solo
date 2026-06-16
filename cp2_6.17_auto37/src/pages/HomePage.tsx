import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, User, MessageCircle, UserPlus, UserCheck } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useApi } from '../hooks/useApi';
import { RoastRecord, User as UserType } from '../types';
import Navbar from '../components/Navbar';
import RecordCardComponent from '../components/RecordCard';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const CURRENT_USER_ID = 'user-001';
const PAGE_SIZE = 9;

interface RoastRecordWithUser extends RoastRecord {
  user?: UserType;
}

interface PaginatedResponse {
  records: RoastRecordWithUser[];
  hasMore: boolean;
}

interface LikeResponse {
  success: boolean;
  likes: number;
  liked: boolean;
}

interface FollowResponse {
  success: boolean;
  following: boolean;
}

const cardStyle: React.CSSProperties = {
  backgroundColor: 'var(--color-surface)',
  borderRadius: 'var(--radius-card)',
  boxShadow: 'var(--shadow-card)',
  overflow: 'hidden',
  cursor: 'pointer',
  transition: 'all var(--transition-default)',
  display: 'flex',
  flexDirection: 'column',
};

const cardImageWrapStyle: React.CSSProperties = {
  width: '100%',
  overflow: 'hidden',
  backgroundColor: '#f5f5f5',
  position: 'relative',
};

const cardImageStyle: React.CSSProperties = {
  width: '100%',
  height: 'auto',
  display: 'block',
  objectFit: 'cover',
};

const cardContentStyle: React.CSSProperties = {
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

const beanOriginStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: '18px',
  fontWeight: 600,
  color: 'var(--color-text-primary)',
  lineHeight: 1.4,
};

const tagsRowStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '6px',
};

const getRoastLevelStyle = (level: string): React.CSSProperties => {
  const colors: Record<string, { bg: string; color: string }> = {
    '浅烘': { bg: '#e8f5e9', color: '#2e7d32' },
    '极浅烘': { bg: '#e3f2fd', color: '#1565c0' },
    '中烘': { bg: '#fff3e0', color: '#ef6c00' },
    '中深烘': { bg: '#fbe9e7', color: '#d84315' },
    '深烘': { bg: '#3e2723', color: '#ffffff' },
  };
  const c = colors[level] || { bg: '#eeeeee', color: '#616161' };
  return {
    backgroundColor: c.bg,
    color: c.color,
    padding: '4px 10px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 500,
    display: 'inline-block',
  };
};

const flavorTagStyle: React.CSSProperties = {
  backgroundColor: '#f5f0e8',
  color: '#795548',
  padding: '3px 8px',
  borderRadius: '6px',
  fontSize: '12px',
};

const userRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingTop: '4px',
  borderTop: '1px solid var(--color-border)',
};

const userInfoStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  minWidth: 0,
  flex: 1,
};

const avatarStyle: React.CSSProperties = {
  width: '36px',
  height: '36px',
  borderRadius: '50%',
  objectFit: 'cover',
  border: '2px solid #fff',
  boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
  flexShrink: 0,
};

const userMetaStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
  flex: 1,
};

const usernameStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 500,
  color: 'var(--color-text-primary)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const timeStyle: React.CSSProperties = {
  fontSize: '12px',
  color: 'var(--color-text-muted)',
};

const actionRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingTop: '4px',
};

const likeButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  backgroundColor: 'transparent',
  border: 'none',
  cursor: 'pointer',
  padding: '4px 8px',
  borderRadius: '8px',
  transition: 'background-color 0.2s ease',
};

const likeCountStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 500,
  color: 'var(--color-text-secondary)',
};

const followButtonStyle = (isFollowing: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  backgroundColor: isFollowing ? 'transparent' : 'var(--color-primary)',
  color: isFollowing ? 'var(--color-primary)' : 'white',
  border: `1px solid ${isFollowing ? 'var(--color-primary)' : 'transparent'}`,
  padding: '6px 12px',
  borderRadius: '8px',
  fontSize: '12px',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  whiteSpace: 'nowrap',
});

const pageWrapStyle: React.CSSProperties = {
  minHeight: '100vh',
  backgroundColor: 'var(--color-bg)',
};

const mainContentStyle: React.CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '32px 24px',
};

const pageHeaderStyle: React.CSSProperties = {
  marginBottom: '32px',
  textAlign: 'center',
};

const pageTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: '32px',
  fontWeight: 700,
  color: 'var(--color-primary-dark)',
  marginBottom: '8px',
};

const pageSubtitleStyle: React.CSSProperties = {
  fontSize: '16px',
  color: 'var(--color-text-secondary)',
};

const loadingWrapStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  padding: '40px 0',
};

const emptyWrapStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '80px 20px',
  color: 'var(--color-text-muted)',
};

interface HomeRecordCardProps {
  record: RoastRecordWithUser;
  isLast: boolean;
  onLastRef: (el: HTMLDivElement | null) => void;
  onLike: (recordId: string) => void;
  onFollow: (userId: string) => void;
  likedRecords: Set<string>;
  followingUsers: Set<string>;
  bouncingHearts: Set<string>;
  onNavigate: (id: string) => void;
  style?: React.CSSProperties;
  onCardRef?: (el: HTMLDivElement | null) => void;
  onImageLoad?: (recordId: string) => void;
}

const HomeRecordCard: React.FC<HomeRecordCardProps> = ({
  record,
  isLast,
  onLastRef,
  onLike,
  onFollow,
  likedRecords,
  followingUsers,
  bouncingHearts,
  onNavigate,
  style,
  onCardRef,
  onImageLoad,
}) => {
  const isLiked = likedRecords.has(record.id);
  const isFollowing = record.userId ? followingUsers.has(record.userId) : false;
  const isSelf = record.userId === CURRENT_USER_ID;
  const isBouncing = bouncingHearts.has(record.id);

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('.like-button') ||
      target.closest('.follow-button') ||
      target.closest('.user-info')
    ) {
      return;
    }
    onNavigate(record.id);
  };

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onLike(record.id);
  };

  const handleFollowClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (record.userId) {
      onFollow(record.userId);
    }
  };

  const handleUserClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const setRef = useCallback(
    (el: HTMLDivElement | null) => {
      if (onCardRef) {
        onCardRef(el);
      }
      if (isLast && onLastRef) {
        onLastRef(el);
      }
    },
    [onCardRef, isLast, onLastRef]
  );

  const handleImgLoad = useCallback(() => {
    if (onImageLoad) {
      onImageLoad(record.id);
    }
  }, [onImageLoad, record.id]);

  return (
    <div
      ref={setRef}
      className="fade-in"
      onClick={handleCardClick}
      style={{
        position: 'absolute',
        ...style,
      }}
    >
      <div
        style={cardStyle}
        className="record-card"
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-8px)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-card-hover)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-card)';
        }}
      >
        <div style={cardImageWrapStyle}>
          <img
            src={record.curveImage}
            alt={record.beanOrigin}
            style={cardImageStyle}
            loading="lazy"
            onLoad={handleImgLoad}
          />
        </div>

        <div style={cardContentStyle}>
          <div style={beanOriginStyle}>{record.beanOrigin}</div>

          <div style={tagsRowStyle}>
            <span style={getRoastLevelStyle(record.roastLevel)}>{record.roastLevel}</span>
            {Array.isArray(record.flavorTags)
              ? record.flavorTags.slice(0, 3).map((tag) => (
                  <span key={typeof tag === 'string' ? tag : tag.name} style={flavorTagStyle}>
                    {typeof tag === 'string' ? tag : tag.name}
                  </span>
                ))
              : null}
          </div>

          <div style={userRowStyle}>
            <div style={userInfoStyle} className="user-info" onClick={handleUserClick}>
              {record.user?.avatar ? (
                <img src={record.user.avatar} alt={record.user.username} style={avatarStyle} />
              ) : (
                <div
                  style={{
                    ...avatarStyle,
                    backgroundColor: 'var(--color-primary-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                  }}
                >
                  <User size={18} />
                </div>
              )}
              <div style={userMetaStyle}>
                <span style={usernameStyle}>{record.user?.username || '匿名用户'}</span>
                <span style={timeStyle}>{dayjs(record.createdAt).fromNow()}</span>
              </div>
            </div>
          </div>

          <div style={actionRowStyle}>
            <button
              className="like-button"
              style={likeButtonStyle}
              onClick={handleLikeClick}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f5f0e8';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
              }}
            >
              <Heart
                size={20}
                fill={isLiked ? 'var(--color-secondary)' : 'none'}
                color={isLiked ? 'var(--color-secondary)' : 'var(--color-text-muted)'}
                strokeWidth={2}
                className={`heart-icon ${isBouncing ? 'heart-bounce' : ''}`}
              />
              <span
                style={{
                  ...likeCountStyle,
                  color: isLiked ? 'var(--color-secondary)' : 'var(--color-text-secondary)',
                }}
              >
                {record.likes}
              </span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: 'var(--color-text-muted)',
                  fontSize: '13px',
                }}
              >
                <MessageCircle size={16} />
              </div>
              {!isSelf && (
                <button
                  className="follow-button"
                  style={followButtonStyle(isFollowing)}
                  onClick={handleFollowClick}
                  onMouseEnter={(e) => {
                    const btn = e.currentTarget as HTMLButtonElement;
                    if (isFollowing) {
                      btn.style.backgroundColor = '#ffebee';
                      btn.style.borderColor = 'var(--color-secondary)';
                      btn.style.color = 'var(--color-secondary)';
                    } else {
                      btn.style.backgroundColor = 'var(--color-primary-dark)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    const btn = e.currentTarget as HTMLButtonElement;
                    if (isFollowing) {
                      btn.style.backgroundColor = 'transparent';
                      btn.style.borderColor = 'var(--color-primary)';
                      btn.style.color = 'var(--color-primary)';
                    } else {
                      btn.style.backgroundColor = 'var(--color-primary)';
                    }
                  }}
                >
                  {isFollowing ? <UserCheck size={14} /> : <UserPlus size={14} />}
                  {isFollowing ? '已关注' : '关注'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const GAP = 24;

const getColumnCount = (width: number): number => {
  if (width >= 1024) return 3;
  if (width >= 768) return 2;
  return 1;
};

interface CardPosition {
  top: number;
  left: number;
  width: number;
}

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { request } = useApi<PaginatedResponse>();
  const likeApi = useApi<LikeResponse>();
  const followApi = useApi<FollowResponse>();

  const [records, setRecords] = useState<RoastRecordWithUser[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [likedRecords, setLikedRecords] = useState<Set<string>>(new Set());
  const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set());
  const [bouncingHearts, setBouncingHearts] = useState<Set<string>>(new Set());
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  const [cardPositions, setCardPositions] = useState<CardPosition[]>([]);
  const [containerHeight, setContainerHeight] = useState(0);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useRef<HTMLDivElement | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const layoutScheduledRef = useRef(false);

  const estimateCardHeight = (record: RoastRecordWithUser, cardWidth: number): number => {
    const imageHeight = cardWidth * 0.5625;
    const contentPadding = 16 * 2;
    const beanOriginHeight = 25.2;
    const tagsRowHeight = 28;
    const tagsGap = 12;
    const userRowPaddingTop = 4;
    const userRowBorderTop = 1;
    const userRowHeight = 36;
    const actionRowPaddingTop = 4;
    const actionRowHeight = 28;
    const gaps = 12 * 3;

    const totalHeight = imageHeight + contentPadding + beanOriginHeight + tagsRowHeight + tagsGap +
      userRowPaddingTop + userRowBorderTop + userRowHeight +
      actionRowPaddingTop + actionRowHeight + gaps;

    return totalHeight;
  };

  const calculateLayout = useCallback(() => {
    const container = containerRef.current;
    if (!container || records.length === 0) return;

    const containerWidth = container.offsetWidth;
    const columns = getColumnCount(containerWidth);
    const cardWidth = (containerWidth - GAP * (columns - 1)) / columns;

    const columnHeights = new Array(columns).fill(0);
    const positions: CardPosition[] = [];

    records.forEach((record) => {
      const cardEl = cardRefs.current.get(record.id);
      let cardHeight: number;

      if (cardEl) {
        cardHeight = cardEl.offsetHeight;
      } else {
        cardHeight = estimateCardHeight(record, cardWidth);
      }

      let shortestColIndex = 0;
      let shortestHeight = columnHeights[0];
      for (let i = 1; i < columns; i++) {
        if (columnHeights[i] < shortestHeight) {
          shortestHeight = columnHeights[i];
          shortestColIndex = i;
        }
      }

      const top = columnHeights[shortestColIndex];
      const left = shortestColIndex * (cardWidth + GAP);

      positions.push({ top, left, width: cardWidth });

      columnHeights[shortestColIndex] += cardHeight + GAP;
    });

    setCardPositions(positions);
    setContainerHeight(Math.max(...columnHeights) - GAP);
  }, [records]);

  const scheduleLayout = useCallback(() => {
    if (layoutScheduledRef.current) return;
    layoutScheduledRef.current = true;
    requestAnimationFrame(() => {
      layoutScheduledRef.current = false;
      calculateLayout();
    });
  }, [calculateLayout]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    resizeObserverRef.current = new ResizeObserver(() => {
      scheduleLayout();
    });

    resizeObserverRef.current.observe(container);

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, [scheduleLayout]);

  useEffect(() => {
    scheduleLayout();
  }, [records, scheduleLayout]);

  const handleImageLoad = useCallback((recordId: string) => {
    setLoadedImages((prev) => {
      const next = new Set(prev);
      next.add(recordId);
      return next;
    });
    scheduleLayout();
  }, [scheduleLayout]);

  const setCardRef = useCallback((recordId: string, el: HTMLDivElement | null) => {
    if (el) {
      cardRefs.current.set(recordId, el);
    } else {
      cardRefs.current.delete(recordId);
    }
  }, []);

  const fetchRecords = useCallback(
    async (pageNum: number) => {
      if (loading) return;
      setLoading(true);

      try {
        const result = await request(
          `http://localhost:3001/api/records?page=${pageNum}&limit=${PAGE_SIZE}`
        );
        if (result) {
          const newRecords = result.records.map((r) => {
            const initialLiked = r.likedBy?.includes(CURRENT_USER_ID) || false;
            if (initialLiked) {
              setLikedRecords((prev) => new Set(prev).add(r.id));
            }
            return r;
          });
          setRecords((prev) => (pageNum === 1 ? newRecords : [...prev, ...newRecords]));
          setHasMore(result.hasMore);
        }
      } catch (err) {
        console.error('Failed to fetch records:', err);
      } finally {
        setLoading(false);
      }
    },
    [request, loading]
  );

  useEffect(() => {
    fetchRecords(1);
  }, []);

  const handleLastRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading) return;
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      lastElementRef.current = node;
      if (node && hasMore) {
        observerRef.current = new IntersectionObserver(
          (entries) => {
            if (entries[0].isIntersecting) {
              const nextPage = page + 1;
              setPage(nextPage);
              fetchRecords(nextPage);
            }
          },
          { rootMargin: '200px 0px', threshold: 0.1 }
        );
        observerRef.current.observe(node);
      }
    },
    [loading, hasMore, page, fetchRecords]
  );

  const handleLike = async (recordId: string) => {
    const isCurrentlyLiked = likedRecords.has(recordId);
    const record = records.find((r) => r.id === recordId);
    if (!record) return;

    const action = isCurrentlyLiked ? 'unlike' : 'like';

    setBouncingHearts((prev) => new Set(prev).add(recordId));
    setTimeout(() => {
      setBouncingHearts((prev) => {
        const next = new Set(prev);
        next.delete(recordId);
        return next;
      });
    }, 200);

    setLikedRecords((prev) => {
      const next = new Set(prev);
      if (isCurrentlyLiked) {
        next.delete(recordId);
      } else {
        next.add(recordId);
      }
      return next;
    });

    setRecords((prev) =>
      prev.map((r) =>
        r.id === recordId
          ? {
              ...r,
              likes: isCurrentlyLiked ? r.likes - 1 : r.likes + 1,
              likedBy: isCurrentlyLiked
                ? r.likedBy.filter((id) => id !== CURRENT_USER_ID)
                : [...r.likedBy, CURRENT_USER_ID],
            }
          : r
      )
    );

    try {
      await likeApi.request(`http://localhost:3001/api/records/${recordId}/like`, {
        method: 'POST',
        body: JSON.stringify({ userId: CURRENT_USER_ID, action }),
      });
    } catch (err) {
      console.error('Failed to like record:', err);
      setLikedRecords((prev) => {
        const next = new Set(prev);
        if (isCurrentlyLiked) {
          next.add(recordId);
        } else {
          next.delete(recordId);
        }
        return next;
      });
      setRecords((prev) =>
        prev.map((r) =>
          r.id === recordId
            ? {
                ...r,
                likes: isCurrentlyLiked ? r.likes + 1 : r.likes - 1,
              }
            : r
        )
      );
    }
  };

  const handleFollow = async (userId: string) => {
    if (userId === CURRENT_USER_ID) return;

    const isCurrentlyFollowing = followingUsers.has(userId);
    const action = isCurrentlyFollowing ? 'unfollow' : 'follow';

    setFollowingUsers((prev) => {
      const next = new Set(prev);
      if (isCurrentlyFollowing) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });

    try {
      await followApi.request(`http://localhost:3001/api/users/${userId}/follow`, {
        method: 'POST',
        body: JSON.stringify({ followerId: CURRENT_USER_ID, action }),
      });
    } catch (err) {
      console.error('Failed to follow user:', err);
      setFollowingUsers((prev) => {
        const next = new Set(prev);
        if (isCurrentlyFollowing) {
          next.add(userId);
        } else {
          next.delete(userId);
        }
        return next;
      });
    }
  };

  const handleNavigate = (id: string) => {
    navigate(`/record/${id}`);
  };

  return (
    <div style={pageWrapStyle}>
      <Navbar />

      <main style={mainContentStyle}>
        <div style={pageHeaderStyle}>
          <h1 style={pageTitleStyle}>烘焙社区</h1>
          <p style={pageSubtitleStyle}>探索来自世界各地的精品咖啡烘焙记录</p>
        </div>

        {records.length === 0 && !loading ? (
          <div style={emptyWrapStyle}>
            <User size={64} strokeWidth={1.5} style={{ marginBottom: '16px', opacity: 0.3 }} />
            <p style={{ fontSize: '16px', marginBottom: '8px' }}>暂无烘焙记录</p>
            <p style={{ fontSize: '14px' }}>点击右上角创建按钮分享你的第一条烘焙记录</p>
          </div>
        ) : (
          <>
            <div
              ref={containerRef}
              style={{
                position: 'relative',
                width: '100%',
                height: containerHeight,
              }}
            >
              {records.map((record, index) => {
                const pos = cardPositions[index] || { top: 0, left: index * 100, width: 200 };
                return (
                  <HomeRecordCard
                    key={record.id}
                    record={record}
                    isLast={index === records.length - 1}
                    onLastRef={handleLastRef}
                    onLike={handleLike}
                    onFollow={handleFollow}
                    likedRecords={likedRecords}
                    followingUsers={followingUsers}
                    bouncingHearts={bouncingHearts}
                    onNavigate={handleNavigate}
                    style={{
                      top: pos.top,
                      left: pos.left,
                      width: pos.width,
                    }}
                    onCardRef={(el) => setCardRef(record.id, el)}
                    onImageLoad={handleImageLoad}
                  />
                );
              })}
            </div>

            {loading && (
              <div style={loadingWrapStyle}>
                <div className="loading-spinner" />
              </div>
            )}

            {!hasMore && records.length > 0 && (
              <div style={{ ...loadingWrapStyle, color: 'var(--color-text-muted)' }}>
                — 已加载全部记录 —
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default HomePage;
