
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useCallback, useRef } from 'react';
import HomePage from './HomePage';
import CreatePage from './CreatePage';
import CardDetail from './CardDetail';
import type { ScentCard } from './types';

function App() {
  const [cards, setCards] = useState<ScentCard[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [transitionCard, setTransitionCard] = useState<ScentCard | null>(null);
  const [transitionRect, setTransitionRect] = useState<DOMRect | null>(null);
  const [transitionPhase, setTransitionPhase] = useState<'idle' | 'entering' | 'leaving'>('idle');
  const navigate = useNavigate();
  const location = useLocation();
  const transitionRef = useRef<HTMLDivElement>(null);

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

  const handleCardClick = useCallback((card: ScentCard, element?: HTMLElement) => {
    if (element) {
      const rect = element.getBoundingClientRect();
      setTransitionCard(card);
      setTransitionRect(rect);
      setTransitionPhase('entering');
      setTimeout(() => {
        navigate(`/card/${card.id}`);
        setTimeout(() => {
          setTransitionPhase('idle');
          setTransitionCard(null);
          setTransitionRect(null);
        }, 100);
      }, 50);
    } else {
      navigate(`/card/${card.id}`);
    }
  }, [navigate]);

  const handleBackHome = useCallback(() => {
    navigate('/');
  }, [navigate]);

  const isDetailPage = location.pathname.startsWith('/card/');

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

      {transitionCard && transitionRect && transitionPhase !== 'idle' && (
        <div className="detail-transition-overlay" ref={transitionRef}>
          <div
            className="detail-transition-image"
            style={{
              left: transitionRect.left,
              top: transitionRect.top,
              width: transitionRect.width,
              height: transitionRect.height,
              transform: transitionPhase === 'entering'
                ? `scale(${window.innerWidth / transitionRect.width * 0.6})`
                : 'scale(1)',
              opacity: transitionPhase === 'entering' ? 0.8 : 1
            }}
          >
            {transitionCard.imageData ? (
              <img
                src={transitionCard.imageData}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background: `radial-gradient(circle, ${getDominantColor(transitionCard)} 0%, transparent 70%)`
                }}
              />
            )}
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function getDominantColor(card: ScentCard): string {
  const active = card.scents.filter(s => s.value > 0);
  if (active.length === 0) return '#D4A574';
  active.sort((a, b) => b.value - a.value);
  return active[0].color;
}

export default App;
