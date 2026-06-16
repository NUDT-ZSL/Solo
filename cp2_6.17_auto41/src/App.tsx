import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import DetailPage from './pages/DetailPage';
import type { Score, Favorite } from './types';

export default function App() {
  const [scores, setScores] = useState<Score[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/scores').then((r) => r.json()),
      fetch('/api/favorites').then((r) => r.json()),
    ]).then(([scoresData, favoritesData]) => {
      setScores(scoresData);
      setFavorites(favoritesData);
      setLoading(false);
    });
  }, []);

  const handleScoreAdded = (newScore: Score) => {
    setScores((prev) => [newScore, ...prev]);
  };

  const handleFavoriteToggle = (scoreId: string) => {
    const existing = favorites.find((f) => f.scoreId === scoreId);
    if (existing) {
      fetch(`/api/favorites/${existing.id}`, { method: 'DELETE' }).then(() => {
        setFavorites((prev) => prev.filter((f) => f.id !== existing.id));
      });
    } else {
      fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scoreId }),
      })
        .then((r) => r.json())
        .then((newFav) => {
          setFavorites((prev) => [...prev, newFav]);
        });
    }
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          fontSize: '18px',
          color: '#b8860b',
        }}
      >
        加载中...
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          <HomePage
            scores={scores}
            favorites={favorites}
            onScoreAdded={handleScoreAdded}
            onFavoriteToggle={handleFavoriteToggle}
          />
        }
      />
      <Route
        path="/score/:id"
        element={
          <DetailPage
            scores={scores}
            favorites={favorites}
            onFavoriteToggle={handleFavoriteToggle}
          />
        }
      />
    </Routes>
  );
}
