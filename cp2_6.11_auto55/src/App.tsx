import { useEffect, useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Game } from './types';
import { gameApi, getUserId } from './api/client';
import GameCard from './components/GameCard';
import GameDetail from './components/GameDetail';
import { Dice6 } from 'lucide-react';

function HomePage() {
  const navigate = useNavigate();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId] = useState(getUserId());

  const fetchGames = async () => {
    try {
      setLoading(true);
      const data = await gameApi.getGames('heat');
      setGames(data);
    } catch (error) {
      console.error('获取游戏列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
  }, []);

  const handleNavigate = (id: string) => {
    navigate(`/game/${id}`);
  };

  const handleUpdate = () => {
    fetchGames();
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #F3F4F6 0%, #F9FAFB 100%)' }}>
      <header
        className="fixed top-0 left-0 right-0 z-50 px-8 py-4 flex items-center justify-between"
        style={{
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          borderBottom: '1px solid rgba(229, 231, 235, 0.5)'
        }}
      >
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <Dice6 size={32} style={{ color: '#F59E0B' }} />
          <h1
            className="text-2xl tracking-wide"
            style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, color: '#1F2937' }}
          >
            桌游集市
          </h1>
        </div>
        <nav className="flex items-center gap-6">
          <span style={{ fontFamily: 'Inter, sans-serif', color: '#6B7280', fontSize: '14px' }}>
            发现精彩桌游
          </span>
        </nav>
      </header>

      <main className="pt-24">
        <section className="max-w-7xl mx-auto px-8 py-12 text-center">
          <h2
            className="text-4xl md:text-5xl mb-4"
            style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, color: '#1F2937' }}
          >
            探索桌游世界
          </h2>
          <p className="text-lg mb-2" style={{ fontFamily: 'Inter, sans-serif', color: '#6B7280' }}>
            社区精选桌游规则，一键生成PDF打印
          </p>
        </section>

        {loading ? (
          <div className="max-w-7xl mx-auto px-8 py-8">
            <div
              className="grid gap-6"
              style={{
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                padding: '32px 0'
              }}
            >
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div
                  key={i}
                  className="animate-pulse rounded-2xl overflow-hidden"
                  style={{ border: '1px solid #E5E7EB', background: '#fff' }}
                >
                  <div style={{ height: '160px', background: '#E5E7EB' }} />
                  <div className="p-5 space-y-4">
                    <div className="h-6 rounded" style={{ background: '#E5E7EB', width: '70%' }} />
                    <div className="h-4 rounded" style={{ background: '#F3F4F6' }} />
                    <div className="h-4 rounded" style={{ background: '#F3F4F6', width: '80%' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-8 pb-16">
            <div
              className="grid"
              style={{
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '24px',
                padding: '32px 0'
              }}
            >
              {games.map(game => (
                <GameCard
                  key={game.id}
                  game={game}
                  onUpdate={handleUpdate}
                  onNavigate={handleNavigate}
                  userId={userId}
                />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/game/:id" element={<GameDetail />} />
    </Routes>
  );
}
