import React, { useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowLeft } from 'lucide-react';
import { useStore } from '../store/useStore';
import InspirationCard from '../components/InspirationCard';
import { getEmotionColors } from '../utils/colorUtils';
import { useNavigate } from 'react-router-dom';

const SparkPage: React.FC = () => {
  const navigate = useNavigate();
  const { inspirations, sparkCollection, selectInspiration, removeFromSparks, setShowDetail } = useStore();

  const sparkInspirations = useMemo(() => {
    return sparkCollection
      .map((spark) => {
        const insp = inspirations.find((i) => i.id === spark.inspirationId);
        if (!insp) return null;
        return { ...insp, sparkType: spark.type };
      })
      .filter(Boolean) as (typeof inspirations[0] & { sparkType: string })[];
  }, [sparkCollection, inspirations]);

  const handleCardClick = useCallback(
    (inspiration: typeof inspirations[0]) => {
      selectInspiration(inspiration);
      setShowDetail(true);
    },
    [selectInspiration, setShowDetail]
  );

  const handleRelease = useCallback(
    (id: string) => {
      removeFromSparks(id);
    },
    [removeFromSparks]
  );

  const columns = useMemo(() => {
    const cols: (typeof sparkInspirations)[] = [[], [], [], []];
    const colHeights = [0, 0, 0, 0];

    for (const item of sparkInspirations) {
      const shortestIdx = colHeights.indexOf(Math.min(...colHeights));
      cols[shortestIdx].push(item);
      colHeights[shortestIdx] += item.content.length > 30 ? 2 : 1;
    }

    return window.innerWidth <= 768 ? [cols[0], cols[1]] : cols;
  }, [sparkInspirations]);

  return (
    <div className="relative w-full h-full overflow-y-auto bg-wall-bg">
      <div className="absolute inset-0 pointer-events-none opacity-30">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-neon-blue/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-neon-purple/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 p-4 md:p-8 max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="text-sm">返回灵感墙</span>
          </button>
          <div className="flex-1 h-px bg-gradient-to-r from-neon-blue/30 to-transparent" />
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-yellow-400" />
            <h1 className="text-lg font-display text-gradient-neon">火花集</h1>
          </div>
        </div>

        {sparkInspirations.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-24"
          >
            <Sparkles size={48} className="mx-auto mb-4 text-white/10" />
            <p className="text-white/30 text-sm mb-2">你的火花集还是空的</p>
            <p className="text-white/20 text-xs">
              在灵感墙上点击火花图标共鸣，或续写灵感，它们会出现在这里
            </p>
          </motion.div>
        ) : (
          <div className="flex gap-4">
            {columns.map((col, colIdx) => (
              <div key={colIdx} className="flex-1 flex flex-col gap-4">
                {col.map((insp, idx) => (
                  <InspirationCard
                    key={insp.id}
                    inspiration={insp}
                    variant="spark"
                    index={colIdx * 10 + idx}
                    onClick={() => handleCardClick(insp)}
                    onRelease={handleRelease}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SparkPage;
