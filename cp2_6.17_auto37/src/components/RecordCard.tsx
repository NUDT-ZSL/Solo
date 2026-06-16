import { useState } from 'react';
import { Heart, MessageCircle, Share2, Bookmark } from 'lucide-react';
import type { RoastRecord } from '../types';
import { useApi } from '../hooks/useApi';

interface LikeResponse {
  success: boolean;
  likes: number;
  liked: boolean;
}

interface RecordCardProps {
  record: RoastRecord;
  currentUserId?: string;
  onCommentClick?: (recordId: string) => void;
}

const roastLevelStyles: Record<string, { bg: React.CSSProperties; text: React.CSSProperties; dot: React.CSSProperties }> = {
  浅烘: {
    bg: { backgroundColor: '#fff7ed', color: '#c2410c' },
    text: { color: '#c2410c' },
    dot: { backgroundColor: '#f59e0b' },
  },
  中烘: {
    bg: { backgroundColor: '#fff7ed', color: '#c2410c' },
    text: { color: '#c2410c' },
    dot: { backgroundColor: '#f97316' },
  },
  深烘: {
    bg: { backgroundColor: '#fef2f2', color: '#b91c1c' },
    text: { color: '#b91c1c' },
    dot: { backgroundColor: '#ef4444' },
  },
  light: {
    bg: { backgroundColor: '#fff7ed', color: '#c2410c' },
    text: { color: '#c2410c' },
    dot: { backgroundColor: '#f59e0b' },
  },
  medium: {
    bg: { backgroundColor: '#fff7ed', color: '#c2410c' },
    text: { color: '#c2410c' },
    dot: { backgroundColor: '#f97316' },
  },
  dark: {
    bg: { backgroundColor: '#fef2f2', color: '#b91c1c' },
    text: { color: '#b91c1c' },
    dot: { backgroundColor: '#ef4444' },
  },
};

const cardStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
  border: '1px solid #e2e8f0',
  overflow: 'hidden',
  transition: 'all 0.3s ease',
};

const cardHoverStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)',
  border: '1px solid #e2e8f0',
  overflow: 'hidden',
  transition: 'all 0.3s ease',
  transform: 'translateY(-8px)',
};

export default function RecordCard({ record, currentUserId = 'user-1', onCommentClick }: RecordCardProps) {
  const { request } = useApi<LikeResponse>();
  const [liked, setLiked] = useState<boolean>(record.likedBy?.includes(currentUserId) || false);
  const [likes, setLikes] = useState<number>(record.likes || 0);
  const [bookmarked, setBookmarked] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const action = liked ? 'unlike' : 'like';
    const result = await request(
      `/api/records/${record.id}/like`,
      {
        method: 'POST',
        body: JSON.stringify({ userId: currentUserId, action }),
      }
    );
    if (result) {
      setLiked(result.liked);
      setLikes(result.likes);
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({
        title: `${record.beanOrigin} - 咖啡烘焙记录`,
        text: record.notes,
        url: window.location.href,
      }).catch(() => {});
    }
  };

  const getRoastStyle = (level: string) => {
    return roastLevelStyles[level] || {
      bg: { backgroundColor: '#f8fafc', color: '#334155' },
      text: { color: '#334155' },
      dot: { backgroundColor: '#64748b' },
    };
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  const flavorTags: Array<string | { name: string }> = Array.isArray(record.flavorTags) ? (record.flavorTags as Array<string | { name: string }>) : [];

  const roastStyle = getRoastStyle(record.roastLevel);

  return (
    <article
      style={isHovered ? cardHoverStyle : cardStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="masonry-item"
    >
      {record.curveImage && (
        <div style={{ position: 'relative', aspectRatio: '16/9', overflow: 'hidden', backgroundColor: '#f1f5f9' }}>
          <img
            src={record.curveImage}
            alt={`${record.beanOrigin} 烘焙曲线`}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: isHovered ? 'scale(1.05)' : 'scale(1)',
              transition: 'transform 0.5s ease',
            }}
          />
          <div style={{ position: 'absolute', top: '12px', left: '12px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: 500,
              ...roastStyle.bg,
            }}>
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '9999px',
                ...roastStyle.dot,
              }} />
              {record.roastLevel}
            </span>
          </div>
        </div>
      )}

      <div style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '9999px',
            background: 'linear-gradient(135deg, #fb923c 0%, #f59e0b 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontWeight: 600,
            flexShrink: 0,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          }}>
            {record.user?.username?.charAt(0).toUpperCase() || record.user?.avatar?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {record.user?.username || '匿名烘焙师'}
              </span>
              <span style={{ color: '#cbd5e1' }}>·</span>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>{formatDate(record.createdAt)}</span>
            </div>
            <div style={{ marginTop: '2px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', lineHeight: 1.4 }}>
                {record.beanOrigin}
              </h3>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
          {record.processMethod && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 500,
              backgroundColor: '#f1f5f9',
              color: '#475569',
            }}>
              {record.processMethod}
            </span>
          )}
          {flavorTags.slice(0, 5).map((tag: string | { name: string }, idx: number) => (
            <span
              key={idx}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 500,
                backgroundColor: '#fff7ed',
                color: '#c2410c',
              }}
            >
              #{typeof tag === 'string' ? tag : tag.name}
            </span>
          ))}
          {flavorTags.length > 5 && (
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>+{flavorTags.length - 5}</span>
          )}
        </div>

        {record.notes && (
          <p style={{
            fontSize: '14px',
            color: '#475569',
            lineHeight: 1.6,
            marginBottom: '20px',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
          }}>
            {record.notes}
          </p>
        )}

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '16px',
          borderTop: '1px solid #f1f5f9',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={handleLike}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                borderRadius: '8px',
                transition: 'all 0.2s ease',
                backgroundColor: liked ? '#fef2f2' : 'transparent',
                color: liked ? '#ef4444' : '#64748b',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#fef2f2';
                e.currentTarget.style.color = '#ef4444';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = liked ? '#fef2f2' : 'transparent';
                e.currentTarget.style.color = liked ? '#ef4444' : '#64748b';
              }}
            >
              <Heart size={18} fill={liked ? 'currentColor' : 'none'} className={liked ? 'heart-bounce' : ''} />
              <span>{likes}</span>
            </button>
            <button
              onClick={() => onCommentClick?.(record.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                borderRadius: '8px',
                transition: 'all 0.2s ease',
                backgroundColor: 'transparent',
                color: '#64748b',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#eff6ff';
                e.currentTarget.style.color = '#3b82f6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#64748b';
              }}
            >
              <MessageCircle size={18} />
              <span>评论</span>
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setBookmarked(!bookmarked);
              }}
              style={{
                padding: '8px',
                borderRadius: '8px',
                transition: 'all 0.2s ease',
                backgroundColor: bookmarked ? '#fffbeb' : 'transparent',
                color: bookmarked ? '#f59e0b' : '#64748b',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#fffbeb';
                e.currentTarget.style.color = '#f59e0b';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = bookmarked ? '#fffbeb' : 'transparent';
                e.currentTarget.style.color = bookmarked ? '#f59e0b' : '#64748b';
              }}
            >
              <Bookmark size={18} fill={bookmarked ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={handleShare}
              style={{
                padding: '8px',
                borderRadius: '8px',
                transition: 'all 0.2s ease',
                backgroundColor: 'transparent',
                color: '#64748b',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f1f5f9';
                e.currentTarget.style.color = '#334155';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#64748b';
              }}
            >
              <Share2 size={18} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
