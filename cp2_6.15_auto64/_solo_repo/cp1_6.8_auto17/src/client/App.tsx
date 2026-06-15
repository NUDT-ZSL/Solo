import React, { useState, useCallback } from 'react';
import { Diary, getTagColor, TAG_CONFIG } from './DiaryLogic';
import { StarOrbitView, DiaryCard, DiaryForm, ConstellationView } from './UIComponents';

type Page = 'orbit' | 'constellation';

const App: React.FC = () => {
  const [page, setPage] = useState<Page>('orbit');
  const [selectedDiary, setSelectedDiary] = useState<Diary | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [pageTransition, setPageTransition] = useState(false);

  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const switchPage = useCallback(
    (target: Page) => {
      if (target === page) return;
      setPageTransition(true);
      setTimeout(() => {
        setPage(target);
        setPageTransition(false);
      }, 300);
    },
    [page]
  );

  const handleStarClick = useCallback((diary: Diary) => {
    setSelectedDiary(diary);
  }, []);

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0e27 0%, #1a0a2e 50%, #0d0d1a 100%)',
      }}
    >
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          background: 'rgba(10,8,30,0.6)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          zIndex: 60,
        }}
      >
        <div
          style={{
            fontSize: 17,
            fontWeight: 600,
            background: 'linear-gradient(90deg, #FFD700, #87CEEB, #DDA0DD)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: 2,
          }}
        >
          ✦ 星轨手账
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => switchPage('orbit')}
            style={{
              padding: '6px 16px',
              borderRadius: 20,
              fontSize: 13,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.25s ease',
              background: page === 'orbit' ? 'rgba(135,206,235,0.15)' : 'transparent',
              color: page === 'orbit' ? '#87CEEB' : '#666688',
              textShadow: page === 'orbit' ? '0 0 8px rgba(135,206,235,0.5)' : 'none',
            }}
          >
            ◈ 星轨
          </button>
          <button
            onClick={() => switchPage('constellation')}
            style={{
              padding: '6px 16px',
              borderRadius: 20,
              fontSize: 13,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.25s ease',
              background: page === 'constellation' ? 'rgba(221,160,221,0.15)' : 'transparent',
              color: page === 'constellation' ? '#DDA0DD' : '#666688',
              textShadow: page === 'constellation' ? '0 0 8px rgba(221,160,221,0.5)' : 'none',
            }}
          >
            ◇ 我的星座
          </button>
        </div>
      </nav>

      <div
        style={{
          marginTop: 56,
          opacity: pageTransition ? 0 : 1,
          transform: pageTransition ? 'translateY(10px)' : 'translateY(0)',
          transition: 'opacity 0.3s ease, transform 0.3s ease',
        }}
      >
        {page === 'orbit' ? (
          <StarOrbitView onStarClick={handleStarClick} refreshKey={refreshKey} />
        ) : (
          <ConstellationView refreshKey={refreshKey} />
        )}
      </div>

      {page === 'orbit' && <DiaryForm onCreated={triggerRefresh} />}

      {selectedDiary && (
        <DiaryCard
          diary={selectedDiary}
          onClose={() => setSelectedDiary(null)}
          onResponded={() => {
            triggerRefresh();
            setSelectedDiary(null);
          }}
        />
      )}
    </div>
  );
};

export default App;
