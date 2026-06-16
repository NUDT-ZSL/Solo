import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassHeader } from '../components/GlassHeader';
import { PlantCard } from '../components/PlantCard';
import { Skeleton } from '../components/Skeleton';
import { useDiscovery } from '../hooks';
import { RefreshCw, GitCompare, ArrowRight, Sparkles } from 'lucide-react';

export function Discovery() {
  const { discovery, plants, refreshDiscovery, getConfusablePairs } = useDiscovery();
  const navigate = useNavigate();
  const [showBadge, setShowBadge] = useState(true);
  const [badgeVisible, setBadgeVisible] = useState(true);

  useEffect(() => {
    setShowBadge(true);
    setBadgeVisible(true);
    const timer1 = setTimeout(() => setBadgeVisible(false), 2000);
    return () => clearTimeout(timer1);
  }, [discovery?.id]);

  const pairs = getConfusablePairs();

  return (
    <div className="min-h-screen pb-20">
      <GlassHeader
        title="今日发现"
        rightContent={
          <button
            onClick={refreshDiscovery}
            className="w-9 h-9 rounded-full bg-white/80 flex items-center justify-center hover:bg-white hover:rotate-180 transition-all duration-500"
            aria-label="换一个"
          >
            <RefreshCw size={18} className="text-text-primary" />
          </button>
        }
      />
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="text-badge-new" />
            <h2 className="text-lg font-semibold text-text-primary">今日推荐</h2>
          </div>
          {!discovery ? (
            <div className="flex justify-center">
              <Skeleton width={220} height={320} rounded="rounded-[12px]" />
            </div>
          ) : (
            <div className="flex justify-center">
              <div style={{ animation: 'slide-in-right 0.4s ease-out' }}>
                <PlantCard
                  plant={discovery}
                  onClick={() => navigate(`/encyclopedia/${discovery.id}`)}
                  showBadge={showBadge && badgeVisible}
                />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitCompare size={20} className="text-secondary" />
              <h2 className="text-lg font-semibold text-text-primary">易混淆树种对比</h2>
            </div>
            <button
              onClick={() => navigate('/comparison')}
              className="text-sm text-primary font-medium hover:underline flex items-center gap-1"
            >
              更多对比
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {pairs.slice(0, 4).map((pair, index) => (
              <button
                key={index}
                onClick={() => navigate(`/comparison?ids=${pair.a.id},${pair.b.id}`)}
                className="p-4 bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.10)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-all card-hover text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    <img
                      src={pair.a.leafImage}
                      alt={pair.a.name}
                      className="w-12 h-12 rounded-lg object-cover border-2 border-white shadow-sm"
                    />
                    <img
                      src={pair.b.leafImage}
                      alt={pair.b.name}
                      className="w-12 h-12 rounded-lg object-cover border-2 border-white shadow-sm"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {pair.a.name} <span className="text-gray-400">vs</span> {pair.b.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">点击查看详细对比</p>
                  </div>
                  <ArrowRight size={16} className="text-gray-400 flex-shrink-0" />
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-text-primary">探索更多</h2>
          <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2 -mx-4 px-4">
            {plants.slice(0, 8).map((plant) => (
              <div key={plant.id} className="flex-shrink-0">
                <PlantCard
                  plant={plant}
                  onClick={() => navigate(`/encyclopedia/${plant.id}`)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
