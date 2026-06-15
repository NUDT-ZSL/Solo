import { motion } from 'framer-motion';
import { Waves, Crown } from 'lucide-react';
import type { Bottle } from '@/store/useStore';

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  return `${Math.floor(diff / 86400)}天前`;
}

interface BottleCardProps {
  bottle: Bottle;
  index: number;
  onResonate: (bottle: Bottle) => void;
  onPass: (bottle: Bottle) => void;
  isHot?: boolean;
  rank?: number;
}

export default function BottleCard({ bottle, index, onResonate, onPass, isHot, rank }: BottleCardProps) {
  const showGoldGlow = isHot && rank !== undefined && rank <= 10;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.5, ease: 'easeOut' }}
      className={`glass-card p-5 relative overflow-hidden ${showGoldGlow ? 'gold-glow' : ''}`}
    >
      {isHot && rank !== undefined && (
        <div className="absolute top-3 left-3">
          {rank <= 3 ? (
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-gold text-white">
              <Crown size={16} />
            </div>
          ) : (
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-gold/20 text-amber-gold text-sm font-bold">
              {rank}
            </div>
          )}
        </div>
      )}

      <div className="text-center mb-3">
        <span className="text-5xl">{bottle.emoji}</span>
      </div>

      <p className="text-warm-brown text-sm leading-relaxed mb-3 line-clamp-3">
        {bottle.description}
      </p>

      <div className="flex items-center gap-2 mb-4">
        <span className="px-3 py-1 rounded-full bg-amber-gold/15 text-amber-gold text-xs font-medium">
          {bottle.category}
        </span>
        <span className="text-xs text-warm-brown/50">{timeAgo(bottle.created_at)}</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-amber-gold/70 text-xs">
          <Waves size={14} />
          <span>{bottle.resonance_count}</span>
        </div>

        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 0.8 }}
            onClick={() => onResonate(bottle)}
            className="px-4 py-1.5 rounded-full bg-amber-gold text-white text-sm font-medium hover:bg-amber-gold/90 transition-colors"
          >
            共鸣
          </motion.button>
          <button
            onClick={() => onPass(bottle)}
            className="px-3 py-1.5 rounded-full bg-warm-brown/10 text-warm-brown/60 text-sm hover:bg-warm-brown/20 transition-colors"
          >
            让它漂走
          </button>
        </div>
      </div>
    </motion.div>
  );
}
