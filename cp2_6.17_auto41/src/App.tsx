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
    ])
      .then(([scoresData, favoritesData]) => {
        setScores(scoresData);
        setFavorites(favoritesData);
        console.log('[App] 初始数据加载成功', {
          scores: scoresData.length,
          favorites: favoritesData.length,
        });
      })
      .catch((err) => {
        console.error('[App] 初始数据加载失败:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleScoreAdded = (newScore: Score) => {
    setScores((prev) => [newScore, ...prev]);
  };

  const handleFavoriteToggle = async (scoreId: string): Promise<void> => {
    const existing = favorites.find((f) => f.scoreId === scoreId);

    if (existing) {
      console.log(`[收藏] 取消收藏 scoreId=${scoreId}, favoriteId=${existing.id}`);
      try {
        const response = await fetch(`/api/favorites/${existing.id}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        console.log(`[收藏] 取消收藏成功:`, data);
        setFavorites((prev) => prev.filter((f) => f.id !== existing.id));
      } catch (err) {
        console.error(`[收藏] 取消收藏失败:`, err);
        throw err;
      }
    } else {
      console.log(`[收藏] 添加收藏 scoreId=${scoreId}`);
      try {
        const response = await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scoreId }),
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const newFav: Favorite = await response.json();
        console.log(`[收藏] 添加收藏成功:`, newFav);
        setFavorites((prev) => [...prev, newFav]);
      } catch (err) {
        console.error(`[收藏] 添加收藏失败:`, err);
        throw err;
      }
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
