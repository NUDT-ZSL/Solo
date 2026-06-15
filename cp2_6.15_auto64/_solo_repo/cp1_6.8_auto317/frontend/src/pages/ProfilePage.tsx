import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { fetchUserPublished, fetchUserResonated } from '@/api/client';
import type { Bottle } from '@/store/useStore';
import BottleCard from '@/components/BottleCard';
import StatsPanel from '@/components/StatsPanel';

type TabKey = 'published' | 'resonated';

export default function ProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { nickname } = useStore();

  const [tab, setTab] = useState<TabKey>('published');
  const [published, setPublished] = useState<Bottle[]>([]);
  const [resonated, setResonated] = useState<Bottle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    (async () => {
      try {
        const [pub, res] = await Promise.all([
          fetchUserPublished(userId),
          fetchUserResonated(userId),
        ]);
        if (mounted) {
          setPublished(pub);
          setResonated(res);
        }
      } catch (e) {
        console.error('Failed to load profile:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [userId]);

  const handleResonate = (_bottle: Bottle) => {};
  const handlePass = (_bottle: Bottle) => {};

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'published', label: '我发布的' },
    { key: 'resonated', label: '我共鸣过的' },
  ];

  const currentList = tab === 'published' ? published : resonated;

  const SkeletonCard = () => (
    <div className="glass-card p-5 animate-pulse">
      <div className="flex justify-center mb-3">
        <div className="w-14 h-14 rounded-full bg-amber-gold/10" />
      </div>
      <div className="h-4 bg-amber-gold/10 rounded mb-2" />
      <div className="h-4 bg-amber-gold/10 rounded w-3/4" />
    </div>
  );

  return (
    <div className="min-h-screen pb-8">
      <header className="sticky top-0 z-40 glass-card rounded-none border-0 border-b border-amber-gold/10">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-full hover:bg-amber-gold/10 transition-colors"
          >
            <ArrowLeft size={20} className="text-warm-brown" />
          </button>
          <h1 className="font-serif text-lg text-warm-brown">个人中心</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 mt-6">
        <div className="glass-card p-6 flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-amber-gold/20 flex items-center justify-center text-2xl">
            🧴
          </div>
          <div>
            <p className="font-serif text-xl text-warm-brown">{nickname || '漂泊者'}</p>
            <p className="text-xs text-warm-brown/40 mt-1">气味旅人</p>
          </div>
        </div>

        {userId && <StatsPanel userId={userId} />}

        <div className="flex gap-2 mt-6 mb-4">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                tab === t.key
                  ? 'bg-amber-gold text-white'
                  : 'bg-amber-gold/10 text-amber-gold hover:bg-amber-gold/20'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : currentList.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <p className="text-3xl mb-2">{tab === 'published' ? '🍾' : '🌊'}</p>
            <p className="text-warm-brown/40 text-sm">
              {tab === 'published' ? '还没有发布过气味漂流瓶' : '还没有共鸣过任何气味'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentList.map((bottle, index) => (
              <BottleCard
                key={bottle.id}
                bottle={bottle}
                index={index}
                onResonate={handleResonate}
                onPass={handlePass}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
