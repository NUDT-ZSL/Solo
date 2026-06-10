
import { Routes, Route, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import HomePage from './HomePage';
import CreatePage from './CreatePage';
import CardDetail from './CardDetail';
import type { ScentCard } from './types';

function App() {
  const [cards, setCards] = useState<ScentCard[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const navigate = useNavigate();

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const fetchCards = useCallback(async () => {
    try {
      const res = await fetch('/api/cards');
      const data = await res.json();
      if (data.success) {
        setCards(data.data);
      }
    } catch (e) {
      console.error('Failed to fetch cards:', e);
    }
  }, []);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const handleCardCreated = useCallback((newCard: ScentCard) => {
    setCards(prev => [newCard, ...prev]);
    showToast('卡片创建成功！');
    navigate('/');
  }, [navigate, showToast]);

  const handleCreateClick = useCallback(() => {
    navigate('/create');
  }, [navigate]);

  const handleCardClick = useCallback((card: ScentCard) => {
    navigate(`/card/${card.id}`);
  }, [navigate]);

  const handleBackHome = useCallback(() => {
    navigate('/');
  }, [navigate]);

  return (
    <div className="app-container">
      <Routes>
        <Route
          path="/"
          element={
            <HomePage
              cards={cards}
              onCardClick={handleCardClick}
              onCreateClick={handleCreateClick}
            />
          }
        />
        <Route
          path="/create"
          element={
            <CreatePage
              onCreated={handleCardCreated}
              onCancel={handleBackHome}
              showToast={showToast}
            />
          }
        />
        <Route
          path="/card/:id"
          element={
            <CardDetail
              cards={cards}
              onBack={handleBackHome}
            />
          }
        />
      </Routes>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

export default App;
