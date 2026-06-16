import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Header from '../components/Header';
import HeartIcon from '../components/HeartIcon';
import { formatPrice } from '../utils/format';
import type { Score, Favorite } from '../types';

const DEFAULT_DETAIL_PLACEHOLDER =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800">
      <rect fill="#f5f0e8" width="600" height="800"/>
      <g fill="none" stroke="#d4c5a9" stroke-width="3">
        <rect x="80" y="80" width="440" height="640" rx="12"/>
        <line x1="120" y1="160" x2="480" y2="160"/>
        <line x1="120" y1="220" x2="440" y2="220"/>
        <line x1="120" y1="280" x2="400" y2="280"/>
        <line x1="120" y1="340" x2="460" y2="340"/>
        <line x1="120" y1="400" x2="420" y2="400"/>
        <circle cx="300" cy="550" r="80"/>
        <line x1="300" y1="470" x2="300" y2="630"/>
        <line x1="220" y1="550" x2="380" y2="550"/>
      </g>
      <text x="300" y="730" text-anchor="middle" fill="#b8860b" font-family="serif" font-size="24">乐谱图片加载失败</text>
    </svg>`
  );

interface DetailPageProps {
  scores: Score[];
  favorites: Favorite[];
  onFavoriteToggle: (scoreId: string) => Promise<void>;
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
  const [isFavoriteLoading, setIsFavoriteLoading] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const score = useMemo(() => scores.find((s) => s.id === id), [scores, id]);
  const isFavorited = favorites.some((f) => f.scoreId === id);

  if (!score) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <Header />
        <div
          style={{
            minHeight: '60vh',
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
      </div>
    );
  }

  const handlePurchase = () => {
    setPurchased(true);
    setTimeout(() => setPurchased(false), 3000);
  };

  const handleFavoriteClick = async () => {
    if (isFavoriteLoading) return;
    setIsFavoriteLoading(true);
    try {
      await onFavoriteToggle(score.id);
    } finally {
      setIsFavoriteLoading(false);
    }
  };

  const handleImageError = () => {
    console.warn(`详情页图片加载失败: ${score.imageUrl}`);
    setImageError(true);
    setImageLoaded(true);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const metaItems = [
    { label: '标题', value: score.title },
    { label: '作曲家', value: score.composer },
    { label: '出版年份', value: score.year ? `${score.year}年` : '未知' },
    { label: '页数', value: score.pages ? `${score.pages}页` : '未知' },
  ];

  return (
    <div style={{ minHeight: '100vh' }}>
      <Header />

      <div style={{ padding: '0 120px 40px' }}>
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
                position: 'relative',
                minHeight: '400px',
              }}
            >
              {!imageLoaded && !imageError && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: '#f5f0e8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#d4c5a9"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  <span style={{ color: '#999', fontSize: '14px' }}>
                    加载中...
                  </span>
                </div>
              )}
              <img
                src={imageError ? DEFAULT_DETAIL_PLACEHOLDER : score.imageUrl}
                alt={score.title}
                onLoad={handleImageLoad}
                onError={handleImageError}
                style={{
                  width: '100%',
                  maxWidth: '400px',
                  display: 'block',
                  objectFit: imageError ? 'contain' : 'contain',
                  opacity: imageLoaded ? 1 : 0,
                  transition: 'opacity 0.5s ease-in-out',
                  backgroundColor: '#f5f0e8',
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
                onClick={handleFavoriteClick}
                onMouseEnter={() => setHoverHeart(true)}
                onMouseLeave={() => setHoverHeart(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: isFavoriteLoading ? 'wait' : 'pointer',
                  padding: '8px',
                  borderRadius: '50%',
                  transition: 'background-color 0.2s, opacity 0.2s',
                  backgroundColor:
                    hoverHeart && !isFavorited ? '#fff5f5' : 'transparent',
                  opacity: isFavoriteLoading ? 0.6 : 1,
                }}
                title={isFavorited ? '取消收藏' : '收藏'}
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
                  {formatPrice(score.price)}
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
      </div>

      <style>{`
        @media (max-width: 768px) {
          div[style*="padding: '0 120px"] {
            padding: 0 20px 40px !important;
          }
        }
      `}</style>
    </div>
  );
}
