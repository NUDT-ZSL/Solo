import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, RefreshCw, User } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { passBottle } from '@/api/client';
import type { Bottle } from '@/store/useStore';
import BottleCard from '@/components/BottleCard';
import CreateModal from '@/components/CreateModal';
import ResonateModal from '@/components/ResonateModal';
import HotWall from '@/components/HotWall';
import ParticleCanvas from '@/components/ParticleCanvas';
import { useNavigate } from 'react-router-dom';

export default function HomePage() {
  const {
    userId, nickname, driftBottles, setDriftBottles,
    setCurrentBottle, toggleCreateModal, toggleResonateModal,
    loadDriftBottles, loadHotBottles, loadUser,
  } = useStore();

  const [loading, setLoading] = useState(true);
  const [passingId, setPassingId] = useState<string | null>(null);
  const [particleActive, setParticleActive] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      await loadUser();
      await Promise.all([loadDriftBottles(), loadHotBottles()]);
      setLoading(false);
    })();
  }, []);

  const handleResonate = useCallback((bottle: Bottle) => {
    setCurrentBottle(bottle);
    toggleResonateModal();
  }, [setCurrentBottle, toggleResonateModal]);

  const handlePassDone = useCallback(() => {
    setParticleActive(false);
    setPassingId(null);
  }, []);

  const handlePass = useCallback(async (bottle: Bottle) => {
    setPassingId(bottle.id);
    setParticleActive(true);

    setTimeout(async () => {
      try {
        await passBottle(bottle.id, userId);
        setDriftBottles(driftBottles.filter((b) => b.id !== bottle.id));
        loadDriftBottles();
      } catch (e) {
        console.error('Failed to pass bottle:', e);
        setDriftBottles(driftBottles.filter((b) => b.id !== bottle.id));
      }
    }, 400);
  }, [userId, driftBottles, setDriftBottles, loadDriftBottles]);

  const handleRefresh = async () => {
    setLoading(true);
    await loadDriftBottles();
    setLoading(false);
  };

  const SkeletonCard = () => (
    <div className="glass-card p-5 animate-pulse">
      <div className="flex justify-center mb-3">
        <div className="w-14 h-14 rounded-full bg-amber-gold/10" />
      </div>
      <div className="h-4 bg-amber-gold/10 rounded mb-2" />
      <div className="h-4 bg-amber-gold/10 rounded w-3/4 mb-3" />
      <div className="flex gap-2">
        <div className="h-5 w-12 bg-amber-gold/10 rounded-full" />
        <div className="h-5 w-16 bg-amber-gold/10 rounded-full" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-40 glass-card rounded-none border-0 border-b border-amber-gold/10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl text-warm-brown">气味漂流瓶</h1>
            <p className="text-xs text-warm-brown/50">让气味带你去远方</p>
          </div>
          <button
            onClick={() => navigate(`/profile/${userId}`)}
            className="flex items-center gap-2 px-3 py-2 rounded-full glass-card hover:shadow-md transition-all"
          >
            <div className="w-8 h-8 rounded-full bg-amber-gold/20 flex items-center justify-center">
              <User size={16} className="text-amber-gold" />
            </div>
            <span className="text-sm text-warm-brown">{nickname || '漂泊者'}</span>
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-xl text-warm-brown">🌊 漂流海</h2>
          <button
            onClick={handleRefresh}
            className="p-2 rounded-full hover:bg-amber-gold/10 transition-colors"
          >
            <RefreshCw size={18} className="text-warm-brown/50" />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : driftBottles.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <p className="text-5xl mb-3">🍾</p>
            <p className="text-warm-brown/40 text-sm">海面上暂时没有漂流瓶</p>
            <p className="text-warm-brown/30 text-xs mt-1">点击右下角按钮投放一个吧</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence>
              {driftBottles.map((bottle, index) => (
                <motion.div
                  key={bottle.id}
                  className="relative"
                  exit={{ x: 100, opacity: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  {passingId === bottle.id && (
                    <ParticleCanvas active={particleActive} onDone={handlePassDone} />
                  )}
                  <BottleCard
                    bottle={bottle}
                    index={index}
                    onResonate={handleResonate}
                    onPass={handlePass}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        <HotWall />
      </main>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleCreateModal}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-amber-gold text-white shadow-lg shadow-amber-gold/30 flex items-center justify-center z-40 hover:bg-amber-gold/90 transition-colors"
      >
        <Plus size={24} />
      </motion.button>

      <CreateModal />
      <ResonateModal />
    </div>
  );
}
