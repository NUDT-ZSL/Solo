import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import BottleCard from './BottleCard';
import type { Bottle } from '@/store/useStore';

export default function HotWall() {
  const { hotBottles } = useStore();

  const handleResonate = (_bottle: Bottle) => {};
  const handlePass = (_bottle: Bottle) => {};

  if (hotBottles.length === 0) {
    return (
      <section className="mt-10">
        <h2 className="font-serif text-2xl text-warm-brown mb-4">🔥 热门气味墙</h2>
        <div className="glass-card p-8 text-center">
          <p className="text-warm-brown/40 text-sm">还没有热门气味，快去投放漂流瓶吧</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-10">
      <h2 className="font-serif text-2xl text-warm-brown mb-4">🔥 热门气味墙</h2>

      <div className="overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory">
        <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
          {hotBottles.map((bottle, index) => (
            <motion.div
              key={bottle.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06, duration: 0.4 }}
              className="snap-start"
              style={{ minWidth: '260px', maxWidth: '280px' }}
            >
              <BottleCard
                bottle={bottle}
                index={index}
                onResonate={handleResonate}
                onPass={handlePass}
                isHot
                rank={index + 1}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
