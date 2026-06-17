import { Pencil } from 'lucide-react';
import type { Review, User, Activity } from '../../shared/types';

interface ReviewItem extends Review {
  user: User;
  activity?: Activity;
}

interface Props {
  reviews: ReviewItem[];
  onEdit?: (review: ReviewItem) => void;
  currentUserId?: string;
  showActivityName?: boolean;
}

const renderStars = (rating: number) => {
  return Array.from({ length: 5 }).map((_, i) => {
    const filled = rating >= i + 1;
    return (
      <span key={i} style={{ color: filled ? '#FFB300' : '#E0E0E0', fontSize: 15 }}>★</span>
    );
  });
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const ReviewList = ({ reviews, onEdit, currentUserId, showActivityName }: Props) => {
  if (!reviews.length) {
    return (
      <div style={{
        padding: 40,
        textAlign: 'center',
        color: '#9E9E9E',
        fontSize: 14,
        backgroundColor: '#fff',
        borderRadius: 12,
      }}>
        还没有书评，成为第一个分享感受的人吧 ✨
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: '#fff',
      borderRadius: 12,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      overflow: 'hidden',
    }}>
      {reviews.map((r, idx) => (
        <div
          key={r.id}
          style={{
            padding: 20,
            borderBottom: idx < reviews.length - 1 ? '1px solid #E0E0E0' : 'none',
            animation: 'fadeInUp 0.35s ease',
          }}
        >
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                backgroundColor: r.user.avatarColor,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: 15,
                flexShrink: 0,
              }}
            >
              {r.user.nickname.charAt(0)}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 8,
                marginBottom: 6,
              }}>
                <span style={{ fontWeight: 600, color: '#212121', fontSize: 14 }}>
                  {r.user.nickname}
                </span>
                <span>{renderStars(r.rating)}</span>
                <span style={{ fontSize: 11, color: '#9E9E9E' }}>
                  {formatDate(r.createdAt)}
                  {r.updatedAt !== r.createdAt && ' (已编辑)'}
                </span>
              </div>

              {showActivityName && r.activity && (
                <div style={{
                  fontSize: 12,
                  color: '#1976D2',
                  marginBottom: 8,
                  fontWeight: 500,
                }}>
                  📚 {r.activity.name}
                </div>
              )}

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 10,
                fontSize: 13,
              }}>
                <span style={{ color: '#616161' }}>书籍：</span>
                <span style={{ fontWeight: 500, color: '#424242' }}>{r.bookTitle}</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: '#9E9E9E' }}>
                  {r.wordCount} 字
                </span>
              </div>

              <div style={{
                color: '#424242',
                fontSize: 14,
                lineHeight: 1.75,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>
                {r.content}
              </div>

              {currentUserId === r.userId && onEdit && (
                <div style={{ marginTop: 12, textAlign: 'right' }}>
                  <button
                    onClick={() => onEdit(r)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '6px 12px',
                      backgroundColor: 'transparent',
                      color: '#1976D2',
                      border: '1px solid #BBDEFB',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#E3F2FD';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <Pencil size={13} /> 编辑
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ReviewList;
