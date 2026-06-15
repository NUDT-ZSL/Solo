import { useState, useEffect, useMemo } from 'react';

export interface Item {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  createdAt: number;
  expiresAt: number;
}

interface ItemCardProps {
  item: Item;
  onDelete: (id: string) => void;
  isRemoving: boolean;
}

const gradients = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
  'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
];

const getGradientById = (id: string): string => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
};

const formatRemainingTime = (ms: number): string => {
  if (ms <= 0) return '已过期';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}小时${minutes}分`;
  }
  return `${minutes}分${seconds}秒`;
};

export default function ItemCard({ item, onDelete, isRemoving }: ItemCardProps) {
  const [now, setNow] = useState(Date.now());
  const gradient = useMemo(() => getGradientById(item.id), [item.id]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const remaining = item.expiresAt - now;
  const remainingText = formatRemainingTime(remaining);

  const handleDelete = () => {
    onDelete(item.id);
  };

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.08)',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.1)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        transition: isRemoving
          ? 'transform 0.4s ease, opacity 0.4s ease'
          : 'transform 0.2s ease, filter 0.2s ease, opacity 0.3s ease',
        transform: isRemoving ? 'translateX(200px)' : 'none',
        opacity: isRemoving ? 0 : 1,
        cursor: 'pointer',
        animation: 'fadeIn 0.3s ease',
      }}
      onMouseEnter={(e) => {
        if (!isRemoving) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.filter = 'brightness(1.1)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isRemoving) {
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.filter = 'none';
        }
      }}
    >
      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt={item.title}
          style={{
            width: '120px',
            height: '120px',
            objectFit: 'cover',
            borderRadius: '8px',
          }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <div
          style={{
            width: '120px',
            height: '120px',
            borderRadius: '8px',
            background: gradient,
          }}
        />
      )}

      <h3
        style={{
          color: '#E2E8F0',
          fontSize: '16px',
          fontWeight: 600,
          textAlign: 'center',
          width: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={item.title}
      >
        {item.title}
      </h3>

      <p
        style={{
          color: '#A0AEC0',
          fontSize: '13px',
          textAlign: 'center',
          width: '100%',
          lineHeight: 1.4,
          minHeight: '36px',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
        title={item.description}
      >
        {item.description}
      </p>

      <div
        style={{
          color: '#63B3ED',
          fontSize: '14px',
          fontWeight: 500,
          fontFamily: 'monospace',
        }}
      >
        {remainingText}
      </div>

      <button
        onClick={handleDelete}
        style={{
          background: '#E53E3E',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          padding: '8px 20px',
          fontSize: '13px',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'transform 0.2s ease, filter 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.filter = 'brightness(1.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.filter = 'none';
        }}
      >
        删除
      </button>
    </div>
  );
}
