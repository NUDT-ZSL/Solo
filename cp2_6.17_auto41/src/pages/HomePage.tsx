import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import UploadForm from '../components/UploadForm';
import ScoreCard from '../components/ScoreCard';
import type { Score, Favorite } from '../types';

interface HomePageProps {
  scores: Score[];
  favorites: Favorite[];
  onScoreAdded: (score: Score) => void;
  onFavoriteToggle: (scoreId: string) => Promise<void>;
}

export default function HomePage({
  scores,
  favorites,
  onScoreAdded,
  onFavoriteToggle,
}: HomePageProps) {
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
      <Header
        showSearch
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        showUploadButton
        onUploadClick={() => setShowUpload(!showUpload)}
        showUploadForm={showUpload}
        matchCount={filteredScores.length}
      />

      {showUpload && (
        <div
          style={{
            padding: '0 120px 20px',
            maxWidth: '740px',
            margin: '0 auto',
          }}
        >
          <UploadForm
            onUploadComplete={(score) => {
              onScoreAdded(score);
              setShowUpload(false);
              navigate(`/score/${score.id}`);
            }}
          />
        </div>
      )}

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
              padding: '80px 20px',
              color: '#999',
              fontSize: '16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#d4c5a9"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <p style={{ fontSize: '18px', color: '#666', fontWeight: 500 }}>
              {searchQuery
                ? '没有找到匹配的乐谱，试试其他关键词吧'
                : '暂无乐谱，快来上传吧！'}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  padding: '6px 16px',
                  borderRadius: '6px',
                  backgroundColor: 'transparent',
                  color: '#b8860b',
                  border: '1px solid #d4c5a9',
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#faf6f0';
                  e.currentTarget.style.borderColor = '#b8860b';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.borderColor = '#d4c5a9';
                }}
              >
                清除搜索
              </button>
            )}
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
                onFavoriteToggle={onFavoriteToggle}
              />
            ))}
          </div>
        )}
      </main>

      <style>{`
        @media (max-width: 768px) {
          main {
            padding: 20px !important;
          }
          div[style*="padding: '0 120px"] {
            padding: 0 20px !important;
          }
        }
      `}</style>
    </div>
  );
}
