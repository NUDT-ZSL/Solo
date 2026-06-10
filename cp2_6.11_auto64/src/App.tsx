
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useCallback, useRef } from 'react';
import HomePage from './HomePage';
import CreatePage from './CreatePage';
import CardDetail from './CardDetail';
import type { ScentCard } from './types';

function getDominantColor(card: ScentCard): string {
  const active = card.scents.filter(s => s.value > 0);
  if (active.length === 0) return '#D4A574';
  active.sort((a, b) => b.value - a.value);
  return active[0].color;
}

interface FlipState {
  card: ScentCard;
  rect: DOMRect;
}

function App() {
  const [cards, setCards] = useState<ScentCard[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [flipState, setFlipState] = useState<FlipState | null>(null);
  const [flipAnimating, setFlipAnimating] = useState(false);
  const flipRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

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
      setFlipState({ card, rect });
      setFlipAnimating(true);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (flipRef.current) {
            flipRef.current.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
            flipRef.current.style.left = '50%';
            flipRef.current.style.top = '50%';
            flipRef.current.style.width = '500px';
            flipRef.current.style.height = 'auto';
            flipRef.current.style.transform = 'translate(-50%, -50%)';
            flipRef.current.style.borderRadius = '16px';
            flipRef.current.style.opacity = '1';
          }

          setTimeout(() => {
            setFlipAnimating(false);
            setFlipState(null);
            navigate(`/card/${card.id}`);
          }, 400);
        });
      });
    } else {
      navigate(`/card/${card.id}`);
    }
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

      {flipState && flipAnimating && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999,
            backgroundColor: 'rgba(26, 26, 26, 0.9)',
            pointerEvents: 'none'
          }}
        >
          <div
            ref={flipRef}
            style={{
              position: 'absolute',
              left: flipState.rect.left + 'px',
              top: flipState.rect.top + 'px',
              width: flipState.rect.width + 'px',
              height: flipState.rect.height + 'px',
              overflow: 'hidden',
              borderRadius: '12px',
              opacity: '0.8',
              transform: 'none',
              willChange: 'transform, width, height, left, top, opacity, border-radius'
            }}
          >
            {flipState.card.imageData ? (
              <img
                src={flipState.card.imageData}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background: `radial-gradient(circle, ${getDominantColor(flipState.card)} 0%, transparent 70%), #2A2A2A`
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

export default App;
