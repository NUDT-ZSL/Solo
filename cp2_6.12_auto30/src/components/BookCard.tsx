import React from 'react';

interface BookCardProps {
  id: string;
  title: string;
  author: string;
  cover_url: string;
  reading_status: 'unread' | 'reading' | 'read';
  note_count?: number;
  onClick?: () => void;
}

const statusLabels: Record<string, string> = {
  unread: '未读',
  reading: '在读',
  read: '已读',
};

const statusColors: Record<string, string> = {
  unread: 'var(--cat-general)',
  reading: 'var(--cat-history)',
  read: 'var(--cat-literature)',
};

const BookCard: React.FC<BookCardProps> = ({ title, author, cover_url, reading_status, note_count = 0, onClick }) => {
  return (
    <div className="book-card" onClick={onClick} style={{
      background: 'var(--card-bg)',
      backdropFilter: 'blur(6px)',
      WebkitBackdropFilter: 'blur(6px)',
      borderRadius: 'var(--radius)',
      border: '1px solid var(--border)',
      overflow: 'hidden',
      cursor: 'pointer',
      transition: 'transform 0.3s ease, box-shadow 0.3s ease',
      position: 'relative',
    }}
    onMouseEnter={e => {
      (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
      (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(44,62,80,0.16)';
    }}
    onMouseLeave={e => {
      (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
      (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(44,62,80,0.08)';
    }}>
      <div style={{
        width: '100%',
        height: 180,
        background: 'linear-gradient(135deg, #e8e4de 0%, #d5d0c8 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {cover_url ? (
          <img src={cover_url} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        ) : (
          <span style={{ fontSize: 48, opacity: 0.3 }}>📖</span>
        )}
        <span style={{
          position: 'absolute',
          top: 8,
          left: 8,
          padding: '2px 10px',
          borderRadius: 6,
          fontSize: 11,
          fontWeight: 600,
          color: '#fff',
          background: statusColors[reading_status] || 'var(--cat-general)',
        }}>
          {statusLabels[reading_status]}
        </span>
        {note_count > 0 && (
          <span className="badge" style={{
            position: 'absolute',
            top: 8,
            right: 8,
          }}>
            {note_count}
          </span>
        )}
      </div>
      <div style={{ padding: 14 }}>
        <h3 style={{
          fontSize: 15,
          fontWeight: 600,
          color: 'var(--primary)',
          marginBottom: 4,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {title}
        </h3>
        <p style={{
          fontSize: 13,
          color: 'var(--text-light)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {author || '未知作者'}
        </p>
      </div>
    </div>
  );
};

export default BookCard;
