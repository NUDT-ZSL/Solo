import { useState, useEffect, useCallback } from 'react';
import VotingWall from './VotingWall';
import Uploader from './Uploader';
import type { Artwork, ApiResponse } from './types';

const App = () => {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchArtworks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/artworks');
      const json: ApiResponse<Artwork[]> = await res.json();
      if (json.success && json.data) {
        setArtworks(json.data);
      } else {
        setError(json.error || '获取作品列表失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络错误');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArtworks();
  }, [fetchArtworks]);

  const handleVote = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/artworks/${id}/vote`, { method: 'POST' });
      const json: ApiResponse<{ id: string; voteCount: number }> = await res.json();
      if (json.success && json.data) {
        setArtworks(prev =>
          prev.map(a =>
            a.id === json.data!.id
              ? { ...a, voteCount: json.data!.voteCount }
              : a
          )
        );
      }
    } catch (err) {
      console.error('投票失败:', err);
    }
  }, []);

  const handleUploadSuccess = useCallback((newArtwork: Artwork) => {
    setArtworks(prev => [newArtwork, ...prev]);
  }, []);

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.title}>
            <span style={styles.titleIcon}>🎨</span>
            人气画廊 · 脉动墙
          </h1>
          <p style={styles.subtitle}>每一次点赞，都是一道流动的光芒</p>
        </div>
        <div style={styles.headerRight}>
          <Uploader onUploadSuccess={handleUploadSuccess} />
        </div>
      </header>

      <main style={styles.main}>
        {loading && <div style={styles.loading}>加载中...</div>}
        {error && <div style={styles.error}>{error}</div>}
        {!loading && !error && (
          <VotingWall artworks={artworks} onVote={handleVote} />
        )}
      </main>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    padding: '0 24px 48px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '32px 0',
    flexWrap: 'wrap',
    gap: 16,
    position: 'sticky',
    top: 0,
    background: 'linear-gradient(180deg, #1a1a2e 70%, rgba(26,26,46,0.95) 100%)',
    zIndex: 10,
    backdropFilter: 'blur(8px)'
  },
  headerLeft: { flex: 1, minWidth: 280 },
  headerRight: { display: 'flex', alignItems: 'center' },
  title: {
    fontSize: 32,
    fontWeight: 700,
    background: 'linear-gradient(90deg, #e94560, #ff6b9d)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 6
  },
  titleIcon: { fontSize: 28, WebkitTextFillColor: 'initial' },
  subtitle: { color: '#8892b0', fontSize: 14 },
  main: { maxWidth: 1600, margin: '0 auto' },
  loading: {
    textAlign: 'center',
    padding: 80,
    color: '#8892b0',
    fontSize: 18
  },
  error: {
    textAlign: 'center',
    padding: 40,
    color: '#e94560',
    fontSize: 16,
    background: 'rgba(233,69,96,0.1)',
    borderRadius: 12,
    marginTop: 24
  }
};

export default App;
