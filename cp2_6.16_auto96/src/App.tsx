import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AlbumTimeline from '@/components/AlbumTimeline';
import PlayerPanel from '@/components/PlayerPanel';
import ThemeSwitcher, { ThemeKey } from '@/components/ThemeSwitcher';
import RecommendSection from '@/components/RecommendSection';
import { usePlayHistory } from '@/hooks/usePlayHistory';
import { Album, ListenRecord, RecommendTrack } from '@/types';

export default function App() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [listens, setListens] = useState<ListenRecord[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendTrack[]>([]);
  const [currentAlbumId, setCurrentAlbumId] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemeKey>('dark-purple');

  const { fetchListens, recordListen, getRecommendations } = usePlayHistory();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const loadAlbums = async () => {
      try {
        const res = await fetch('/api/albums');
        const data = await res.json();
        const sorted = [...data].sort((a: Album, b: Album) => a.year - b.year);
        setAlbums(sorted);
      } catch (error) {
        console.error('Failed to load albums:', error);
      }
    };
    loadAlbums();
  }, []);

  useEffect(() => {
    const loadListens = async () => {
      try {
        const data = await fetchListens();
        setListens(data);
      } catch (error) {
        console.error('Failed to load listens:', error);
      }
    };
    loadListens();
  }, [fetchListens]);

  useEffect(() => {
    if (albums.length > 0) {
      const recs = getRecommendations(albums, listens);
      setRecommendations(recs);
    }
  }, [albums, listens, getRecommendations]);

  const handlePlay = (albumId: string) => {
    setCurrentAlbumId(albumId);
  };

  const handleClosePlayer = () => {
    setCurrentAlbumId(null);
  };

  const handleListen = async (albumId: string, trackTitle: string, duration: number) => {
    try {
      await recordListen(albumId, trackTitle, duration);
      const updatedListens = await fetchListens();
      setListens(updatedListens);
    } catch (error) {
      console.error('Failed to record listen:', error);
    }
  };

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <div
              style={{
                minHeight: '100vh',
                backgroundColor: 'var(--bg-primary)',
                color: '#ffffff',
                transition: 'background-color 1s ease',
                paddingBottom: '120px',
              }}
            >
              <header
                style={{
                  padding: '48px 24px 24px',
                  textAlign: 'center',
                }}
              >
                <h1
                  style={{
                    fontSize: '42px',
                    fontWeight: 800,
                    background: 'linear-gradient(135deg, #ff6b6b, #feca57)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    marginBottom: '8px',
                    letterSpacing: '-0.5px',
                  }}
                >
                  Musician Portfolio
                </h1>
                <p
                  style={{
                    fontSize: '16px',
                    color: 'rgba(255, 255, 255, 0.55)',
                    fontWeight: 500,
                  }}
                >
                  一个独立音乐人的创作历程
                </p>
              </header>

              <RecommendSection recommendations={recommendations} onPlay={handlePlay} />

              <AlbumTimeline albums={albums} onPlay={handlePlay} />

              <PlayerPanel
                albumId={currentAlbumId}
                onClose={handleClosePlayer}
                onListen={handleListen}
              />

              <ThemeSwitcher currentTheme={theme} onThemeChange={setTheme} />
            </div>
          }
        />
      </Routes>
    </Router>
  );
}
