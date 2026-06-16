import React, { useEffect, useState, useCallback } from 'react';
import Ocean from './components/Ocean';
import BottleModal from './components/BottleModal';
import ThrowForm from './components/ThrowForm';
import { fetchBottles, pickBottle, likeBottle, createBottle, type Bottle } from './api';

export type SortMode = 'random' | 'hot';

const SORT_KEY = 'bottle_sort_mode';

const App: React.FC = () => {
  const [bottles, setBottles] = useState<Bottle[]>([]);
  const [selected, setSelected] = useState<Bottle | null>(null);
  const [showThrow, setShowThrow] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('random');

  useEffect(() => {
    const saved = localStorage.getItem(SORT_KEY) as SortMode | null;
    if (saved === 'random' || saved === 'hot') {
      setSortMode(saved);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(SORT_KEY, sortMode);
  }, [sortMode]);

  const loadBottles = useCallback(async () => {
    try {
      const data = await fetchBottles();
      setBottles(data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    loadBottles();
  }, [loadBottles]);

  const handleBottleClick = useCallback((b: Bottle) => {
    setSelected(b);
  }, []);

  const handleBottlePick = useCallback(async (b: Bottle) => {
    try {
      const updated = await pickBottle(b.id);
      setBottles((prev) => prev.map((x) => (x.id === b.id ? updated : x)));
      setSelected(updated);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleWritten = useCallback(async () => {
    await loadBottles();
    if (selected) {
      const data = await fetchBottles();
      const fresh = data.find((x) => x.id === selected.id);
      if (fresh) setSelected(fresh);
    }
  }, [selected, loadBottles]);

  const handleLiked = useCallback(async () => {
    await loadBottles();
    if (selected) {
      const data = await fetchBottles();
      const fresh = data.find((x) => x.id === selected.id);
      if (fresh) setSelected(fresh);
    }
  }, [selected, loadBottles]);

  const handleToggleSort = () => {
    setSortMode((prev) => (prev === 'random' ? 'hot' : 'random'));
  };

  const handleCreate = async (data: {
    title: string;
    content: string;
    color: string;
    author: string;
  }) => {
    try {
      await createBottle(data);
      await loadBottles();
      setShowThrow(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLikeInModal = async () => {
    if (!selected) return;
    try {
      const updated = await likeBottle(selected.id);
      setSelected(updated);
      setBottles((prev) => prev.map((x) => (x.id === selected.id ? updated : x)));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Ocean
        bottles={bottles}
        onBottleClick={handleBottleClick}
        onBottlePick={handleBottlePick}
        sortMode={sortMode}
      />

      <button
        onClick={handleToggleSort}
        style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          height: '40px',
          padding: '0 16px',
          borderRadius: '8px',
          border: 'none',
          background: 'rgba(255,255,255,0.92)',
          color: '#1e293b',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
          transition: 'transform 0.2s, box-shadow 0.2s',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          zIndex: 50,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.15)';
        }}
      >
        <span>{sortMode === 'random' ? '🌊 随机漂浮' : '🔥 按热度排序'}</span>
      </button>

      <button
        onClick={() => setShowThrow(true)}
        style={{
          position: 'absolute',
          top: '16px',
          right: sortMode ? '160px' : '16px',
          width: '160px',
          height: '44px',
          borderRadius: '8px',
          border: 'none',
          background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
          color: '#fff',
          fontSize: '14px',
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 2px 12px rgba(37,99,235,0.4)',
          transition: 'transform 0.2s, box-shadow 0.2s',
          zIndex: 50,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 18px rgba(37,99,235,0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 12px rgba(37,99,235,0.4)';
        }}
      >
        🍾 扔瓶子
      </button>

      <BottleModal
        bottle={selected}
        onClose={() => setSelected(null)}
        onWritten={handleWritten}
        onLiked={handleLiked}
        onLikeClick={handleLikeInModal}
      />

      {showThrow && (
        <ThrowForm
          onClose={() => setShowThrow(false)}
          onSubmit={handleCreate}
        />
      )}
    </div>
  );
};

export default App;
