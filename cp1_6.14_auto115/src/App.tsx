import { useState, useEffect, useCallback } from 'react';
import MoodEntry from './components/MoodEntry';
import MoodCard from './components/MoodCard';
import TrendChart from './components/TrendChart';
import http from './utils/http';
import type { Mood } from './types';

type Page = 'record' | 'trend';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('record');
  const [moods, setMoods] = useState<Mood[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMoods = useCallback(async () => {
    try {
      const data = await http.get<never, Mood[]>('/moods');
      setMoods(data);
    } catch (error) {
      console.error('Failed to fetch moods:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMoods();
  }, [fetchMoods]);

  const handleSubmit = async (moodData: { mood: string; note: string; tags: string[] }) => {
    try {
      const newMood = await http.post<never, Mood>('/moods', moodData);
      setMoods(prev => [newMood, ...prev]);
    } catch (error) {
      console.error('Failed to create mood:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await http.delete(`/moods/${id}`);
      setMoods(prev => prev.filter(m => m.id !== id));
    } catch (error) {
      console.error('Failed to delete mood:', error);
    }
  };

  return (
    <div style={styles.app}>
      <nav style={styles.navbar}>
        <div style={styles.navContainer}>
          <h1 style={styles.appTitle}>MoodMirror</h1>
          <div style={styles.navButtons}>
            <button
              onClick={() => setCurrentPage('record')}
              style={{
                ...styles.navButton,
                ...(currentPage === 'record' ? styles.navButtonActive : {})
              }}
            >
              记录
            </button>
            <button
              onClick={() => setCurrentPage('trend')}
              style={{
                ...styles.trendButton,
                ...(currentPage === 'trend' ? styles.navButtonActive : {})
              }}
              className="mood-trend-button"
            >
              趋势
            </button>
          </div>
        </div>
      </nav>

      <main style={styles.main}>
        {currentPage === 'record' ? (
          <>
            <MoodEntry onSubmit={handleSubmit} />
            <div style={styles.moodList}>
              {loading ? (
                <p style={styles.loading}>加载中...</p>
              ) : moods.length === 0 ? (
                <p style={styles.empty}>还没有情绪记录，开始记录你的心情吧！</p>
              ) : (
                moods.map(mood => (
                  <MoodCard key={mood.id} mood={mood} onDelete={handleDelete} />
                ))
              )}
            </div>
          </>
        ) : (
          <TrendChart />
        )}
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh'
  },
  navbar: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: '56px',
    backgroundColor: '#2d3748',
    zIndex: 100,
    display: 'flex',
    alignItems: 'center'
  },
  navContainer: {
    maxWidth: '720px',
    width: '100%',
    margin: '0 auto',
    padding: '0 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  appTitle: {
    fontSize: '20px',
    fontFamily: 'sans-serif',
    color: '#ffffff',
    fontWeight: 600
  },
  navButtons: {
    display: 'flex',
    gap: '8px'
  },
  navButton: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#a0aec0',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s ease-out'
  },
  trendButton: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#6c5ce7',
    color: '#ffffff',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s ease-out',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  navButtonActive: {
    backgroundColor: '#a29bfe',
    color: '#ffffff'
  },
  main: {
    maxWidth: '720px',
    margin: '0 auto',
    padding: '76px 20px 40px',
    width: '100%'
  },
  moodList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginTop: '20px'
  },
  loading: {
    textAlign: 'center',
    color: '#718096',
    padding: '40px 0'
  },
  empty: {
    textAlign: 'center',
    color: '#718096',
    padding: '40px 0',
    fontSize: '14px'
  }
};

export default App;
