import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import UploadForm from '../components/UploadForm';
import type { Score, Favorite } from '../types';

interface HomePageProps {
  scores: Score[];
  favorites: Favorite[];
  onScoreAdded: (score: Score) => void;
}

export default function HomePage({ scores, favorites, onScoreAdded }: HomePageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const navigate = useNavigate();

  const filteredScores = useMemo(() => {
    if (!searchQuery.trim()) return scores;
    const query = searchQuery.toLowerCase().trim();
    return scores.filter(
      (s) =>
        s.title.toLowerCase().includes(query) ||
        s.composer.toLowerCase().includes(query)
    );
  }, [scores, searchQuery]);

  const isFavorited = (scoreId: string) =>
    favorites.some((f) => f.scoreId === scoreId);

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '60px' }}>
      <header
        style={{
          padding: '40px 120px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
        }}
      >
        <h1
          className="serif"
          style={{
            fontSize: '36px',
            color: '#b8860b',
            fontWeight: 700,
            letterSpacing: '1px',
          }}
        >
          乐谱集市
        </h1>
        <p style={{ color: '#888', fontSize: '14px', marginTop: '-12px' }}>
          发现闲置乐谱，让音乐继续流淌
        </p>

        <div style={{ position: 'relative', width: '400px' }}>
          <input
            type="text"
            placeholder="搜索乐谱标题或作曲家..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '400px',
              height: '44px',
              borderRadius: '22px',
              border: '2px solid #d4c5a9',
              padding: '0 24px',
              fontSize: '15px',
              backgroundColor: '#ffffff',
              outline: 'none',
              transition: 'border-color 0.2s ease',
              color: '#333',
            }}
            onFocus={(e) => (e.target.style.borderColor = '#b8860b')}
            onBlur={(e) => (e.target.style.borderColor = '#d4c5a9')}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ color: '#666', fontSize: '14px' }}>
            找到 <strong style={{ color: '#b8860b' }}>{filteredScores.length}</strong> 个乐谱
          </span>
          <button
            onClick={() => setShowUpload(!showUpload)}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              backgroundColor: '#b8860b',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'background-color 0.2s',
              boxShadow: '0 2px 6px rgba(184,134,11,0.3)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#8b6914')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#b8860b')}
          >
            {showUpload ? '取消上传' : '上传乐谱'}
          </button>
        </div>

        {showUpload && (
          <div style={{ width: '100%', maxWidth: '500px' }}>
            <UploadForm
              onUploadComplete={(score) => {
                onScoreAdded(score);
                setShowUpload(false);
                navigate(`/score/${score.id}`);
              }}
            />
          </div>
        )}
      </header>

      <main
        style={{
          padding: '30px 120px',
          maxWidth: '100%',
        }}
      >
        {filteredScores.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 0',
              color: '#999',
              fontSize: '16px',
            }}
          >
            {searchQuery ? '没有找到匹配的乐谱' : '暂无乐谱，快来上传吧！'}
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '20px',
              justifyContent: 'flex-start',
            }}
          >
            {filteredScores.map((score) => (
              <ScoreCard
                key={score.id}
                score={score}
                favorited={isFavorited(score.id)}
                onClick={() => navigate(`/score/${score.id}`)}
              />
            ))}
          </div>
        )}
      </main>

      <style>{`
        @media (max-width: 768px) {
          header {
            padding: 24px 20px 16px !important;
          }
          header input {
            width: 100% !important;
            max-width: 350px;
          }
          header > div:first-of-type {
            width: 100% !important;
            max-width: 350px;
          }
          main {
            padding: 20px !important;
          }
        }
      `}</style>
    </div>
  );
}

function ScoreCard({
  score,
  favorited,
  onClick,
}: {
  score: Score;
  favorited: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        width: '200px',
        borderRadius: '12px',
        backgroundColor: '#faf6f0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        display: 'flex',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'transform 0.3s ease-out, box-shadow 0.3s ease-out',
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-5px)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.18)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
      }}
    >
      <div
        style={{
          width: '60%',
          overflow: 'hidden',
          backgroundColor: '#eee',
        }}
      >
        <img
          src={score.thumbnailUrl}
          alt={score.title}
          style={{
            width: '100%',
            height: '100%',
            minHeight: '150px',
            objectFit: 'cover',
            display: 'block',
            transition: 'opacity 0.3s',
          }}
          loading="lazy"
        />
      </div>

      <div
        style={{
          width: '40%',
          padding: '12px 10px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '6px',
        }}
      >
        <div>
          <h3
            className="serif"
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#333',
              marginBottom: '4px',
              lineHeight: 1.3,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {score.title}
          </h3>
          <p
            style={{
              fontSize: '12px',
              color: '#888',
              display: '-webkit-box',
              WebkitLineClamp: 1,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {score.composer}
          </p>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: '#b8860b',
            }}
          >
            ¥{score.price}
          </span>
          <HeartIcon filled={favorited} size={16} />
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          div[style*="width: '200px'"] {
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}

function HeartIcon({ filled, size = 24 }: { filled: boolean; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? '#ff6b6b' : 'none'}
      stroke={filled ? '#ff6b6b' : '#cccccc'}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}
