import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import type { Item } from '../types';

interface ItemCardProps {
  item: Item;
}

const statusLabels: Record<string, { text: string; color: string }> = {
  open: { text: '寻找中', color: '#6366f1' },
  matched: { text: '已匹配', color: '#10b981' },
  claimed: { text: '已认领', color: '#6b7280' },
};

const typeLabels: Record<string, { text: string; color: string }> = {
  lost: { text: '寻物', color: '#ef4444' },
  found: { text: '拾物', color: '#10b981' },
};

export default function ItemCard({ item }: ItemCardProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const navigate = useNavigate();

  const statusInfo = statusLabels[item.status];
  const typeInfo = typeLabels[item.type];

  const handleClick = () => {
    navigate(`/item/${item.id}`);
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFavorite(!isFavorite);
  };

  return (
    <div
      className="item-card"
      onClick={handleClick}
    >
      <div className="card-image">
        {!imageLoaded && <div className="image-placeholder" />}
        <img
          src={item.imageUrl}
          alt={item.title}
          onLoad={() => setImageLoaded(true)}
          style={{ opacity: imageLoaded ? 1 : 0 }}
        />
        <div className="card-type-badge" style={{ backgroundColor: typeInfo.color }}>
          {typeInfo.text}
        </div>
        <button
          className="favorite-btn"
          onClick={handleFavoriteClick}
          style={{ color: isFavorite ? '#ef4444' : '#9ca3af' }}
        >
          {isFavorite ? '♥' : '♡'}
        </button>
      </div>
      
      <div className="card-content">
        <div className="card-header">
          <h3 className="card-title">{item.title}</h3>
          <span className="status-badge" style={{ backgroundColor: statusInfo.color }}>
            {statusInfo.text}
          </span>
        </div>
        
        <p className="card-description">{item.description}</p>
        
        <div className="card-meta">
          <div className="meta-item">
            <span className="meta-icon">📍</span>
            <span className="meta-text">{item.stationName}</span>
          </div>
          <div className="meta-item">
            <span className="meta-icon">⏰</span>
            <span className="meta-text">{dayjs(item.time).format('MM-DD HH:mm')}</span>
          </div>
        </div>
        
        <div className="card-footer">
          <span className="publisher">发布者: {item.username}</span>
        </div>
      </div>
      
      <style>{`
        .item-card {
          width: 100%;
          min-width: 0;
          max-width: 100%;
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.08);
          overflow: hidden;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          margin-bottom: 0;
          display: flex;
          flex-direction: column;
        }
        
        .item-card:hover {
          transform: translateY(-3px) translateZ(0);
          box-shadow: 0 6px 24px rgba(0,0,0,0.12);
        }
        
        .card-image {
          position: relative;
          width: 100%;
          height: 140px;
          overflow: hidden;
        }
        
        .card-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: opacity 0.3s ease;
        }
        
        .image-placeholder {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        
        .card-type-badge {
          position: absolute;
          top: 8px;
          left: 8px;
          padding: 2px 8px;
          border-radius: 4px;
          color: #ffffff;
          font-size: 12px;
          font-weight: 500;
        }
        
        .favorite-btn {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 28px;
          height: 28px;
          border: none;
          background: rgba(255,255,255,0.9);
          border-radius: 50%;
          cursor: pointer;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s ease;
        }
        
        .favorite-btn:hover {
          transform: scale(1.1);
        }
        
        .card-content {
          padding: 12px;
        }
        
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        
        .card-title {
          font-size: 14px;
          font-weight: 600;
          color: #1f2937;
          margin: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          flex: 1;
          margin-right: 8px;
        }
        
        .status-badge {
          padding: 2px 6px;
          border-radius: 4px;
          color: #ffffff;
          font-size: 11px;
          font-weight: 500;
          flex-shrink: 0;
        }
        
        .card-description {
          font-size: 12px;
          color: #6b7280;
          margin: 0 0 10px 0;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        .card-meta {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-bottom: 8px;
        }
        
        .meta-item {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: #6b7280;
        }
        
        .meta-icon {
          font-size: 12px;
        }
        
        .meta-text {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .card-footer {
          padding-top: 8px;
          border-top: 1px solid #f3f4f6;
        }
        
        .publisher {
          font-size: 11px;
          color: #9ca3af;
        }
      `}</style>
    </div>
  );
}
