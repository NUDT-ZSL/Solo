import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { Score, Favorite } from '../types';

interface DetailPageProps {
  scores: Score[];
  favorites: Favorite[];
  onFavoriteToggle: (scoreId: string) => void;
}

export default function DetailPage({
  scores,
  favorites,
  onFavoriteToggle,
}: DetailPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [purchased, setPurchased] = useState(false);
  const [hoverHeart, setHoverHeart] = useState(false);

  const score = useMemo(() => scores.find((s) => s.id === id), [scores, id]);
  const isFavorited = favorites.some((f) => f.scoreId === id);

  if (!score) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
        }}
      >
        <p style={{ fontSize: '18px', color: '#666' }}>乐谱不存在</p>
        <Link
          to="/"
          style={{
            color: '#b8860b',
            textDecoration: 'none',
            fontSize: '15px',
          }}
        >
          ← 返回首页
        </Link>
      </div>
    );
  }

  const handlePurchase = () => {
    setPurchased(true);
    setTimeout(() => setPurchased(false), 3000);
  };

  const metaItems = [
    { label: '标题', value: score.title },
    { label: '作曲家', value: score.composer },
    { label: '出版年份', value: score.year ? `${score.year}年` : '未知' },
    { label: '页数', value: score.pages ? `${score.pages}页` : '未知' },
  ];

  return (
    <div style={{ minHeight: '100vh', padding: '40px 120px' }}>
      <div
        style={{
          marginBottom: '30px',
        }}
      >
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'none',
            border: 'none',
            color: '#b8860b',
            fontSize: '15px',
            cursor: 'pointer',
            padding: '4px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          返回首页
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '40px',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: '0 0 auto', maxWidth: '400px', width: '100%' }}>
          <div
            style={{
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              backgroundColor: '#fff',
            }}
          >
            <img
              src={score.imageUrl}
              alt={score.title}
              style={{
                width: '100%',
                maxWidth: '400px',
                display: 'block',
                objectFit: 'contain',
              }}
            />
          </div>
        </div>

        <div
          style={{
            flex: '1 1 300px',
            minWidth: '280px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}
        >
          <div>
            <h1
              className="serif"
              style={{
                fontSize: '28px',
                color: '#333',
                marginBottom: '8px',
                lineHeight: 1.3,
              }}
            >
              {score.title}
            </h1>
            <p style={{ fontSize: '16px', color: '#888' }}>{score.composer}</p>
          </div>

          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '20px 24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
          >
            {metaItems.map((item) => (
              <div
                key={item.label}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '10px 0',
                  borderBottom:
                    item.label !== '页数' ? '1px solid #f0ece6' : 'none',
                }}
              >
                <span style={{ color: '#999999', fontSize: '14px' }}>
                  {item.label}
                </span>
                <span
                  style={{
                    color: '#333333',
                    fontSize: '14px',
                    fontWeight: 500,
                  }}
                >
                  {item.value}
                </span>
              </div>
            ))}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '50%',
                transition: 'background-color 0.2s',
                backgroundColor: hoverHeart && !isFavorited ? '#fff5f5' : 'transparent',
              }}
              onClick={() => onFavoriteToggle(score.id)}
              onMouseEnter={() => setHoverHeart(true)}
              onMouseLeave={() => setHoverHeart(false)}
            >
              <HeartIcon
                filled={isFavorited}
                size={28}
                hovered={hoverHeart}
              />
            </div>

            <div style={{ flex: 1 }}>
              <span
                style={{
                  fontSize: '24px',
                  fontWeight: 700,
                  color: '#b8860b',
                  fontFamily: "'Playfair Display', serif",
                }}
              >
                ¥{score.price}
              </span>
            </div>

            <button
              onClick={handlePurchase}
              disabled={purchased}
              style={{
                padding: '14px 40px',
                borderRadius: '8px',
                backgroundColor: purchased ? '#6db36d' : '#b8860b',
                color: '#ffffff',
                border: 'none',
                fontSize: '16px',
                fontWeight: 600,
                cursor: purchased ? 'default' : 'pointer',
                transition: 'background-color 0.2s, transform 0.1s',
                boxShadow: '0 4px 12px rgba(184,134,11,0.3)',
              }}
              onMouseEnter={(e) => {
                if (!purchased) e.currentTarget.style.backgroundColor = '#8b6914';
              }}
              onMouseLeave={(e) => {
                if (!purchased) e.currentTarget.style.backgroundColor = '#b8860b';
              }}
              onMouseDown={(e) => {
                if (!purchased) e.currentTarget.style.transform = 'scale(0.98)';
              }}
              onMouseUp={(e) => {
                if (!purchased) e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {purchased ? '✓ 已购买' : '立即购买'}
            </button>
          </div>

          {purchased && (
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: '#e8f5e9',
                borderRadius: '8px',
                color: '#2e7d32',
                fontSize: '14px',
              }}
            >
              购买成功！卖家将尽快与您联系。
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          div[style*="padding: '40px 120px'"] {
            padding: 20px !important;
          }
        }
      `}</style>
    </div>
  );
}

function HeartIcon({
  filled,
  size = 24,
  hovered = false,
}: {
  filled: boolean;
  size?: number;
  hovered?: boolean;
}) {
  const color = filled ? '#ff6b6b' : hovered ? '#ff6b6b' : '#cccccc';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? '#ff6b6b' : 'none'}
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transition: 'all 0.2s' }}
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}
